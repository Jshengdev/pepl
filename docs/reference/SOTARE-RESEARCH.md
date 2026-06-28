# Reference — SOTARE research to apply

Distilled from `/Users/johnnysheng/code/SOTARE` (Johnny's meta-research lab — "all the research I've ever had"). What's relevant + applicable for pepl.

## The two ideas that reframe pepl

- **#30 — AI as the *unconscious* mind.** The Double accumulates understanding from your interaction stream and surfaces sparks; the *human* (conscious) makes meaning + decides. Inverts the usual "query → answer." For pepl: the Double isn't a real-time Q&A bot — it's an accumulating unconscious that surfaces *who you are* for you to **reclaim**. Pitch framing: *"machines PROVE, humans MEAN."*
- **#21 — The AI Twin.** Build an AI version of a person from their verbatim docs + reactions, QA'd by them. Stanford digital-twin research: the richest method is augmenting the prompt with rich *interview data*, not heavier persona prompts. Convergence-via-different-paths = genuine insight, not echo (the **Two-Eyes** test).

## The grounding discipline (= pepl's truth gate — and it's Johnny's own research)

SOTARE treats **stories as a grounded knowledge format**, not decoration: every claim traces to source (backward-propagation: conclusion → reasoning → evidence → source), byte-exact quote grounding, mechanical gates that reject "silent LARP." Same idea as sayhello's held-out judge — so pepl's *"never fabricate who you are; every claim grounded in your interactions"* is founded twice. The **living chapters** (`research-app/chapters/`) are the model: narrative + a grounding manifest.

## Reusable primitives (patterns we can apply)

- **Cognition store + FAISS** (`tools/cognition/cognition.py`, `faiss_index.py`) — content-stable IDs across rebuilds, namespace filtering (each Double = a namespace), sub-second retrieval. The interaction-memory backbone *if* we want semantic recall.
- **Harness loop** (`harness.sh`) — Scout → Plan → Auto-loop → Retro → QA → Status; JSON state; atomic per-iter commits. Overlaps dot/sayhello's loop (Window 3).
- **Ledger pattern** — philosophy / hypotheses / tickets with source pointers — a model for a Double's evolving beliefs from interaction data.
- **Two-Eyes test** — "does the Double's story match what the real person would say?", measured over time — pepl's fidelity metric.

## Apply to pepl

1. Frame the demo on **#30**: the Double *surfaces*, the human **reclaims** (conscious meaning-making).
2. Every story claim = a **backward-trace** to a real interaction (the grounding gate = the truth of the product).
3. If semantic recall is needed, **reuse** the cognition store + FAISS (one namespace per person) rather than rebuild.
4. Compose, don't construct (Belief #28) — reuse, don't rebuild (= ponytail).

Paths: `CLAUDE.md`, `principles/extracted/philosophy.md` (#30, #21, #28), `srm-state/research-compass.md`, `research/domain-expert-agents-sota-2025.md` (§1.5 digital twins), `tools/cognition/*`, `research-app/chapters/`.
