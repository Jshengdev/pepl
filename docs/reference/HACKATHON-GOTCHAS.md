# Reference — Hackathon Gotchas (the landmine map)

Distilled from three of Johnny's prior hackathon builds — **`dot`** (reflective health AI), **`sayhello`** (held-out-judge lead-gen), **`caltech`** ("The Empathy Layer", brain-encoding) — deduped and ranked for **pepl**. The Build-Loop window reads this so it doesn't re-step a mine three projects already hit. Pair with root `CLAUDE.md` §2 (no silent fallbacks) + §4 (verbose debug) and `LOOP-FRAMEWORK.md`.

> The pattern across all three: **the demo dies at a wiring seam or a silent fake, not in the core logic.** Every guardrail below is "make the failure loud / make the slow thing cached-but-real / verify the seam before you build on it."

---

## A. The 7 top demo-killers (the must-not-happen list, pepl-framed)

1. **Live-by-default, badge it.** Ship with the pipeline running **LIVE**; cache only via explicit `DEMO_CACHE=1` (never opt-out). Print the active mode on boot **and** stamp a visible `live` vs `cached` badge on screen so a canned run can never masquerade as live. Any failed call → a red **"… FAILED · <status>"** badge, never a happy-looking fake. *(all three)*
2. **Make the hero reflection deterministic — fixture-lead rule.** The "oh whoa" beat (the grounded story / the slightly-wrong graph) must land **every run**. Seed the *input* so the logic provably trips; keep the *logic* fully live (engineered half-half). A spontaneous live hit is a bonus, never the plan. *(sayhello, caltech)*
3. **Wire + verify CORS day one.** Next (`:3000`) → Hono (`:8787`) dies instantly with a FAILED badge if `OPTIONS` doesn't return `Access-Control-Allow-Origin`. Put it in the preflight before building any feature on the seam. *(sayhello)*
4. **Prove persistence with write→read-back.** pepl mirrors the past — a saved card/graph/story that vanishes or goes stale on re-read makes the reveal silently re-run the model or show empty. After every write, **re-read and assert the roundtrip** in the e2e gate. Persist what you replay; never silently re-call. *(dot)*
5. **The demo MOMENT must fire on the path the frontend actually hits.** A beat wired into a background/durable/parallel job won't fire on the real HTTP request. Trace the exact request end-to-end and confirm every beat fires on **that** request. *(dot)*
6. **Handle the sensitive-domain trap.** pepl reflects a person's life back at them — **observational language only** ("the record shows you leaned on Teri most this year"), never clinical/mind-reading ("you're anxious/depressed"). Keep any safety/crisis handling **deterministic and separate** from the reflection LLM: a cue scan routes to a help message with **no reframe**. *(caltech, dot)*
7. **Record a backup video before freeze; assume venue wifi flakes.** Full green-run video queued open in a tab; the live scene falls back to it on any error. Disk-cache reads so `/demo/*` is local. *(dot, caltech)*

---

## B. Build-loop guardrails (paste these into the loop — each is one check)

