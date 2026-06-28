# Pebble — Frontend ↔ Backend Integration (the wiring contract)

> **Status: v1 — 2026-06-28.** How the live backend wires into UI visual elements so the demo **just works**. Owner: Window 4. Front-end *visuals* are Johnny's per-page examples; this doc is the **seam** they drop onto. Pairs with [DESIGN-GOALS.md](./DESIGN-GOALS.md) (per-page backend contracts) + `backend/src/types.ts` (the shapes). Connector/friends bindings finalize from the backend-lock spec.

## The four integration laws (every element obeys these)

1. **One source of truth = the backend types.** The frontend imports `backend/src/types.ts` **type-only** (`import type { Reveal, WsEvent, … }`) — never redefines a shape. The zod schemas are the law; the UI renders only what they describe. *(The harness already does this.)*
2. **Render-only components, state from one place.** Components are dumb: they take data + render. All liveness flows through **one WS hook → one reducer → state**. No component fetches ad-hoc or holds pipeline state.
3. **Liveness is WS-driven; data is HTTP.** You **POST to start** a thing and **read the WS stream** to animate it live; the final payload comes back on the POST response (or a GET). Connect the WS **before** you trigger the run.
4. **Fail loud, never fake.** Loading = **blur-up** (never a spinner). Error = a visible **red FAILED badge** (never a canned value). Empty = an honest, labeled empty (never hidden). A **live/cached mode badge** is always visible. This is CLAUDE.md §2 at the UI layer.

## The wiring layer (3 pieces the frontend needs — build once, reuse everywhere)

```ts
// 1. SHARED TYPES — type-only import, zero runtime cost, never drift.
import type { Dossier, RelationshipGraph, Story, WsEvent, CriticVerdict } from "../../backend/src/types";

// 2. API CLIENT — one fetch wrapper. Surfaces failures LOUD; never returns a canned value.
const API = process.env.NEXT_PUBLIC_API_URL!;            // CORS already on the Hono side
async function call<T>(path: string, body?: unknown): Promise<T> {
  const t0 = performance.now();
  const res = await fetch(`${API}${path}`, body
    ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    : {});
  const ms = (performance.now() - t0).toFixed(0);
  if (!res.ok) {                                          // 4xx/5xx/422 → throw with the server message → red badge
    const err = await res.text();
    console.error(`[pepl:ui] ${path} -> ${res.status} (${ms}ms): ${err}`);
    throw new Error(`${path} failed (${res.status})`);
  }
  console.log(`[pepl:ui] ${path} -> 200 (${ms}ms)`);
  return res.json();
}

// 3. WS HOOK — one socket → one reducer → live UI state. Connect BEFORE triggering a run.
//    (Pattern from dot/sayhello useStoryRun: WS event → state; render-only components read state.)
function useRun() {
  const [state, dispatch] = useReducer(reduce, INITIAL);  // see the event→state map below
  useEffect(() => {
    const ws = new WebSocket(`${API.replace(/^http/, "ws")}/ws`);
    ws.onmessage = (e) => dispatch(JSON.parse(e.data) as WsEvent);   // WsEvent is the law
    ws.onclose = () => {/* reconnect or GET-rehydrate */};
    return () => ws.close();
  }, []);
  return state;
}
```

## The WS event → UI state map (the live spine)

`WsEvent` is a discriminated union in `types.ts`. Each event drives exactly one UI move:

| WS event | UI does |
|---|---|
| `scrape_progress {pct, etaSec}` | the **corner whisper** advances (`pebble is reading… {pct}%`) — runs *under* the talking face + card pages |
| `node_start {node}` | mark that stage "working" (a quiet pulse, not a spinner) |
| `node_done {node, ms}` | mark it done; optional `[node ✓ {ms}ms]` whisper |
| `cards_ready` | **the reveal fires:** `POST /reveal` → the `Dossier` → blur the background → card fills with the dossier → becomes the node |
| `failed {node, error}` | render the **red FAILED badge** (`role=alert`) with `node` + `error` — never swallow |

> Connect the socket on page mount (before any POST), and support a **GET-rehydrate** so a mid-run refresh recovers (gotcha: WS `clients=0` = silent dashboard). Emit a WARN server-side when broadcasting to zero clients.

## Per-page binding (UI element → endpoint / WS / data / states)

### Page 1 · Landing + Sign-in
- **Button "Sign in with Google"** → `POST /api/connect/google/initiate {userId, provider:"gmail"}` → `{redirectUrl}`; open it. On return, poll `GET /api/connect/google/status?userId&provider=gmail` until `{connected:true, email}`. On connect, the backend starts ingest → `scrape_progress` begins.
- **States:** idle → (OAuth) → connected. Error → red badge ("sign-in failed"). **No spinner** — a breathing glow.

