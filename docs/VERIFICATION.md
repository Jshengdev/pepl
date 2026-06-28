# Pebble — Journey × Verification (what's working vs production)

> **Status: 2026-06-28 — verified by RUNNING it, not reading.** The builder's realignment board. Per step: 🎯 **should work** (production bar — clearly doing what it claims) · **now** (✅ verified / ⚠️ partial / ❌ missing) · 🔧 **gap** · 🔍 **verify** (run + observed). Keep this green as you build.

## The one-paragraph truth

**The hard part is done and proven. The live part and the product aren't built yet.** I ran the full pipeline live against real models: **39 real signals → Haiku extract → 6 people → seeded-wrong → Sonnet story (14 grounded claims, all real ids) → held-out Qwen critic `emit` (grounding 1.0, voice 0.9) → 5 cards → negative-control caught the planted "Maria" lie → regen. ~35s. 6/6 green.** That engine is production-level. BUT it runs on a **precached gx corpus** (`data/precached-signals.json`) with **Johnny's people hardcoded** — it is NOT live Gmail and would crash on anyone else's account. Voice/Dot, Composio sign-in, You.com, and the real experience UI don't exist. So: **engine = real + verified; live-data + voice + product = not yet.**

**Verified evidence (observed):** `typecheck` exit 0 · `STUB_MODE=1 …test-e2e` → 6/6 GREEN · `LLM_PROVIDER=openrouter STUB_MODE=0 …test-e2e` → 6/6 GREEN (the run above). The engine is "very clearly doing what it's doing" — every node logs `[pepl:node:X] …(n, ms)` and the gate prints the real artifacts + PASS/FAIL.

## ⚠️ Corrections — backend-lock pass (2026-06-28; trust the live code over the rows below)

The build window progressed in parallel; several rows below are now STALE:
- **Steps 1 & 3 are STALE.** Composio IS built (`src/ingest/composio/{client,connect,gmail,calendar,v3-execute}.ts`; `POST /api/connect/google/initiate` + `GET /status` live), and so are `liveIngest`, `footprint.ts`, `signalize.ts`, the closeness extractors, and `memory/store.ts`. `graphNode.live` is **already generic** — the "`graph.ts:104` asserts Sarah+Teri" claim is wrong. The **only** hardcode left to rip is the `extractNode.live` hint at **`graph.ts:56`**; `seededWrong` still fires at `graph.ts:114-129` (drop it for v3). All built but **UNVERIFIED against a real account** (blocker: `COMPOSIO_API_KEY` + `composio add gmail`).
- **New rows to verify** (the not-yet-built v3 pieces): the **lunchbox Dossier** (`/reveal` → 5 cards × ~5 grounded bits, every bit a receipt, unresolvable → `failed`); **Knot** (`/api/map/link` two-sided grounded story; non-overlapping pair → `link:null`); the **friend constellation** (`saveDossier(friend-*)` from a baked corpus). Build per [goals/03](./goals/03-lunchbox-reveal.md) & [goals/05](./goals/05-friends-and-knot.md); spec in GOAL.md S2c/S3 + [reference/CONNECTOR-AND-FRIENDS.md](./reference/CONNECTOR-AND-FRIENDS.md). Verify each on a real account.

---

## Step 1 — Landing + Sign-in (Composio)
- 🎯 **Should:** click "Sign in with Google" → Composio OAuth → you're signed in, account bound, scrape kicks off. Clearly-doing = a real Google consent screen; `/status` flips `connected:true` with your email.
- ❌ **Now:** **not built.** No `composio/` dir, no connect routes. (`@composio/core` IS in `package.json`; landing is still the create-next-app boilerplate.)
- 🔧 **Gap:** port `doubles/src/composio/connect.ts` → `POST /api/connect/google/initiate` + `GET /status` (DOUBLES-PORT §4).
- 🔍 **Verify:** `curl` initiate → a real `redirectUrl`; after consent `/status` → `{connected:true, email}`.

## Step 2 — Voice onboard (Dot)
- 🎯 **Should:** Dot speaks **instantly** (cached first line), asks 3 Qs, you answer by voice, she replies witty; answers → 3 Signals; scrape runs underneath. Clearly-doing = audio plays; `[pepl:dot] turn index=N → signal`.
- ❌ **Now:** **not built.** No voice module, no Grok STT/TTS wiring (`XAI_API_KEY` is set, unused).
- 🔧 **Gap:** `GET /api/dot/intro` (cached Grok) + `POST /api/dot/turn`.
- 🔍 **Verify:** `/intro` returns audio instantly; `/turn` returns a witty reply + advances; after 3, answers are queryable as `source:"onboarding"` Signals.

