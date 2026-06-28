# Pebble — Backend MVP per page (build spec)

> **Status: v2 — 2026-06-28. Backend-first.** Johnny's call: don't over-design the front-end — build the **minimum backend** each page needs, and he drops in a front-end example per page that just calls it. So each part below pins the **endpoint(s) + request/response shape + engine work + done-when**; the front-end is **deferred** (one line per part). This unblocks the build window's S2 live-swap and dissolves "icon vs cards" — the backend returns grounded *content*; the front-end renders it however.

**The product (one line):** sign in once → Pebble reads your real world → it returns **a version of yourself** (story · stats · throughline), every claim traceable → you sharpen it by talking.

**Today's backend** (keep — it's real + source-agnostic): `POST /run` (full pipeline → `{graph, story, verdict, cards}`), `/ingest` `/graph` `/correct` `/generate` `/ask`, `GET /ws`, held-out critic + fail-closed. Shapes in `backend/src/types.ts`. What's **missing**: Composio sign-in/live ingest, the Dot voice endpoints, the reveal payload (Story/Stats/Throughline + receipts), and the de-hardcoding of `graph.ts:55-56 (the extract hint ONLY; the Sarah/Teri assert is already gone — keep the :102-112 generic guard)`.

> **Data-shape principle:** every page that shows a fact gets it with its **receipt** (`signalId` → the Signal, or a source URL). The front-end renders the receipt; the backend guarantees it exists (or the claim was cut). Mode (`live`/`cached`) is always in the response.

---

## Part 1 — Landing + Sign-in
- **Backend (MVP):** `POST /api/connect/google/initiate {userId, provider:"gmail"}` → `{connectionId, redirectUrl}` · `GET /api/connect/google/status?userId&provider=gmail` → `{connected:boolean, email?}`. On `connected`, kick live ingest in the background (WS `scrape_progress`).
- **Engine:** Composio managed OAuth (port `doubles/src/composio/connect.ts`); bind `userId` = Composio `user_id`.
- **Done-when:** hitting initiate returns a real Google consent URL; after consent, status flips `connected:true` with the account's email; the scrape has started. CORS verified.
- **Front-end (deferred):** one page, one "Sign in with Google" button.

## Part 2 — Onboarding scene: the talking face (Dot)
- **Backend (MVP):** `GET /api/dot/intro` → `{text, audioUrl}` — the **cached** opening + the ONE question (`// DEMO_CACHE:` prewarmed Grok TTS, instant) · `POST /api/dot/turn {userId, audioRef|text, wrapUp?}` → `{transcript, reply:{text, audioUrl}, done}` — Grok **STT returns the `transcript`** (shown live, gradient-fade), then a witty reply → TTS. It asks **≥1 follow-up** (`done:false`); when the front-end sends `wrapUp:true` (at ~25s) it replies *"timer's about to be up…"* + the sign-off *"thanks bro, ima send u over to my buddy"* with `done:true`. Every user turn persists as a `Signal` (`source:"onboarding"`).
- **Engine:** Grok STT/TTS on a **30-second** budget. ONE seed question — *"How do you spend your day? Doing anything today you normally do?"* — then **at least one follow-up** (answer → follow-up → answer), wrapping on the timer. Personality is light for v1 (talk · respond · follow up · respond · wrap). Runs **while** ingest streams underneath.
- **Done-when:** `/intro` returns instantly with audio + the question; an answer returns a witty spoken reply; **≥1 follow-up fires**; `wrapUp:true` returns the "timer's about to be up" line + buddy sign-off (`done:true`); each turn is a `source:"onboarding"` Signal; autoplay-block returns text.
- **Front-end (deferred, Johnny — mockup 2026-06-28):** the **talking face** (mouth-synced SVG) asks; you answer via a **mic button** (**≈30s** budget + a **live transcript that gradient-fades**); at **~25s** it sends `wrapUp:true`. Backend supplies `{text, audioUrl}` + `{transcript}`; mouth-sync, the timer, and the record UI are front-end.

