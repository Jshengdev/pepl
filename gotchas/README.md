# `gotchas/` — the build runbook, one file per window

This folder is a **rediscoverable record of the high-ROI things each build window did** — the decisions, the exact commands, the landmines, and (most importantly) *how each thing was tested, validated, and verified*. The goal: anyone can re-walk a window's highest-impact work and demonstrate it, verbatim.

**This is not a changelog.** It is the opposite of "we did X." It is: *"here is the exact thing, why, the gotcha that bit us, the fix, and the one command that proves it works."*

## Convention

- **One file per window**, named for what that window *owned* (not "window-4" — the responsibility):
  - `gotchas/integration-deploy.md` — Integration, deploy & demo-readiness (this window — written first, as the template) ✅
  - `gotchas/backend-engine.md` — the pipeline/agents/orchestrator + build-loop (Window 3) ✅
  - `gotchas/stack-and-sponsors.md` — tech stack, sponsor provisioning, contracts & engine spec (Window 1) ✅
  - `gotchas/story-experience.md` — narrator/voice/experience/FE design (Window 2) ⬜
  - *(adjust names to your actual responsibility)*
- Each window **adds one line to the index above** when done.
- Capture **verbatim what's worth saving** — exact commands, code, error strings. Not every turn; the high-impact stuff.

## The template every file follows

```
# <Window name> — Gotchas & Build Runbook

## 0. What this window owned
   One paragraph + the demo-path slice you were responsible for.

## 1. The high-ROI decisions (and WHY)
   The 3–7 decisions that mattered most. For each: the call, the alternatives, why this won.

## 2. How it was built — step by step
   Numbered. Each step: what you did + the exact command/code + → verify: <the check that proved it>.

## 3. Gotcha catalog  ← the meat
   For EACH landmine, this exact shape:
   - **Symptom** (the verbatim error / wrong behavior)
   - **Root cause** (what was actually happening)
   - **Fix** (the exact change — code/command, verbatim)
   - **Verify** (the command/check that proves it's fixed)

## 4. Verbatim commands & scripts worth saving
   The reusable commands + helper scripts (deploy, seed, verify) — copy-pasteable.

## 5. How to test / validate / verify this window end-to-end
   The exact sequence to prove this window's slice works on real input. No mocks.

## 6. Cross-window coordination notes
   What you depended on / what depends on you / how you avoided clobbering.
```

## The prompt to hand to each of the other windows

Paste this into windows 1/2/3 (each does its own file):

> **We're building a `gotchas/` knowledge base — one file per window — so each window can rediscover and demonstrate the highest-impact work it did.** The integration/deploy window already scaffolded `gotchas/README.md` (read it for the template + convention) and `gotchas/integration-deploy.md` as the worked example.
>
> **Your task:** read back through *your own* work in this window and extract every **high-ROI** decision, action, and gotcha. Write `gotchas/<your-responsibility>.md` (name it for what you owned — e.g. `backend-engine.md`, `contracts.md`, `story-experience.md`) following the template in `gotchas/README.md`, then add a one-line entry to the index there.
>
> **Capture verbatim what's worth saving** — exact commands, code snippets, error strings. Not every turn; the things that had real impact. For **every gotcha** use the exact shape: **Symptom → Root cause → Fix (verbatim) → Verify (the command/check that proves it)**. Include a numbered **"how it was built"** section (each step with its verify check) and a **"how to test/validate/verify end-to-end"** section that runs on *real input, no mocks* (CLAUDE.md §2 — if a reader asked "is this real?", the verify command must answer yes).
>
> Bias to **the few things that were genuinely high-impact + the landmines that cost the most time**, captured precisely enough that someone could reproduce and demonstrate them. Math/verbatim > vibes.

---

*Started by the integration/deploy window on 2026-06-29. Each window owns its own file; this README is shared — only append to the index.*
