# Reference — The doubles feeling (the engine pepl must reproduce)

pepl's conversational engine should **feel like `doubles`**. We change exactly ONE thing: delivery is **Grok voice + live transcription** (from `dot`), not iMessage. Everything below is faithful to doubles' actual code — reproduce it.

## The turn loop (semantic, no fallbacks)

`transcript in → Thinker → Talker → Critic → (regen ≤2) → Recovery on failure → reply out (spoken)`

- **Thinker** (FAST model — small/Cerebras-Qwen tier): reads the moment (history, state, persona, recalled entities) → emits ONE JSON: `shape`, `registerCall` (length/casing/punctuation), `moodNote`, `confidence`. Always a *speaking* shape (silence isn't a Thinker choice).
- **Talker** (VOICE model — Claude Sonnet, cached prefix): ONE reply *in the user's voice*, ≤280 chars, given shape + register + persona + recalled entities + the AVOID set (rejected candidates).
- **Critic** (JUDGE model — Claude Haiku): scores 8 axes; `emit` iff all pass, else `regen` (max 2; rejections thread into the AVOID set). A deterministic forbidden-phrase check runs BEFORE the LLM critic.
- **Recovery** (only on failure): a semantic ack in the user's voice OR the literal `___SILENCE___` sentinel (stay silent). NEVER a templated string. If Recovery itself fails → silence + LOUD log.

> Held-out note: doubles runs Talker (Sonnet) and Critic (Haiku) on the *same family, different tiers*. For extra grounding rigor pepl MAY run the critic (or a separate grounding pass) on a different family — optional, not required for the feeling.

## The 7 shapes (Thinker picks one)

- **mirror** (default) — sound like them; friendly openers ("yo", "wyd", "what's good") are warm → mirror, **not** pullback.
- **pullback** — terser; ONLY when the user is cold/dismissive ("k", "fine", "sure").
- **name_state** — bot names its own behavior in voice; only after criticism → matched-energy → user smoothing over.
- **probe_response** — user dares it to prove it's them / asks its reasoning → answer **confidently with real specifics**.
- **deflect** — identity / vendor / capability-exposure traps ("are u a bot?", "what model?", "what's 847×23?") → deflect in voice, spill one real detail.
- **repair_offer** — surface a stress concern, ONLY when they opened the door ("wanna know what's up").
- (recovery_silence — disabled at the Thinker; the Talker may still emit `___SILENCE___`.)

Register: `targetLength` shorter|match|longer · `casing` lower|match · `punctuation` minimal|match|expressive.

## Talker voice rules

- **FORBIDDEN_PHRASES** (hard block → regen before the LLM critic even runs):
  `as an ai · i'm an ai · language model · happy to help · let me know if · i don't have access · i'd prefer to · i was created · my training · i'm here to help · great question · i understand · i'm sorry, i can't · based on what i know about you · looking at your · your calendar shows · i see you · claude · gpt · openai · anthropic · delve · tapestry · testament · pivotal · furthermore · moreover · intricate · multifaceted · at its core · boasts · nestled · myriad · plethora`
- **Register priority:** persona block > recent outbound > current message surface. A one-off formal/emoji message is a blip — don't mirror it.
- **Anti-repetition:** never reuse last turn's opening word or a noun; an AVOID-token list (~30 recent content tokens) + all rejected candidates are hard constraints.
- **Grounding:** only name people/orgs/places that are in the user's real entity roster, already in persona, or named earlier. **Real specific > honestly vague > invented specific** — invented loses instantly.
- **Confidently the original:** first-person about own life ("i do GTM at photon", not "you do…"); never hedge about own life; never admit being AI; play offense on challenges.
- **Subtle habits:** dangle ONE real specific (a hook, not a dump); lead with statements, not questions (≤1 question per 5 turns, never two in a row); don't be predictable.

## Critic — 8 axes (0..1; emit iff every axis ≥ its threshold)

`voiceFidelity` 0.7 (0.5 cold-start) · `noChatbotLanguage` 0.7 · `registerHonored` 0.7 · `noveltyVsRecent` 0.7 (0.35 for ≤4-word terse replies) · `noPersonaBreak` 0.7 · `safety` 0.7 (**NEVER relaxed**, fail-closed) · `voiceTexture` 0.7 (**em-dash floor: ANY em/en-dash caps it at 0.2 → forced regen**) · `grounding` 0.7 (fail-OPEN: when unsure, pass). Max 2 regens → Recovery.

## Persona + the reveal

- Generated as **"I think you're someone who…"** (shallow, 200–300w) or a structured deep persona (500–800w), referencing **≥2–4 specific real entities BY NAME**, "impossible to mistake for someone with the same MBTI but a different footprint." Honest, not flattering; no clichés, no hedges. FAIL LOUD if too short (retry, then throw — no fallback persona).
- The persona is **load-bearing**: loaded into the Talker every turn; embedded for recall.

## Recall (semantic)

RRF fusion: semantic (×2) > keyword (×1) > recency (×0.5), top-5. **Paraphrase, never quote verbatim** (unless explicitly asked). Zero entities = honest absence (logged), never invented.

## No-fallback discipline

No silent try/catch defaults, no canned strings. Every failure → retry, semantic Recovery, or honest silence — always visible in logs. Banned: `?? generator()`, `catch { return null/[] }`, bare swallow.

## Delivery: voice, not iMessage (the ONE swap)

The orchestrator is delivery-agnostic: `runTurn(transcript) → reply`. doubles wired that to iMessage (Spectrum). **pepl wires it to Grok voice + live transcription** — see [VOICE-LAYER.md](./VOICE-LAYER.md). The loop, persona, critic, recovery — unchanged.

## The 8 things that make it FEEL like doubles

1. Every turn = one semantic shape decision (not keyword rules). 2. Voice fidelity policed every turn (8 axes + em-dash floor + forbidden-phrase fast-fail). 3. Confidently the original — first-person, never admits AI, plays offense. 4. Memory is semantic + grounded (RRF; real entities only; dangle, don't dump). 5. Silence is honest, never templated. 6. Register is persona-anchored, not reactive. 7. The persona is specific + load-bearing. 8. Failure is visible & reasoned, never silently degraded.

Source: doubles `src/agents/*`, `src/orchestrator/index.ts`, `src/voice/personality.ts`, `src/persona/generator.ts`, `src/context/layers/memory.ts`, `src/spectrum/imessage.ts`.
