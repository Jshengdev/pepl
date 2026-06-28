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
import { deriveIdentityFromGmail } from "../ingest/composio/gmail";
import { generateNode } from "../agents/generator";
import { criticNode } from "../agents/critic";
import { introLine, dotTurn } from "../agents/dot";
import { buildDossier } from "../agents/dossier";
import { runConnector } from "../agents/connector";
import { connectMap } from "../agents/connect-map";
import { runPipeline, runIngest, runReveal, RunInput, Correction, currentMode } from "../orchestrator/run";
import { loadDossier, loadCard, saveCard, listMapNodes } from "../memory/store";
import { CardSeed, OnboardingAnswers, RelationshipGraph, Signal, WsEvent } from "../types";

// Who a /run is for (userId) + about (owner). Parsed off the same body as RunInput; kept standalone
// (not RunInput.extend) so this module never touches run.ts's bindings at import time — server.ts and
// run.ts form an import cycle that only resolves because each uses the other lazily, inside handlers.
const PersistCtx = z.object({ userId: z.string(), owner: z.object({ name: z.string(), email: z.string() }) });

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
  const body = await c.req.json();
  const input = RunInput.parse(body);
  const ctx = body.userId && body.owner ? PersistCtx.parse(body) : undefined;
  console.log(`[pepl:seam] POST /run source="${input.source}" kind=${input.kind} user=${ctx?.userId ?? "(ephemeral)"}`);
  return c.json(await runPipeline(input, broadcast, ctx));
});

// POST /run/ingest — beat 1 only: source -> { graph, signals } (the reveal comes later).
app.post("/run/ingest", async (c) => {
  const body = await c.req.json();
  const input = RunInput.parse(body);
  const ctx = body.userId && body.owner ? PersistCtx.parse(body) : undefined;
  console.log(`[pepl:seam] POST /run/ingest source="${input.source}" user=${ctx?.userId ?? "(ephemeral)"}`);
  return c.json(await runIngest(input, ctx, broadcast));
});

// POST /run/reveal — beat 4: { graph, signals, kind, answers?, cardSeed? } -> { story, verdict, cards }.
const RevealBody = z.object({
  graph: RelationshipGraph,
  signals: z.array(Signal),
  kind: z.enum(["bio", "story"]),
  answers: OnboardingAnswers.optional(),
  cardSeed: CardSeed.optional(),
});
app.post("/run/reveal", async (c) => {
  const body = await c.req.json();
  const args = RevealBody.parse(body);
  const ctx = body.userId && body.owner ? PersistCtx.parse(body) : undefined;
  console.log(`[pepl:seam] POST /run/reveal kind=${args.kind} signals=${args.signals.length} user=${ctx?.userId ?? "(ephemeral)"}`);
  return c.json(await runReveal(args, ctx, broadcast));
});

// GET /dossier/:userId — rehydrate a saved dossier (refresh). 404 honest-absence if none.
app.get("/dossier/:userId", async (c) => {
  const userId = c.req.param("userId");
  console.log(`[pepl:seam] GET /dossier/${userId}`);
  const dossier = await loadDossier(userId);
  if (!dossier) return c.json({ error: `no dossier for user "${userId}"` }, 404);
  return c.json(dossier);
});

// GET /api/map — every signed-up user as a worldmap node ({nodes:MapNode[], mode}). The keystone for
// "see each other": after each user finishes onboarding their dossier lands here (smiley joined from
// user_cards). Honest empty (logged) if none. mode is in the payload per the grounding law.
app.get("/api/map", async (c) => {
  console.log(`[pepl:seam] GET /api/map`);
  const nodes = await listMapNodes();
  return c.json({ nodes, mode: currentMode() });
});

// POST /reveal — the bento Dossier for one user. Loads their persisted dossier + drawn smiley, then
// buildDossier reshapes it into 5 grounded cards (every bit a receipt, or status:"failed"). 404 if the
// user has no persisted dossier yet; 422 if it was persisted without a story/verdict (can't ground).
const RevealReq = z.object({ userId: z.string() });
app.post("/reveal", async (c) => {
  const { userId } = RevealReq.parse(await c.req.json());
  console.log(`[pepl:seam] POST /reveal userId=${userId}`);
  const d = await loadDossier(userId);
  if (!d) return c.json({ error: `no dossier for user "${userId}"` }, 404);
  if (!d.story || !d.verdict) return c.json({ error: `dossier for "${userId}" has no story/verdict` }, 422);
  const card = await loadCard(userId);
  const dossier = await buildDossier({
    graph: d.graph,
    story: d.story,
    verdict: d.verdict,
    signals: d.signals,
    smiley: card?.smiley ?? null,
    mode: currentMode(),
  });
  return c.json(dossier);
});

