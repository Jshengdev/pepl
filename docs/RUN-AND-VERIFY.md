# pepl — Run & Verify the wiring (for Johnny)

How to have the build window stand up the **live harness** so you can click through and verify every wire end-to-end. The bare-minimum harness IS the validation surface; your real front-end drops onto the same routes later. "Verified" = the wire works in the browser (run + observed), never "should work."

---

## 1. Run it (two terminals)

**Backend** → http://localhost:8787
```
cd backend && npm install
# CACHE mode — validate the engine + all wiring with NO Google needed (runs on the cached corpus):
COMPOSIO_MODE=cache STUB_MODE=0 LLM_PROVIDER=openrouter npm run dev
# LIVE mode — after `composio add gmail` (real Gmail):
COMPOSIO_MODE=live  STUB_MODE=0 LLM_PROVIDER=openrouter npm run dev
```
Boot should print `envReadiness` (SET/MISSING) + the active mode. `GET /health` → `{ok:true}`.

**Frontend (the harness)** → http://localhost:3000
```
cp frontend/.env.local.example frontend/.env.local     # set NEXT_PUBLIC_API_URL=http://localhost:8787
cd frontend && npm install && npm run dev
```
The endpoint harness is at **`/harness`** (the boilerplate `/` gets replaced by your FE). *(Next.js 16 — the build window reads `frontend/AGENTS.md` before touching FE code.)*

> **Validate without a Google account:** use **CACHE mode** — the whole pipeline runs on the cached gx corpus, so you can click through and confirm the wiring + shapes today. Switch to **LIVE mode** once you've run `composio add gmail` to prove it on real data.

## 2. Tell the build window (paste alongside the HANDOFF command)

```
Keep a RUNNABLE dev harness at :3000 the whole time — one section per endpoint (button →
raw response + PASS/FAIL) + a live WS log panel (scrape_progress / node_start/done /
cards_ready / failed). After EACH story (01..06): run both dev servers, exercise the new
route IN THE BROWSER, confirm the WS stream + a green test-e2e (cache gate always; live gate
once a Google is connected), and REPORT the local URL + exactly what you clicked + the
observed output. "Done" = the wire works in the browser, not "should work." Do NOT polish the
harness — Johnny's real FE replaces it; keep sections one-per-stage so his FE drops over the
same routes/shapes. If a wire breaks, fail LOUD (red FAILED panel), never blank.
```

This makes the build window itself open the live front end (the harness) and prove each wire as it lands — and gives you a URL to click.

## 3. Your click-through validation runbook (each wire → what to expect)

| In the harness, do | Expect (observed) | Verifies |
|---|---|---|
| `GET /health` | `{ok:true}` | backend up + CORS |
| **Connect** → `initiate` | a real Google **consent URL** opens | Composio OAuth wired |
| after consent → `status` (poll) | `{connected:true, email?}` → WS `scrape_progress` starts | sign-in = ingest kickoff |
| watch the **WS panel** | `scrape_progress → node_start/done(each stage) → cards_ready` | the live pipeline streams on the path the FE hits |
| `POST /ingest` | `{signals:[…], mode}` (live: real Gmail; cache: gx corpus) | ingest |
| `GET /graph` | people + edges — **on a real account, NO Johnny/Sarah/Teri**, `seededWrong` empty | de-hardcode (story 01) |
| `POST /reveal` | `Dossier` = 5 cards × ~5 **bits, each with a receipt**, `proof`, `mode` | the lunchbox reveal (story 03) |
| `GET /api/dot/intro` → `POST /api/dot/turn` | instant audio+question → `{transcript, reply, done}` | talking-face Dot (story 04) |
| `POST /api/card` → re-`/reveal` or `/api/map` | smiley persists + comes back | card persist (story 04) |
| `GET /api/map` | `{nodes:[…], mode}` — **every connected person** is a node | multi-user |
| `POST /api/map/link {a,b}` | `{link, similarities, mode}` (or `link:null`, or `422`) | Knot (story 05) |
| **break it** (bad input / kill a key) | a red **FAILED** panel with the error — never blank/canned | fail-loud (§2) |

**Multi-user check:** open the harness in a second browser/profile, connect a **different** Google → it appears as a second node in `/api/map` → `POST /api/map/link` between the two grounds a real story.

## 4. What's runnable now vs after each story

- **Now:** backend boots; `/health`, the engine (`/run /ingest /graph /generate /ask`), connect routes; the harness exercises them in **cache mode** (engine is GREEN). You can validate the *engine + connect* wiring today.
- **After story 01:** live ingest on a real account (no hardcoded names). **03:** `/reveal` Dossier. **04:** Dot voice + card persist. **05:** `/api/map` + Knot links. So you validate **incrementally, one story at a time** — each story ends with a clickable, verified wire.
