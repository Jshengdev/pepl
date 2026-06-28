# pepl — Vision (from `gx`)

Synthesized from Johnny's verbatim-intent graph at `/Users/johnnysheng/code/gx`. "pepl" is not yet named literally in gx — this is the dominant, most-recent project thread (the Sarah / Teri / Johnny personal-context product). Source files are listed at the bottom; read them for the verbatim voice.

## What pepl is

An **invisible-AI personal CRM + chatbot over yourself**. It quietly organizes the disorganized mess of a person's life — contacts, emails, social feeds, life events — maps the relationships, surfaces patterns, and lets you ask "what does this mean about me?" It starts purely **functional** (a relationship database that works) and deepens into **emotional reflection** (self-understanding and storytelling).

The principle underneath it: **AI does the steps only AI can do (organize, synthesize, hold context); the human does the steps only the human can do (originate, decide, feel).** You're not "working with AI" — AI collapses the effort of organization so you can finally think about your own life.

## The pitch / thesis

- **Problem.** People lack perspective because their lives are digitalized, fragmented, and disorganized. There's no forcing function to organize it (only content creators are forced to). The mess feels too daunting to touch, ROI feels blurry, and fatigue + procrastination spiral out of the mess itself.
- **Core insight.** Organization is exactly the step AI can do in 5 seconds — and perspective comes directly from organization. People don't lack desire; they lack effort-collapse. Externalize the mess onto a screen, let AI digest it, and you can finally think about your life.
- **Solution.** A personal CRM that ingests your contacts/emails/socials/events, maps your relationships visually, and surfaces patterns — paired with a context-aware chatbot over all of it, plus story/bio generation that reframes milestones as chapters of a larger journey.
- **Wedge / why now.** Lead functional (people need a CRM), expand into emotional reflection once they're in and see value. Trust + privacy are the gates — positioning is "keep your context to yourself," NOT "AI girlfriend" or "productivity tool." LLMs are finally good enough to be an honest mirror *if* fed real context.

## Goals & success criteria

Winning = a prototype that demonstrates the full E2E: **messy input → AI organization → an output that *feels right*** (a story / post / bio the user couldn't have produced alone). The emotional proof: a normal person (not an AI power user, not someone who already journals) hands over their data, trusts it, and has an unexpected moment of clarity — *"I see my life better now."*

Explicit objectives:
- Lead with functional value (relationship CRM works, no sign-up friction).
- Make the AI step **invisible** — no "go talk to the chatbot"; instead features like "auto-generate your bio" or "turn this moment into a story."
- Validate the division-of-labor thesis (AI organizes/synthesizes, human originates/tells).
- Prove the bridge: Sarah's human vision (emotional perspective) meets Johnny's AI read (what only AI can do).

## Demo path / E2E experience

1. **Input.** User signs in, grants access to email / contacts / socials (maybe a journal or photos).
2. **Processing (invisible).** AI scrapes + organizes recurring people, infers relationships, maps them visually (who's close, who's dormant, timeline of interactions) — **slightly wrong on purpose**.
3. **Activation.** User corrects the graph ("Teri's here, Johnny's here — fix me"). The correction is the perfectionist activation hook; the system learns deeper context from it.
4. **Output (multiple modalities).**
   - Relationship journal: "here's who matters in your life, organized."
   - Auto-generated bio: "write a Luma / LinkedIn bio from your actual story" (kills procrastination).
   - Story generation: "you had a housewarming — here's how it fits your journey since you moved."
   - Ask-anything chatbot: "what does my relationship with X tell me?" — answered from full context, no setup each time.
5. **Deeper loop.** Over time the system prompts little-by-little ("have you thought about why you're close to X?") to deepen context without being invasive.
6. **Outcome.** User sees themselves anew and makes clearer choices.

## Scope

**MVP must-haves**
- Contact / email / social ingestion + unification
- Visual relationship map (graph or timeline)
- Slightly-wrong seeding → user-correction loop
- One concrete generated output (bio / personal statement)
- Basic context-aware chatbot ("ask your life")

**Phase 2 / nice-to-have**
- Multi-output story generation (event → journey post)
- Deep prompting loop (little-by-little context extraction)
- Memory / life-as-a-book mode; timeline visualization; sharing + privacy controls

**Explicitly NOT:** productivity tool, "never miss a coffee," AI girlfriend, Notion replacement.

## Verbatim intent (Johnny / Sarah)

- "AI does the steps that only AI can do and you're doing the steps that only you can do. So you're not working with AI."
- "the pitch deck is basically the prompt that this loop would need to consistently have the context to build out this product."
- "organization is the real problem — and exactly what AI can do in 5 seconds."
- "Claude can never replicate her story because it doesn't have her context but if you work together on it, it kind of heightens her ability to tell her story."
- (Sarah) "I spent a lot of time blind to myself… I lacked perspective. My solution was in seeing my life better."
- (Sarah) "Build for someone like me first, then expand."

## Source map (read in gx/, ranked)

1. `raw/0010-johnny-invisible-ai-division-of-labor.md` — the canonical drop (invisible AI, only-AI/only-you, organization-as-moat, the bridge, the product seed).
2. `wiki/the-pitch-deck-is-the-prompt.md` — the method: pitch deck → spec → that spec is the build-loop prompt.
3. `raw/0008-sarah-teri-bio-trust-icp.md` — relationship-mapping as low-friction seeding, the correction loop, trust gate, ICP, functional-first.
4. `raw/0007-sarah-teri-personal-crm.md` — the wedge: personal CRM, relationship mapping, story-gen, competitive field.
5. `wiki/the-deep-problem-a-disorganized-life.md` — root-cause synthesis.
6. `patterns.md` — the eight recurring patterns (invisible-AI, externalize-to-crystallize, semi-rage-bait, context-is-the-moat, the-bridge, functional-first wedge…).
7. `wiki/the-competitive-field-and-references.md` — landscape + tar-pit risk.
8. `raw/0001-genesis-framing.md` — genesis: pitch deck as first artifact.

> Naming is still open: "people / personal / perspective / peeps" thread through everything — hence **pepl**.