// POST /api/map/link — Knot ties two persisted nodes with a TWO-SIDED grounded story. Returns
// {link:ConnectionStory, similarities[], mode} on a grounded link, {link:null, ...} on an honest
// 0-overlap (never a canned rhyme), or 422 fail-CLOSED if the connector can't ground it (fabricated
// id / >2 regens / missing node) — the same fail-loud contract the engine enforces internally.
const MapLinkReq = z.object({ a: z.string(), b: z.string() });
app.post("/api/map/link", async (c) => {
  const { a, b } = MapLinkReq.parse(await c.req.json());
  console.log(`[pepl:seam] POST /api/map/link a="${a}" b="${b}"`);
  try {
    return c.json(await runConnector(a, b, broadcast));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.warn(`[pepl:seam] POST /api/map/link -> 422 fail-CLOSED: ${error}`);
    return c.json({ error }, 422);
  }
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

// GET /api/connect/google/status — poll whether a user's Google connection is ACTIVE. On the FIRST poll
// that flips to connected (gmail), BACKGROUND-KICK the live pipeline so scrape_progress begins streaming
// on /ws — fire-and-forget so the poll returns immediately (never blocks on the scrape).
const kicked = new Set<string>(); // userIds whose live pipeline we've already background-started
app.get("/api/connect/google/status", async (c) => {
  const { userId, provider } = z
    .object({ userId: z.string(), provider: z.enum(["gmail", "calendar"]) })
    .parse({ userId: c.req.query("userId"), provider: c.req.query("provider") });
  console.log(`[pepl:seam] GET /api/connect/google/status userId=${userId} provider=${provider}`);
  const status = await getConnectionStatus(userId, provider);
  if (status.connected && provider === "gmail" && !kicked.has(userId)) {
    kicked.add(userId);
    console.log(`[pepl:seam] connect flip -> background-kick live pipeline userId=${userId}`);
    void kickLivePipeline(userId);
  }
  return c.json(status);
});

// The background scrape: ingest (scrape_progress) -> graph -> story -> cards (cards_ready) -> persist the
// dossier so POST /reveal can load it. Fire-and-forget; a failure fails LOUD on the WS, never the poll.
async function kickLivePipeline(userId: string): Promise<void> {
  try {
    const owner = await deriveIdentityFromGmail(userId);
    await runPipeline({ source: `gmail:${userId}`, kind: "story" }, broadcast, { userId, owner });
    console.log(`[pepl:seam] background pipeline done userId=${userId}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[pepl:seam] background pipeline FAILED userId=${userId}: ${error}`);
    broadcast({ type: "failed", node: "pipeline", error });
    kicked.delete(userId); // allow a retry on the next poll — don't wedge the demo on one transient failure
  }
}

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

// --- beat-2: Dot voice onboarding (v3 free-turn) ----------------------------------------------
// The browser does speech<->text (Web Speech API); these process the transcript. Each user turn is
// banked in dot.ts as a Signal{source:"onboarding"} and folded into the dossier at reveal time.

// GET /api/dot/intro — the cached opener + one seed question (instant, DEMO_CACHE). audioUrl: FE speaks it.
app.get("/api/dot/intro", (c) => {
  console.log(`[pepl:seam] GET /api/dot/intro`);
  return c.json(introLine());
});

// POST /api/dot/turn — advance the conversation one Dot line: {transcript, reply:{text,audioUrl}, done}.
// `text` IS the browser STT transcript; wrapUp (the FE ~25s timer) drives done — never a hidden count.
const DotTurnReq = z.object({ userId: z.string(), text: z.string(), wrapUp: z.boolean().optional() });
app.post("/api/dot/turn", async (c) => {
  const body = DotTurnReq.parse(await c.req.json());
  console.log(`[pepl:seam] POST /api/dot/turn userId=${body.userId} wrapUp=${body.wrapUp ?? false} text=${body.text.length}c`);
  return c.json(await dotTurn(body));
});

// --- beat-3: the drawn card -------------------------------------------------------------------
// POST /api/card — persist the node avatar + card style ({ok}). The smiley survives the scrape's
// dossier delete+reinsert (own table) and grounds the Identity smiley bit at reveal.
const CardReq = z.object({
  userId: z.string(),
  smiley: z.string().min(1),
  smileyColors: z.unknown().optional(),
  cardGradient: z.unknown().optional(),
});
app.post("/api/card", async (c) => {
  const { userId, smiley, smileyColors, cardGradient } = CardReq.parse(await c.req.json());
  console.log(`[pepl:seam] POST /api/card userId=${userId} smiley=${smiley.length}b`);
  await saveCard(userId, { smiley, smileyColors, cardGradient });
  return c.json({ ok: true });
});

// --- beat-5: thematic connect-map -------------------------------------------------------------
// POST /api/connect-map — score how alike a set of users are AS PEOPLE (every distinct pair).
const ConnectMapBody = z.object({ userIds: z.array(z.string()).min(2) });
app.post("/api/connect-map", async (c) => {
  const { userIds } = ConnectMapBody.parse(await c.req.json());
  console.log(`[pepl:seam] POST /api/connect-map users=[${userIds.join(", ")}]`);
  return c.json(await connectMap(userIds));
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
