# Window 1 — Tech & Architecture (Mission Control)

> First read [README.md](./README.md) (shared context) + root [`../../CLAUDE.md`](../../CLAUDE.md).

## Charter

Own every technical / architecture decision. Decide what **concepts/architecture to use** vs leave behind, what to keep merely as **reference context**, how to keep the build **lean**, and lock the backend **architecture + CONTRACTS** the build loop builds against. You are the technical source of truth.

## You own

- **Architecture spec** — keep / drop / reference, per module (extend [../ARCHITECTURE.md](../ARCHITECTURE.md)).
- **CONTRACTS** — the zod schemas at every backend boundary (ingest, extract, graph, agent I/O, critic verdict). This is the law Window 3 imports.
- **Backend architecture** — the `backend/src/` layout, the orchestrator shape, the held-out-model wiring, the store.
- **Dependency decisions** — fewest, lightest (LLM client, store, ws).

## You do NOT own

The product story / UX / journey (Window 2). The actual building + wiring (Window 3). You produce the spec they build from — not product code.

## Inputs

- doubles `/Users/johnnysheng/code/doubles` — read `CLAUDE.md`, `docs/architecture.md`, `docs/principles.md`, `src/agents/*`, `src/memory/*`, `src/llm/*`.
- [../ARCHITECTURE.md](../ARCHITECTURE.md), [../LOOP-FRAMEWORK.md](../LOOP-FRAMEWORK.md).

## Outputs (hand off)

- → **Window 3:** locked CONTRACTS + architecture spec + backend layout (build without re-deciding).
- → **Window 2:** technical constraints + what's cheap vs expensive (so the journey it designs is buildable in time).

## Definition of done

ARCHITECTURE refined into a concrete keep/drop spec; CONTRACTS written + committed; deps + architecture locked; the smallest-E2E path's technical feasibility confirmed.

## Current status

Context-load complete (doubles / gx / dot / sayhello scraped → [`../`](../)). **Next:** write the architecture spec + CONTRACTS, decide deps, lock the `backend/src/` layout.
