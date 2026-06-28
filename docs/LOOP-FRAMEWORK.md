# pepl — Autonomous Build-Loop Framework (from `dot` + `sayhello`)

How the **execution-loop window** builds pepl: a lock-before-build ultracode workflow with stage gates and a held-out judge that refuses to ship ungrounded output. `dot` contributes the *workflow discipline*; `sayhello` contributes the *self-validating judge loop*.

## The core idea

**Lock the shape before the content.** Autonomy scales by *restricting degrees of freedom*: lock scope, types, stages, rules, gates, and the demo — then the loop can run hard without inventing the product.

| Locked artifact | What it forbids |
|---|---|
| SCOPE-LOCK (the ONE problem + crystal I/O) | inventing the product |
| CONTRACTS (zod schemas at every boundary) | silent shape mismatches |
| GOAL stages S0–S4 | skipping fundamentals |
| CONSTRAINTS CP-1…CP-7 | working the wrong thing |
| test gate + held-out judge | partial / ungrounded passes |
| DEMO-SCRIPT | polishing off the demo path |

## Stage gates (from `dot`, S0–S4) — all-or-nothing

1. **S0 Scaffold** (~15 min) — monorepo, env, types from CONTRACTS. *Done:* installs, typechecks, `dev` boots. ✅ (pepl scaffold already exists.)
2. **S1 Prove the pipe** — full node sequence on STUB/canned content, no real intelligence. *Done:* one run animates the whole journey end-to-end, in-brand.
3. **S2 Real wiring** — replace stubs with real integrations node by node, live-test after each. *Done:* one real input runs the whole journey; the hero moment lands grounded in real data.
4. **S3 Persistence + trace + polish** — storage so refresh rehydrates, trace every seam, polish demo path to design spec. *Done:* demo path is in-brand + recordable; a run rehydrates.
5. **S4 Deploy + freeze** — public URL serves the demo; freeze submission with buffer.

A stage passes only on **run command + observed output** — never "should work." 4/5 gates = blocked, not "good enough." No parallel stages (WIP = 1).

## The discipline (from `dot`, CP-1…CP-7) — run on every unit of work

- **CP-1 On the one line?** If it's not on SCOPE-LOCK, it's a CUT or a FINDING, not work.
- **CP-2 Bottleneck first.** Work the single thing most blocking a demoable `main` right now (not the easy thing).
- **CP-3 WIP = 1.** Finish (to "ran + observed") before starting the next thing.
- **CP-4 Satisfice.** Smallest honest implementation that clears the bottleneck. No silent stubs.
- **CP-5 Demo-path test.** Does this make DEMO-SCRIPT land better? If yes → polish. If no → minimum.
- **CP-6 Log the wiring seam.** Every boundary (node→node, sponsor call, stream→frontend) gets a logged seam.
- **CP-7 Prove it.** "Done" = run + observed output. Hit an open question → flag it, don't guess.

## The self-validating judge loop (from `sayhello`) — pepl's truth gate

This is the part that fits pepl perfectly: **never hallucinate a fact/relationship about the user.**

- **Held-out judge.** Critic model family ≠ generator family (asserted at boot AND per call). It never grades its own homework. (doubles: Thinker/Talker/Critic tiers map onto this directly.)
- **Asymmetric evidence.** The judge's corpus = the **ingested context / signals only** — never the prose the generator saw. So when the generator restates an ungrounded claim, the judge has no signal for it → catches it deterministically.
- **Verdict.** `emit` iff every axis ≥ threshold AND `fabricatedClaims` is empty; else `regen` with a `failReason`.
- **Regen loop.** On `regen`: re-gather evidence targeting the flagged claims (reenrich), keep a cumulative AVOID set, force-cut claims with no signal. After `MAX_RETRIES` (2) → **fail-closed** (refuse to ship), never fake.
- **Two defenses that stop infinite loops** (real `sayhello` bugs):
  - *Phantom-claim:* every `fabricatedClaim` must be a substring of the actual output; re-judge once, drop survivors.
  - *Mechanical trace overrule:* if a flagged claim's substance demonstrably lives in the corpus (full containment / all numeric tokens present / ≥80% word overlap), drop the flag loudly. Real fabrications (invented people, fake facts) fail all three checks and survive.

