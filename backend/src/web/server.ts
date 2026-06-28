import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { WSContext } from "hono/ws";
import { assertHeldOutCritic } from "../llm/client";
import { WsEvent } from "../types";

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

app.get("/health", (c) => c.json({ ok: true, service: "pepl-backend" }));

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
