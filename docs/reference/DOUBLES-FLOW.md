# Reference — What a "Double" Is (doubles flow + port mapping)

Distilled from doubles' planning docs. This is the *product flow* (the code map is in [../CORE-PORT-PLAN.md](../CORE-PORT-PLAN.md)). Use it to decide what pepl ports vs builds net-new.

## What a Double is

An impersonator-twin that learns to sound like you and represents you. Ethos: *"LARP about your life to the only person who'd care: yourself."* **Voice fidelity is the product** — if it doesn't sound like you, nothing else matters. Not a chatbot/therapist/companion — a Turing test where you're both operator and judge.

## The flow (solo, v1)

1. **Onboard (minimal, no quiz)** — Google sign-in + phone + MBTI pick + optional public-footprint pastes (X / GitHub / LinkedIn / site). Triangulation points, not forms.
2. **Reveal (the install hook)** — one LLM call → *"I think you're someone who [specific, not horoscope]."* Shown with a ~2s suspense beat; an LLM-judge gates specificity ≥0.7. ← cheapest, highest-impact mechanic.
3. **Conversation test** — you chat; it replies *as you*; you catch misses ("I'd never say that"); each good turn = a trust point. Loop: **Thinker** (picks a speaking shape) → **Talker** (voice) → **Critic** (5-axis fidelity, regen ≤2) → **Recovery** (semantic ack or silence; never a templated string).
4. **Reclaim** — you correct / own how it represents you ("cruel and accurate" → noted).
5. **Earn → bounded action (later tiers)** — once trust accrues, it can act for approved contacts.

## Storytelling is the medium

Triangulates three stories: the one you *tell* (footprint), the one you *live* (calendar/email), the one you *narrate* (chat). Surfaces the gap as **receipts** ("GitHub says 12 days, not shipping — talk about it?"). Sells receipts, **not** transformation.

## Multiplayer — DESIGNED but DEFERRED (Tier 2/3) ← this is pepl's center

doubles is solo-first; the specced-but-unbuilt multiplayer mechanics *are* Johnny's pepl vision:
- **Mii-card exchange (PX-6):** send a friend your "island snapshot" (persona + state); they see how your Double sees *you* → self-view vs friend-view juxtaposition = the viral moment. **(= "someone else makes a node and sees how close you really are to your interests.")**
- **Group chats (Tomodachi):** watch your Double talk to a friend's Double.
- **Co-rehearsal:** two Doubles run scenes in parallel, low-latency.

> **pepl ≈ doubles' deferred multiplayer vision brought forward.** That's the differentiator — and the heaviest part for a 6-hr build.

## Real-time "world" visualization — NET-NEW for pepl

doubles is deliberately **text-only / iMessage**; it *rejected* a "watch your AI being built" UI (scope + it breaks the conversational feel). Johnny's *"walking toward your desk / watch the Double form"* is **new build** — a strong "alive / magical" demo wow that fits Wizard Hackathon, but not a port.

## Data ingestion

Public footprint (API / paste) at onboard; Gmail/Calendar via Composio (opt-in, soft-pitched in chat) at Tier 1+ — only embeddings/summaries stored, never raw. For pepl's demo: **precache** the ingest (engineered half-half).

## Port weight (for 6 hrs)

| Mechanic | Weight | pepl call |
|---|---|---|
| Reveal ("I think you're someone who…") | LIGHT | **port — the hook** |
| Talker + Critic voice loop | LIGHT | **port — the engine** |
| Single-source scrape / precached ingest | LIGHT | precache |
| Reclaim / correction | LIGHT | **port — activation** |
| Thinker shapes · forbidden-phrases · anti-repeat | MEDIUM | optional |
| Mii-card juxtaposition (the multiplayer hook) | MEDIUM | **the pepl differentiator — smallest version** |
| Real-time world viz | MEDIUM–HEAVY | net-new wow; scope carefully |
| Group chats · co-rehearsal · Gmail OAuth · time-capsules | HEAVY | defer / precache |

Sources: doubles `docs/planning/{prd,prfaq,planning-narrative,designer-handoff,digital-twin-flow}.md`, `docs/architecture.md`, `CLAUDE.md`.
