# Backend Engine & Build-Loop — Gotchas & Build Runbook

## 0. What this window owned

The **engine + the autonomous build loop**: the whole pipeline from raw signal to grounded output, and the staged workflows (S0→S4) that built it. The slice this window had to make true:

> **real signals in → a grounded dossier out, with ZERO fabricated people/facts, enforced by a held-out critic** — and prove it with a CLI gate that exits 0.

Concretely built: `backend/src/types.ts` (the zod CONTRACTS), the one LLM call site (`llm/client.ts`), the `defineNode` stub/live wrapper, the pipeline (`ingest → extract → graph → generate → critic → cards`), the `orchestrator/run.ts` turn loop + WS stream, the **held-out grounding critic** (`agents/critic.ts`), the **live ingest port** (Composio Gmail/Calendar + You.com footprint + the bidirectional closeness engine), the **InsForge Postgres dossier store** (`memory/store.ts`), the **bento Dossier** (`agents/dossier.ts`), the **two-sided Knot connector** (`agents/connector.ts`), and the **Dot/Grok voice route** (`/api/tts`). Built across ~7 ultracode workflows, each gated on `run + observed output`.

**Commit trail:** `cecdd59` S2 green · `339edc3` live ingest · `dad2b6a` S3 InsForge store · `ff7a8cd` boundary (Dossier/Knot) · `9d1e48b` FE wiring · `146f3db` Grok voice.

---

## 1. The high-ROI decisions (and WHY)

1. **Lock the shape before the content — CONTRACTS (zod) are THE law.** Every node states its input/output as a zod schema in `types.ts`; agents import, never redefine. This is what let **parallel workflow agents build nodes independently** (ingest, extract, generate, critic, cards each written concurrently by a different agent) and have them compose on first integration. Autonomy scaled *because* degrees of freedom were restricted. Alternative (build nodes ad-hoc, reconcile later) = silent shape drift; rejected.

2. **The held-out critic is a different model FAMILY, asserted at boot AND per call.** Generator = `anthropic/claude-sonnet-4.6`; critic = `qwen/qwen3-235b-a22b-2507`. Same-family judging = confident hallucination (the model rubber-stamps its own work). The assertion (`assertHeldOutCritic()`) compares the slug prefix before `/` and **throws** if they match. Proven not by faith but by a **negative control** (gotcha G6).

3. **One LLM call site (`llm/client.ts`) — provider swappable in one file.** `complete({tier, system, prompt, json?, temperature?})` is the *only* place a model is called. Provider chosen by `LLM_PROVIDER`. This made "OpenRouter now, InsForge gateway later" a one-env change, not a refactor (G7). **Verified the slugs live before fanning out agents** so 5 parallel agents never had to touch the shared client.

4. **`defineNode` stub/live polarity → prove the pipe before the intelligence.** Each node defines a `stub` (canned, contract-shaped) and a `live` executor; `STUB_MODE` picks. S1 proved all 6 nodes compose end-to-end on stubs (15 WS events, `exit 0`) *before* any LLM call. S2 swapped stub→live node-by-node. De-risks the whole build: wiring bugs surface on free, instant stubs.

5. **Source-agnostic contracts → the data source is one swappable node.** Going from a precached corpus to live Gmail changed **only `ingest/ingest.ts`** — `extract → graph → generate → critic → cards → store` were untouched and stayed green. The `Signal{id,text,source}` shape is the universal joint.

6. **Engineered half-half done right (CLAUDE §2): cache the slow INPUT, run the LOGIC live.** The Gmail scrape (slow/flaky external) is the only cached thing; extract→graph→generate→critic runs live on it. The test: *flip `COMPOSIO_MODE=live` and watch the same pipeline produce it.* Real, not faked.

7. **Grok has real voice; the browser's Web Speech API doesn't survive Chromium forks.** The "voice doesn't work on Dia" rabbit hole resolved to: `webkitSpeechRecognition` needs Google's speech backend that Dia/Arc/Brave don't ship, while **xAI exposes real TTS (`/v1/tts`, voice `eve`) and a realtime socket** — used via a server route, plays anywhere (G9).

---

## 2. How it was built — step by step

> Every stage gates on a **run command + observed output** — never "should work." `test-e2e.ts` is the binary gate.

