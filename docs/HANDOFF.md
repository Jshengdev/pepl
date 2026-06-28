# pepl — HANDOFF to the Build window (FINAL)

This is the command to give the build/execution-loop window. The spec is **FINAL** — build it to done; deliver a **live end-to-end demo** Johnny can use immediately, with **multi-user connect** (anyone connects their own Google → a node in the DB → linkable). Front-end is **Johnny's** (his real FE is the source of truth) — build only the bare-minimum harness; every endpoint must match the documented contracts so his FE wires straight on.

---

## 1. The command (paste this to the build window)

```
You are the Build window for pepl (Pebble). This spec is FINAL — build it to DONE, do not
re-design or invent scope (flag any real gap in docs/OPEN-QUESTIONS.md, don't guess).

READ IN ORDER, hold every decision to the grounding:
  docs/GROUNDING.md → docs/GOAL.md → docs/goals/01..06 (run each as a /goal story) →
  docs/DESIGN-GOALS.md (per-page backend contracts) → docs/INTEGRATION.md (the wireable
  FE↔BE surface) → docs/reference/CONNECTOR-AND-FRIENDS.md → docs/VERIFICATION.md
  (trust the LIVE CODE over any stale row).

DELIVERABLE — a demo that works straight away, LIVE, on a REAL connected Google account:
  sign-in (Composio) → talking-face Dot (30s, one question + ≥1 follow-up) → live scrape
  (Composio Gmail+Calendar + You.com) → lunchbox Dossier reveal (5 cards × ~5 grounded bits,
  every bit a receipt) → you as a NODE on the map → Knot links two nodes with a grounded
  two-sided story. MULTI-USER: any other person connects THEIR Google and becomes a node in
  the DB you can link to. The ONLY cached thing is Dot's first voice line.

DONE = run + observed output on a REAL account (never "should work"):
  • a NON-Johnny Google connects → THEIR signals → THEIR grounded Dossier → THEIR node;
    zero hardcoded names; seededWrong empty; held-out critic emits; planted lie caught.
  • a SECOND account connects → a second node → POST /api/map/link grounds a two-sided story
    between them (or link:null on no real overlap — never a canned rhyme).
  • live gate green:  STUB_MODE=0 COMPOSIO_MODE=live LLM_PROVIDER=openrouter \
      npx tsx --env-file=.env src/test-e2e.ts   (make CHECK 1 mode-aware).
    cache gate green WITHOUT a connected account (COMPOSIO_MODE=cache).
  • public deploy URL serves the path.

FRONT-END: build ONLY a bare-minimum endpoint harness to exercise + verify the flow.
  Johnny's real front-end is the SOURCE OF TRUTH and drops onto the documented API
  (docs/INTEGRATION.md) — so every route's request/response/WS-event must match those
  contracts EXACTLY. Do not polish UI.

RULES (root CLAUDE.md): no silent fallbacks (throw or render a red FAILED badge; never a
  canned value or empty-to-hide-error); engineered half-half only (cached = Dot's first line
  + any pre-seeded friend INPUT, labeled // DEMO_CACHE:, same live pipeline produces it);
  held-out critic (anthropic generator ≠ qwen critic) at boot AND per call; verbose DEFAULT
  logs ([pepl:stage] did X n=.. ms; WARN-with-inputs on 0-result; print mode+envReadiness at
  boot); WIP=1; "done"=run+observed. The engine is ALREADY GREEN — build the BOUNDARY +
  EXPERIENCE, never rebuild it.

TIME-BOX (must finish for the demo): priority order 01→06.
  MUST-HAVE: 01 live-seam+ingest+de-hardcode · 02 You.com · 03 lunchbox reveal · 04 card+Dot
  · multi-user connect (each sign-in persists a node).  CEILING (do-if-time): 05 Knot + map
  links; a SECOND live connect is the real multi-user proof — pre-cached friends are only a
  seed/fallback if you can't get a 2nd account on stage.  LAST: 06 deploy.

UNLOCK for live: COMPOSIO_API_KEY is already set — run `composio add gmail` to connect an
  account (and a 2nd account for the multi-user link). Report status per story:
  wired / green / blocked.
```

