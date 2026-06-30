# Tech Stack, Sponsor Provisioning & Engine Spec — Gotchas & Build Runbook

## 0. What this window owned

The **foundation everything else built on**: repo + scaffold, the hackathon `CLAUDE.md`, the context-load of the source repos into `docs/`, the **engine spec** (`ARCHITECTURE.md`, `CONTRACTS.md`, `reference/DOUBLES-FEELING.md`, `reference/VOICE-LAYER.md`), and — the highest-ROI, most *demonstrable* slice — **provisioning + live-validating the sponsor stack** (InsForge model gateway, You.com, Composio) and the **flag-gated Nebius/Tavily integrations PR**, plus `SPONSORS.md` + the GitHub `README.md`.

Boundary with the integration/deploy window: **they own the deploy** (compute/Fly + deployments/Vercel); **this window owns the provisioning** (linking the InsForge project, pulling the keys into `backend/.env`, proving each key works before anyone built on it) and the **contracts/architecture the build was held to**.

**Live, validated artifacts:**
- InsForge project `pepl` — `oss_host = https://n9bdaens.us-west.insforge.app`, appkey `n9bdaens`, project `ed8c2b66-dc94-4a1f-97ea-cbd91c160755`, org `38634687-660a-433c-ac86-5c09ef0e2740`, region `us-west`.
- Sponsor keys in `backend/.env` (gitignored): `INSFORGE_OPENROUTER_API_KEY` (sk-or, gateway, **validated 200**), `YDC_API_KEY`/`YOU_API_KEY` (**validated 200 + sources**), `INSFORGE_API_KEY` (ik_, SDK admin), `INSFORGE_ANON_KEY` (anon_), `XAI_API_KEY` (Grok), `COMPOSIO_API_KEY`.
- PR #1 `feat/sponsors-nebius-tavily` — Nebius + Tavily, flag-gated off.

---

## 1. The high-ROI decisions (and WHY)

1. **InsForge's "model gateway" IS OpenRouter — so the flip is a key swap, not a rewrite.** `npx @insforge/cli ai setup` writes an `OPENROUTER_API_KEY` (a project-scoped key that bills to InsForge credits). There is **no separate `<project>.insforge.dev/v1` gateway to wire**: call `https://openrouter.ai/api/v1/chat/completions` with that key. The whole multi-agent loop routes through one OpenAI-compatible key and the prize is claimed by *using* the key. Alternative (chasing a bespoke InsForge LLM endpoint, the empty `insforge.baseUrl` TODO in `llm/client.ts`) was a dead end.

2. **There are TWO different InsForge "API keys" — never conflate them.** `INSFORGE_API_KEY = ik_…` is the **admin/service key** for the `@insforge/sdk` (db/auth, `createAdminClient`). The **gateway key** is `sk-or-…` (an OpenRouter key from `ai setup`). The build's `llm/client.ts` read `INSFORGE_API_KEY` for the LLM — wrong key shape entirely. Kept them as distinct env vars.

3. **Validate every sponsor key LIVE the second it lands** (fail-loud at provision time, not at 4pm on stage). A key that 200s on a *key-required* endpoint is the only proof it's real. This caught the anon-key label bug (G3) and confirmed gateway + You.com before anyone built on them.

4. **Held-out critic enforced at the gateway boundary.** `generator anthropic/claude-sonnet-4.6` ≠ `critic qwen/qwen3-235b` — asserted at boot (`assertHeldOutCritic`, fails closed on same family). The judge can't rubber-stamp its own family.

5. **Reproduce the doubles *feeling* faithfully; swap only the delivery.** Read doubles' real code and captured the exact loop / 7 shapes / `FORBIDDEN_PHRASES` / 8-axis critic (incl. the em-dash floor) / semantic Recovery into `reference/DOUBLES-FEELING.md`. The ONE change vs doubles: iMessage → Grok voice + live transcription (`reference/VOICE-LAYER.md`), and the orchestrator is delivery-agnostic (`runTurn(transcript) → reply`).