1. **S0 — scaffold + the law.** Wrote `types.ts` (every zod shape from `docs/CONTRACTS.md`), `llm/client.ts` (registry + held-out assert + `complete()`), `nodes/defineNode.ts` (zod-in/zod-out + seam log + stub/live), `web/server.ts` (Hono + `@hono/node-ws`).
   → **verify:** `cd backend && npm run typecheck` exits 0; boot logs `[pepl:llm] held-out assert -> generator=anthropic/claude-sonnet-4.6 (anthropic) != critic=qwen/qwen3-235b-a22b-2507 (qwen) -> ok` + `listening on http://localhost:8787`.

2. **S1 — prove the pipe on STUBS.** All 6 nodes return canned, contract-shaped data; orchestrator streams a `WsEvent` per node.
   → **verify:** `npx tsx src/test-e2e.ts` → `✅ S1 GATE GREEN — 6/6 checks · 6 signals → 3 people → 4 grounded claims → emit → 5 cards · 15 ws events` + `EXIT_CODE=0`.

3. **S2 — wire live, node by node, on the REAL corpus.** Swapped each `stub` for a `live` executor calling `complete()`. Critic became the held-out judge.
   → **verify:** `STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts` → `✅ S2 GATE GREEN (LIVE) — 39 signals → 6 people → 14 grounded claims → emit (grounding 1.0, voice 0.9) → 5 cards · negative-control caught the lie`.

4. **Live ingest port (Composio + You.com).** Ported `doubles`' engine onto the contracts: `ingest/composio/{client,v3-execute,gmail,calendar,connect}.ts` (v3 REST + tree-walk + retry), `ingest/extractors/{gmail,sender-classifier,calendar}.ts` (bidirectional closeness → `Person{closeness,ring}` + radial `Edge`), `ingest/footprint.ts` (You.com), `ingest/signalize.ts`.
   → **verify (live, real Gmail):** `STUB_MODE=0 COMPOSIO_MODE=live npx tsx --env-file=.env scripts/run-live.ts johnny` → derived owner `Johnny Sheng <johnnysheng222@gmail.com>`, real people + rings, `verdict=emit`, persisted.

5. **S3 — InsForge Postgres dossier store.** Schema via `insforge-cli` migration; `memory/store.ts` `saveDossier`/`loadDossier` (write-through REPLACE per `user_id`).
   → **verify:** save→load round-trip deep-matches (`signals=39 people=6 edges=8 stories=1 cards=5`); re-save = no dup rows.

6. **The boundary — bento Dossier + Knot.** `agents/dossier.ts buildDossier()` → 5 `DossierCard`s × ~5 grounded `Bit`s (every bit a receipt or `status:"failed"`). `agents/connector.ts` → two-sided `Similarity` (one `aSignalId` from A + one `bSignalId` from B), critic run **per side**.
   → **verify (via live HTTP routes):** `POST /reveal {userId:"johnny"}` → `cards=5 bits=25 failed=0 mode=live proof={peopleSurfaced:6,claimsCut:0}`; `POST /api/map/link {a:"johnny",b:"<teri>"}` → grounded `ConnectionStory` + N similarities.

7. **Dot voice — real Grok TTS.** `frontend/src/app/api/tts/route.ts` proxies `https://api.x.ai/v1/tts` (`voice_id:"eve"`); `lib/pepl/voice.ts speak()` plays the blob.
   → **verify:** `curl -X POST $FE/api/tts -d '{"text":"hi"}' -w '%{http_code} %{content_type}'` → `200 audio/mpeg` (24 kHz mp3).

---

## 3. Gotcha catalog (the meat)

