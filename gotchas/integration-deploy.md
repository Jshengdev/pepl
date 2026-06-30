# Integration, Deploy & Demo-Readiness — Gotchas & Build Runbook

## 0. What this window owned

The **seam** between the real front-end and the live backend, the **deploy** of the whole thing onto InsForge, and **demo-readiness** (the data + reliability that make the demo path actually run on stage). The demo path this window had to make true:

> open the live URL → **"use demo account"** (enters as `johnny`) → talk to Dot (live voice) → reveal (your grounded dossier) → worldmap (you + Teri + Sarah, click the line for the grounded connection).

Concretely this window built/fixed: the `GET /api/map` keystone, Composio-as-signin validation, the **full InsForge deploy** (backend container + frontend), the demo data (seed/enrich/dedup/bio), the **rich profile cards**, and the **connector reliability** fix. Owner-of-record for everything between "the engine works" and "two people can use it live."

**Live artifacts (this project):**
- Frontend: `https://n9bdaens.insforge.site` (InsForge deployments → Vercel)
- Backend: `https://pepl-backend-ed8c2b66-dc94-4a1f-97ea-cbd91c160755.fly.dev` (InsForge compute → Fly)
- InsForge project: `oss_host = https://n9bdaens.us-west.insforge.app`, appkey `n9bdaens`, project `ed8c2b66-…`

---

## 1. The high-ROI decisions (and WHY)

