import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// Let the Next.js frontend (localhost:3000) call us in dev.
app.use("/*", cors());

// Verbose request log — every request emits one line with status + latency.
// This is the logging template the rest of the backend should follow (see CLAUDE.md §4).
app.use("/*", async (c, next) => {
  const start = performance.now();
  await next();
  const ms = (performance.now() - start).toFixed(1);
  console.log(`[pepl:backend] ${c.req.method} ${c.req.path} -> ${c.res.status} (${ms}ms)`);
});

app.get("/health", (c) => c.json({ ok: true, service: "pepl-backend" }));

app.get("/api/hello", (c) =>
  c.json({ message: "hello from the pepl backend", ts: new Date().toISOString() }),
);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[pepl:backend] listening on http://localhost:${info.port}`);
});