- LIVE is the default; CACHE/STUB only via explicit `DEMO_CACHE=1`, and **print the active mode on every boot**.
- On any external/LLM call failure: **throw or return an error-tagged payload that renders a visible red badge** — never a canned reflection or empty array.
- Log a **WARN with the inputs it saw whenever any stage returns 0 results**; empty is allowed only as an honest, logged absence.
- Log one line with **count + latency at every seam** (`[pepl:stage] did X n=12 34ms`), on the **shared** code path — never inside a mode-specific `if`-branch (it vanishes when live replaces stub).
- After every write to the store, **re-read and assert the roundtrip** in the e2e gate before the step counts as done.
- **One shared TS types/contracts file** across frontend + backend (`CONTRACTS.md` → `types.ts`); when a doc conflicts with code, **trust the code**.
- Verify CORS: assert `OPTIONS` on the Hono route returns `Access-Control-Allow-Origin` in the preflight.
- Boot-time `envReadiness()` prints **SET/MISSING** (never values) per required key; **throw at import** if a required key is missing — never instantiate an unauthenticated client.
- Parse `.env` **line-by-line**, one `KEY=value` per line; **never `source .env`** (a value with `&` merges into the next line → mass-MISSING).
- **Pin the exact model id** and record its proven latency; treat any model swap as a regression to re-verify (a swap silently made dot's renderer slow/expensive).
- Trace the **actual frontend→backend HTTP request** end-to-end; confirm every demo beat fires on THAT request, not a background job.
- Keep safety **deterministic and separate** from the reflection LLM: crisis cue scan → help-routing message only, no reframe.
- **Seed the demo fixture, assert `fixture.id == lockedHero`** in the gate, and eyeball its text once (dot shipped the *wrong* hero story).
- **Zero inline mock data** in shipping code; gate dev mocks behind `MOCK_*=1` and show a red "REAL DATA MISSING" badge otherwise.
- **Throttle concurrent LLM fan-out** (semaphore ~6) with generous timeout + per-item skip-on-error so one bad call can't kill the run.
- **Log HTTP status + body length on every external call** so a 402/401/silent no-op is visible, not discovered on stage.
- **Wire ONE real input through the entire real pipeline end-to-end before widening** — no throw-placeholder "lands at S2" stages on the demo path.
- Mark every intentional shortcut with `// pepl:` (the ceiling) or `// DEMO_CACHE:` (what / why / how-to-run-live); never a silent no-op.

---

## C. Full ranked ledger (sources in parentheses)

### Demo-killers
- **Silent stub/fake output that looks real** — a hand-written result returned as if the engine produced it, or a CACHE mode default-ON. → Live-by-default + visible mode badge + fail-loud red badge. *(sayhello, caltech, dot)*
- **Non-deterministic hero moment** — the striking output depends on the model behaving that exact run. → Fixture-lead rule: seed the input, keep the logic live. *(sayhello, caltech)*
- **CORS preflight blocks Next→Hono** — instant FAILED badge / empty UI. → Wire + preflight-verify CORS day one. *(sayhello)*
- **Persistence LARP** — saves but vanishes/stale on re-read → page re-runs model or shows empty. → write→read-back assertion at every store boundary. *(dot)*
- **Demo beat on the wrong code path** — wired into a durable/background job the frontend never hits. → trace the real request; every beat on that request. *(dot)*
- **Wifi flake / live call stalls, no backup** — whole demo dies with empty UI. → backup video + disk-cache reads + fall back on error. *(dot, caltech)*
- **Over-claiming / forbidden framing in a sensitive domain** — clinical diagnosis, mind-reading, mishandled crisis transcript. → observational language only; deterministic crisis path separate from the LLM. *(caltech, dot)*
- **Real integration shipped as throw-placeholders** ("lands at S2") — only the stub path ever proven. → wire ONE real input end-to-end before widening. *(sayhello)*
- **Concurrent LLM fan-out overwhelms the endpoint** — times out, loses a full run. → semaphore ~6, generous timeout, per-item skip-on-error, frontend drops malformed. *(caltech)*

### Major
- **Mass auth failure** — `.env` value with `&` merged into next line → every key MISSING. → parse line-by-line; `envReadiness()` SET/MISSING; throw at import. *(sayhello)*
- **Producer-consumer never connected** — context assembler built but the model call ignores it (looks done, does nothing); often double-computed reads too. → log assembled context at the call site to prove it reaches the model. *(dot)*
- **Contract/spec drift** — docs disagree on a call's return or a field type (`string` vs `string[]`); building to the stale doc breaks the render. → one shared types file; trust code over the newest doc. *(dot, caltech)*
- **Unlogged seams / logs inside a stub branch** — the demo-critical line vanishes when live replaces stub. → seam logs on the shared path, after the value is produced; log every error/empty/404 path. *(dot, sayhello, caltech)*
- **Model-swap regression** — switching id silently makes the path slow/expensive (mandatory reasoning) or times out. → pin the id, record latency, re-verify on swap. *(sayhello, caltech)*
- **Fixture drifts from the locked hero / persona pivots mid-build / name stays TBD across 30 files.** → pin fixture to hero; lock spine, persona, working codename **early**; defer only prose polish. *(dot, caltech)*
- **Inline mock arrays in shipping frontend** — risks demoing fake numbers. → zero inline mocks; gate behind `MOCK_*`; red "REAL DATA MISSING" badge otherwise. *(caltech, sayhello)*
- **External dep fails mid-demo** — 402 exhausted credits, or a wrong env-var name → silent SDK no-op. → log status+body-length; cached `DEMO_CACHE` fallback; preflight asserts the dep actually returns; top up credits. *(sayhello)*
- **Sponsor/external API slug or shape differs from the obvious name** — 404s or rejects silently. → hit it once in preflight with the exact slug + minimal body, capture the real 200 shape. *(sayhello)*
- **Heavy/slow processing run live** — strangles iteration, blocks UI gestures. → pre-bake the slow part offline into committed JSON (cache input, not logic); make the expensive stage an env-gated cut-line. *(caltech)*
- **Lanes collide editing the same files / gate can't observe a step.** → separate lanes by FILE with up-front JSON contracts; if the gate can't observe a step, change the mechanism to one it can verify. *(dot, caltech)*
- **Claiming a sponsor track before it returns real results live.** → only claim once it returns REAL output live; until then badge the UI honestly ("via local corpus / replay"). *(sayhello, caltech)*
- **WS/live dashboard silent** — UI connected after the run started or wrong port → broadcasting to zero clients. → connect UI before triggering; GET-rehydrate; WARN on `clients=0`. *(sayhello)*

### Minor
- **No-op pipeline step** that structurally can't do anything but occupies a slot. → cut it or make it a labeled pass-through. *(dot)*
- **Unverified/inflated stats in the pitch** — one rigor question torpedoes trust. → cite only sourceable numbers; ctrl-F before freeze. *(sayhello, caltech)*
- **Over-produced pitch surface** — many parallel cuts/decks competing with shipping. → one master cut + cheap swap-slides; slides hold one phrase, founder is the script. *(dot, caltech)*
- **Held-out-judge id check breaks** — provider returns canonical ids, not your alias. → assert independence on the **family prefix** (segment before `/`), never the full id. *(sayhello)*
- **Op hygiene** — key shared in plaintext; concurrent installs race the lockfile. → keys in gitignored `.env.local` + "rotate keys" post-demo; never run two installs at once. *(dot, sayhello)*

---

## D. What WORKED — patterns to reuse (the positive side of the ledger)

**Engine + scope discipline**
- **One engine, output adapts.** dot proved ONE split (panic / broken toe / women's-health) by changing only the output; caltech did "same engine, different input file" per sponsor. Resist a feature-per-use-case — that's how a 1-day build dies. For pepl: one ingest→graph→generate→critic engine; the cards are just different *outputs* of it.
- **Decide exactly ONE thing must be REAL; everything else is a labeled synthetic seed.** dot: only the two-truths split was live. For pepl: the **extract→graph→generate→critic logic** is the real thing; the ingest *export* is the labeled `DEMO_CACHE`.
- **Reframe the problem until it's a MECHANISM, not a mood.** "help people feel understood" → "two truths, the gap is the diagnosis" → one LLM call. pepl's mechanism: *organize the mess → reflect a grounded perspective the user couldn't produce alone → they correct it → it deepens.*
- **Snippet-representation doctrine** (caltech): demo ONE slice end-to-end well enough that the judge believes the rest exists. Don't build the whole product.

**Make the half-half honest**
- **Engineered halfsies = scripted/pasted inputs + live processing.** Premade content guarantees the best output on stage while the SAME path runs any live input. On stage: **type one short answer live to prove it's live, then paste the rest for time.** Say the honesty line out loud: *"this is a sample export; the reasoning is live."*
- **Fail-loud over silent degradation** — every failure throws + renders a visible FAILED badge; real-vs-cached is labeled on screen; mocks env-gated. The screen always tells the truth about what you're seeing.
- **Pre-bake all interactive combos** (caltech) so any judge click is an O(1) disk read (<10ms) — no live LLM call ever blocks a gesture.

**Verification**
- **"Done" = a run command + observed output, never "should work."** Strong checkable criteria let the loop run independently.
- **One live verification gate = "the demo works":** `test-e2e.ts` exits 0 with named green checks, run live against the real model, **green before touching the UI**; build the UI off the proven shape.
- **Validate the spec against the ACTUAL code before handoff** — dot caught three landmines this way (safety on wrong path, unpersisted field, wrong seed).
- **Preflight script:** N live seam checks in ~2s, exit code = FAIL count, keys checked by presence only. One command answers "is everything reachable right now?"

**Held-out judge (pepl's truth gate)**
- Critic on a **different model family** is both real architecture and a crisp pitch line ("a model can't catch its own confident lie"). Assert independence on the family prefix.
- **Fixture-lead** the catch so it's deterministic; the catch *logic* is live, only the input is staged.

**Pitch / judging**
- **Two real numbers that ARE the proof** (caltech: cosine 0.42→0.84). For pepl: e.g. "# claims grounded vs cut," "# people surfaced from the export." Numbers that prove it's real, not decoration.
- **One sponsor = one visible node, captioned on screen as it lights** + a one-line "what it does + why innovative." Targets the tool-use judging axis and makes the architecture legible.
- **Map the build to the judging rubric explicitly** (axes × weight, "how we win each") and decide demo choices against scoring, not vibes.
- **Lead with the moment the decision goes wrong**, not the solution; cold-open in present tense; hold a **silent hero beat** while the engine visibly works on screen (don't talk over the reveal).
- **Customer-as-hero story spine used consistently** across the generate prompt, judge calibration, slides, and the Devpost — one coherent narrative everywhere.
- **Freeze ~1hr before deadline, submit ~10min before** — the last hour is rehearsal + backup video, not building. Pre-bake Q&A answers.
- **Only chase prizes already ON the journey line** — never add a node just to claim a badge (score = expected-$ × feasibility / wiring-minutes).
