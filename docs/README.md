# pepl — Context Packages

This `docs/` folder is the **context layer** for building pepl. It was assembled in a dedicated context-loading session by reading three source repos and synthesizing them. The execution-loop window and the story/experience window read these to know *what* to build, *what* to reuse, and *how* to build it.

## The three threads

| Thread | Question it answers | Source repo | Doc |
|---|---|---|---|
| **Vision** | What is pepl? What demo wins? | `gx` (Johnny's verbatim-intent graph) | [VISION.md](./VISION.md) |
| **Core engine** | What do we reuse to build it? | `doubles` (semantic multi-agent + memory) | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| **Build loop** | How do we build it autonomously? | `dot` + `sayhello` (ultracode loops w/ goals) | [LOOP-FRAMEWORK.md](./LOOP-FRAMEWORK.md) |

Then: [SCOPE-LOCK.md](./SCOPE-LOCK.md) (the ONE problem, locked) and [GOAL.md](./GOAL.md) (the workflow the build loop runs).

## How the three fit together (the synthesis)

pepl is **gx's product** — an invisible-AI personal-context tool that organizes the mess of your life (relationships, history) so you can see it and originate your own story — running on **pepl's own engine** — a semantic, multi-agent loop with queryable memory that holds deep context over *one person* — driven by a **lock-before-build loop** — an autonomous workflow with a held-out judge that refuses to ship ungrounded output.

The fit is tight:

- pepl's engine holds "deep context over a person, interpreted semantically" — pointed at *your own life* (so you understand yourself) instead of *impersonating you to others*. **pepl delivers through the Next.js web frontend.** That removes an entire layer and keeps the build lean.
- pepl's hard requirement — *never hallucinate a relationship or fact about the user* — is met by a **held-out grounding judge**: every claim traceable to ingested context, or it gets cut. It is pepl's truth gate.
- The "slightly-wrong seeded graph the user corrects" demo beat (gx) is the perfect **engineered half-half**: precache real ingested data so the demo doesn't wait on live OAuth scraping, while the organize → correct → deepen → output pipeline runs live. (See root [../CLAUDE.md](../CLAUDE.md) §2.)

## The window architecture

pepl is built across **three windows**, each its own mission-control. Full briefs in [`windows/`](./windows/):

- **Window 1 · Tech & Architecture** — what concepts/architecture to use, backend architecture + CONTRACTS, the lean build. ([windows/tech-porting.md](./windows/tech-porting.md))
- **Window 2 · Story & Experience** — gx + hackathon theme → user journey, narrative, demo script, page specs. ([windows/story-experience.md](./windows/story-experience.md))
- **Window 3 · Build Loop** — the autonomous builder: build backend to the locked specs, wire a throwaway test-frontend, loop on stage gates ([GOAL.md](./GOAL.md)). ([windows/build-loop.md](./windows/build-loop.md))

The context-loading pass that produced this `docs/` folder was Window 1's first act. See [windows/README.md](./windows/README.md) for the shared context and handoffs.

## Hard constraints carried into the code

- **The core reads as clean, original pepl code.**
- **No silent fallbacks; engineered half-half only** (root CLAUDE.md §2).
- **Ponytail: lean — collapse abstractions, fewest deps, fewest files.**
- **Semantic-only in the user-facing loop, fail loud.**
