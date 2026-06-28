# pepl — The Hackathon (Wizard Hackathon)

Shared context: pepl is being built for **Wizard Hackathon** — a themed one-day build sprint (idea → prototype → demo → magic). This doc is the factual brief + the strategic read. Window 2 owns turning it into the demo narrative; all windows respect the time budget.

## The hard reality: it's ~6 hours

| Time | Block |
|---|---|
| 9:00–9:30 | Opening |
| 9:30–11:00 | Theme intro, sponsor demos, talks |
| **11:00–17:00** | **Hacking sprint (~6 hrs)** |
| 17:00–18:00 | Submissions + Judging Round 1 |
| 18:00–19:00 | Finalist demos |
| 19:00–20:00 | Winners + closing |

**Implication (drives every window):** ruthless MVP. The demo path is the *only* path. Precache aggressively (engineered half-half — real pipeline, cached inputs). One hero moment, demoed live. Submission via the official Replit link before the deadline.

## Tracks (pick one)

- 🏟️ **Sports Arena** — sports tech, fitness, fan engagement.
- 🎼 **Creative Expressions** — music, storytelling, writing, art. *(pepl backup: "personalized storytelling powered by user input" = pepl's story/bio generation.)*
- 🧪 **Potion Lab** — **personalization, identity, communication, human connection; apps that adapt to users.** *(pepl's bullseye — examples include "AI assistant that adapts to a user's communication style" and "smart social network based on interests and personality.")*
- 🎮 **GameCraft Arena** — games, gamified experiences.

> **Recommended track: Potion Lab.** pepl = invisible AI over your own relationships + an engine that adapts to *your* voice and context. Direct hit.

## Prizes worth targeting (cash + credits)

| Prize | Reward | pepl angle |
|---|---|---|
| **Best Use of InsForge** | **$500 / $300 / $100** | InsForge is agent-native cloud (model gateway + db + auth + deploy) — **literally pepl's backend**. Build on it → prize + infra in one. |
| **Best Use of You.com** | **$1,000 in credits** | Citation-backed Web Search API → enrichment + grounding layer ("every claim cited"). Reinforces the held-out grounding judge story. |
| **Growing Pines Prize** | $200 winning project | Overall. |
| Special Wizard Awards | various | Best Design / Best Technical Execution / Most Innovative / Best Use of Sponsor Tech — pepl's grounded, in-your-voice demo competes here. |

## Sponsor tools = free credits + candidate dependencies

This changes the [ARCHITECTURE](./ARCHITECTURE.md) dependency choices — prefer sponsor tech where it both wins a prize and supplies what pepl needs:

- **InsForge** — model gateway, compute, deployment, **database, auth**. Candidate replacement for raw OpenRouter + pg + manual deploy.
- **You.com** — Web Search API (real-time, citation-backed). Candidate for the enrichment / external-grounding step.
- **Nebius + Tavily** — $50 tokens + $50 GPU + $25 Tavily search. Nebius for inference/GPU; Tavily as an alternative search.
- **Replit** ($25) — fast deploy / the submission platform is Replit-hosted.
- **Trae** (7-day Pro + $20), **Kite AI** (agent identity/permissions/payments — only if we go agentic-transactional, which the vision doesn't require).

## The tradeoff to decide (6-hour clock)

Adopting new sponsor platforms = prize coverage **but** learning-curve risk in a 6-hr sprint. The ponytail call: commit only where value > friction.

- **Max prize coverage:** InsForge backend (db/auth/model-gateway/deploy) + You.com grounding search. Both are things pepl needs anyway.
- **Balanced:** pick the single highest-leverage one (InsForge — it removes the most build work *and* is the biggest cash prize).
- **Speed-first:** known stack (Hono + a model API + in-memory), use sponsor credits lightly.

> **OPEN — founder decision (see SCOPE-LOCK "Integrations"):** lock the track + which sponsor tech pepl commits to. Everything downstream (deps, deploy, the grounding-citation story) follows from this.

## Participant credits (use them)

Nebius ($50 tokens + $50 GPU) · Tavily ($25) · Replit ($25) · Trae (7-day Pro + $20) · You.com ($100 base, $1k prize). 100K+ across the ecosystem.
