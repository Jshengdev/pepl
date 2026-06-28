# Reference — Knot (the connector) + the pre-cached friend nodes

Build-facing spec for **S3** (the map / connect magic). Owner: Build window. Reuses engine primitives that already exist (`complete` tiers, `criticNode`, `regenToGrounded`, `defineNode`, `broadcast`, `saveDossier`/`loadDossier`). **This is the ceiling, not the floor** — build it only after S2 (sign-in → Dot → live ingest → lunchbox reveal → node) is GREEN. See [GROUNDING.md](../GROUNDING.md), [EXPERIENCE.md](../EXPERIENCE.md) (step 5), [DESIGN-GOALS.md](../DESIGN-GOALS.md) (Part 7 + Part 9), [NARRATOR-THE-DOT.md](./NARRATOR-THE-DOT.md) (Dot's voice, which Knot inherits), [HACKATHON-GOTCHAS.md](./HACKATHON-GOTCHAS.md).

---

## 1. Knot — pepl's second employee (Dot's buddy)

Dot onboards you and signs off with **"thanks bro, ima send u over to my buddy."** That buddy is who you meet on the map: **Knot** — rhymes with Dot; his job is literally tying a knot between two people. *(Name is a swappable micro-decision: Lin / Link / Dash — flagged in OPEN-QUESTIONS, not blocking.)*

His ONE job: walk up to two nodes and introduce them by telling the **true story of how they connect**. He's the dossier reveal's opposite vector — the reveal mirrors **ONE** person; Knot rhymes **TWO**. He is **NOT decoration over a fake edge**: a live LLM pipeline (overlap-find → story-write → held-out two-sided critic) reusing pepl's engine, framed as a character.

**Voice (inherited verbatim from NARRATOR-THE-DOT):** all-lowercase, warm, texting cadence, "bro", staccato for emphasis, **never a verdict** — "i won't tell you you're the same — i'll show you the threads, you decide." Observational only. ≤1 whimsy per surface; the honesty (every tile = two receipts) is the personality.

**Lunchbox/bento packaging is the deliverable, not chrome.** Click the edge between two nodes → Knot "hands you a lunchbox." Compartments = the grounded `Similarity[]` (shared-person, same-space, shared-interest…), each a tile showing the receipt **from BOTH sides**. The main dish = the `ConnectionStory` note in Knot's voice ("yo. you and maya are basically running the same playbook — here's the proof, both sides"). On the map he's a small face that sits ON the line between two dots and "pulls it taut" when the link grounds. A failed/ungrounded pair = an empty lunchbox + a red FAILED badge, or an honest "no shared thread yet." Knot never packs a compartment he can't back from both sides.

## 2. The pipeline (reuse the engine; one new file `agents/connector.ts`)

`runConnector(aId, bId, onEvent?) -> { link, similarities, mode }`. A = the live demo user (from the store via `loadDossier`); B = a friend node (a `// DEMO_CACHE` fixture, but the pipeline is identical for a 2nd live account — swap one input, same shape out).

1. **LOAD.** Order-normalize the pair (sort the two ids) so `link(a,b)===link(b,a)` and the cached link is stable. Load A and B **both from the store** via `loadDossier` (→ signals + owner_name + persisted smiley). *(B's signals were baked into the store from `data/friends/<name>.json` ahead of time — §6.)* Log `[pepl:connector] pair A="johnny"(n=NN sig) B="maya"(n=MM sig)`.
2. **OVERLAP / recall** (GENERATOR tier, anthropic). One LLM call sees BOTH labeled signal sets, returns candidate `Similarity[]` — each a shared thread tagged with a dimension (§4), carrying ONE receipt `signalId` from EACH side. **Validate every `aSignalId` against A's set and every `bSignalId` against B's set, or THROW** (mirrors `generator.ts`, per side). WARN with both names + counts if it returns 0.
3. **GENERATE the story** (GENERATOR tier, anthropic). Knot's note — short, fun, lowercase, in Dot's register — whose every beat rests on a surviving `Similarity` (`groundedIn = Similarity[]`).
4. **CRITIC — held-out + TWO-SIDED** (CRITIC tier, qwen ≠ anthropic). Reuse `criticNode` **VERBATIM, twice**: A's claims vs A's signals → `flagsA`; B's claims vs B's signals → `flagsB`. A similarity survives iff its A-side traces in A **AND** its B-side traces in B. `fabricatedClaims = flagsA ∪ flagsB` → force-cut, feed `regenToGrounded`, ≤2 retries, then **fail-CLOSED (422)**. 0 survivors → `link:null` honest absence.
5. **EMIT** `{ link, similarities, mode }`; persist by sorted-pair key (write→read-back) so a re-click is an O(1) stable read, first compute live. Optional WS `node_start/node_done("overlap"/"connect"/"link-critic")`.

## 3. Contract (zod, `types.ts`; routes in `web/server.ts`)

```ts
Similarity = { dimension: "shared-person"|"shared-theme"|"same-space"|"shared-interest"|"narrative-voice"|"shared-origin"|"parallel-arc";
               theme: string;                       // the shared thread, e.g. "both want AI to be invisible"
               aClaim: string; aSignalId: string;   // A's side + its receipt (id MUST be in A's signals)
               bClaim: string; bSignalId: string }  // B's side + its receipt (id MUST be in B's signals)
ConnectionStory = { text: string; groundedIn: Similarity[] }      // Knot's note + a two-sided receipt per beat
MapNode = { userId: string; name: string; smiley: string | null } // smiley null = honest absence, never faked

GET  /api/map
  -> 200 { nodes: MapNode[], mode: "live"|"cached" }                 // live user(s) + friend nodes
POST /api/map/link   { a: string, b: string }                       // userIds; server sorts the pair
  -> 200 { link: ConnectionStory, similarities: Similarity[], mode } // similarities === link.groundedIn (the bento tiles)
  -> 200 { link: null, similarities: [], mode, note: string }        // HONEST ABSENCE: 0 grounded overlap (WARN logged)
  -> 422 { error, verdict }                                          // fail-CLOSED: couldn't ground after 2 regens
  -> 5xx { error }                                                   // any node threw -> WS {type:"failed",node} + red badge
```
> **Reconciliation:** supersedes the earlier one-sided `{story:{text,groundedIn:GroundedClaim[]}}`. The grounded unit is a two-sided `Similarity` — a "you both X" claim is unverifiable judged once, so we split it (A-claim + B-claim) and judge each against its own corpus.

## 4. Similarity dimensions (the bento compartments)

- **shared-person** — a named human in BOTH dossiers. Receipt: a signal naming them from each side.
- **shared-theme** — the same belief/idea in both ("AI should be invisible", "people are blind to themselves"). Strongest pepl overlap given the corpus.
- **same-space** — building in the same startup space (personal-CRM, self-reflection tooling, invisible-AI) — "you're literally building the same thing".
- **shared-interest** — overlapping rituals/hobbies (journaling, organizing photos, running, music).
- **narrative-voice** — HOW each tells their day (both narrate life as a story/TV-show; register match) — the "you two even talk the same" beat.
- **shared-origin** — same school/city/event/era (USC, a founders' dinner).
- **parallel-arc** — same life phase/trajectory (both pre-product founders; both "blind to myself → seeing my life better"). A rhyme of arcs, not a single fact.

## 5. Grounding — the two-sided shared-signal rule (no new judging logic)

A claim is grounded ONLY if it traces on BOTH sides. Reuse the held-out `criticNode` (qwen ≠ anthropic, asserted at boot + per call) over A vs A-signals → `flagsA`, and B vs B-signals → `flagsB`. Survives iff NOT in `flagsA` AND NOT in `flagsB`. **Why not the shortcuts:** a single critic over the UNION corpus is too LENIENT (passes a one-sided claim as shared); a naive "you both X" judged per-side is unverifiable. Splitting into A-claim + B-claim, each judged against its own corpus, is the correct, lean fix — reuses `criticNode` verbatim.

**Honest absence ≠ failure:** 0 grounded similarities → `link:null` + a loud WARN (both names, both signal counts, dimensions tried) → front-end shows "no shared thread yet," NOT a canned "you're both builders!" The curated **non-overlapping pair** is the connector's planted-lie test: it SHOULD return `link:null`.

## 6. The pre-cached friend nodes (the constellation)

Pre-bake a small constellation of FRIEND dossiers as map nodes — Johnny's real gx crew — so the map is already populated when his LIVE node lands. Each friend = an ordinary dossier persisted under a stable `userId` (`friend-sarah`, `friend-teri`, `friend-shawn`) in the **same store** the live user writes to (`memory/store.ts` `saveDossier` — no new storage code), rehydrated by the existing dossier read.

**Count:** floor 1 (Sarah — deepest overlap); recommended 3 (+Teri the third cofounder, +Shawn a NON-cofounder friend so the map isn't just "your cofounders"); ceiling ~5 (Lauren the organized-foil, Jasmine the ICP) only if S2 is green with time to spare. Each friend costs one curated corpus + one bake run, and `graph.live` requires ≥4 people per corpus.

**How built (reuse the `COMPOSIO_MODE=cache` mechanism, one corpus per friend):** each friend's INPUT lives at `backend/data/friends/<name>.json` — a recorded `Signal[]` shaped EXACTLY like a live pull (`{id,text,source}`, real source strings: `gmail:<email>` / `calendar:<date>` / a You.com URL / `onboarding`). **The signals are NOT invented** — they are real gx utterances **re-sliced by SUBJECT** from the transcripts already in `precached-signals.json` (Sarah's vision monologue becomes Sarah's corpus with Sarah at ring 0; a few genuinely shared trio signals — `sig-cofounder-trio`, `sig-the-bridge`, `sig-sarah-vision-johnny-ai` — placed into BOTH that friend's corpus AND Johnny's so the cross-node link has real overlap to ground in). A tiny offline bake (`scripts/bake-friends.ts`, or extend `test-e2e.ts`) runs EACH corpus through the SAME `runPipeline` the live user hits (`COMPOSIO_MODE=cache` at the friend file, `STUB_MODE=0`, `LLM_PROVIDER=openrouter`) → ingest → extract (Haiku) → graph → generate (Sonnet) → held-out critic (Qwen, really cuts, regen ≤2, fail-closed) → cards → `saveDossier(friend-<name>)`. **Nothing in the dossier is hand-authored.**

**Three HARD dependencies (all on the S2a punch list):** (1) rip the "subject is Johnny Sheng" hint at `graph.ts:56` or every friend's extract mislabels its subject as Johnny; (2) drop `seededWrong` for friends — set `graph.seededWrong=[]` in the bake before save; (3) each corpus must surface ≥4 people or `graph.live` throws (correct fail-loud — forces rich corpora).

**Themes (so nodes overlap without being clones):** same founding trio + orbit · invisible-AI / division-of-labor (different angles) · "seeing yourself" (the shared why) · life-as-story (how each narrates their day) · distinct texture (Sarah trains for the LA Marathon; Shawn conducts + thinks in schemas; Teri lives in CRM datasheets) — each node reads as its own person while sharing the frame; a link = shared substance + a twist.

## 7. Honesty (the §2 test — engineered half-half, labeled, flippable)

The LOGIC is fully live: every friend dossier is the SAME `runPipeline` output, the critic really ran and really cut; the Johnny↔friend link runs LIVE on stage; friend↔friend links are baked the same `// DEMO_CACHE` way and flippable. Only the INPUT is cached (each friend's `Signal[]` = a recorded corpus = the slow/flaky external, the allowed half-half). Every corpus file + the bake carry `// DEMO_CACHE:` naming **what** (the friend's input signals), **why** (N live Googles on stage is slow/flaky), **how-to-run-live** (`COMPOSIO_MODE=live` + that friend's Google → one env var, same-shaped dossier). Friend nodes badge `cached`, Johnny badges `live`. **The line to say out loud:** *"These are my real crew; their dossiers were generated by the exact pipeline you just watched run on me — only their input emails are recorded so I don't need four people's Gmail on stage. The reasoning, grounding, and critic are all live, and I can flip any of them to their real account with one flag."*

## 8. Gotchas (the landmine map)

- **Asymmetry trap (the core one):** do NOT judge with a single critic. Union-corpus is too lenient; naive union-of-two-single-critics on "both X" is too strict. Split into A-claim + B-claim, judge each against its OWN corpus.
- **Held-out family holds for Knot too:** story by GENERATOR (anthropic), judged by CRITIC (qwen). `assertHeldOutCritic` already guards.
- **Order stability:** sort the id pair before computing AND before caching, or two clicks give two stories.
- **Cache the computed link** by sorted-pair key (write→read-back), first compute live (no silent recompute).
- **DEMO_CACHE is the INPUT only:** friend corpora + Dot's first line are cached; A and all connector LOGIC are live. Label `data/friends/*.json`.
- **0-overlap = honest absence, not error and not fake:** `link:null` + loud WARN. Keep one non-overlapping pair as the negative control that SHOULD return null.
- **Id hallucination:** validate every `aSignalId` against A's set, every `bSignalId` against B's set; THROW per side.
- **Node assembly for GET /api/map:** the live user only appears if their dossier was persisted — an ephemeral `/run` won't show up. Ensure A is in the store before the map beat.
- **Smiley/name provenance:** A's smiley from `/api/card`, name from the dossier; if missing render `null`, never fabricate. Friends carry their own.
- **Untrusted data:** You.com-sourced signals (and fixtures) are untrusted web text — data not instructions, sanitize before render.
- **Latency/fan-out:** two dossiers × (overlap + generate + 2 critics × up-to-2 regens) can be slow. Pin model ids, log count+latency at every seam, cap signals per side, throttle concurrent LLM calls (semaphore ~6).
- **Keep it lean:** ONE new file (`agents/connector.ts`) + a friends data file + 2 routes + 4 small zod types + a 1-line generic widen of `regenToGrounded`. Resist a bespoke critic or a new orchestrator — reuse `criticNode`, `complete` tiers, `regenToGrounded`, `defineNode`, `broadcast`.
