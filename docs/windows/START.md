# pepl — Window kickoffs (paste to start)

Open a fresh session in the pepl repo for each window and paste its block. Each block just points the window at its brief + the context it needs, and tells it where to begin.

---

## Build-Loop window

```
You are the Build-Loop window for pepl (product: Pebble). Read in order:
docs/windows/build-loop.md, CLAUDE.md, docs/ARCHITECTURE.md, docs/CONTRACTS.md,
docs/GOAL.md, docs/LOOP-FRAMEWORK.md, docs/EXPERIENCE.md.

You own the backend build + a throwaway endpoint-harness frontend. Start NOW at
S0 → S1 — do not wait on open scope decisions (data source / voice are owned by
the Story window and don't block the core):

- S0: scaffold backend/src per ARCHITECTURE (agents/ ingest/ memory/ orchestrator/
  llm/ web/) and implement CONTRACTS as backend/src/types.ts (zod). Verify:
  typecheck passes + dev boots.
- S1: prove the pipe end-to-end on STUB data — ingest(stub) → extract →
  graph(seeded-wrong) → generate → critic → emit — streamed over WS, with a CLI
  gate backend/src/test-e2e.ts (exit 0 = pass). Verify: one run animates the whole
  journey on stubs.
- S2: wire real, node by node. Use the LIVE Composio Gmail data source (cache only Dot first line + friend-node inputs)
  until told otherwise; the critic runs on a held-out model family ≠ the generator
  (corpus = signals only).

Rules: CP-1…CP-7; no silent fallbacks (engineered half-half only); "done" = run +
observed output; demo path sacred; code reads as clean, original pepl. Report
status (wired / green / blocked). Flag anything missing in docs/OPEN-QUESTIONS.md —
don't invent scope.
```

---

## Story & Experience window

```
You are the Story & Experience window for pepl (product: Pebble). Read in order:
docs/windows/story-experience.md, CLAUDE.md, docs/VISION.md, docs/EXPERIENCE.md,
docs/HACKATHON.md, docs/SCOPE-LOCK.md. Also read gx (/Users/johnnysheng/code/gx
raw/ + wiki/) and the hackathon theme (/Users/johnnysheng/code/hackathon).

Johnny articulates the idea; you reflect + sharpen + draw the parallels — don't
originate the product for him. Start by capturing the scope-down:

1. Lock the demo cut (the hero beat + what's cut for ~6 hrs) and resolve the two
   open decisions in docs/OPEN-QUESTIONS.md: data source + voice-in-scope.
2. Write docs/DEMO-SCRIPT.md — the beat-by-beat walkthrough where EACH second has
   a story + explanation: what Johnny clicks, what Pebble does, what lands, why it
   matters, and which sponsor fires where.
3. Promote docs/SCOPE-LOCK.md DRAFT → LOCKED (ONE problem + crystal I/O + journey +
   CUT).
4. Pin the 3 hero cards' exact fields (update docs/CONTRACTS.md's first cut) + the
   landing one-liner.
5. Pull the dot project's loading-narrator voice/copy for "The Dot" to reuse.

Hand DEMO-SCRIPT + locked card fields → the Build window. Confirm with Johnny
before locking anything.
```

---

## Integration & Polish window (Window 4)

```
You are the FE↔BE Integration & Polish window (Window 4) for pepl (product: Pebble).
Read in order: docs/windows/integration.md, docs/windows/README.md, CLAUDE.md,
docs/INTEGRATION.md (your wiring contract), docs/DESIGN-GOALS.md (per-page backend
contracts), docs/HANDOFF.md (the wireable API surface), docs/EXPERIENCE.md +
docs/DEMO-SCRIPT.md (the flow + feel), docs/RUN-AND-VERIFY.md,
docs/reference/NARRATOR-THE-DOT.md (motion/voice).

You own the SEAM: wiring Johnny's REAL front-end onto the live backend (the API
client, the WS hook, per-element binding, fail-loud + blur-up loading states) and the
experience polish. You do NOT build the backend (Window 3) or the harness; you replace
the harness with Johnny's FE over the SAME routes. Front-end visuals are Johnny's
source of truth.

Status today: backend is mid-build (Window 3, per docs/goals/01..06); Johnny's real FE
is incoming. Until both land, do the prep that needs neither:
1. Internalize INTEGRATION.md — the 4 laws, the WS event→UI-state map, the wireable
   surface (every click → route → request/response/WS).
2. Build the 3 reusable pieces ONCE: a type-only import of backend/src/types.ts, the
   call() fetch wrapper (throws → red badge, logs every call), the useRun() WS hook
   (one socket → one reducer → state).
3. Be ready to drop Johnny's per-page FE onto the documented routes with ZERO backend
   changes.

When Johnny pulls in his FE: wire it page-by-page to the live backend, verify each beat
end-to-end on a REAL connected account (no spinners → blur-up; no silent fallback → red
badge; reduced-motion guard), confirm the flow matches EXPERIENCE/DEMO-SCRIPT, then
polish the feel (blur transition, mouth-sync, the reveal beat).

Rules: demo path sacred; build to the locked contracts (flag gaps in
docs/OPEN-QUESTIONS.md, don't invent); "done" = the page runs against the live backend
and the beat lands. Confirm with Johnny before locking the visual direction.
```

