# pepl — `/goal` stories (feed these to the build loop)

Each file is a self-contained `/goal` story for the execution-loop window. Run `/goal docs/goals/NN-name.md` (or read in order 01→06). Every story is grounded in [../GROUNDING.md](../GROUNDING.md) and gated on **run + observed output** (WIP = 1 — finish a story to green before the next). The master plan is [../GOAL.md](../GOAL.md); per-page contracts [../DESIGN-GOALS.md](../DESIGN-GOALS.md); FE↔BE wiring [../INTEGRATION.md](../INTEGRATION.md).

**The engine is already GREEN** (`STUB_MODE=1 tsx src/test-e2e.ts` → 6/6; live run emit-grounded, planted lie caught). These stories build the **BOUNDARY + EXPERIENCE** — they never rebuild the engine.

**The one human blocker for 01:** `COMPOSIO_API_KEY` in `backend/.env` + `composio add gmail` + `COMPOSIO_MODE=live`.

| # | Story | Serves |
|---|---|---|
| 01 | live seam + ingest + de-hardcode | sign-in + the live scrape |
| 02 | You.com footprint | the web receipts |
| 03 | the lunchbox reveal (Dossier) | the hero reveal |
| 04 | card persist + talking-face Dot | onboarding + make-your-card |
| 05 | friends + Knot (the map) | the connect magic |
| 06 | deploy + freeze | the public demo |

Gates (run after each story — make `test-e2e` CHECK 1 **mode-aware** as part of story 01):
- **Cache gate (verified now — needs no connected account):** `STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts` → CHECK 1 asserts the cached-corpus shape (sarah/teri present + seededWrong>0).
- **Live gate (after `composio add gmail`):** same with `COMPOSIO_MODE=live` → CHECK 1 asserts **zero hardcoded names + seededWrong empty** on the connected account.