### G1 — You.com: every endpoint guess 403'd until the host lost its `api.` prefix
- **Symptom:** `GET https://api.ydc-index.io/search` → `403 {"message":"Forbidden"}`; `…/v1/research` → `403 Missing Authentication Token`; `chat-api.you.com/smart` → `401`.
- **Root cause:** wrong host. The Search API is **`https://ydc-index.io/v1/search`** (no `api.` prefix), header `X-API-Key`. The footprint agent's live-working endpoint is **`https://api.you.com/v1/research`** (`{input, research_effort}`, `X-API-Key`) — a *different* You.com product (agentic research → cited markdown). Both are valid; the index `api.ydc-index.io` is the dead one.
- **Fix (verbatim, what footprint.ts ships):** `POST https://api.you.com/v1/research` with `{ "input": "<query>", "research_effort": "lite" }`, header `X-API-Key: $YDC_API_KEY`; split `output.content` into one `Signal` per cited sentence, `source = output.sources[n].url`.
- **Verify:** `export $(grep '^YDC_API_KEY=' backend/.env|xargs); curl -s "https://ydc-index.io/v1/search?query=Johnny+Sheng+USC&count=3" -H "X-API-Key: $YDC_API_KEY" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['results']['web']))"` → ≥1.

### G2 — Raw Gmail graph is ALL brands (the sender-classifier is load-bearing, not optional)
- **Symptom:** a deterministic peek of the inner circle returned `ring1 Urban Outfitters · UNIQLO · SHEIN · ring2 Newegg · Big 5 · ring3 Frontier Airlines · Quora · Reddit` — zero humans.
- **Root cause:** closeness alone (`(inbound+outbound)·(bidirectional?2:1)·exp(-days/30)`) ranks high-volume marketing senders above real humans on a consumer inbox; the peek skipped the classifier.
- **Fix:** `extractors/sender-classifier.ts` — two-stage: a deterministic prefilter (automated localparts `support|notify|noreply|no-reply|team|hello|updates|via` + the "display-name appears in the email domain" brand tell + `X on Facebook`/`from <service>` patterns) → one batched LLM call for the ambiguous rest; **keep-all + loud WARN** only if the LLM call fails (never silently drop).
- **Verify:** live run logs `senders=84 autoDropped=19 brandDropped=8 notifDropped=4 humans=5`; the resulting `graph.people` contain real names (Sarah, Teri, Mark…), no brands.

### G3 — The owner showed up TWICE (ring 0 AND ring 1)
- **Symptom:** `/api/map`/graph had `ring0 Johnny Sheng` *and* `ring1 Johnny Sheng`.
- **Root cause:** the LLM `extractNode` emits its own "subject" person node, which is a different object than the radial ring-0 owner derived from `deriveIdentityFromGmail` → two nodes for one person.
- **Fix:** merge by normalized identity (`entityHash` on name+email, `extractors/extract-helpers.ts`) in the merge path; the owner appears once at ring 0. Merge log: `merge radial(people=6,edges=5) + lateral(people=1,edges=0) -> people=6 edges=5 merged=1 selfDropped=0`.
- **Verify:** live `scripts/run-live.ts johnny` → the people list has exactly one ring-0 node and no duplicate name.