## Part 3 — Live collection (the ingest swap)
- **Backend (MVP):** `POST /ingest {userId, source?}` → `{signals: Signal[], mode:"live"}` — pulls **Composio Gmail + Calendar** + **You.com** footprint (seeded by `deriveIdentityFromGmail`), via [DOUBLES-PORT.md](./reference/DOUBLES-PORT.md) §4. **THROWS if all sources empty** (never canned). Streams WS `scrape_progress` + `node_start/done`.
- **Engine:** ported Composio pulls + bidirectional closeness engine + You.com cited facts → `Signal[]` (each with a real `source`). **Remove the `graph.ts:55-56` extract hint (the Sarah/Teri assert is already gone; keep the :102-112 generic guard)** — identity is derived, works on any account.
- **Done-when:** a real connected account yields real `Signal[]` + a recognizable graph via `GET /graph`; zero hardcoded names; every signal has a real source.

## Part 4 — Make your card (one creative page: profile smiley + card background)
- **Backend (MVP):** `POST /api/card {userId, smiley, smileyColors?, cardGradient?}` → `{ok}` — persist the drawn **smiley** (svg/data-url) + its **colors** + the chosen **card-background gradient** as the user's **node avatar + card style** (returned in the reveal + on the map). Storage only — this page is creative + buys scrape time; the dossier is generated from the scrape (Parts 3/5).
- **Engine:** none (storage).
- **Done-when:** a posted smiley + colors + gradient persist and come back on the reveal/map as the node's look.
- **Front-end (deferred, Johnny — mockup 2026-06-28):** create-profile (draw smiley, pick colors from the 3 dots) → design-card-background (gradient height + color combos via the shape pickers).

## Part 5 — The reveal: your card → your node → all cards · THE HERO (the lunchbox/bento dossier)
- **Backend (MVP):** the **Dossier** payload (below) is ready when the scrape finishes (WS `cards_ready`); `POST /reveal {userId}` returns it — your dossier as a **lunchbox of 5 cards × ~5 grounded "bits" (compartments)**, every bit a receipt, ungrounded already cut. The Identity card's lid is your persisted `smiley` + colors + `cardGradient`.
- **Engine:** add `buildDossier()` / `dossierNode` AFTER `cardsNode` in `orchestrator/run.ts`, mapping `{graph, story, verdict, signals}` + persisted smiley → `DossierCard[]`. It REUSES existing outputs: `Story.text/groundedIn`→Story card; `RelationshipGraph`→People card's `theGraph` bit `value`; `CriticVerdict`→`claimsCut` + `receipts`; `cards.ts` oneLiner/mbti copy→Identity/Personality. This **replaces** the loose `WowCard`/`MbtiCard` reveal — they fold into bits.
- **Done-when:** every `ok` bit carries a `Grounding` receipt; `proof{peopleSurfaced,claimsCut}` + `mode:"live"` present; any unresolvable bit renders `status:"failed"` (red badge, never a canned string); `[pepl:dossier] cards=5 bits=25 failed=0 mode=live`.
- **Front-end (deferred, Johnny):** same page as Part 4 — on `cards_ready` it blurs the background, surfaces your Identity card (the lid), creates your node; clicking the node spreads all 5 cards; clicking a bit shows its receipt.

### The reveal payload — the bento dossier (mirror into `types.ts`)

