"use client";

// The ONE liveness hook (INTEGRATION.md law 2+3): one socket → one reducer → state.
// Connect on mount BEFORE any POST so no scrape event is missed. Render-only components read this
// state; they never open their own socket or hold pipeline state. Pattern: dot/sayhello useStoryRun.
import { useEffect, useReducer, useRef, useState } from "react";
import type { WsEvent } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL!;

export type NodeStatus = { state: "working" | "done"; ms: number | null };

export type RunState = {
  scrapePct: number;
  etaSec: number | null;
  nodes: Record<string, NodeStatus>;
  cardsReady: boolean;
  failed: { node: string; error: string } | null;
};

const INITIAL: RunState = {
  scrapePct: 0,
  etaSec: null,
  nodes: {},
  cardsReady: false,
  failed: null,
};

// WsEvent is the law (the backend discriminated union). One event → one state move.
function reduce(state: RunState, ev: WsEvent): RunState {
  switch (ev.type) {
    case "scrape_progress":
      return { ...state, scrapePct: ev.pct, etaSec: ev.etaSec };
    case "node_start":
      return {
        ...state,
        nodes: { ...state.nodes, [ev.node]: { state: "working", ms: null } },
      };
    case "node_done":
      return {
        ...state,
        nodes: { ...state.nodes, [ev.node]: { state: "done", ms: ev.ms } },
      };
    case "cards_ready":
      return { ...state, cardsReady: true };
    case "failed":
      return { ...state, failed: { node: ev.node, error: ev.error } };
  }
}

export function useRun(): RunState & { connected: boolean } {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Derive WS_URL here (in-effect, browser-only) — NOT at module scope — so prerendering
    // /onboarding never evaluates API.replace on an unset env. Liveness fails loud at connect
    // time (the network boundary), the same fail-loud pattern api.ts uses for fetch (law 3).
    const WS_URL = `${API.replace(/^http/, "ws")}/ws`;
    let live = true;
    let ws: WebSocket | null = null;

    const open = () => {
      if (!live) return;
      console.log(`[pepl:run] ws:connect ${WS_URL} (try=${retryRef.current})`);
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
        console.log(`[pepl:run] ws:open ${WS_URL}`);
      };
      ws.onmessage = (e) => {
        const ev = JSON.parse(String(e.data)) as WsEvent;
        console.log(`[pepl:run] ws:${ev.type} ${String(e.data)}`);
        dispatch(ev);
      };
      ws.onclose = () => {
        setConnected(false);
        if (!live) return;
        // Reconnect the liveness channel with capped backoff. The final PAYLOAD is rehydrated over
        // HTTP by the caller (reveal/getMap on cardsReady) — liveness=WS, data=HTTP (law 3).
        const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
        retryRef.current += 1;
        console.warn(
          `[pepl:run] ws:close — reconnect in ${delay}ms (try=${retryRef.current})`,
        );
        timerRef.current = setTimeout(open, delay);
      };
      ws.onerror = () => {
        console.error(`[pepl:run] ws:error ${WS_URL}`);
        ws?.close();
      };
    };

    open();

    return () => {
      live = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      ws?.close();
    };
  }, []);

  return { ...state, connected };
}
