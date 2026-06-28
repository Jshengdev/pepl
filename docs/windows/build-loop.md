# Window 3 — Build Loop (Mission Control)

> First read [README.md](./README.md) (shared context) + root [`../../CLAUDE.md`](../../CLAUDE.md).

## Charter

The autonomous builder. **Loop** to build out everything backend-wise to the locked specs (CONTRACTS from Window 1, journey + DEMO-SCRIPT from Window 2), and wire it into the frontend as that arrives. Run the lock-before-build loop ([../GOAL.md](../GOAL.md) + [../LOOP-FRAMEWORK.md](../LOOP-FRAMEWORK.md)): stage gates S0–S4, CP-1…CP-7, held-out grounding judge, and prove every "done" with **run + observed output**.

## You own

- **Backend implementation** — the core engine, the `ingest → extract → graph → generate → critic` pipeline, endpoints, the held-out judge, write-through replay.
- A **throwaway test-frontend** (see below).
- **Tests / verification** — the CLI gate (`backend/src/test-e2e.ts`) + per-node checks.
- **Build-loop execution** + status reports.

## The test-frontend (for now)

A deliberately basic frontend whose only job is to **exercise + verify endpoints**: buttons that hit `/ingest`, `/graph`, `/correct`, `/generate`, `/ask`, render the raw responses, and show pass/fail. Treat it as a **placeholder that will be replaced** by Window 2's real experience — but structure its sections **one per pipeline stage** so the real frontend drops in over the same endpoints. No design polish — it's an endpoint harness, not the product.

## You do NOT own

Product vision / story (Window 2). Architecture + contract decisions (Window 1). You build to their locked specs; if a spec is missing or ambiguous, **flag it in `../OPEN-QUESTIONS.md` — don't invent**.

## Inputs

[../GOAL.md](../GOAL.md), [../LOOP-FRAMEWORK.md](../LOOP-FRAMEWORK.md), [../ARCHITECTURE.md](../ARCHITECTURE.md), CONTRACTS (Window 1), DEMO-SCRIPT + journey (Window 2), doubles `src/` for reference patterns.

## Outputs

Working backend + endpoints + verification frontend; status (what's wired, what's green, what's blocked) → Windows 1 & 2.

## Definition of done

The [../GOAL.md](../GOAL.md) STOP CONDITION — a real (precached) input runs the whole journey live, grounded, no fabricated relationships, demo path matches DEMO-SCRIPT, deployed.

## Constraints

Code reads as clean original pepl; engineered half-half only; ponytail; demo path sacred; "done" = run + observed output.