1. **Ground before wiring — read the real routes, not the spec.** `docs/INTEGRATION.md` named `/reveal`, `/api/card`, `/api/map`, `/api/map/link`, `/api/dot/intro` — *none of which existed* when first read. The backend actually had `/run/ingest`, `/run/reveal`, `/api/connect/google/*`, `/api/dot/turn|finalize`, `/api/connect-map`. **Wiring to the doc would have hit dead routes.** Always `grep` the live route table first. (The other window later added the spec routes, converging — but the lesson stands: verify the surface, don't trust the spec doc.)

2. **Composio *is* the signin (don't build InsForge Auth for the demo).** The pipeline already has `deriveIdentityFromGmail(userId)` — connecting Google via Composio yields the user's real name+email. So "Sign in with Google" doubles as signup: no password form, no email-verification step, no OAuth-callback route, no `allowedRedirectUrls` config. **Honest caveat captured in code:** Composio is a *data-grant* OAuth, not an account system — "logged in" = a userId in `localStorage`, not a server session. Fine for a 2-person demo; swap to InsForge Auth for real accounts.

3. **Deploy topology that needs ZERO re-architecture.** Backend (stateful Hono **+ WebSocket**) → InsForge **`compute`** (a Docker container on Fly) keeps `/ws` as-is. Frontend (Next.js 16) → InsForge **`deployments`** (Vercel, native Next). DB + auth + model gateway already on InsForge. The alternative (rewrite liveness onto InsForge Realtime + edge functions) was a trap — `compute` hosts a long-lived WS server directly.

4. **Precache the slow/flaky external, run the live part live (the §2 half-half).** The Gmail scrape + dossier synth is precached per user; the **voice onboarding is real**. The demo enters as a pre-seeded `johnny` (no live scrape → no flakiness on stage), but Dot's STT/TTS is genuinely live. This is the engineered half-half, not a fake: `/reveal johnny` returns a *real grounded dossier* from real data.

5. **Drop the bad thread, don't kill the link (connector reliability).** The connection-line connector 422'd the *entire* link on any one misattributed LLM citation. Changed to **drop only the misattributed thread + retry** — keeps §2 (never ships a fabricated id) while making it reliable.

---

## 2. How it was built — step by step

> Every step ends in a real check. The rule (CLAUDE.md §0/§4): never claim it works without a command that proves it.

1. **Map the real surface.** `grep -nE "app\.(get|post)\(" backend/src/web/server.ts` + read `backend/src/types.ts` (the zod `WsEvent` union + shapes) + `backend/src/orchestrator/run.ts` (return shapes). → verify: a reconciled list of real routes ≠ the spec.

2. **Build the keystone — `GET /api/map`.** Added `listMapNodes()` to `memory/store.ts` (query `dossiers` + join `user_cards` for the smiley) and the route in `web/server.ts`. → verify: a **self-cleaning** script seeds 2 users, asserts both appear, deletes them (leaves prod pristine):
   ```
   saveDossier("verify-johnny", {...}) ; saveDossier("verify-teri", {...})
   listMapNodes()  // assert both present
   admin.from(t).delete().eq("user_id", uid)  // for each table, both users
   ```

3. **Verify the keystone over HTTP** (not just the store fn). Booted the backend, `curl /api/map` → returned real nodes. → verify: `curl … /api/map | python3 -m json.tool`.

4. **Deploy backend → InsForge compute.** Wrote `backend/Dockerfile` + `.dockerignore`, installed `flyctl`, ran `compute deploy`. → verify: `curl https://<fly>/health` + `/api/map` from the public URL (proves it boots AND reaches InsForge DB from the container).

5. **Deploy frontend → InsForge deployments.** Staging-copy trick (see gotcha 3), passed env, deployed. → verify: `curl -I https://n9bdaens.insforge.site` = 200 + the bundle references the fly URL (gotcha 4).

6. **Seed demo data** (johnny via cache corpus; teri/sarah from their live logins). → verify: `curl /api/map` shows 3 named nodes; `POST /reveal johnny` = 200 with a full dossier.

7. **Enrich + bio cards.** You.com footprint merge + grounded `inferBio` → the card fields. → verify: `/api/map` returns `bio` with `tagline`/`facts`/`personality`.

8. **Connector reliability.** Drop-bad-thread + retry. → verify: `POST /api/map/link {johnny,teri}` = `link=True` on a **fresh image** (empty cache).

---

## 3. Gotcha catalog (the meat)

### G1 — Two windows, one working tree → files change under you
- **Symptom:** `Edit` failed with *"File has been modified since read"*; backend wouldn't boot mid-session: `SyntaxError: … does not provide an export named 'answersFromHistory'`.
- **Root cause:** the other window was refactoring `agents/dot.ts` while `web/server.ts` still imported the old names — a transient non-compiling state in the *shared* working tree (not separate branches).
- **Fix:** make only **small, additive** edits; re-`Read` before every edit; never `git add .` over another window's WIP — commit path-specific files. Wait out transient breakage (it self-heals when they finish).
- **Verify:** `cd backend && npx tsc --noEmit; echo $?` before relying on the tree; `git status --short` to see whose changes are in flight.

### G2 — `npm ci` fails in the Docker build (peer-dep conflict)
- **Symptom:** `npm error ERESOLVE … peer @hono/node-server@"^1.19.11" from @hono/node-ws@1.3.1 … Conflicting peer dependency: @hono/node-server@1.19.14` (app runs `@hono/node-server@2`).
- **Root cause:** `@hono/node-ws@1.3` declares a peer on node-server **v1**, but the project runs **v2**. Local `npm install` is lenient; `npm ci` (strict) rejects it.
- **Fix:** in the Dockerfile, `RUN npm ci --legacy-peer-deps` (reproduces the working local resolution; the server boots + serves `/ws`). *Real* fix = align the two `@hono` versions in `package.json` (backend-owner's call).
- **Verify:** `compute deploy` build reaches `[5/5] COPY . .` + `✓ deployed [running]`.

### G3 — Frontend-only deploy can't see `backend/src/types` (escapes `frontend/`)
- **Symptom:** remote Next build: `Type error: Cannot find module '../../../../backend/src/types'` (the `deployments deploy` upload is *only* `frontend/`).
- **Root cause:** the seam type-imports the backend zod schemas, a path that escapes the uploaded dir. (The FE vendors them into `frontend/src/lib/pepl/contract.ts` for exactly this reason — but `/harness` still imports backend directly.)
- **Fix:** deploy from a **staging copy** of `frontend/` whose `next.config.ts` sets `typescript.ignoreBuildErrors:true` + `eslint.ignoreDuringBuilds:true`. Safe because the **full typecheck already passed locally** and `import type` is erased by SWC. **When you add a field to a backend shape the FE uses, mirror it into `contract.ts`** or the local FE build breaks (see G9).
- **Verify:** local `npm run build` is clean (run it before every deploy); the deploy reports `Live at …`.

### G4 — `deployments deploy` from the wrong dir → "No project linked"
- **Symptom:** `Error: No project linked. Run npx @insforge/cli link first.`
- **Root cause:** the CLI resolves the project from `.insforge/` in the **cwd**; running from the staging dir (no `.insforge/`) fails.
- **Fix:** run **from the repo root** (which has `.insforge/`) and pass the staging dir as the source arg: `npx @insforge/cli deployments deploy "$STG" --env '{…}'`.
- **Verify:** the command prints `Live at https://n9bdaens.insforge.site`.

### G5 — Backend container listens on the wrong port
- **Symptom:** container deploys but the platform can't route to it.
- **Root cause:** the server reads `PORT` (defaults 8787); `--port` must match what it listens on; `backend/.env`'s `PORT` could differ.
- **Fix:** build the deploy env by **stripping `PORT` and forcing 8787**, without exposing secrets:
  ```
  grep -v -E '^[[:space:]]*PORT=' backend/.env > deploy.env && echo 'PORT=8787' >> deploy.env
  compute deploy backend --name pepl-backend --port 8787 --env-file deploy.env
  ```
- **Verify:** `curl https://<fly>/health` = `{"ok":true}`.

### G6 — The dot's voice was silent in prod (`/api/tts` 500)
- **Symptom:** live site, Dot doesn't speak; `POST /api/tts` → 500 `"XAI_API_KEY not set on the frontend deploy"`.
- **Root cause:** `app/api/tts/route.ts` is a **server-side Next route** that needs `XAI_API_KEY`; the FE `--env` didn't include it (easy to forget — it's not a `NEXT_PUBLIC_*` var).
- **Fix:** pass `XAI_API_KEY` (server-side secret, NOT `NEXT_PUBLIC_`) in the FE deploy `--env` alongside the public vars.
- **Verify:** `curl -X POST https://n9bdaens.insforge.site/api/tts -d '{"text":"hi"}' -w '%{http_code} %{content_type}'` → `200 audio/mpeg`.

### G7 — "Teri signed in and got Johnny's stats"
- **Symptom:** a real second person signs in and sees the first person's dossier.
- **Root cause:** `session.ts` `getUserId()` returns the **stored localStorage value first**, defaulting to `"johnny"`; and on a **shared browser** the Composio Google OAuth re-used the *logged-in* Google account. So the fresh node inherited the wrong identity.
- **Fix (operational):** each person signs in on **their own device / an incognito window logged into their own Google**. (Code is correct: real signin mints `crypto.randomUUID()` + `setUserId(it)` on connect.)
- **Verify:** `GET /api/map` shows two distinct named nodes after two real signins on two devices.

### G8 — `/api/map/link` 422 "no dossier" mid-reveal (the live-login RACE)
- **Symptom:** console: `/api/map/link -> 422 {"error":"… no dossier for \"<uuid>\" — cannot connect a node that isn't in the store"}` — yet `/reveal <uuid>` returns 200 seconds later.
- **Root cause:** a **real Google login** kicks a background scrape; `RevealStep` fires `/api/map/link` **before that user's dossier finishes saving** → the connector can't load it. Plus repeated logins create **duplicate nodes**.
- **Fix:** demo via the **pre-seeded `johnny`** (no scrape → no race); **dedupe** the duplicate login nodes (keep `johnny` + one Teri + Sarah).
- **Verify:** `GET /api/map` = exactly 3 nodes; `POST /api/map/link {johnny, <teri-id>}` = 200.

### G9 — Adding a backend field didn't show up in the FE (the vendored contract)
- **Symptom:** FE build: `Property 'bio' does not exist on type '{ userId; name; smiley }'`.
- **Root cause:** the FE's `MapNode` comes from `frontend/src/lib/pepl/contract.ts` — a **vendored copy** of `backend/src/types.ts` (so the FE deploys self-contained). Editing the backend type alone leaves the FE copy stale.
- **Fix:** mirror the addition (`Bio` schema + `bio` field) into **`contract.ts`** too.
- **Verify:** `cd frontend && npm run build` → `✓ Compiled successfully` (no type error).

### G10 — Card bio fields were blank ("not in the scrape", by design)
- **Symptom:** card shows empty `Age / Hometown / Birthday / Occupation`.
- **Root cause:** a Gmail + You.com scrape genuinely doesn't contain age/birthday/hometown; `RevealStep.toPerson` hardcoded them `""` deliberately (§2 — never fabricate).
- **Fix:** grounded LLM inference (`agents/bio.ts inferBio`) of `{occupation, hometown, age, tagline, personality, facts}` — **occupation always; the rest only when supported; ground from the email domain** (`usc.edu → Los Angeles + ~20-22`). Birthday left honestly blank (no explicit date in any scrape → never faked).
- **Verify:** `/api/map` returns a populated `bio`; `[pepl:bio]` log shows the values.

### G11 — LLM JSON wrapped in a ```​json fence
- **Symptom:** `[bio] … FAILED: Unexpected token '`', "```json …`.
- **Root cause:** even with `response_format: json_object`, the model sometimes wraps JSON in a markdown fence.
- **Fix:** extract the object before parsing — `const m = raw.match(/\{[\s\S]*\}/); JSON.parse(m[0])` (throw if no match — never silently default).
- **Verify:** re-run the seed; bios parse + save.

### G12 — `tsx -e` can't run the inline checks
- **Symptom:** `Top-level await is currently not supported with the "cjs" output format`.
- **Root cause:** `npx tsx -e '<code with top-level await>'` compiles as CJS.
- **Fix:** write a `.ts` **script file** and run `npx tsx --env-file=.env scripts/foo.ts` (top-level await works in ESM script files; the repo's `run-live.ts` is the template).

### G13 — Card content cut off → distribute across the 3-card stack
- **Symptom:** one card crammed with name + tagline + 4 rows + 4 facts, overflowing.
- **Root cause:** every card in the stack rendered the same full `CardFront`.
- **Fix:** make `CardFront` **page-aware** (`page` prop from `CardStack`'s `c.id`): page 0 = identity, page 1 = "Known for" (first half of facts), page 2 = "Also known for" (rest).
- **Verify:** local build clean; flip the stack — each card is a clean slice.

### G14 — "backend not updated" was browser cache, not the backend
- **Symptom:** user reports the live site looks stale.
- **Root cause:** the **deployed backend was already serving the new data** (`/api/map` rich bio confirmed); the live FE bundle was browser-cached.
- **Fix:** hard-refresh (`Cmd+Shift+R`) / incognito. Don't redeploy the backend to fix a *frontend* cache.
- **Verify:** `curl https://<fly>/api/map` shows the new data → it's a client cache, not the server.

### G15 — `compute` scale-to-zero + slow reveal
- **Symptom:** first request after idle is slow (~1s); `/reveal` takes ~25s.
- **Root cause:** InsForge `compute` v1 scales to zero (cold start); the bento `buildDossier` runs a **live ~25s LLM synth** per `/reveal` (not cached).
- **Fix:** **warm it** with a dry-run before presenting. (Upgrade path: cache the dossier for an instant reveal.)
- **Verify:** `curl -w '%{time_total}' /reveal johnny` — first ~25s, then connections cache for instant re-clicks.

---

## 4. Verbatim commands & scripts worth saving

**Deploy backend (InsForge compute / Fly):**
```bash
PATH="$HOME/.fly/bin:$PATH" npx @insforge/cli compute deploy backend \
  --name pepl-backend --port 8787 --env-file <scratch>/deploy.env
# requires flyctl on PATH (curl -L https://fly.io/install.sh | sh — NO sudo); no Docker daemon needed.
```

**Deploy frontend (InsForge deployments / Vercel) — staging copy + run from repo root:**
```bash
STG=<scratch>/fe-deploy
rm -rf "$STG" && mkdir -p "$STG"
rsync -a --exclude node_modules --exclude .next --exclude .git frontend/ "$STG/"
cat > "$STG/next.config.ts" <<'EOF'
import type { NextConfig } from "next";
const nextConfig: NextConfig = { typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true } };
export default nextConfig;
EOF
# from REPO ROOT (has .insforge/), pass the 4 env vars incl. the server-side XAI_API_KEY:
npx @insforge/cli deployments deploy "$STG" --env "{\"NEXT_PUBLIC_API_URL\":\"<fly>\",\"NEXT_PUBLIC_INSFORGE_URL\":\"<oss_host>\",\"NEXT_PUBLIC_INSFORGE_ANON_KEY\":\"<anon>\",\"XAI_API_KEY\":\"<xai>\"}"
```

**Schema change (no migration file needed for a quick column):**
```bash
npx @insforge/cli db query "ALTER TABLE dossiers ADD COLUMN IF NOT EXISTS bio jsonb"
```

**Helper scripts (all in `backend/scripts/`, run `npx tsx --env-file=.env scripts/<x>.ts`):**
- `seed-johnny.ts` — `COMPOSIO_MODE=cache STUB_MODE=0` → runs the full pipeline on the recorded corpus (which *is* Johnny's data) and persists under `johnny`. **Use when a user has no live Gmail connection.**
- `enrich.ts` — per user: You.com `discoverFootprint(name,email)` + existing signals → `runReveal` (regenerates story/cards). Robust: a failure keeps the existing dossier (saveDossier only fires after generate/critic succeed).
- `seed-bios.ts` + `agents/bio.ts` — grounded `{occupation,hometown,age,tagline,personality,facts}` → `dossiers.bio`.
- `dedupe-demo.ts` — keep `johnny` + one Teri + Sarah, delete duplicate login nodes.
- `reset-users.ts` — wipe every user except a kept id, across all 6 tables + `user_cards`.

**The connector reliability fix (drop-bad-thread, `agents/connector.ts overlapFind`):** filter out similarities whose `aSignalId`/`bSignalId` isn't in that person's signal set (log + drop the thread, never throw); retry the whole run up to `MAX_OVERLAP_TRIES=4` with rising temperature if a run is *all*-bad.

---

## 5. How to test / validate / verify this window end-to-end

**The full live API sweep — every call the site makes, against the live backend:**
```bash
BASE=https://pepl-backend-ed8c2b66-dc94-4a1f-97ea-cbd91c160755.fly.dev
FE=https://n9bdaens.insforge.site
curl -s "$BASE/api/map" | python3 -m json.tool                 # 3 nodes, each with a rich .bio
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/dot/intro"  # 200
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/reveal" -d '{"userId":"johnny"}'            # 200 (~25s)
curl -s -X POST "$BASE/api/map/link" -d '{"a":"johnny","b":"<teri-id>"}'                            # link=True
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' -X POST "$FE/api/tts" -d '{"text":"hi"}'   # 200 audio/mpeg
curl -s -o /dev/null -w '%{http_code}\n' "$FE"                  # 200
```
**Pass criterion:** every call returns real, grounded data (CLAUDE.md §2 — if a judge asked "is this real?", flip `COMPOSIO_MODE` and watch the live pipeline produce it). The connector test must pass on a **fresh image** (empty cache) to prove reliability, not a cached hit.

**CORS + FE wiring (the silent killers):**
```bash
curl -s -D - -o /dev/null -H "Origin: $FE" "$BASE/api/map" | grep -i access-control   # access-control-allow-origin: *
# confirm the deployed FE is baked to the fly URL, not localhost:
for c in $(curl -s "$FE/onboarding" | grep -oE '/_next/static/[^"]+\.js'); do curl -s "$FE$c"; done | grep -oE "pepl-backend-[a-z0-9-]+\.fly\.dev|localhost:8787" | sort -u
```

---

## 6. Cross-window coordination notes

- **Depended on:** Window 3's real routes + zod shapes (`backend/src/types.ts`), `run-live.ts`, the `dossiers`/`user_cards` schema, the cache corpus `backend/data/precached-signals.json`.
- **Depended on this window:** the deploy + the live data + the `GET /api/map` keystone + `bio` field (which both backend `MapNode` and FE `contract.ts` had to carry).
- **The hazard (G1):** two windows on one working tree. Survived it by additive edits, re-reading before each edit, and atomic commits — never `git add .` over in-flight work. The other window built *on top of* the `/api/map` keystone (wrapped it with the `mode` badge) — convergence worked because the edits were small and additive.