6. **Flag-gated, off-by-default integrations on an ISOLATED worktree.** Nebius/Tavily added as real, compiling code that is **inert until `*_ENABLED=true`** — built in a `git worktree` so the active build window's shared working tree was never switched or dirtied.

7. **Secrets never enter git.** `backend/.env` AND `.insforge/project.json` (which holds the `ik_` admin key in plaintext) are gitignored. Every commit was verified clean.

---

## 2. How it was built — step by step

> Every step ends in a real check (CLAUDE.md §0/§4).

1. **Repo + scaffold.** `gh repo create pepl --private --source=. --remote=origin --push`; `npx create-next-app@latest frontend …`; Hono backend. → verify: `curl -s localhost:8799/health` → `{"ok":true,"service":"pepl-backend"}` and `/api/hello` → 200.
2. **Context-load 4 source repos** (doubles/gx/dot/sayhello, later SOTARE) via parallel `Explore` agents → distilled into `docs/`. → verify: `ls docs/` shows VISION/ARCHITECTURE/CONTRACTS/LOOP-FRAMEWORK + `reference/`.
3. **CONTRACTS.md (zod) = the law** the build implements as `backend/src/types.ts`. → verify: `Signal`/`Person`/`Edge`/`Story`/`CriticVerdict`/`Dossier` exist in `types.ts`.
4. **Provision InsForge** (see §4 sequence). → verify: gateway `curl … 200` (G1) + `git check-ignore .insforge/project.json` = ignored.
5. **Validate You.com.** → verify: research `curl … 200` with a `"sources"` array.
6. **Engine spec** — `DOUBLES-FEELING.md` + `VOICE-LAYER.md` + `ARCHITECTURE.md` realigned to the doubles loop. → verify: the build's `agents/{generator,critic,dot}.ts` mirror the loop; `XAI_API_KEY` already in `.env`.
7. **Flag-gated Nebius/Tavily PR** on a worktree. → verify: `npm run typecheck` green on the branch; `git worktree list` shows `main` untouched; `gh pr view` = OPEN.

---

## 3. Gotcha catalog (the meat)

### G1 — InsForge's "gateway" is actually OpenRouter (the empty-baseUrl trap)
- **Symptom:** `backend/src/llm/client.ts` had `insforge: { baseUrl: "", keyEnv: "INSFORGE_API_KEY" } // pepl: TODO base URL from docs.insforge.dev`. Docs implied a `https://<project>.insforge.dev/v1` gateway; no such thing materialized.
- **Root cause:** InsForge's AI gateway **is OpenRouter**. `ai setup` provisions a project-scoped OpenRouter key; there's no separate base URL.
- **Fix (verbatim):** route the `insforge`/`openrouter` provider at `https://openrouter.ai/api/v1` and read the InsForge-provisioned key. `llm/client.ts` `resolveKey()` already prefers it:
  ```ts
  if (p === "openrouter") {
    const gateway = process.env.INSFORGE_OPENROUTER_API_KEY;
    if (gateway) return { key: gateway, source: "INSFORGE_OPENROUTER_API_KEY (InsForge gateway)" };
    return { key: process.env.OPENROUTER_API_KEY, source: "OPENROUTER_API_KEY (direct)" };
  }
  ```
- **Verify:**
  ```bash
  KEY=$(grep '^INSFORGE_OPENROUTER_API_KEY=' backend/.env | cut -d= -f2-)
  curl -s -o /dev/null -w '%{http_code}\n' https://openrouter.ai/api/v1/chat/completions \
    -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
    -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"say ok"}],"max_tokens":5}'   # 200
  ```

### G2 — Two InsForge "API keys" mean different things
- **Symptom:** wiring `INSFORGE_API_KEY` (the `ik_…` admin key) as the LLM gateway key would 401 every model call.
- **Root cause:** `ik_…` is the **SDK admin/service key** (`createAdminClient`, db/auth). The **LLM gateway key is `sk-or-…`** (OpenRouter, from `ai setup`). Same word "API key," different secret.
- **Fix:** keep them separate — `INSFORGE_API_KEY=ik_…` (SDK), `INSFORGE_OPENROUTER_API_KEY=sk-or-…` (gateway).
- **Verify:** gateway curl (G1) = 200 with the `sk-or` key; the `ik_` key is only ever passed to `createAdminClient({ apiKey })`.

