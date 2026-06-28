# pepl — Architecture (concept)

A high-level abstract of what pepl's engine *is*. Conceptual, not an implementation checklist.

## The idea

pepl builds a **Double** of a person — a semantic model of who they are — from their interactions, and lets them (and others) **see, reclaim, and connect** those stories. The engine is a **semantic multi-agent loop over a memory of you**: interpretation is done by agents; structured state is just substrate. The framing (from our research): the AI is the *unconscious* that surfaces; the human is the *conscious* that reclaims meaning.

## The conversational loop (faithful to doubles)

pepl's core **is the doubles turn loop** — reproduce its *feeling*. Full spec: [reference/DOUBLES-FEELING.md](./reference/DOUBLES-FEELING.md).

`transcript in → Thinker → Talker → Critic → (regen ≤2) → Recovery on failure → reply (spoken)`

- **Thinker** (fast model) — picks one *speaking shape* (mirror / pullback / probe_response / deflect / name_state / repair_offer) + a register call (length/casing/punctuation).
- **Talker** (voice model) — one reply *in the user's voice*, grounded in real entities, honoring the forbidden-phrase + anti-repetition rules.
- **Critic** (judge model) — 8 axes (voice fidelity · no-chatbot-language · register · novelty · no-persona-break · safety · voice-texture incl. an **em-dash floor** · grounding); emit or regen (≤2).
- **Recovery** — semantic ack in-voice or honest `___SILENCE___`; never a template.

State (people, interactions, signals, persona) is data; every decision is an agent. Semantic-only in the user-facing loop; no silent fallbacks.

## Delivery: voice, not text (the one swap)

The orchestrator is delivery-agnostic (`runTurn(transcript) → reply`). doubles delivered via iMessage; **pepl delivers via Grok voice + live transcription** (mic → STT → transcript → loop → reply → TTS). Spec: [reference/VOICE-LAYER.md](./reference/VOICE-LAYER.md).

## Ingestion → the relationship graph

Raw signal (a person's footprint / messages) is extracted into **people + relationships** → the visual graph, seeded deliberately imperfect so the person corrects it (the activation hook). The correction flows back into context and shapes the next output.

## The grounding gate (the truth of the product)

Stories are a **grounded knowledge format**: every claim traces back to source (conclusion → reasoning → evidence → interaction). A held-out critic — a different model family than the generator, with its evidence limited to ingested context — catches anything ungrounded. This is what makes *"this is really me"* credible instead of a horoscope.

## Memory

A queryable memory of one person — people, interactions, signals, relational state. Semantic recall (embeddings + similarity) surfaces relevant past moments. Each person is an isolated namespace.

## Shape (conceptual layout)

- **agents** — thinker · talker · critic · recovery (the doubles loop) (+ shared contracts)
- **voice** — Grok TTS (out) + realtime STT / live transcription (in) — the delivery layer (replaces iMessage)
- **ingest** — extract people/relationships from Composio Gmail → signals + the graph
- **memory** — schema · store · recall (RRF · paraphrase · honest absence)
- **orchestrator** — the turn loop (`runTurn(transcript) → reply`), delivery-agnostic
- **llm** — model tiers (Thinker fast · Talker voice · Critic judge)
- **web** — the API + WS (live transcription) + the reveal

The frontend renders the graph + correction, the generated story, and the ask surface — bound to the live stream so it feels alive.

## Principles

- Semantic-only in the user-facing loop; deterministic only for data lifecycle / plumbing.
- No silent fallbacks; engineered half-half (precache where the real pipeline still runs).
- Compose over construct; fewest dependencies and files.
- The demo path is sacred.

## Smallest demo spine

**surface** (a Double forms from precached signal) → **reclaim** (you correct your story) → **connect** (a second person sees how your Double sees them). The processing runs live; only slow/flaky inputs are precached (labeled `// DEMO_CACHE:`).
