# pepl — Windows (Mission Control)

pepl is built across **three windows**, each its own orchestrator / command center. Every window reads **this file** + the root [`../../CLAUDE.md`](../../CLAUDE.md) + the [`../`](../) context packages, then owns its lane. Read the shared block below before opening your window file.

## The three windows

| Window | Owns | Brief |
|---|---|---|
| **1 · Tech & Architecture** *(this repo's current window)* | what concepts/architecture to use, what to keep as context, backend architecture + CONTRACTS, the lean build | [tech-porting.md](./tech-porting.md) |
| **2 · Story & Experience** | gx + hackathon theme → user journey, experience, narrative, demo script, page specs | [story-experience.md](./story-experience.md) |
| **3 · Build Loop** | the autonomous builder: build backend to the locked specs, wire a throwaway test-frontend, loop on stage gates | [build-loop.md](./build-loop.md) |

## How they coordinate

```
Window 1 (tech)  ──CONTRACTS + architecture spec──────▶ Window 3 (build loop)
Window 2 (story) ──journey + DEMO-SCRIPT + page specs─▶ Window 3 (build loop)
Window 1 ◀────── tech constraints / cheap-vs-costly ──▶ Window 2
Window 3 ──────── status: what's wired / green / blocked ─▶ Windows 1 & 2
```

Windows **1 & 2 lock the specs** (run first + continuously); **Window 3 executes** against whatever is locked. A window never invents another window's output — if it's missing, flag it in `../OPEN-QUESTIONS.md`, don't guess.

## Shared context (every window reads this)

**What pepl is (one line):** an invisible-AI personal-context tool — organize the mess of your life (relationships, history) so you can *see yourself* and originate your own story. Full: [../VISION.md](../VISION.md).

**The synthesis:** pepl = `gx`'s product, on a semantic multi-agent engine, built by a lock-before-build loop with a **held-out grounding judge**. Full: [../README.md](../README.md).

**The hackathon:** **Wizard Hackathon** — a one-day sprint (~6 hrs hacking). Track fit: **Potion Lab**. Sponsor prizes to target: InsForge ($500, = pepl's backend infra) + You.com ($1k, citation-backed grounding). Full brief + strategy: [../HACKATHON.md](../HACKATHON.md). **Time discipline is mandatory: demo path only, precache hard.**

**Source repos (read-only context):**

| repo | path | who uses it |
|---|---|---|
| gx | `/Users/johnnysheng/code/gx` | vision / verbatim intent → Window 2 |
| doubles | `/Users/johnnysheng/code/doubles` | engine + architecture reference → Window 1 |
| dot | `/Users/johnnysheng/code/dot` | loop framework + stage gates → Window 3 |
| sayhello | `/Users/johnnysheng/code/sayhello` | held-out judge + node pipeline → Window 3 |
| hackathon | `/Users/johnnysheng/code/hackathon` | theme, DEMO-SCRIPT, DEVPOST, tmux-spawn pattern → Window 2 |
| SOTARE | `/Users/johnnysheng/code/SOTARE` | Johnny's research lab — grounding discipline, cognition store, AI-as-unconscious → distilled in [../reference/SOTARE-RESEARCH.md](../reference/SOTARE-RESEARCH.md) |

**Distilled references:** [../reference/THE-DOUBLE.md](../reference/THE-DOUBLE.md) (what a Double is) · [../reference/SOTARE-RESEARCH.md](../reference/SOTARE-RESEARCH.md) (research to apply) · [../reference/HACKATHON-GOTCHAS.md](../reference/HACKATHON-GOTCHAS.md) (the landmine map — Build window read first) · [../reference/NARRATOR-THE-DOT.md](../reference/NARRATOR-THE-DOT.md) ("The Dot" narrator voice + Pebble-adapted copy) · [../reference/DOUBLES-PORT.md](../reference/DOUBLES-PORT.md) (port doubles' live-scrape engine → pepl; doubles-vs-pepl differentiation — Build window read for ingest).

**Hard constraints (all windows):**
- Code reads as clean, original pepl.
- No silent fallbacks; engineered half-half / precache only (root CLAUDE.md §2).
- Ponytail: lean — fewest lines / deps / files.
- Demo path is sacred; semantic-only + fail-loud in the user-facing loop.

**Stack:** `frontend/` Next.js 16, `backend/` TS + Hono (`/health` + `/api/hello` live).

**Glossary:**
- *engineered half-half* — precached/staged data where the **real pipeline still runs** (labeled `// DEMO_CACHE:`).
- *held-out judge* — critic on a **different model family** than the generator; its corpus = ingested context only.
- *seeded-wrong graph* — the deliberately-imperfect relationship map the user corrects (the activation hook).

**Read order (any window):** this file → root `../../CLAUDE.md` → `../README.md` → your window file → the context packages it points to.
