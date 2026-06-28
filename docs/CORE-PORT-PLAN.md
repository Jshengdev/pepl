# pepl — Core Port Plan (from `doubles`)

Source: `/Users/johnnysheng/code/doubles` (~17,705 LOC in `src/`). We port the **semantic multi-agent loop + queryable memory** into pepl's `backend/`, rewritten **ponytail-style at roughly half the LOC**, repurposed from *impersonating you to others* → *understanding yourself*.

> **Hard rule for all ported code: NO migration / "ported from doubles" comments.** It must read as clean, original pepl code.

## What doubles gives us

The turn loop (semantic-only, fail-loud, no fallbacks):

```
turn → ORCHESTRATOR → Thinker (reads state, plans) → Talker (generates in user's voice)
                    → Critic (voice fidelity; regen on fail) → Recovery (semantic failure handling)
state in Postgres; recall via FAISS; delivery via Spectrum/iMessage
```

Core (≈1,828 LOC, production-ready): `src/agents/*` (Thinker → Talker → Critic → Recovery). Memory schema `src/memory/schema.ts`. LLM routing `src/llm/*` (OpenRouter, model tiers). Read those first.

## Repurpose map (doubles → pepl)

| doubles | pepl role |
|---|---|
| **Thinker** (reads state, plans the turn) | **Reasoner** — reads your relationship graph + memory, decides what to surface / which output to build |
| **Talker** (generates in *your* voice to others) | **Generator** — produces bio / story / answer in *your* voice, grounded in *your* context |
| **Critic** (voice fidelity) | **Critic = grounding + voice gate** — every claim traceable to ingested context (sayhello's judge), AND sounds like you |
| **Recovery** (semantic failure handling) | keep as-is |
| **shadow_entities ingestion** (doubles says *drop*) | **KEEP, minimal** — this is pepl's product: extract people + relationships → the visual graph |
| Spectrum / iMessage delivery | **DROP** — pepl delivers through the Next.js web frontend |
| personality archetypes/filters (1,711) · full scrapers (2,377) · heavy ingestion/synthesis (2,467) · evaluation framework (1,786) · wiki (623) · Composio (873) | **DROP / defer** |

> Divergence from the raw doubles read: the doubles explorer recommended dropping ingestion. For pepl the relationship-graph build is the demo's hero, so keep a **lightweight** extractor (one grounded LLM call → entities + relationships, in the spirit of `dot/packages/backend/src/extract.ts`). Heavy live scraping is **precached** (see Demo path).

## LOC budget

- doubles `src/`: ~17,705 LOC.
- pepl core target: **~4,000–6,000 LOC.** Collapse abstractions inline, merge single-use files, drop the layers above.

## Shrink strategy

- **Context assembler** 1,072 → ~80 LOC: collapse the 7 layers into one `buildContext()` that reads graph + recent interactions + relational_state.
- **Memory schema** 676 → ~150 LOC: 13 tables → **~4** (`people`, `interactions`, `signals`, `relational_state`). Start with an in-memory store (dot's `store.ts` Map pattern) for the demo; swap to Postgres when it needs to persist.
- **Voice** 162 + 1,711 → ~60 LOC: drop the personality system; inline the forbidden-phrase list + a short voice spec.
- **Web/API** 40 files → one Hono server (~150 LOC): `/ingest`, `/graph`, `/correct`, `/ask`, `/generate`, `/health` + a WS for streaming the graph build live.
- **Drop** Spectrum, scrapers, evaluation, wiki, Composio entirely.

## Proposed `backend/src/` layout

```
agents/
  types.ts              # shared agent I/O contracts (zod)
  reasoner.ts  reasoner-prompt.ts
  generator.ts generator-prompt.ts
  critic.ts    critic-prompt.ts     # grounding + voice; HELD-OUT model (≠ generator)
  recovery.ts  recovery-prompt.ts
ingest/
  extract.ts            # raw drop -> { people, relationships, signals }  (1 grounded LLM call)
  graph.ts              # build / update / "seed slightly wrong" the relationship graph
memory/
  schema.ts             # people, interactions, signals, relational_state
  store.ts              # in-memory Map for demo (Postgres adapter later)
orchestrator/
  index.ts              # the loop: ingest | ask | generate -> critic -> (regen|emit) -> recovery
llm/
  models.ts             # registry + held-out family assertion (generator != critic)
  client.ts             # provider call wrapper (OpenRouter)
web/
  server.ts             # Hono routes + WS live stream
logger.ts               # verbose seam logging (CLAUDE.md §4)
index.ts                # boot
```

Frontend (`frontend/`): graph view + correction UI, the generated-output surface (bio/story), and the "ask your life" chat — bound to the WS stream so nodes light up live.

## Dependencies (few, light)

`hono`, `@hono/node-server` (present), `zod`, `ws`, an LLM client (OpenRouter over `fetch`, or the `ai` SDK). DB: in-memory for the demo, `pg`/Neon later. Skip FAISS for MVP — if semantic recall is needed, embed + cosine over the in-memory store; add a real vector store only if v1 reveals the gap.

## Smallest E2E demo path

Live pipeline (no faked logic):
**ingest (precached blob) → extract → relationship graph (seeded slightly wrong) → render → user corrects → graph updates → Generator writes a bio grounded in the graph → Critic checks grounding + voice → emit.**

Engineered half-half (CLAUDE.md §2):
- `// DEMO_CACHE:` a **real** exported data blob for the demo user (contacts/emails/socials), so the demo doesn't wait on live OAuth scraping. The scraper genuinely works; we cache its *output* for one known user. Swap one flag → live scrape.
- Everything after ingestion (extract → graph → correct → generate → critic) runs **live**. That's the half that proves the idea.

## Risks / gotchas

- doubles is Postgres + FAISS + Spectrum heavy — resist porting that weight; start in-memory.
- "Slightly wrong on purpose" must be a **deliberate, controllable seed**, not a bug — make it a parameter of `graph.ts`.
- Critic must run on a **held-out model family** (≠ generator) or it grades its own homework (sayhello gotcha).
- Keep semantic-only + fail-loud in the user-facing loop; no silent fallbacks (doubles principle, pepl CLAUDE.md §2).