### G3 — `secrets get ANON_KEY` returns a LABELED line → the label got captured into the env var
- **Symptom:** captured anon value had prefix `ANO` and length 78 (a real anon key is `anon_…`). The plain CLI prints: `ANON_KEY = anon_c77a…`.
- **Root cause:** `npx @insforge/cli secrets get ANON_KEY` (no `--json`) prints `KEY = value`; stripping whitespace yielded `ANON_KEY=anon_…` — the label became part of the value.
- **Fix (verbatim):** use `--json` and parse `.value`:
  ```bash
  ANON=$(npx --yes @insforge/cli secrets get ANON_KEY --json | python3 -c 'import sys,json;print(json.load(sys.stdin)["value"])')
  ```
- **Verify:** `grep '^INSFORGE_ANON_KEY=' backend/.env` shows `anon_…` (not `ANON_KEY=anon_…`).

### G4 — `ai setup --env-file <path>` fails if the file doesn't exist
- **Symptom:** `node: /tmp/insforge_ai.env: not found` (exit 2).
- **Root cause:** the flag *updates* an existing env file; it doesn't create one.
- **Fix:** `touch "$TMP"` first, then `npx @insforge/cli ai setup --env-file "$TMP"` (it writes `OPENROUTER_API_KEY=` into it).
- **Verify:** `grep '^OPENROUTER_API_KEY=' "$TMP"` is non-empty (prefix `sk-or-`, len ~73).

### G5 — The `Write` tool converted `\u00XX` regex escapes into literal control chars
- **Symptom:** a sanitizer written as `/[ -…]/` landed in the file as `/[ <literal control chars> ]/` — a malformed/unintended char class.
- **Root cause:** the escape sequences were materialized to their codepoints on write.
- **Fix (verbatim):** strip control/zero-width chars by **numeric charCode comparison**, no escape literals in source:
  ```ts
  let cleaned = "";
  for (const ch of raw) {
    const c = ch.charCodeAt(0);
    const isControl = c < 0x20 || (c >= 0x7f && c <= 0x9f);
    const isZeroWidth = (c >= 0x200b && c <= 0x200f) || c === 0x2028 || c === 0x2029 || c === 0xfeff;
    cleaned += isControl || isZeroWidth ? " " : ch;
  }
  ```
- **Verify:** `npm run typecheck` green; the regex/loop is readable in the committed file (no stray bytes).

### G6 — zsh ate `--include=*.ts` in `grep`
- **Symptom:** `(eval):3: no matches found: --include=*.ts` — the grep never ran.
- **Root cause:** zsh expands the unquoted glob `*.ts` before grep sees it (and fails when nothing matches the literal flag).
- **Fix:** quote the patterns (`--include='*.ts'`) or drop `--include` and post-filter with a second `grep`.
- **Verify:** the recon command returns file lists, not a zsh error.

