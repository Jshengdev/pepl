# pepl — CONTRACTS (the law)

The zod shapes at every backend boundary. The build implements these as `backend/src/types.ts` and imports them everywhere; the frontend renders only these. **Source-agnostic** — the data source doesn't change these shapes.

> **⚠️ SUPERSEDED for the v3 hero (2026-06-28):** the reveal + connector shapes are now the bento **`Dossier`** (`Grounding`/`Bit`/`DossierCard`) + **`Similarity`/`ConnectionStory`/`MapNode`** — see [DESIGN-GOALS.md](./DESIGN-GOALS.md) Part 5/7 + [reference/CONNECTOR-AND-FRIENDS.md](./reference/CONNECTOR-AND-FRIENDS.md). `WowCard`/`MbtiCard`/the loose `Card` deck + the 3-field `OnboardingAnswers` **fold into** `Bit`/`Grounding` + onboarding `Signal`s. Add the new zod to `types.ts` in build stories 03/05; the shapes below are the engine substrate (Signal/Person/Edge/Graph/Story/CriticVerdict — still the law), not the hero contract.

## Core entities

```ts
import { z } from "zod";

// The grounding unit — one piece of evidence about the person. Everything traces back to a Signal.
export const Signal = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),            // email subject, a post, an onboarding answer…
});

export const Person = z.object({
  id: z.string(),
  name: z.string(),
  ring: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]), // 0=you · 1=inner · 2=2nd · 3=3rd
  closeness: z.number().min(0).max(1),
  lastInteraction: z.string().optional(),
});

export const Edge = z.object({
  from: z.string(), to: z.string(),
  kind: z.string(),              // friend · colleague · family…
  strength: z.number().min(0).max(1),
});

export const RelationshipGraph = z.object({
  people: z.array(Person),
  edges: z.array(Edge),
  seededWrong: z.array(z.object({ personId: z.string(), field: z.string() })), // deliberate — the correction beat
});
```

## Generated output (grounded)

```ts
export const GroundedClaim = z.object({ claim: z.string(), signalId: z.string() });

export const Story = z.object({
  text: z.string(),                       // bio / story in the user's voice
  groundedIn: z.array(GroundedClaim),     // every claim → a Signal, or it was cut
});
```

## Cards (what the desktop renders)

```ts
const Back = z.object({ label: z.string() });   // shown when the card flips

export const ProfileCard = z.object({ kind: z.literal("profile"), name: z.string(), oneLiner: z.string(), facts: z.array(z.string()), back: Back });
export const WowCard     = z.object({ kind: z.literal("wow"), headline: z.string(), detail: z.string(), back: Back });
export const GraphCard   = z.object({ kind: z.literal("graph"), graph: RelationshipGraph, back: Back });
export const StoryCard   = z.object({ kind: z.literal("story"), story: Story, back: Back });
export const MbtiCard    = z.object({ kind: z.literal("mbti"), type: z.string(), why: z.string(), back: Back });
export const Card = z.discriminatedUnion("kind", [ProfileCard, WowCard, GraphCard, StoryCard, MbtiCard]);
```

## Onboarding

```ts
export const OnboardingAnswers = z.object({
  turningPoint: z.string(),     // a turning point you've encountered
  uniqueStrength: z.string(),   // the one thing you're uniquely good at
  friendNote: z.string(),       // what someone should know to be a good friend to you
});
```

## Critic (the truth gate)

```ts
export const CriticVerdict = z.object({
  verdict: z.enum(["emit", "regen"]),
  axes: z.object({ grounding: z.number(), voice: z.number() }),  // 0..1 each
  fabricatedClaims: z.array(z.string()),   // exact substrings of the output with no Signal
  failReason: z.string().nullable(),
});
```

## Pipeline (agent I/O)

- `ingest(source)` → `{ signals: Signal[] }` — precached for the demo (engineered half-half).
- `extract(signals)` → `{ people, edges }` → `graph(…, seedWrong)` → `RelationshipGraph`.
- `generate(graph, signals, answers, kind)` → `Story` — in the user's voice.
- `critic(output, signals)` → `CriticVerdict` — **held-out model family ≠ generator; corpus = signals only.**
- `buildCards(graph, story, profile, mbti)` → `Card[]`.

## WS events (the live stream)

```ts
export const WsEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("scrape_progress"), pct: z.number(), etaSec: z.number() }),
  z.object({ type: z.literal("node_start"), node: z.string() }),
  z.object({ type: z.literal("node_done"), node: z.string(), ms: z.number() }),
  z.object({ type: z.literal("cards_ready"), cards: z.array(Card) }),
  z.object({ type: z.literal("failed"), node: z.string(), error: z.string() }),
]);
```

> These are a first cut shaped by [EXPERIENCE.md](./EXPERIENCE.md). The Story window pins the exact card fields; the Build window can start on these and adjust as fields lock.
