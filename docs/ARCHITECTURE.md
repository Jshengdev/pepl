# pepl — Architecture (concept)

A high-level abstract of what pepl's engine *is*. Conceptual, not an implementation checklist.

## The idea

pepl builds a **Double** of a person — a semantic model of who they are — from their interactions, and lets them (and others) **see, reclaim, and connect** those stories. The engine is a **semantic multi-agent loop over a memory of you**: interpretation is done by agents; structured state is just substrate. The framing (from our research): the AI is the *unconscious* that surfaces; the human is the *conscious* that reclaims meaning.

## The loop (conceptual)

A turn flows through agents, each owning exactly one decision:

- **Reasoner** — reads your graph + memory; decides what to surface / which output to build.
- **Generator** — produces the artifact (a story, a bio, an answer) in *your* voice, grounded in *your* context.
- **Critic (grounding + voice)** — a held-out judge: every claim must trace to a real interaction, and it must sound like you, or it regenerates.
- **Recovery** — semantic handling when something fails; never a canned string.

State (people, interactions, signals, relational state) is data; decisions are agents.

## Ingestion → the relationship graph

Raw signal (a person's footprint / messages) is extracted into **people + relationships** → the visual graph, seeded deliberately imperfect so the person corrects it (the activation hook). The correction flows back into context and shapes the next output.

## The grounding gate (the truth of the product)

Stories are a **grounded knowledge format**: every claim traces back to source (conclusion → reasoning → evidence → interaction). A held-out critic — a different model family than the generator, with its evidence limited to ingested context — catches anything ungrounded. This is what makes *"this is really me"* credible instead of a horoscope.

## Memory

A queryable memory of one person — people, interactions, signals, relational state. Semantic recall (embeddings + similarity) surfaces relevant past moments. Each person is an isolated namespace.

## Shape (conceptual layout)

- **agents** — reasoner · generator · critic · recovery (+ shared contracts)
- **ingest** — extract people/relationships; build, seed, and update the graph
- **memory** — schema · store · recall
- **orchestrator** — the turn loop
- **llm** — model routing + the held-out-family rule
- **web** — the API + a live stream of the graph forming

The frontend renders the graph + correction, the generated story, and the ask surface — bound to the live stream so it feels alive.

## Principles

- Semantic-only in the user-facing loop; deterministic only for data lifecycle / plumbing.
- No silent fallbacks; engineered half-half (precache where the real pipeline still runs).
- Compose over construct; fewest dependencies and files.
- The demo path is sacred.

## Smallest demo spine

**surface** (a Double forms from precached signal) → **reclaim** (you correct your story) → **connect** (a second person sees how your Double sees them). The processing runs live; only slow/flaky inputs are precached (labeled `// DEMO_CACHE:`).