---

## 2. The wireable API surface (what your front-end clicks → what the backend does)

Every clickable maps to one route. Shapes are in `backend/src/types.ts` (the law); full per-element binding in [INTEGRATION.md](./INTEGRATION.md).

| Click / action | Method · route | Request | Response | What's processed | WS fires |
|---|---|---|---|---|---|
| **Sign in** | `POST /api/connect/google/initiate` | `{userId, provider:"gmail"}` | `{connectionId, redirectUrl}` | start Composio OAuth (userId = the person's id) | — |
| **(poll status)** | `GET /api/connect/google/status?userId&provider=gmail` | — | `{connected, email?}` | on `connected` → background-kick `liveIngest` | `scrape_progress` begins |
| **Dot greets** | `GET /api/dot/intro` | — | `{text, audioUrl}` | cached first line (`// DEMO_CACHE:`), instant | — |
| **answer Dot** | `POST /api/dot/turn` | `{userId, audioRef\|text, wrapUp?}` | `{transcript, reply:{text,audioUrl}, done}` | Grok STT→witty reply→TTS; each turn → a `Signal` | — |
| **(scrape, bg)** | *(kicked on connect)* | — | — | Composio Gmail+Cal + You.com → `Signal[]` → graph → Dossier | `scrape_progress`, `node_start/done`, `cards_ready` |
| **save card** | `POST /api/card` | `{userId, smiley, smileyColors?, cardGradient?}` | `{ok}` | persist the node avatar + card style | — |
| **reveal** | `POST /reveal` | `{userId}` | `Dossier {cards, smiley, proof, mode}` | `buildDossier` (every bit grounded or `failed`) | *(ready on `cards_ready`)* |
| **the map** | `GET /api/map` | — | `{nodes: MapNode[], mode}` | list every persisted dossier (all connected people) | — |
| **link two nodes** | `POST /api/map/link` | `{a, b}` (userIds) | `{link: ConnectionStory, similarities[], mode}` · or `{link:null}` · or `422` | Knot: two-sided grounded story (held-out critic per side) | — |

**Liveness:** connect the WebSocket (`GET /ws`) on page mount **before** any POST; events stream the scrape/reveal live (`cards_ready` → fetch `/reveal`). Any node failure → WS `{type:"failed",node,error}` + a non-200 → render a red FAILED badge. Mode (`live`/`cached`) is in every payload.

## 3. Multi-user connect (the "add other people" requirement — explicit)

The whole flow is **per-userId**, so it's already multi-user — make it true end-to-end:
- Each person who signs in gets their **own `userId`** (the id bound to their Composio connection); their `liveIngest → buildDossier → saveDossier(userId)` persists **their** node in the store.
- `GET /api/map` lists **every** persisted dossier → everyone who's connected shows up as a node.
- `POST /api/map/link {a,b}` connects **any two** persisted nodes (live↔live or live↔seed).
- **Acceptance:** two different real Google accounts connect on stage → two real nodes → a grounded link between them. (Pre-cached friend nodes from story 05 are a *seed/fallback* so the map isn't empty before a 2nd person connects — not the primary path.)

## 4. Front-end (don't build it — make it wireable)

Build only the **bare-minimum harness** (buttons that hit the routes above + render raw responses + pass/fail), structured one section per stage. Johnny's real front-end is the **source of truth**; it will bind to the routes/shapes in this doc + `INTEGRATION.md`. Your job: **the contracts match exactly** so his FE drops on with zero backend changes. When he pulls his FE in, the mapping is: *what's clickable* = the routes above; *what data* = the `types.ts` shapes; *how it works* = the WS-driven liveness in `INTEGRATION.md`.

## 5. The one human unlock

`COMPOSIO_API_KEY` is set. Run `composio add gmail` to connect a Google account (and a second one for the multi-user link). Until then, the **cache gate** verifies shape on every step.