### G7 — Multi-window shared working tree → push rejected / can't rebase
- **Symptom:** `git push` → `! [rejected] … (fetch first)`; then `git pull --rebase` → `error: cannot pull with rebase: You have unstaged changes` (another window's in-flight backend edits).
- **Root cause:** all windows share ONE working tree on `main`; an in-progress window left `backend/src/*` dirty, and another had already pushed.
- **Fix:** for the **PR branch**, isolate with a worktree so `main` is never switched:
  ```bash
  git worktree add -b feat/sponsors-nebius-tavily "$WT" origin/main
  ```
  For **integrating remote into a dirty `main`**: prefer `git merge` over rebase (rebase refuses on a dirty tree; merge proceeds when the incoming files don't overlap the unstaged set — check first):
  ```bash
  comm -12 <(git status --short|awk '{print $2}'|sort -u) <(git diff --name-only HEAD origin/main|sort -u)   # overlap? (empty = safe)
  git merge origin/main --no-edit
  ```
- **Verify:** `git worktree list` shows `main` at its prior rev (untouched); `git status --short` still shows the other window's WIP intact after the push.

### G8 — Add/add `SPONSORS.md` false alarm (and how to check)
- **Symptom:** `git diff --name-only HEAD origin/main` listed `docs/SPONSORS.md` after I'd just created it — looked like a conflict.
- **Root cause:** the file differs because it exists on **my** HEAD only; that's not an add/add unless `origin` has it too.
- **Fix/Check (verbatim):** confirm whether origin actually has it before assuming conflict:
  ```bash
  git ls-tree origin/main docs/SPONSORS.md          # empty output = origin doesn't have it → clean add
  ```
- **Verify:** the merge applied with no conflict markers.

### G9 — You.com env-var name mismatch (skill vs build code)
- **Symptom:** the You.com skill convention is `YDC_API_KEY`; the build's `.env.example` documented `YOU_API_KEY` → the key could be set under a name the code doesn't read.
- **Root cause:** two naming conventions for the same secret. (`footprint.ts` actually reads `YDC_API_KEY ?? YOU_API_KEY` — but only after this was reconciled.)
- **Fix:** set **both** (alias to one value) in `backend/.env`:
  ```bash
  KEY=$(grep '^YDC_API_KEY=' backend/.env | cut -d= -f2-); printf 'YOU_API_KEY=%s\n' "$KEY" >> backend/.env
  ```
- **Verify:** `grep -c '^YDC_API_KEY=\|^YOU_API_KEY=' backend/.env` = 2.

### G10 — `.insforge/project.json` holds the admin key in plaintext
- **Symptom:** after `cli link`, `.insforge/project.json` contains `"api_key": "ik_…"` and `oss_host`.
- **Root cause:** the CLI writes the admin key to the project file.
- **Fix:** ensure `.insforge` is gitignored (it was added to `.gitignore`); never `git add` it.
- **Verify:** `git check-ignore .insforge/project.json` prints the path (= ignored); `git status --porcelain | grep -i '\.insforge\|\.env'` is empty before every commit.

---

## 4. Verbatim commands & scripts worth saving

**Provision InsForge end to end** (after a human `npx @insforge/cli login`):
```bash
npx --yes @insforge/cli whoami
npx --yes @insforge/cli list --json     # -> org id + project id + appkey + region
npx --yes @insforge/cli link --project-id ed8c2b66-dc94-4a1f-97ea-cbd91c160755 \
  --org-id 38634687-660a-433c-ac86-5c09ef0e2740 --json -y     # writes .insforge/project.json (gitignored)
# anon key (public-safe) — parse --json, not the labeled plain line (G3):
npx --yes @insforge/cli secrets get ANON_KEY --json
# gateway key (= OpenRouter, bills to InsForge) — file must exist first (G4):
TMP=$(mktemp); npx --yes @insforge/cli ai setup --env-file "$TMP"   # writes OPENROUTER_API_KEY=sk-or-…
```
`backend/.env` ends up with: `INSFORGE_URL` (oss_host) · `INSFORGE_ANON_KEY` (anon_) · `INSFORGE_API_KEY` (ik_, SDK admin) · `INSFORGE_OPENROUTER_API_KEY` (sk-or, gateway).

**Validate the two prize keys LIVE (the "is this real?" proof):**
```bash
# InsForge gateway (model call) -> expect 200 + a real completion
KEY=$(grep '^INSFORGE_OPENROUTER_API_KEY=' backend/.env|cut -d= -f2-)
curl -s https://openrouter.ai/api/v1/chat/completions -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"say ok"}],"max_tokens":5}' | head -c 200

# You.com research (requires a valid key) -> expect 200 + "sources":[…]
YK=$(grep '^YDC_API_KEY=' backend/.env|cut -d= -f2-)
curl -s -X POST https://api.you.com/v1/research -H "X-API-Key: $YK" -H "Content-Type: application/json" \
  -d '{"input":"In one sentence, what is a hackathon?","research_effort":"lite"}' | head -c 300
```

**The flag-gated-integration PR pattern (isolated worktree, never touches `main`):**
```bash
WT=<scratch>/pepl-sponsors
git worktree add -b feat/sponsors-nebius-tavily "$WT" origin/main
# … add backend/src/providers/nebius.ts + backend/src/ingest/tavily.ts + minimal flag-gated hooks …
ln -sfn "$(pwd)/backend/node_modules" "$WT/backend/node_modules"   # reuse deps for typecheck
npm --prefix "$WT/backend" run typecheck                          # green
rm -f "$WT/backend/node_modules"                                  # don't commit the symlink
git -C "$WT" add backend/src/providers/nebius.ts backend/src/ingest/tavily.ts backend/src/llm/client.ts backend/src/ingest/ingest.ts backend/.env.example
git -C "$WT" commit -m "…" && git -C "$WT" push -u origin feat/sponsors-nebius-tavily
gh pr create --base main --head feat/sponsors-nebius-tavily --title "…" --body "…"
git worktree remove "$WT" --force                                # branch+PR persist on remote
```

**Held-out model registry** (`backend/src/llm/client.ts`):
```ts
openrouter: { GENERATOR: "anthropic/claude-sonnet-4.6", CRITIC: "qwen/qwen3-235b-a22b-2507", EXTRACT: "anthropic/claude-haiku-4.5" }
// assertHeldOutCritic() throws at boot if modelFamily(GENERATOR) === modelFamily(CRITIC)
```

---

## 5. How to test / validate / verify this window end-to-end (real input, no mocks)

The provisioning is "real" iff the keys answer a **key-required** endpoint live:

```bash
# 1) InsForge gateway — a REAL model completion (not a stub)
KEY=$(grep '^INSFORGE_OPENROUTER_API_KEY=' backend/.env|cut -d= -f2-)
curl -s -o /dev/null -w 'insforge-gateway %{http_code}\n' https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"ok"}],"max_tokens":3}'   # -> 200

# 2) You.com research — REAL cited web answer
YK=$(grep '^YDC_API_KEY=' backend/.env|cut -d= -f2-)
curl -s https://api.you.com/v1/research -X POST -H "X-API-Key: $YK" -H "Content-Type: application/json" \
  -d '{"input":"what is a hackathon?","research_effort":"lite"}' | grep -o '"sources"' | head -1   # -> "sources"

# 3) The full pipeline runs on the InsForge gateway, on REAL-shaped input (the §2 half-half):
COMPOSIO_MODE=cache STUB_MODE=0 npx tsx --env-file=backend/.env backend/src/test-e2e.ts   # held-out critic catches the planted lie; emit-grounded

# 4) The flag-gated PR is inert by default:
grep -E '^(NEBIUS|TAVILY)_ENABLED=' backend/.env   # both =false -> Tavily source returns [], nebius never selected
```
**Pass criterion:** #1/#2 are `200` with real bodies (the keys are genuinely live, billing to the sponsors), #3 produces a grounded dossier with the planted lie cut, #4 shows the integrations off. If a judge asks "is this real?", #1–#3 answer yes.

---

## 6. Cross-window coordination notes

- **Provided to the build/integration windows:** `CONTRACTS.md` → `types.ts` (the zod law), `STACK.md` (the wiring + endpoints), `DOUBLES-FEELING.md`/`VOICE-LAYER.md` (the engine spec), and the **live keys in `backend/.env`** + the linked InsForge project. The integration/deploy window's deploy ran on this provisioning (gateway key, oss_host, anon).
- **Depended on:** the build window's `llm/client.ts` `keyEnv` names (drove the env var naming, G2/G9) and `footprint.ts` (the You.com call shape).
- **The hazard (G7):** one shared working tree across windows. Avoided clobbering by: **additive doc edits** (never `git add -A` over WIP — path-specific adds), **`git merge` not rebase** when integrating into a dirty tree, and a **`git worktree`** for the PR branch so `main` was never switched. Verified `main`'s rev was unchanged after every push.
