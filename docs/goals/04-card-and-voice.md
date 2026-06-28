# /goal 04 — Card persistence + talking-face Dot

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed.** No fallbacks. Builds on 01–03.

**Serves (beats):** Beat 2 (the talking face) + Beat 3 (make your card).

**Build (two small things):**
1. **Card persist (S2d):** `POST /api/card {userId, smiley, smileyColors?, cardGradient?}` persists the drawn mark + colors + gradient as the node avatar / card style; `/reveal` (`Dossier.smiley`, `grounding.kind:"user"`) + `/api/map` read it back. **Assert write→read-back** in the gate (persistence-LARP guard).
2. **Talking-face Dot (S2e):** relax onboarding (drop the 3-field `OnboardingAnswers`; each turn → `Signal{source:"onboarding"}`); `GET /api/dot/intro` (**`// DEMO_CACHE:` prewarmed first line + the ONE question**, instant) + `POST /api/dot/turn {userId, audio|text, wrapUp?}` → `{transcript, reply:{text,audioUrl}, done}` (Grok STT→witty reply→TTS, **≥1 follow-up**; on `wrapUp:true` → "timer's about to be up" + "thanks bro, ima send u over to my buddy", `done:true`). 30-second budget.

**Files:** `web/server.ts` (`/api/card`, `/api/dot/*`), `memory/store.ts` (smiley), `types.ts` (relax OnboardingAnswers), an `agents/dot.ts` or similar (Grok turn).

**🔍 Done-when:** a posted smiley round-trips onto the reveal + node avatar; `/intro` is instant audio+question; `/turn` replies witty with ≥1 follow-up; `wrapUp` returns the buddy sign-off; each turn is a queryable `source:"onboarding"` Signal; autoplay-block path returns text.

**Gotchas:** cache ONLY Dot's first line (`// DEMO_CACHE:`), the rest live; the mouth-sync is front-end (audio amplitude — see INTEGRATION); persistence write→read-back.

**Spec:** GOAL.md S2d/S2e · DESIGN-GOALS Part 2/4 · reference/NARRATOR-THE-DOT.md §4 (the exact copy) · INTEGRATION.md.