```ts
// Every compartment ("bit") is GROUNDED or it FAILS loud (CLAUDE.md §2). A bit's grounding IS the receipt the UI renders.
// Supersedes GroundedFact/Stat and the loose Card union; Story + RelationshipGraph ride along as structured bit values.
Grounding = | { kind:"signal"; signalId: string }                                // ONE clickable receipt
            | { kind:"computed"; from: string[]; critic: boolean }              // aggregate over N; critic:true = survived the held-out critic; from:[] = honest absence (e.g. claimsCut)
            | { kind:"user"; source: "drawn"|"onboarding" }                     // the one human-made bit (the smiley)
Bit       = | { status:"ok"; label: string; value: string | Record<string,unknown>; grounding: Grounding }
            | { status:"failed"; label: string; triedSource: string }          // red FAILED badge, NEVER a fabricated value
DossierCard = { kind:"identity"|"story"|"stats"|"people"|"personality"; title: string; bits: Bit[] /* 3–6, ~5 */ }
Dossier   = { cards: DossierCard[]; smiley: string | null; proof:{ peopleSurfaced:number; claimsCut:number }; mode:"live"|"cached" }  // smiley null until /api/card (story 04) — degrade the Identity smiley bit to status:"failed", NEVER an empty-string default (that's a silent §2 fallback)
```
The 5 cards (~5 bits each, ~25 total): **Identity** (smiley·name·oneLiner·voiceSignature·definingFact) · **Story** (arc·throughline·origin·drivingBelief·receipts) · **Stats** (peopleSurfaced·closestPerson·claimsCut·signalsRead·mappedRelationships) · **People/Graph** (innerCircle·mentor·icp·theGraph·lateralEdge) · **Personality** (type·why·operatingMode·principle·growthEdge). LLM-synthesized bits (oneLiner, story arc, throughline, type/why) carry `kind:"computed", critic:true`; deterministic counts (all Stats) `critic:false`; the smiley `kind:"user"`. **Grounding is asserted, not trusted:** every `signalId` and every id in `computed.from` MUST be in the ingested signal set or `buildDossier` THROWS (mirrors `generator.ts`). `claimsCut` legitimately uses `computed.from:[]` — an HONEST absence (a cut claim has no surviving signal), logged, never faked.

## Part 6 — Correct-by-talking · **NOT in the v3 flow (engine kept)**
- v3's flow is onboarding → smiley → reveal → map; there's **no correction beat**. The engine capability stays (`correctGraph` + `/correct` are built), but no UI beat unless Johnny adds one.
- **⚠️ Open (Johnny):** with no correction step, should `graph.live` still **seed a wrong field** (`seededWrong`)? Right now it does — a deliberate wrong ring with nowhere to fix it would just be a visible error. **Default: stop seeding-wrong in v3** (drop the seed) unless you want the correction beat back.