## Demo-safe replay (from `sayhello`)

Write-through recording: append every event to a tape *as it streams* (survives mid-run crashes); snapshot the final run. **Replays are cached REAL runs, honestly labeled `mode:"replay"` — never stub runs.** This is the legitimate way to make a live pipeline demo-snappy (an engineered half-half).

## The gotcha (what breaks it)

1. **The `/goal` command is Claude-Code-specific.** The loop window must either *be* Claude Code running `/goal docs/GOAL.md`, or reimplement the goal-execution as an orchestrator script. Don't assume portability.
2. **Locked docs before work.** If SCOPE-LOCK is unfilled, the loop halts — fill it first (see SCOPE-LOCK.md, drafted).
3. **Gates are binary.** No partial passes; S2 waits for S1 to fully gate.
4. **Zod at every boundary.** A node that can't state its input/output schema isn't ready to build. CONTRACTS is the law.
5. **Demo path is THE path.** Polish only lives on DEMO-SCRIPT; everything else is "minimum to not crash" (zero-sum under time pressure).
6. **Real grounding.** No silent stubs — failures render a visible FAILED badge; the judge rejects ungrounded data.
7. **Held-out family.** Same model for generate + judge = confident hallucination. Keep them different.

## Reusable primitives (patterns we can apply, with paths)

From `dot`:
- `docs/CONSTRAINTS.md`, `docs/BUILD-LOOP.md` — the CP-1…CP-7 discipline + stage shape. *Reuse verbatim.*
- `docs/SCOPE-LOCK.md`, `docs/CONTRACTS.md`, `docs/GOAL.md`, `docs/DEMO-SCRIPT.md` — the locked-doc templates.
- `packages/backend/src/types.ts` (zod contracts), `store.ts` (in-memory Map persistence), `director.ts` (durable step workflow), `extract.ts` (one grounded LLM call), `test-e2e.ts` / `test-director.ts` (CLI stage gates: `exit 0` = pass).

From `sayhello`:
- `packages/backend/src/nodes/defineNode.ts` — typed node wrapper (zod in → executor → zod out, seam logging, per-node stub/live polarity).
- `packages/backend/src/orchestrator/runStory.ts` — the loop driver (sequential nodes, ≤2 regen, cumulative AVOID set, human gate, WS emit).
- `packages/backend/src/nodes/judge.ts` — the held-out critic (6-axis rubric, phantom + mechanical-trace defenses).
- `packages/backend/src/store/replay.ts` + `orchestrator/replay.ts` — write-through recording + replay.
- `packages/backend/src/llm/models.ts` — model registry + held-out family assertion.
- `packages/frontend/lib/ws.ts` — `useStoryRun()` hook (WS → state reducer; render-only components).

## Recipe to set up the loop in pepl

1. **Lock the specs** — SCOPE-LOCK (done, draft), CONTRACTS (zod for ingest/graph/agents I/O), CONSTRAINTS (adapt CP-1…CP-7 + pepl CLAUDE.md §2), DEMO-SCRIPT (from VISION demo path).
2. **Author GOAL.md** — the ultracode workflow: STEP 1 read context + confirm scope; STEP 2 run S0–S4 with pepl acceptance criteria; STOP CONDITION (see GOAL.md).
3. **Build the node pipeline** — `defineNode()` per stage (ingest → extract → graph → generate → critic), zod at each boundary, WS event per node.
4. **Wire the held-out judge** — generator ≠ critic family; critic corpus = ingested context only; emit/regen; reenrich + AVOID + fail-closed; phantom + trace defenses.
5. **Add a CLI gate** — `backend/src/test-e2e.ts` asserting the demo's hero beats (graph built from real data, generated bio grounded, no fabricated relationships); `exit 0` = stage passes.
6. **Record for replay** — write-through tape of real runs; honest `mode:"replay"`.
7. **Run the loop** — `/goal docs/GOAL.md` (or the orchestrator equivalent); halt on each gate until `run + observed output` is green.
