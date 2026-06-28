# Window 4 — Frontend ↔ Backend Integration & Polish (Mission Control)

> First read [README.md](./README.md) (shared context) + root [`../../CLAUDE.md`](../../CLAUDE.md) + [`../INTEGRATION.md`](../INTEGRATION.md) (your wiring contract).

## Charter

Wire Johnny's per-page front-end examples onto the **live backend** so the demo path **just works** end to end on a real account — then **polish the experience** (the blur transition, the mouth-sync, the timing, the feel). You own the **seam**: the API client, the WS liveness, the data binding, the fail-loud + loading states, and the final polish. The product is judged on this seam working.

## You own

- **[INTEGRATION.md](../INTEGRATION.md)** — the wiring contract (every UI element → its endpoint / WS event / data shape / states). Keep it current.
- The frontend **API client** + the **WS hook** (WS → UI state).
- **Binding Johnny's per-page front-end examples** onto the backend endpoints — the real UI replacing the harness, drop-in over the same shapes.
- The **experience polish:** the reveal's blur transition, the talking-face mouth-sync, **blur-up loading (no spinners)**, the reveal beat, reduced-motion.
- **Fail-loud + honest states in the UI:** red FAILED badge on any node failure, honest empty (logged), a visible **live/cached mode badge**.

## You do NOT own

The backend engine/endpoints (Window 3 builds them to DESIGN-GOALS). The product story (Window 2). The contracts (Window 1). You wire + polish against locked specs; if an endpoint/shape is missing or wrong, **flag it in [../OPEN-QUESTIONS.md](../OPEN-QUESTIONS.md) — don't invent**.

## Inputs

[../INTEGRATION.md](../INTEGRATION.md), [../DESIGN-GOALS.md](../DESIGN-GOALS.md) (per-page backend contracts), `backend/src/types.ts` (the shapes — import type-only), [../EXPERIENCE.md](../EXPERIENCE.md) (the feel) + [../DEMO-SCRIPT.md](../DEMO-SCRIPT.md) (the beats), **Johnny's per-page front-end examples**, [../reference/NARRATOR-THE-DOT.md](../reference/NARRATOR-THE-DOT.md) (motion/voice), [../reference/HACKATHON-GOTCHAS.md](../reference/HACKATHON-GOTCHAS.md) (the FE-seam landmines: CORS, WS clients=0, refresh-rehydrate, inline mocks).

## Working mode

The demo path is the only path; it must run end to end on a **real connected account**. **No spinners** (blur-up). **No silent fallback** (red badge). Zero inline mock data in shipping code (gate dev mocks behind `MOCK_*`). "Done = the page runs against the live backend and the beat lands."

## Definition of done

Every v3 beat's UI is bound to the live backend; the demo path runs end to end, in-brand, on an account that isn't Johnny's; fail-loud everywhere; reduced-motion guarded; the experience is polished to the feel in EXPERIENCE/DEMO-SCRIPT.