## Step 3 — Live collection (the data source) — **THE BIG GAP**
- 🎯 **Should:** while you talk, Composio pulls **your real Gmail + Calendar** + **You.com** footprint → real `Signal[]` for **any** account, each with a real source; throws if all empty. Clearly-doing = `[pepl:ingest] gmail n=142 cal n=37 web n=8`; **works on a stranger's account**.
- ⚠️ **Now:** **partial / wrong source.** `ingest.ts` loads `precached-signals.json` (39 gx signals) — verified loads + runs live. **No Composio, no Gmail, no You.com.** `extract.live` uses a **hardcoded Johnny/Sarah/Teri hint** (`graph.ts:55`); `graph.live` **asserts Sarah+Teri present or throws** — STALE row: `graph.live` is generic now (no Sarah/Teri assert); see Corrections at top.
- 🔧 **Gap:** swap ingest precached→**Composio live + You.com** (DOUBLES-PORT §4); **rip the hardcoded hint + the Sarah/Teri assert**; identity from `deriveIdentityFromGmail`.
- 🔍 **Verify:** connect a **non-Johnny** Google → ingest returns *that* person's signals → graph has *their* people, **no Johnny/Sarah/Teri, no crash**.

## Step 4 — Card-builder (dossier prefill → refine)
- 🎯 **Should:** a prefilled dossier (name auto + "why you do what you do") you refine by talking, grounded each turn.
- ⚠️ **Now:** **partial.** `generate` produces a grounded Story (✅ verified: 14 claims, emit) and `cards` a profile card (oneLiner + 3 facts, ✅ verified). **No interactive draft→refine loop.**
- 🔧 **Gap:** `/api/dossier/draft` + `/refine` (or reuse `/generate`) + the conversational refine turn.
- 🔍 **Verify:** draft returns a grounded dossier; a refine message changes it and the critic still `emit`s.

## Step 5 — The reveal ("your icon") — **THE HERO**
- 🎯 **Should:** the `Reveal` payload `{profile, story, stats, throughline, graph, proof, mode}`, **every claim with a receipt**; a real person reads it → "that's me."
- ⚠️ **Now:** **data partial, experience missing.** Pipeline returns a grounded story + 5 cards (profile/**wow**/graph/story/mbti, ✅ verified). **No Stats panel, no receipts on facts, no throughline field**; the front-end is a **harness + boilerplate** (no reveal UI).
- 🔧 **Gap:** extend payload (Stats + `signalId` receipts + throughline; `WowCard`→`StatCard`); build the reveal UI (Johnny's front-end example).
- 🔍 **Verify:** `/reveal` returns the full payload, every fact/stat carrying a `signalId`; front-end renders it.

## Step 6 — Correct-by-talking (the catch)
- 🎯 **Should:** tap a line → see its source → say what it means → graph + story update grounded. Clearly-doing = `seededWrong` visible; `[pepl:correctGraph] applied`; story regenerates grounded.
- ⚠️ **Now:** **partial.** `correctGraph` built (drops the seed); `/correct` endpoint exists; `seededWrong` seeded (✅ verified: `shawn.ring`). **Not wired to a conversational correction or a live re-render**; not exercised in the e2e.
- 🔧 **Gap:** wire correction → regenerate → re-render, by voice/text.
- 🔍 **Verify:** `POST /correct` → updated graph (seed dropped) → regenerated grounded story.

## Step 7 — The map (connect) · **STRETCH**
- 🎯 **Should:** a 2nd account joins; click each other; a map shows semantic links (shared people/themes).
- ❌ **Now:** **not built.**
- 🔧 **Gap:** defer until 1–6 are green.
- 🔍 **Verify:** two real accounts render on one map with grounded links.

## Cross-cutting — Truth gate + fail-loud · **✅ VERIFIED WORKING**
- 🎯 **Should:** nothing invented — every claim traces or it's cut; failures loud; held-out critic on a different family.
- ✅ **Now (verified live):** negative control **caught the injected fabrication** (→ regen); held-out **anthropic ≠ qwen** asserted at boot + per call; **fail-CLOSED** throws after 2 regens (unit-verified); every node logs counts+latency; failures emit WS `failed` + non-200; bad body → 400.
- 🔍 **Verify:** `LLM_PROVIDER=openrouter STUB_MODE=0 npx tsx --env-file=.env src/test-e2e.ts` → 6/6 (ran it; observed).

---

## Realignment punch list (the order to close the gap)

The engine stays. Build the boundary + experience, gating each on a run against a **real connected account**:

1. **S2a — Live ingest + de-hardcode** (Step 3): Composio Gmail+Cal swap; **rip the `graph.ts:55-56` extract hint (the Sarah/Teri assert is already gone — keep the :102-112 generic guard); drop seededWrong :114-130**; identity from `deriveIdentityFromGmail`. *Gate: a non-Johnny account produces a real graph, no crash, no hardcoded names.*
2. **S2b — You.com footprint** → cited Signals (the web receipts).
3. **S2c — Dot voice** (Step 2): `/intro` cached + `/turn`.
4. **S3a — Reveal payload** (Step 5): add Stats + receipts + throughline (`WowCard`→`StatCard`).
5. **S3b — Correct-by-talking** (Step 6): wire conversational correction → re-render.
6. **S3c — Map** (Step 7) — only after 1–5 are green.

**The one human blocker:** `COMPOSIO_API_KEY` in `backend/.env` + connect your Google (`composio add gmail`, `COMPOSIO_MODE=live`). Until then S2a builds to contract but can't pull real Gmail. **Extend `test-e2e.ts`** with a check that runs on a connected account and asserts zero hardcoded names — that's the new gate for "live."