## Part 7 — The map: nodes + Knot the connector (the bento link) · the connect magic (do-if-time)
- **Backend (MVP):** `GET /api/map -> { nodes: MapNode[], mode }` where `MapNode = { userId, name, smiley: string|null }` (live user from the store + `// DEMO_CACHE:` friend nodes) · `POST /api/map/link {a, b} -> { link: ConnectionStory, similarities: Similarity[], mode }` — **Knot** (Dot's buddy, the connector employee) generates a grounded connection STORY over BOTH dossiers, gated by the held-out critic run **PER SIDE**. `link:null` + WARN on honest 0-overlap; 422 fail-closed after ≤2 regens.
- **Engine:** `runConnector(aId,bId)` in `agents/connector.ts` — sort the pair (stable `link(a,b)===link(b,a)`), overlap-find (each `Similarity` cites ONE real `aSignalId` from A + ONE `bSignalId` from B or THROW), write the story, then reuse `criticNode` TWICE (A-claims vs A-signals, B-claims vs B-signals; survives iff grounded on BOTH), merged flags → `regenToGrounded`. Cache by sorted-pair key. **Full spec: `reference/CONNECTOR-AND-FRIENDS.md`.**
- **Done-when:** two+ nodes render (drawn smileys as avatars); a link's every beat traces to a SHARED signal on BOTH sides; an invented overlap is CUT; the curated non-overlapping pair returns `link:null`. **Build after 1–6 + Part 9 (friends) are green.**
- **Front-end (deferred, Johnny):** the node map; Knot sits ON the edge and "pulls it taut" when grounded; clicking the edge "hands you a lunchbox" — compartments = the `Similarity[]` tiles (receipt from BOTH sides), main dish = the `ConnectionStory` note.

```ts
Similarity = { dimension:"shared-person"|"shared-theme"|"same-space"|"shared-interest"|"narrative-voice"|"shared-origin"|"parallel-arc";
               theme: string; aClaim: string; aSignalId: string; bClaim: string; bSignalId: string }
ConnectionStory = { text: string; groundedIn: Similarity[] }   // similarities === link.groundedIn (the bento tiles)
```
> Supersedes the earlier `{story:{text,groundedIn:GroundedClaim[]}}` — the grounded unit is a two-sided `Similarity` (a "you both X" claim is unverifiable judged once; split A/B and judge each against its own corpus).

## Part 8 — Truth gate + fail-loud (cross-cutting, already real — keep)
- Held-out critic (different family, asserted at boot) gates every output; ungrounded = regen ≤2 → fail-closed; any node failure emits WS `failed` + a non-200; `mode` honest in every response.

## Part 9 — Friend nodes: the pre-cached constellation (Part 7's other dots) · do-if-time
- **Backend (MVP):** seed friend dossiers as ordinary store rows under stable userIds (`friend-sarah`, `friend-teri`, `friend-shawn`) via `saveDossier` — **no new storage code**; rehydrated by the existing dossier read; surfaced by `GET /api/map`.
- **Engine:** reuse the `COMPOSIO_MODE=cache` mechanism, ONE corpus per friend. Each friend's INPUT = `backend/data/friends/<name>.json`, a recorded `Signal[]` shaped EXACTLY like a live pull — **real gx utterances re-sliced by SUBJECT** from `precached-signals.json` (a few shared trio signals placed into BOTH the friend's corpus AND Johnny's so the cross-node link has real overlap). A bake script (`scripts/bake-friends.ts`) runs EACH corpus through the SAME `runPipeline` → `saveDossier(friend-<name>)`. **Nothing is hand-authored.**
- **Count:** floor 1 (Sarah), recommended 3 (+Teri +Shawn), ceiling ~5 — only if Parts 1–6 are green.
- **Hard deps (on the S2a punch list):** (1) rip the `graph.ts:56` Johnny hint or each friend mislabels its subject; (2) set `graph.seededWrong=[]` in the bake (no correction UI in v3); (3) each corpus must surface ≥4 people or `graph.live` throws (correct fail-loud).
- **Honesty:** engineered half-half — the LOGIC is fully live, only the INPUT is cached. Each corpus + the bake carry `// DEMO_CACHE:`. Friend nodes badge `cached`, Johnny `live`. **Full spec: `reference/CONNECTOR-AND-FRIENDS.md` §6–7.**
- **Done-when:** the map shows Johnny's live node + the friend node(s), each with a drawn smiley; a friend dossier rehydrates; the Johnny↔friend link grounds live.

---

## The reveal payload → **superseded by the bento `Dossier`** (Part 5)

The one shape to mirror into `types.ts` is the **bento `Dossier`** in Part 5 (`Grounding` / `Bit` / `DossierCard` / `Dossier`). The old `Reveal`/`GroundedFact`/`Stat` + the loose `WowCard`/`MbtiCard` deck **fold into `Bit` + `Grounding`**; `Story` and `RelationshipGraph` ride along as bit `value`s. The map link shape is the two-sided `Similarity` / `ConnectionStory` in Part 7.

> **Onboarding contract change:** the old `OnboardingAnswers {turningPoint, uniqueStrength, friendNote}` is replaced by **ONE** seed question (daily routine) + free back-and-forth → each user turn is a `Signal{source:"onboarding"}`. Relax/remove the 3-field struct.

## Build sequence → see [GOAL.md](./GOAL.md) + [goals/](./goals/) (single source of S-labels)
The canonical staged order + S-labels live in **GOAL.md** (S2-PRE → S2a live-ingest+de-hardcode → S2b You.com → S2c lunchbox reveal → S2d card persist → S2e Dot voice → S2f connect-kick → S3 friends+Knot → S4 deploy), one runnable story per file in [goals/](./goals/). Build to those labels; this doc no longer keeps a second numbering (it drifted).

**Blocker (Johnny):** drop `COMPOSIO_API_KEY` into `backend/.env` + connect your Google (`composio add gmail`), `COMPOSIO_MODE=live`. Everything else keyed + validated.
