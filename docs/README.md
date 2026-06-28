# pepl — Context Packages

This `docs/` folder is the **context layer** for building pepl. It was assembled in a dedicated context-loading session by reading three source repos and synthesizing them. The execution-loop window and the story/experience window read these to know *what* to build, *what* to reuse, and *how* to build it.

## The three threads

| Thread | Question it answers | Source repo | Doc |
|---|---|---|---|
| **Vision** | What is pepl? What demo wins? | `gx` (Johnny's verbatim-intent graph) | [VISION.md](./VISION.md) |
| **Core engine** | What do we reuse to build it? | `doubles` (semantic multi-agent + memory) | [CORE-PORT-PLAN.md](./CORE-PORT-PLAN.md) |
| **Build loop** | How do we build it autonomously? | `dot` + `sayhello` (ultracode loops w/ goals) | [LOOP-FRAMEWORK.md](./LOOP-FRAMEWORK.md) |

Then: [SCOPE-LOCK.md](./SCOPE-LOCK.md) (the ONE problem, locked) and [GOAL.md](./GOAL.md) (the workflow the build loop runs).

## How the three fit together (the synthesis)

pepl is **gx's product** — an invisible-AI personal-context tool that organizes the mess of your life (relationships, history) so you can see it and originate your own story — built on **doubles' engine** — a semantic, multi-agent loop with queryable memory that holds deep context over *one person* — driven by **dot/sayhello's loop** — a lock-before-build autonomous workflow with a held-out judge that refuses to ship ungrounded output.

The fit is tight:

- doubles already *is* "deep context over a person, interpreted semantically." pepl points that engine at *your own life* (so you understand yourself) instead of *impersonating you to others*. **Drop Spectrum/iMessage delivery — pepl delivers through the Next.js web frontend.** That removes an entire layer and helps the ~½-LOC target.
- pepl's hard requirement — *never hallucinate a relationship or fact about the user* — is exactly sayhello's **held-out grounding judge**: every claim traceable to ingested context, or it gets cut. Reuse it as pepl's truth gate.
- The "slightly-wrong seeded graph the user corrects" demo beat (gx) is the perfect **engineered half-half**: precache real ingested data so the demo doesn't wait on live OAuth scraping, while the organize → correct → deepen → output pipeline runs live. (See root [../CLAUDE.md](../CLAUDE.md) §2.)

## The window architecture

- **This window (context loading) — done.** Scaffolded the repo (Next.js `frontend/` + Hono `backend/`), ported the working-style CLAUDE.md, wrote these context packages.
- **Execution loop window.** Runs [GOAL.md](./GOAL.md) as an ultracode workflow: picks up the locked scope + contracts, builds the core engine + demo path stage by stage (S0–S4), and self-validates against the held-out judge until the stop condition is green.
- **Story / E2E experience window.** Builds out the experience, design, and narrative; feeds refined context + integration packages back into `docs/` for the loop to pick up.

## Hard constraints carried into the code

- **No "ported from doubles" / migration comments anywhere.** The ported core must read as clean, original pepl code.
- **No silent fallbacks; engineered half-half only** (root CLAUDE.md §2).
- **Ponytail: ~half the LOC of doubles.** Collapse abstractions, fewest deps, fewest files.
- **Semantic-only in the user-facing loop, fail loud** (carried from doubles).
