"use client";

import { useCallback, useEffect, useRef, useState } from "react";
// The shapes are the law: import from the single source, never redefine.
// Type-only — erased at build, so no zod is pulled into the browser bundle.
import type { WsEvent } from "../../../../backend/src/types";

const API = process.env.NEXT_PUBLIC_API_URL;
const WS = API ? `${API.replace(/^http/, "ws")}/ws` : null;

type Method = "GET" | "POST";

/** One pipeline stage = one endpoint the real UI will later drop over. */
const STAGES: { id: string; method: Method; path: string; body?: string }[] = [
  { id: "run", method: "POST", path: "/run", body: "{}" },
  { id: "ingest", method: "POST", path: "/ingest", body: '{ "source": "precached" }' },
  { id: "graph", method: "GET", path: "/graph" },
  { id: "correct", method: "POST", path: "/correct", body: "{}" },
  { id: "generate", method: "POST", path: "/generate", body: "{}" },
  { id: "ask", method: "POST", path: "/ask", body: "{}" },
];

type Result =
  | { ok: true; status: number; data: unknown; ms: number }
  | { ok: false; status: number | null; error: string; ms: number };

function Stage({ id, method, path, body: initial }: (typeof STAGES)[number]) {
  const [body, setBody] = useState(initial ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const send = useCallback(async () => {
    if (!API) return;
    setBusy(true);
    const t0 = performance.now();
    // No try/catch into a canned value: any failure is surfaced to the UI and
    // logged LOUD. Empty/error responses render as-is — never hidden.
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        ...(method === "POST"
          ? { headers: { "Content-Type": "application/json" }, body }
          : {}),
      });
      const ms = Math.round(performance.now() - t0);
      const text = await res.text();
      const data: unknown = text ? JSON.parse(text) : null;
      const keys =
        data && typeof data === "object" ? Object.keys(data as object).length : 0;
      console.log(
        `[pepl:harness] ${method} ${path} -> ${res.status} keys=${keys} (${ms}ms)`,
      );
      if (!res.ok) {
        setResult({ ok: false, status: res.status, error: text, ms });
      } else {
        setResult({ ok: true, status: res.status, data, ms });
      }
    } catch (err) {
      const ms = Math.round(performance.now() - t0);
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[pepl:harness] ${method} ${path} -> FAIL ${error} (${ms}ms)`);
      setResult({ ok: false, status: null, error, ms });
    } finally {
      setBusy(false);
    }
  }, [method, path, body]);

  return (
    <section style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 8px", fontFamily: "monospace" }}>
        {method} {path}{" "}
        <span style={{ color: "#888", fontWeight: "normal" }}>({id})</span>
      </h2>
      {method === "POST" && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
        />
      )}
      <div style={{ margin: "8px 0" }}>
        <button onClick={send} disabled={busy || !API}>
          {busy ? "…" : `Send ${method} ${path}`}
        </button>
        {result && (
          <span style={{ marginLeft: 8, fontFamily: "monospace" }}>
            <Badge ok={result.ok} text={result.ok ? `${result.status}` : "FAIL"} />{" "}
            {result.ms}ms
          </span>
        )}
      </div>
      {result && (
        <pre
          style={{
            background: result.ok ? "#f4f4f4" : "#fff0f0",
            padding: 8,
            fontSize: 12,
            overflow: "auto",
            maxHeight: 280,
            margin: 0,
          }}
        >
          {result.ok
            ? JSON.stringify(result.data, null, 2)
            : `status=${result.status ?? "network"}\n${result.error}`}
        </pre>
      )}
    </section>
  );
}

function Badge({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      style={{
        background: ok ? "#0a7" : "#c33",
        color: "white",
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 12,
      }}
    >
      {text}
    </span>
  );
}

function WsPanel() {
  const [events, setEvents] = useState<WsEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!WS) {
      console.warn("[pepl:harness] ws skipped — NEXT_PUBLIC_API_URL unset");
      return;
    }
    const ws = new WebSocket(WS);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      console.log(`[pepl:harness] ws:open ${WS}`);
    };
    ws.onclose = () => {
      setConnected(false);
      console.warn(`[pepl:harness] ws:close ${WS}`);
    };
    ws.onmessage = (msg) => {
      // Render-only harness — no zod here; parse and surface the raw event.
      const ev = JSON.parse(String(msg.data)) as WsEvent;
      setEvents((prev) => [...prev, ev]);
      console.log(`[pepl:harness] ws:${ev.type} (n=${events.length + 1})`);
    };
    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failed = events.find((e) => e.type === "failed");
  const ready = events.some((e) => e.type === "cards_ready");
  const verdict = failed
    ? { ok: false, text: "FAIL" }
    : ready
      ? { ok: true, text: "PASS" }
      : { ok: connected, text: connected ? "WAITING" : "DISCONNECTED" };

  return (
    <section style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 8px", fontFamily: "monospace" }}>
        WS /ws <Badge ok={verdict.ok} text={verdict.text} />{" "}
        <span style={{ color: "#888", fontWeight: "normal" }}>
          ({events.length} events)
        </span>
      </h2>
      <ol style={{ fontFamily: "monospace", fontSize: 12, margin: 0, paddingLeft: 20 }}>
        {events.map((ev, i) => (
          <li key={i} style={{ color: ev.type === "failed" ? "#c33" : "#222" }}>
            <strong>{ev.type}</strong> {JSON.stringify(ev)}
          </li>
        ))}
      </ol>
      {events.length === 0 && (
        <p style={{ color: "#888", fontSize: 12 }}>
          {connected ? "connected — waiting for events…" : "not connected"}
        </p>
      )}
    </section>
  );
}

export default function HarnessPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>pepl endpoint harness</h1>
      <p style={{ fontFamily: "monospace", fontSize: 12 }}>
        API = {API ?? <em style={{ color: "#c33" }}>NEXT_PUBLIC_API_URL UNSET</em>}
      </p>
      {!API && (
        <p style={{ color: "#c33" }}>
          NEXT_PUBLIC_API_URL is not set — copy frontend/.env.local.example to
          frontend/.env.local. Buttons are disabled until it is set.
        </p>
      )}
      <WsPanel />
      {STAGES.map((s) => (
        <Stage key={s.id} {...s} />
      ))}
    </main>
  );
}
