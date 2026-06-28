# pepl — GOAL (the ultracode workflow the loop runs)

This is the kickoff the **execution-loop window** runs (`/goal docs/GOAL.md` in Claude Code, or the orchestrator-script equivalent — see LOOP-FRAMEWORK "gotcha #1"). It builds the gx product on the ported doubles engine, validated by the sayhello-style held-out judge.

## STEP 1 — Read context IN ORDER, then confirm scope (mandatory gate)

Read, in this order:
1. `../CLAUDE.md` — how we build (MVP-first, demo-path-sacred, no silent fallbacks, engineered half-half).
2. `docs/VISION.md` — what pepl is and the demo that wins.
3. `docs/SCOPE-LOCK.md` — the ONE problem + crystal I/O + journey + CUT list.
4. `docs/CORE-PORT-PLAN.md` — the engine to port from doubles (~½ LOC, no migration comments).
5. `docs/LOOP-FRAMEWORK.md` — stage gates, CP-1…CP-7, the held-out judge, replay.

Then **confirm scope in ONE paragraph** before authoring anything:
- Restate the ONE problem.
- Crystal input shape · crystal output shape.
- The hero / "catch" moment.
- The integrations and where each lands on screen.

If SCOPE-LOCK is still `DRAFT` / integrations are `TODO`, flag it in `docs/OPEN-QUESTIONS.md` and get confirmation — don't invent scope.

## STEP 2 — Author and run the workflow (staged, live-tested from the first node)

Build the journey from SCOPE-LOCK as typed nodes (`defineNode()`, zod at every boundary), streaming each node over WS so the UI lights up live.

- **S0 Scaffold** — ✅ already done (Next.js `frontend/` + Hono `backend/`). Add `backend/src` skeleton from CORE-PORT-PLAN layout; write types from CONTRACTS. *Done when:* installs, typechecks, both `dev` servers boot.
- **S1 Prove the pipe (STUB)** — ingest → extract → graph → render → correct → generate → critic → emit, all on canned content. *Done when:* one run animates the entire journey end-to-end, in-brand.
- **S2 Real wiring** — swap stubs for real, node by node, live-test each: real precached ingest → live extract → live graph (seeded slightly wrong) → live generate → **held-out critic** (grounding + voice). *Done when:* one real input runs the whole journey and the hero moment lands grounded in real data; no fabricated relationships survive the judge.
- **S3 Persistence + trace + polish** — write-through recording so a run rehydrates on refresh; seam-log every boundary; polish the demo path to the design spec. *Done when:* demo path is in-brand + recordable, a run rehydrates, replay is an honest cached real run.
- **S4 Deploy + freeze** — public URL serves the demo path; freeze with buffer.

Run `backend/src/test-e2e.ts` as the CLI gate at each stage (`exit 0` = pass). It must assert the hero beats: graph built from real data, generated output grounded (every claim → a signal), zero invented people/facts.

## STOP CONDITION (done when ALL are true, not before)

- A real (precached) input runs the **entire** journey live, end-to-end.
- The relationship graph is built from real data; the correction beat updates it; the generated bio/story is **grounded** — every claim traceable, none invented (held-out judge `emit`, `fabricatedClaims` empty).
- Every panel reads a real endpoint/event; no silent stubs (failures show a visible FAILED badge).
- The demo path matches `docs/DEMO-SCRIPT.md` and is in-brand.
- Public deploy URL serves the demo path.
- The ported core carries **no migration comments** and lands near the ~½-LOC target.

## Constraints (always on)

CP-1…CP-7 from LOOP-FRAMEWORK + root CLAUDE.md §2 (no silent fallbacks; engineered half-half only) + §1 ponytail ladder (fewest lines/deps/files). Demo path is sacred; WIP = 1; "done" = run + observed output.