### G4 — Live run took ~5 min; capping to 90d made it ~80s but dropped the cofounders
- **Symptom:** `[pepl:run] done … (293788ms)` — a ~5-minute reveal (the 180d Gmail pull dominates: `1000 emails → 117 senders`).
- **Root cause:** Gmail pagination over 180 days is the long pole; the scrape, not the LLM, is the latency.
- **Fix:** cap `pullGmailMessages` to **~90d / maxPages**, → live run ~**80s**. **Tradeoff captured:** 90d on a *consumer* inbox (`johnnysheng222`) drops Sarah/Teri (correspondence >90d), so the recognizable-cofounder payoff was moved to the **map** (they're separate persisted nodes) rather than the inbox graph. (`// pepl:` note on the cap explains the upgrade path: real backend ETA + a wider window when latency budget allows.)
- **Verify:** `time (STUB_MODE=0 COMPOSIO_MODE=live npx tsx --env-file=.env scripts/run-live.ts johnny)` → ~80s, `verdict=emit`.

### G5 — The held-out critic's regen loop must have two anti-loop defenses or it never converges
- **Symptom (the failure mode this prevents):** the judge flags a "fabricated" claim that's actually grounded → regen → judge re-flags → infinite loop / false-positive cut.
- **Root cause:** an LLM judge (a) invents `fabricatedClaims` substrings that aren't in the output, and (b) flags paraphrases of grounded facts.
- **Fix (verbatim, `agents/critic.ts`, ported from sayhello):**
  1. **Phantom-claim:** every `fabricatedClaim` must be an **exact substring of `output.text`** — drop any that aren't.
  2. **Mechanical-trace overrule:** for each surviving flag, if its substance is in the corpus (full containment **OR** all numeric tokens present **OR** ≥80% word overlap with some signal), **drop the flag loudly**.
  Real fabrications (invented people, fake facts) fail all three checks and survive. `verdict="emit"` iff `fabricatedClaims` empty AND both axes ≥0.7, else `regen` (force-cut the flagged claims, regenerate, ≤2 retries, then **fail-closed/throw** — never ship ungrounded).
- **Verify:** the negative control (G6).

### G6 — Proving the critic is REAL (the negative control)
- **Symptom / question:** "is the grounding real or is the judge rubber-stamping?"
- **Fix (the proof, baked into `test-e2e.ts`):** take the emitted grounded story, **inject a fabricated sentence** — `"Johnny's sister Maria flew in from Lisbon for the housewarming."` — and re-judge.
- **Verify:** the held-out critic returns `verdict=regen` with `fabricatedClaims=["Johnny's sister Maria flew in from Lisbon for the housewarming"]`. Gate asserts `caughtMaria=true`. If the critic emits the lie, the gate FAILS. (This is the single most demo-credible check: it shows the truth gate has teeth.)

### G7 — "InsForge model gateway" is just OpenRouter with their key (don't build a new integration)
- **Symptom:** unclear how to route models "through InsForge" for the prize without a new provider.
- **Root cause:** InsForge's AI gateway **is** OpenRouter — `npx @insforge/cli ai setup` fetches a project `OPENROUTER_API_KEY=sk-or-v1-…`. The provisioned key (`INSFORGE_OPENROUTER_API_KEY`, an `sk-or-v1` key) hits `https://openrouter.ai/api/v1` directly.
- **Fix:** `llm/client.ts resolveKey()` prefers `INSFORGE_OPENROUTER_API_KEY ?? OPENROUTER_API_KEY` for the `openrouter` provider — held-out family logic unchanged; only *who bills* differs. One-env flip, no new code path.
- **Verify:** `export $(grep '^INSFORGE_OPENROUTER_API_KEY=' backend/.env|xargs); curl -s https://openrouter.ai/api/v1/chat/completions -H "Authorization: Bearer $INSFORGE_OPENROUTER_API_KEY" -H 'Content-Type: application/json' -d '{"model":"anthropic/claude-haiku-4.5","max_tokens":5,"messages":[{"role":"user","content":"reply ok"}]}'` → `ok`. Boot log: `[pepl:llm] gateway key for "openrouter" -> INSFORGE_OPENROUTER_API_KEY (InsForge gateway) (present)`.

### G8 — Composio: two `user_id`s, `verbose:true` ALONE, and UUID accounts
- **Symptom:** `ActionExecute_ConnectedAccountNotFound`; or `HTTP 413` on the Gmail pull; or "which of the 10 connected accounts is mine?"
- **Root cause:** (a) the v3 body `user_id` = the **Composio account id**; the action arg `user_id:"me"` = Gmail's mailbox param — conflating them fails. (b) `verbose:true` + `include_payload:true` blows the ~6MB v3 cap → 413. (c) accounts are keyed by opaque UUID, not email.
- **Fix:** v3 `POST https://backend.composio.dev/api/v3/tools/execute/<ACTION>` with body `{user_id:"<account-uuid>", arguments:{user_id:"me", …}}`; Gmail uses `verbose:true` **alone**; loop `nextPageToken`. Map UUID→email with `GMAIL_GET_PROFILE` → `data.response_data.emailAddress`.
- **Verify:** `curl -s https://backend.composio.dev/api/v3/connected_accounts -H "x-api-key: $COMPOSIO_API_KEY"` lists ACTIVE gmail accounts; per account `GMAIL_GET_PROFILE` returns the owner email.

### G9 — Voice dead on Dia: it's the browser, and the real fix is Grok TTS (not Web Speech)
- **Symptom:** on Dia, the mic records nothing and Dot never speaks; the backend `/api/dot/turn` returns a real reply with `audioUrl:null`.
- **Root cause:** the FE used the browser **`webkitSpeechRecognition`** (Chrome/Edge-backed by Google's speech servers) — Chromium *forks* (Dia/Arc/Brave) don't ship that backend, so recognition silently errors; and the intro was never spoken. Grok/xAI's **chat** API has no audio (`audioUrl` always null).
- **Fix:** xAI **does** have voice. Real Grok TTS: `POST https://api.x.ai/v1/tts` `{text, voice_id:"eve", language:"en"}` → `audio/mpeg`; played with `new Audio(blobUrl)` — works in any browser. (Full duplex is `wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.1`, voice `eve`, `getUserMedia` not `webkitSpeechRecognition` — so it also works on Dia. The dot project's pattern: a server `/api/tts` route + a cached-by-text `speak()` hook.)
- **Verify:** `curl -s -X POST $FE/api/tts -H 'Content-Type: application/json' -d '{"text":"hey, this is dot"}' -w '\n%{http_code} %{content_type}'` → `200 audio/mpeg`; `file` on the body → `MPEG ADTS, layer III, 24 kHz`.

### G10 — Parallel workflow agents on disjoint files; shared files get a single writer
- **Symptom (the trap avoided):** N agents editing `types.ts`/`server.ts`/`llm/client.ts` concurrently → torn writes, lost edits.
- **Root cause:** a Workflow fans out concurrent subagents in **one working tree**; two agents writing the same file race.
- **Fix:** phase the workflow — a **single foundation agent** writes the shared files (`types.ts`, `client.ts`, `defineNode.ts`, the `server.ts` skeleton) first; the **fan-out** agents each own **one disjoint node file**; a **single wire agent** adds all routes to `server.ts` last. Pre-verify anything shared (slugs, endpoints) *yourself* before fanning out so no agent needs to touch the shared file.
- **Verify:** after each workflow, `cd backend && npm run typecheck` clean + `git status --short` shows only the expected disjoint files.

### G11 — `tsx -e` can't run inline checks with top-level await
- **Symptom:** `Top-level await is currently not supported with the "cjs" output format`.
- **Root cause:** `npx tsx -e '<await …>'` compiles as CJS.
- **Fix:** write a `.ts` **script file** under `backend/scripts/` and run `npx tsx --env-file=.env scripts/<x>.ts` (ESM, top-level await works). `scripts/run-live.ts` is the template all the verify/seed scripts follow.

### G12 — LLM JSON wrapped in a markdown fence even with `response_format: json_object`
- **Symptom:** `Unexpected token '`', "```json …`.
- **Root cause:** the model sometimes fences the JSON despite `json_object` mode.
- **Fix:** extract the object before parsing — `const m = raw.match(/\{[\s\S]*\}/); if (!m) throw new Error("no JSON"); JSON.parse(m[0])` (throw on no match — never silently default; that's a §2 violation).
- **Verify:** extract/generate/critic nodes parse + emit on the live corpus (S2 gate green).

---

## 4. Verbatim commands & scripts worth saving

**The CLI gates (the binary stage checks):**
```bash
cd backend
# cache gate — proves shape on the recorded corpus, NO connected account needed:
STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts ; echo "exit=$?"
# stub gate (instant, no LLM): STUB_MODE=1 npx tsx src/test-e2e.ts
```

**Verify the held-out slugs are live BEFORE fanning out agents:**
```bash
export $(grep '^OPENROUTER_API_KEY=' backend/.env | xargs)
curl -s https://openrouter.ai/api/v1/models -H "Authorization: Bearer $OPENROUTER_API_KEY" \
 | python3 -c "import sys,json;ids={m['id'] for m in json.load(sys.stdin)['data']}; \
[print(s, s in ids) for s in ['anthropic/claude-sonnet-4.6','qwen/qwen3-235b-a22b-2507','anthropic/claude-haiku-4.5']]"
```

**Helper scripts (`backend/scripts/`, run `npx tsx --env-file=.env scripts/<x>.ts`):**
- `run-live.ts <userId>` — full pipeline on a connected Gmail → dossier persisted. The verify template for the whole engine.
- `peek.ts <userId>` — deterministic (no LLM) Gmail pull + closeness graph — surfaces classifier/dedup issues fast.
- `connect.ts <userId> <gmail|calendar>` — mint a Composio Google OAuth consent link.
- `map.ts <a> <b> …` — run the two-sided Knot across persisted dossiers.

**Map the connected Composio accounts → owner emails:**
```bash
export $(grep '^COMPOSIO_API_KEY=' backend/.env | xargs)
curl -s https://backend.composio.dev/api/v3/connected_accounts -H "x-api-key: $COMPOSIO_API_KEY" \
 | python3 -c "import sys,json;[print(i.get('user_id'),i.get('status')) for i in json.load(sys.stdin)['items'] if (i.get('toolkit') or {}).get('slug')=='gmail']"
# per uid: POST /api/v3/tools/execute/GMAIL_GET_PROFILE {user_id:<uid>,arguments:{user_id:"me"}} -> data.response_data.emailAddress
```

**The model registry (`llm/client.ts`) — the held-out pair, verbatim:**
```ts
openrouter: {
  GENERATOR: "anthropic/claude-sonnet-4.6",   // strong voice/instruction
  CRITIC:    "qwen/qwen3-235b-a22b-2507",      // DIFFERENT family — never grades its own work
  EXTRACT:   "anthropic/claude-haiku-4.5",     // cheap structured extraction
}
// assertHeldOutCritic(): modelFamily(GENERATOR) !== modelFamily(CRITIC) — throws if equal, at boot AND per critic call
```

---

## 5. How to test / validate / verify this window end-to-end

**The engine, on real input, no mocks:**
```bash
cd backend
# 1. cache gate (real LLMs on the recorded REAL corpus; the half-half input):
STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts
#    → 39 signals → 6 people → grounded story (emit) → 5 cards, AND the planted "Maria" lie is caught (regen).
# 2. LIVE gate (real Gmail — flip the one flag; this is the §2 "is it real?" answer):
STUB_MODE=0 COMPOSIO_MODE=live  LLM_PROVIDER=openrouter npx tsx --env-file=.env scripts/run-live.ts johnny
#    → deriveIdentityFromGmail prints the real owner; real people/rings; verdict=emit; persisted to InsForge.
```

**The boundary, over live HTTP (what the FE calls):**
```bash
BASE=https://pepl-backend-ed8c2b66-dc94-4a1f-97ea-cbd91c160755.fly.dev
curl -s -X POST $BASE/reveal       -d '{"userId":"johnny"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print('cards',len(d['cards']),'bits',sum(len(c['bits']) for c in d['cards']),'mode',d['mode'])"
curl -s $BASE/api/map | python3 -c "import sys,json;print([n['name'] for n in json.load(sys.stdin)['nodes']])"
curl -s -X POST $BASE/api/map/link -d '{"a":"johnny","b":"<teri-uuid>"}' | python3 -c "import sys,json;d=json.load(sys.stdin);print('link',bool(d.get('link')),'sims',len(d.get('similarities',[])))"
```
**Pass criterion (CLAUDE §2):** every claim in `/reveal` carries a real `signalId` receipt, `failed=0`, `mode:live`; the Knot's every similarity cites a real `aSignalId` **from A** + `bSignalId` **from B**. If a reader asks "is this real?", the LIVE gate flips one flag and the same pipeline produces it.

---

## 6. Cross-window coordination notes

- **Produced for the integration/deploy + story windows:** the real routes + `types.ts` zod shapes, `orchestrator/run.ts` (`runIngest`/`runReveal`/`runPipeline`), the held-out critic, the `dossiers`/`user_cards` schema + `memory/store.ts`, the cache corpus `backend/data/precached-signals.json`, and `scripts/run-live.ts` (their verify template).
- **Depended on:** Window 1's CONTRACTS draft + STACK decision (InsForge gateway, You.com); the source repos ported from (`doubles` engine, `sayhello` judge/orchestrator/replay, `dot` voice + loop).
- **The hazard — two windows, one working tree:** the Story window was live-editing the frontend (StoryStep/CardsStep) while I edited the seam — my StoryStep voice patch got clobbered twice. Survived by going **additive** (new files: `/api/tts`, `lib/pepl/voice.ts` — not editing their in-flight components), re-reading before edits, and committing **path-specific** files (never `git add .` over their WIP). When in doubt, hand them a drop-in (`speak(text)`) instead of editing their component.
</content>
