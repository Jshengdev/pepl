# pepl — SCOPE-LOCK

> **Status: DRAFT v0 — derived from `gx` vision; founder to confirm before the loop locks it.**
> The build loop halts if this is unfilled. It is filled below as a concrete proposal; tighten the one-liner + integrations with Johnny, then mark `LOCKED`.

## The ONE problem (one paragraph)

People can't see their own lives because the context is a fragmented, disorganized mess they'll never sit down to organize — so they lack perspective on their relationships and their story. pepl collapses that organization effort with invisible AI: it ingests the mess (contacts, emails, socials, events), maps your relationships, and lets you *see yourself* — then helps you originate output (a bio, a story, an answer about your own life) that you couldn't have produced alone. **AI does what only AI can (organize, synthesize, hold context); you do what only you can (originate, decide, feel).**

## Crystal INPUT shape

```ts
// the raw mess for ONE demo user (precached real export — see CORE-PORT-PLAN "engineered half-half")
type Ingest = {
  contacts?: RawContact[]      // name, handles, emails, last-seen
  messages?: RawMessage[]      // who, when, snippet
  socials?: RawPost[]          // platform, text, ts
  events?: RawEvent[]          // title, date, people
}
// or, for ask/generate after ingestion:
type Ask = { question: string }                 // "what does my relationship with X say about me?"
type Generate = { kind: "bio" | "story"; seed?: string }   // "luma bio" | "the housewarming"
```

## Crystal OUTPUT shape

```ts
type RelationshipGraph = {
  people: { id: string; name: string; closeness: number; lastInteraction?: string }[]
  edges:  { from: string; to: string; kind: string; strength: number }[]
  seededWrong: { personId: string; field: string }[]   // deliberate, for the correction beat
}
type GeneratedOutput = {
  text: string                               // the bio / story, in the user's voice
  groundedIn: { claim: string; signalId: string }[]   // every claim traceable — or it was cut
}
```

## The journey (node graph)

```
ingest(precached) → extract → graph(seeded slightly wrong) → [render]
        → user corrects → graph updates(learns deeper context)
        → generate(bio|story|answer, in your voice) → critic(grounding + voice)
        → emit  (regen ≤2, else fail-closed)
```

## Hero / "catch" moment

The user looks at the auto-built relationship map, sees it's *almost* right, and instinctively corrects it ("Teri's closer than that") — and in correcting it, hands pepl the deeper context. Then pepl produces a bio/story grounded in *their actual life* that makes them go **"...I see my life better now."** Every claim in it is traceable to something they gave it — nothing invented.

## Integrations / sponsors + where they land

> **TODO-confirm with Johnny** (hackathon-specific). Likely seams: an LLM provider (generator) + a *different* one for the held-out critic; a data source for ingestion (precached export for the demo). Name each on screen where it fires.

## CUT (not in the demo)

- Live OAuth scraping during the demo (precache the export instead; scraper works, output cached).
- Multi-user / accounts / auth beyond the one demo user.
- Deep prompting "little-by-little" loop, life-as-a-book mode, sharing/privacy controls (Phase 2).
- FAISS / heavy vector store (in-memory recall first).
- iMessage / any non-web delivery.
