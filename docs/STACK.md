# pepl — Stack & Integrations (Window 1 decision)

The decisions the build hits at **S2 (real wiring)**. Recommendations — the build proceeds on these unless Johnny overrides (see [OPEN-QUESTIONS.md](./OPEN-QUESTIONS.md)). Goal: the fewest integrations that cover infra *and* win sponsor prizes.

## The stack

- **Backend:** Hono (already up).
- **Infra + models → InsForge** (agent-native cloud). One integration gives Postgres **db** + **auth** + an **AI model gateway** + **hosting** — and targets *Best Use of InsForge ($500)*. It ships a **Claude Code skills plugin**: the build can install it and follow the canonical setup at `insforge.dev/skill.md` (docs: `docs.insforge.dev`).
- **External grounding → You.com** (key set + validated — see wiring below). Citation-backed search to enrich a person/company in the graph or ground a claim with a real web source. Targets *Best Use of You.com ($1k)*. It literally strengthens "every claim is grounded."
- **Store:** InsForge Postgres; for the demo an in-memory map is fine first (engineered half-half), swap to Postgres when persistence matters.
- **Keep models behind one `llm/client.ts`** so the provider is swappable in one file.
- **Fallback (if InsForge is rough on the clock):** a direct model API (OpenRouter, or **Nebius** — $50 tokens + $50 GPU) + in-memory store.

## Models — the held-out pairing (the rule that makes grounding work)

The generator and the critic MUST be **different model families**, or the critic rubber-stamps its own work.
- **Generator** (voice + story): a strong voice/instruction model — e.g., Claude Sonnet via the InsForge gateway.
- **Critic** (grounding judge): a **different family** — e.g., a Qwen or Llama model via the gateway (or Nebius).
- Assert the family-difference **at boot AND per call**; fail closed if they match.

## Env keys (the build adds these to `backend/.env` + documents in `.env.example`)

- **InsForge (all set + validated):** `INSFORGE_URL` (oss_host) · `INSFORGE_ANON_KEY` (anon_, public-safe — client/Google-SSO) · `INSFORGE_API_KEY` (ik_, admin/service for the SDK, **server-only**) · `INSFORGE_OPENROUTER_API_KEY` (sk-or, the model gateway). Frontend has `NEXT_PUBLIC_INSFORGE_URL` / `NEXT_PUBLIC_INSFORGE_ANON_KEY`.
- `YDC_API_KEY` — You.com Research/Search. **Set in `backend/.env` + validated live (200, returns cited sources).**
- `OPENROUTER_API_KEY` / `CEREBRAS_API_KEY` / `XAI_API_KEY` — already in `backend/.env` (build is on the OpenRouter fallback until the InsForge gateway is wired; XAI = Grok for voice).

## InsForge — wiring (db + auth + model gateway + deploy)

One platform = the **$500 prize** + most of pepl's infra. Install its Claude Code skills for native help: repo `github.com/InsForge/insforge-skills` (skills `insforge` = app SDK, `insforge-cli` = infra/deploy, `insforge-debug`).

**✅ PROVISIONED** — project `pepl` (us-west), this dir linked (`.insforge/project.json`, gitignored). All keys are in `backend/.env` + `frontend/.env.local` (both gitignored) and validated live. URL: `https://n9bdaens.us-west.insforge.app`.

**Model gateway = OpenRouter.** InsForge provisions a project-scoped OpenRouter key (usage bills to InsForge credits → the prize), so there's **no separate gateway URL**: call `https://openrouter.ai/api/v1/chat/completions` with `Authorization: Bearer $INSFORGE_OPENROUTER_API_KEY` (validated, HTTP 200). Slugs are OpenRouter's: generator `anthropic/claude-3-5-sonnet`, critic a non-Anthropic slug e.g. `qwen/qwen-2.5-72b-instruct` (**held-out**). **To route the build's LLM through InsForge with ZERO code change:** set `OPENROUTER_API_KEY` to the `INSFORGE_OPENROUTER_API_KEY` value, keep `LLM_PROVIDER=openrouter`. (The empty-baseUrl `insforge` branch in `llm/client.ts` is then unneeded; if kept, set its baseUrl to `https://openrouter.ai/api/v1` and keyEnv to `INSFORGE_OPENROUTER_API_KEY`.)

