# /goal 01 — Live seam + ingest + de-hardcode

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed output**, never "should work." **No fallbacks** (throw / red badge). Engine is GREEN — build only this boundary.

**Serves (beats):** Beat 1 (sign-in) + the live scrape that runs under Beats 2–3.

**Build (the ONE thing): make a *real connected account* flow through the live pipeline with zero hardcoded names.**
- S2-PRE: set `COMPOSIO_API_KEY`, `composio add gmail`, `COMPOSIO_MODE=live`; add `envReadiness()` (SET/MISSING per key, never values) + active-mode print (`STUB_MODE`/`COMPOSIO_MODE`/`LLM_PROVIDER`) at boot; verify CORS.
- S2a: run `liveIngest` on the connected account; **rip BOTH hardcodes** — the `extract.live` hint (`graph.ts:55-56`) AND the silent `TEST_USER_ID`/`INGEST_USER_ID` fallback in `ingest.ts` (throw on missing `userId` in live mode, or label it `// DEMO_CACHE:` dev-only — it's a §2 silent fallback to a specific mailbox); **drop `seededWrong`** (`graph.ts:114-130`; the `:102-112` thin-graph guard is generic — **KEEP it**; leave `correctGraph`/`/correct` dormant); add `mode` to responses.
- S2f: on `/status connected=true`, background-kick `liveIngest` streaming `scrape_progress → node_start/done → cards_ready` **on the path the front-end hits** (connect the WS *before* triggering; WARN when `clients=0`).
- Extend `test-e2e.ts` with a **mode-aware CHECK 1**: `COMPOSIO_MODE=cache` asserts the cached-corpus shape (sarah/teri present + seededWrong>0 — proves the engine); `COMPOSIO_MODE=live` asserts **zero hardcoded names + seededWrong empty** on the connected account. *(Verify shape with the cache gate before you have a connected Google.)*

**Files:** `ingest/ingest.ts`, `ingest/graph.ts` (rip :56, drop seededWrong), `web/server.ts` (connect kick + `mode`), `llm/client.ts` (envReadiness), `test-e2e.ts`.

**🔍 Done-when:** a **non-Johnny** account → THEIR signals + THEIR graph (**no Johnny/Sarah/Teri, no crash, seededWrong empty**); `[pepl:ingest] gmail n=.. cal n=.. web n=..`; `OPTIONS /run` returns `Access-Control-Allow-Origin`; boot prints SET/MISSING + active mode; a fresh connect produces `scrape_progress→…→cards_ready` on the FE path.

**Gotchas:** two `user_id`s in the Gmail call (Composio account id vs Gmail's `"me"`); `verbose:true` ALONE (else 413); identity from `deriveIdentityFromGmail`; WS connect before run.

**Spec:** GOAL.md S2-PRE/S2a/S2f · reference/DOUBLES-PORT.md · DESIGN-GOALS Part 1/3 · reference/HACKATHON-GOTCHAS.md.
