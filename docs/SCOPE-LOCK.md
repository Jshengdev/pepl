# pepl — SCOPE-LOCK

> **Status: LOCKED v1 — 2026-06-28.** Reflects Johnny's redirect (everything live, voice-agent Dot, "see a version of yourself" as hero). The build loop runs against this. **Redline any line and it flips back to DRAFT.**

## The ONE problem (one paragraph)

People can't see their own lives because the context is a fragmented, disorganized mess they'll never sit down to organize — so they lack perspective on their relationships and their story. Pebble collapses that organization effort with invisible AI: it reads the mess **live** (your Gmail + your public footprint + what you tell it), shows you **a version of yourself** — your story and your stats — and lets you *see yourself*. Then you sharpen and own it just by talking. Every line traces to something real, or it's cut. **AI does what only AI can (organize, synthesize, hold context); you do what only you can (originate, decide, feel).**

## Crystal INPUT shape

```ts
// LIVE end to end. Composio Gmail OAuth = sign-in + data grant in one (reuse doubles' Gmail).
// You.com scrapes the public footprint; the Dot voice agent pulls story out of you.
// The ONLY engineered half-half: Dot's FIRST voice line is a cached Grok response (// DEMO_CACHE: prewarmed). Everything else live.
type Ingest = {
  gmail: GmailGrant            // Composio OAuth → messages, contacts
  web?: WebHit[]               // You.com enrichment (each carries a source)
  answers?: OnboardingAnswers  // the 3 questions, by voice or text
}
type Ask = { question: string }                            // "what does my relationship with X say about me?"
type Generate = { kind: "story" | "stats" | "bio"; seed?: string }
```

## Crystal OUTPUT shape

```ts
type RelationshipGraph = {
  people: { id: string; name: string; ring: 0|1|2|3; closeness: number; lastInteraction?: string }[]
  edges:  { from: string; to: string; kind: string; strength: number }[]
  seededWrong: { personId: string; field: string }[]   // deliberate — invites the correction
}
type GeneratedOutput = {
  text: string                                          // the story/bio, in the user's voice
  groundedIn: { claim: string; signalId: string }[]     // every claim → a Signal, or it was cut
}
// rendered as cards: Profile · Story · Stats (hero set) + Graph (the "open endeavour" stretch). See CONTRACTS.
```

## The journey (node graph)

```
connect(LIVE Gmail via Composio = signup)
  → ingest(scrape live; You.com enrich)  → extract  → graph(seeded slightly wrong)
  → [Dot voice Q&A while scraping]        → buildCard(prefill from answers+scrape)
  → reveal(story + stats, grounded)       → correct-by-talking(receipt = the edit surface; learns deeper context)
  → generate/regenerate(in your voice)    → critic(grounding + voice; held-out family)
  → emit  (regen ≤2, else fail-closed)
  → [network graph = open endeavour / stretch]
```

## Hero / "catch" moment

Sign in with Gmail → Pebble reads your **actual world** → it shows you **a version of yourself** (your story + your stats), and every line shows **where it came from** ("from 3 emails with Teri"). You correct/deepen it **just by talking** — the receipt *is* the correction surface — and it updates live. The output makes you go **"…that's me. I see my life better now."** Nothing invented; everything traceable. *(People want to be told who they are — Pebble earns the right to, because it read your real world.)*

## Time budget (Wizard Hackathon)

One day; **~6 hrs hacking (11:00–17:00)**, judging 17:00, finalist demos 18:00. See [HACKATHON.md](./HACKATHON.md). Forces: demo path only, **everything live + hardened** (the [gotchas](./reference/HACKATHON-GOTCHAS.md) are the make-it-work playbook), one hero protected, network graph as stretch.

## Integrations / sponsors + where they land

Track: **Potion Lab** (identity / personalization / human connection). On-screen where each fires (see [DEMO-SCRIPT.md](./DEMO-SCRIPT.md)):
- **Composio** — live Gmail OAuth = signup + ingest in one.
- **Grok** — Dot, the voice agent (STT/TTS + reasoning); the onboarding *is* a conversation.
- **InsForge** — model gateway (generate + held-out critic on **different** families) + db + deploy URL. *(Best Use of InsForge: $500.)*
- **You.com** — citation-backed web search for enrichment + external grounding (each fact cited). *(Best Use of You.com: $1k.)*

## CUT (not in the demo)

- A **backup video** (founder call — we run live, hardened, not recorded).
- iMessage / texting (replaced by the Dot voice Q&A).
- Multi-user / accounts beyond the one connected demo account; live OAuth *re-grant* on stage (use the connected account).
- The **network graph beyond a single animated reveal** (open endeavour / stretch).
- Card flip + PNG share, MBTI card, the deep "little-by-little" prompting loop, life-as-a-book (Phase 2 / layer if time).
- FAISS / heavy vector store (in-memory recall first).
