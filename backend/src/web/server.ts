import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { z, ZodError } from "zod";
import { assertHeldOutCritic } from "../llm/client";
import { ingestNode } from "../ingest/ingest";
import { extractNode, graphNode, correctGraph, mergeGraphInputs } from "../ingest/graph";
import { initiateGoogleConnect, getConnectionStatus } from "../ingest/composio/connect";
import { generateNode } from "../agents/generator";
import { criticNode } from "../agents/critic";
import { runPipeline, RunInput, Correction } from "../orchestrator/run";
import { OnboardingAnswers, RelationshipGraph, Signal, WsEvent } from "../types";

export const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const sockets = new Set<WSContext>();

app.use("/*", cors());

// Verbose request log — every request emits one line with status + latency.
app.use("/*", async (c, next) => {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(1);
  console.log(`[pepl:backend] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
});

// Honest error surfacing — a bad body is a 400, a dead stage is a 500. Never a faked 200.
app.onError((err, c) => {
  const status = err instanceof ZodError ? 400 : 500;
  console.error(`[pepl:backend] ERROR ${c.req.method} ${c.req.path} -> ${status}: ${err.message}`);
  return c.json({ error: err.message }, status);
});

app.get("/health", (c) => c.json({ ok: true, service: "pepl-backend" }));

// POST /run — full pipeline; events stream to /ws via the default broadcast onEvent.
app.post("/run", async (c) => {
  const input = RunInput.parse(await c.req.json());
  console.log(`[pepl:seam] POST /run source="${input.source}" kind=${input.kind}`);
  return c.json(await runPipeline(input));
});

// POST /ingest — source -> { signals }.
app.post("/ingest", async (c) => {
  const { source } = z.object({ source: z.string() }).parse(await c.req.json());
  console.log(`[pepl:seam] POST /ingest source="${source}"`);
  return c.json(await ingestNode({ source }));
});

// GET /graph — ingest + extract + graph -> RelationshipGraph (?source defaults to the demo corpus).
app.get("/graph", async (c) => {
  const source = c.req.query("source") ?? "demo";
  console.log(`[pepl:seam] GET /graph source="${source}"`);
  const { signals, people: radialPeople, edges: radialEdges } = await ingestNode({ source });
  const lateral = await extractNode({ signals });
  const merged = mergeGraphInputs({ people: radialPeople, edges: radialEdges }, lateral);
  return c.json(await graphNode(merged));
});

// POST /correct — apply a user correction, drop the matching seededWrong entry.
app.post("/correct", async (c) => {
  const { graph, correction } = z
    .object({ graph: RelationshipGraph, correction: Correction })
    .parse(await c.req.json());
  console.log(`[pepl:seam] POST /correct ${correction.personId}.${correction.field}`);
  return c.json(correctGraph(graph, correction));
});

// POST /api/connect/google/initiate — start the managed Google OAuth flow for a user.
app.post("/api/connect/google/initiate", async (c) => {
  const { userId, provider } = z
    .object({ userId: z.string(), provider: z.enum(["gmail", "calendar"]) })
    .parse(await c.req.json());
  console.log(`[pepl:seam] POST /api/connect/google/initiate userId=${userId} provider=${provider}`);
  return c.json(await initiateGoogleConnect(userId, provider));
});

// GET /api/connect/google/status — poll whether a user's Google connection is ACTIVE.
app.get("/api/connect/google/status", async (c) => {
  const { userId, provider } = z
    .object({ userId: z.string(), provider: z.enum(["gmail", "calendar"]) })
    .parse({ userId: c.req.query("userId"), provider: c.req.query("provider") });
  console.log(`[pepl:seam] GET /api/connect/google/status userId=${userId} provider=${provider}`);
  return c.json(await getConnectionStatus(userId, provider));
});

// POST /generate — generate + critic; 422 (fail-CLOSED) if the judge can't ground it.
app.post("/generate", async (c) => {
  const body = z
    .object({
      graph: RelationshipGraph,
      signals: z.array(Signal),
      answers: OnboardingAnswers.optional(),
      kind: z.enum(["bio", "story"]),
    })
    .parse(await c.req.json());
  console.log(`[pepl:seam] POST /generate kind=${body.kind} signals=${body.signals.length}`);
  const story = await generateNode(body);
  const verdict = await criticNode({ output: story, signals: body.signals });
  if (verdict.verdict === "regen") {
    console.warn(`[pepl:seam] POST /generate -> 422 fail-CLOSED: ${verdict.failReason}`);
    return c.json({ error: verdict.failReason, verdict }, 422);
  }
  return c.json({ story, verdict });
});

// POST /ask — route the question through generate(kind="story"); seed it as a Signal so it can ground.
app.post("/ask", async (c) => {
  const { question, source } = z
    .object({ question: z.string(), source: z.string().optional() })
    .parse(await c.req.json());
  console.log(`[pepl:seam] POST /ask q="${question.slice(0, 60)}"`);
  const { signals } = await ingestNode({ source: source ?? "demo" });
  const seed: Signal = { id: `sig-ask-${Date.now()}`, text: question, source: "ask" };
  const corpus = [...signals, seed];
  const { people, edges } = await extractNode({ signals });
  const graph = await graphNode({ people, edges });
  const story = await generateNode({ graph, signals: corpus, kind: "story" });
  const verdict = await criticNode({ output: story, signals: corpus });
  if (verdict.verdict === "regen") {
    console.warn(`[pepl:seam] POST /ask -> 422 fail-CLOSED: ${verdict.failReason}`);
    return c.json({ error: verdict.failReason, verdict }, 422);
  }
  return c.json({ story, verdict });
});

app.get(
  "/ws",
  upgradeWebSocket(() => ({
    onOpen(_evt, ws) {
      sockets.add(ws);
      console.log(`[pepl:ws] connect (clients=${sockets.size})`);
    },
    onClose(_evt, ws) {
      sockets.delete(ws);
      console.log(`[pepl:ws] close (clients=${sockets.size})`);
    },
  })),
);

/** Validate against the WsEvent contract, then fan out to every live socket. */
export function broadcast(event: WsEvent): void {
  const payload = JSON.stringify(WsEvent.parse(event));
  for (const ws of sockets) ws.send(payload);
  console.log(`[pepl:ws] -> ${event.type} (clients=${sockets.size})`);
}

export { injectWebSocket };

export function start(port = Number(process.env.PORT ?? 8787)): void {
  assertHeldOutCritic(); // critic family != generator family — fail CLOSED at boot
  const server = serve({ fetch: app.fetch, port }, (info) => {
    console.log(`[pepl:backend] listening on http://localhost:${info.port}`);
  });
  injectWebSocket(server);
}