### Page 2 · Talking face (30s)
- **Face mount** → `GET /api/dot/intro` → `{text, audioUrl}` (cached, instant). Play audio; **drive the mouth SVG from the audio amplitude** (front-end: WebAudio analyser → mouth-open state).
- **Mic button** → record → `POST /api/dot/turn {userId, audio}` → `{transcript, reply:{text,audioUrl}, done}`. Show `transcript` live (gradient-fade); play `reply.audioUrl` (mouth-sync); ≥1 follow-up loop.
- **Timer (30s)** → at **~25s** send `{wrapUp:true}` → the "timer's about to be up" + buddy sign-off (`done:true`) → advance.
- **Corner whisper** ← `scrape_progress` (the scrape runs under this whole page).
- **States:** autoplay-blocked → **show text, keep the face animating from text** (never silent). STT/TTS error → red badge + text fallback.

### Page 3 · Make your card
- **Smiley canvas + color dots + gradient picker** (all front-end) → on advance, `POST /api/card {userId, smiley, smileyColors, cardGradient}` → `{ok}`. Persists the node avatar + card style.
- **States:** local until POST; POST error → red badge ("couldn't save your card") + retry. Scrape still streaming under this page.

### Page 4 · The reveal (same page as 3 — blur transition)
- On `cards_ready` → `POST /reveal {userId}` → the `Dossier` → **blur the background, surface the card** populated with the dossier, **make it the node**. Click node → **all 5 cards spread** (the lunchbox, ~5 grounded bits each).
- **Each bit renders its receipt** (`signalId` → a tooltip/popover with the source text or URL). A bit with no receipt should not exist (critic cut it) — if one arrives empty, render the red badge, don't hide it.
- **States:** before `cards_ready` → the card is the back of page 3 (blurred-pending). Reveal = **blur-up**, staggered. Show the **mode badge** (live/cached) + the proof numbers (`peopleSurfaced`, `claimsCut`).

### Page 5 · The map (connector + friends)
- **Map mount** → `GET /api/map` → nodes `[{userId, name, smiley}]` (your live node + the pre-cached friend nodes).
- **A link between two nodes** → `POST /api/map/link {a, b}` → `{link: ConnectionStory, similarities: Similarity[], mode}` (Knot; `similarities === link.groundedIn`; `link:null` on honest 0-overlap; `422` fail-closed). Render `link.text` on the edge/click; each `similarities` tile carries its receipt **from both sides** (`aSignalId` + `bSignalId`).
- **States:** one node (you) before friends load → honest "you're the first here" (not an error). Link with no grounded overlap → say so honestly, don't invent.

## States every element must handle (the contract)

| State | UI | Never |
|---|---|---|
| **Loading** | blur-up / breathing glow / live transcript | ❌ a spinner |
| **Streaming** | WS-driven incremental reveal | ❌ wait-for-all-then-dump |
| **Empty** | honest, labeled ("nothing here yet") | ❌ a fake placeholder |
| **Error** | red **FAILED** badge (`node` + `error`, `role=alert`) | ❌ a canned value / swallowed catch |
| **Mode** | a visible `live` / `cached` badge | ❌ letting cached masquerade as live |

## "It just works" checklist (run before you call any page done)

- [ ] `NEXT_PUBLIC_API_URL` set; **CORS** verified (OPTIONS returns `Access-Control-Allow-Origin`).
- [ ] Frontend imports `backend/src/types.ts` **type-only** — no redefined shapes (compiler catches drift).
- [ ] WS connects **on mount, before** any POST; mid-run refresh **GET-rehydrates**; server WARNs on `clients=0`.
- [ ] Every fetch path **throws → red badge** on non-200; **zero** inline mock arrays in shipping code (dev mocks behind `MOCK_*`).
- [ ] **No spinners** anywhere — blur-up only; **reduced-motion guard** ships (`prefers-reduced-motion` → clamp to 0.01ms, count-ups jump to final).
- [ ] The **mode badge** (live/cached) is visible on the reveal + map.
- [ ] Run the **whole path on a real connected account that isn't Johnny's** — sign-in → 30s face → card → reveal → map — and watch each beat land.

## Polish pass (after it works — the feel)
The reveal **blur transition** (background blur + card blur-up in, staggered ~700ms per group); the **mouth-sync** smoothness (amplitude → 2–3 mouth states, the one signature ease); the **30s timer** pacing + the ~25s wrap; the corner-whisper cadence; the **node-pop** when you land on the map; confetti **only** on a human's meaningful action (never page load). One whimsy per surface; never on a money/gate moment.