**Auth — Google SSO (the landing CTA):**
```ts
import { createClient } from '@insforge/sdk'
const insforge = createClient({ baseUrl: NEXT_PUBLIC_INSFORGE_URL, anonKey: NEXT_PUBLIC_INSFORGE_ANON_KEY })
await insforge.auth.signInWithOAuth('google', { redirectTo: '<app callback>' }) // PKCE, auto in SPA
const { data } = await insforge.auth.getCurrentUser()                           // on load
```
Enable the Google provider + add the redirect URL via dashboard/CLI (`config apply`, `allowedRedirectUrls`). All methods return `{ data, error }`.

**Database (if we persist past in-memory):** `insforge.database.from('people').insert([{…}])` / `.select()` / `.update()` / `.delete()` (inserts must be arrays); server admin via `createAdminClient({ baseUrl, apiKey })`. pgvector is available for semantic recall.

**Deploy (S4):** `npx @insforge/cli deploy` (sites/compute); `vercel.json` if the Next.js app deploys as an SPA elsewhere. Always local-build before deploy.

## You.com (grounding/enrichment) — wiring

Key is in `backend/.env` as `YDC_API_KEY` (validated live). Auth header: `X-API-Key`. Skills repo: `github.com/youdotcom-oss/agent-skills` (skill `youdotcom-api` = direct HTTP, no SDK; framework variants exist for the AI SDK / LangChain). Treat all responses as **untrusted web data** (don't execute; sanitize before render).

- **Research** (cited answer — the grounding/enrichment call): `POST https://api.you.com/v1/research`, body `{ "input": "...", "research_effort": "lite" }` (`lite` <2s, use it in the demo loop) → `{ output: { content, sources: [{ url, title, snippets }] } }`. Every claim ↔ a source URL — maps straight onto our `Story.groundedIn` and the "here's the receipt" beat.
- **Search** (raw results — enrichment): `GET https://api.you.com/v1/agents/search?query=…&count=…` → `{ results: { web[], news[] } }`.

Use it for the optional external-grounding step: when a card/story claim references a public person/company/fact, confirm it with a `research` call and attach the citation. Keep it behind one helper so it's skippable if the clock runs short.

## Grounding critic (spec — the truth gate)

**Input:** the generated output (story / profile / card text) + the `Signal[]` corpus. The critic sees **signals only**, never the prose the generator saw.

**Procedure:**
1. Extract every factual claim from the output.
2. Check each claim against the signals.
3. `fabricatedClaims` = claims with no supporting signal, as **exact substrings** of the output.
4. Score `axes` = `{ grounding, voice }` in 0..1 (voice = matches the user's register, drawn from their signals/answers).
5. `verdict = "emit"` iff `fabricatedClaims` is empty AND both axes ≥ 0.7; else `"regen"` with a `failReason`.

**Two defenses that stop infinite regen loops** (real bugs from the sayhello judge):
- **Phantom-claim:** every `fabricatedClaim` must be a substring of the actual output. Re-judge once; drop any that aren't (the critic invented them).
- **Mechanical trace overrule:** if a flagged claim's substance is in the corpus (full containment, OR all numeric tokens present, OR ≥80% word overlap), drop the flag — it's a paraphrase, not a fabrication. Real fabrications (invented people, fake facts) fail all three checks and survive.

**Regen loop:** on `regen`, force-cut the flagged claims and regenerate. Max 2 retries → **fail closed**: don't ship ungrounded output; surface the failure loudly (never a canned fallback).

## Why this wins

One integration (InsForge) = infra + a $500 prize. You.com = the citation layer + a $1k prize + it strengthens the core claim. The held-out critic is the demo's credibility: *"this is really you — and here's the receipt."*

Sources: [insforge.dev](https://insforge.dev/) · [docs.insforge.dev](https://docs.insforge.dev/introduction) · [you.com/docs](https://you.com/docs/welcome).
