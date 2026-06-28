# Window 1 — Tech & Porting (Mission Control)

> First read [README.md](./README.md) (shared context) + root [`../../CLAUDE.md`](../../CLAUDE.md).

## Charter

Own every technical / porting decision. Decide what to **port** from doubles vs leave behind, what to keep merely as **reference context**, how to hit the **~½-LOC** target, and lock the backend **architecture + CONTRACTS** the build loop builds against. You are the technical source of truth.

## You own

- **Port manifest** — keep / drop / reference, per doubles module (extend [../CORE-PORT-PLAN.md](../CORE-PORT-PLAN.md)).
- **CONTRACTS** — the zod schemas at every backend boundary (ingest, extract, graph, agent I/O, critic verdict). This is the law Window 3 imports.
- **Backend architecture** — the `backend/src/` layout, the orchestrator shape, the held-out-model wiring, the store.
- **Dependency decisions** — fewest, lightest (LLM client, store, ws).

## You do NOT own

The product story / UX / journey (Window 2). The actual building + wiring (Window 3). You produce the spec they build from — not product code.

## Inputs

- doubles `/Users/johnnysheng/code/doubles` — read `CLAUDE.md`, `docs/architecture.md`, `docs/principles.md`, `src/agents/*`, `src/memory/*`, `src/llm/*`.
- [../CORE-PORT-PLAN.md](../CORE-PORT-PLAN.md), [../LOOP-FRAMEWORK.md](../LOOP-FRAMEWORK.md).

## Outputs (hand off)

- → **Window 3:** locked CONTRACTS + port manifest + backend layout (build without re-deciding).
- → **Window 2:** technical constraints + what's cheap vs expensive (so the journey it designs is buildable in time).

## Definition of done

CORE-PORT-PLAN refined into a concrete keep/drop manifest; CONTRACTS written + committed; deps + architecture locked; the smallest-E2E path's technical feasibility confirmed.

## Current status

Context-load complete (doubles / gx / dot / sayhello scraped → [`../`](../)). **Next:** write the port manifest + CONTRACTS, decide deps, lock the `backend/src/` layout.
