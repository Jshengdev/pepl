import { z } from "zod";

export const Signal = z.object({
  id: z.string(),
  text: z.string(),
  source: z.string(),
});
export type Signal = z.infer<typeof Signal>;

export const Person = z.object({
  id: z.string(),
  name: z.string(),
  ring: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  closeness: z.number().min(0).max(1),
  lastInteraction: z.string().optional(),
});
export type Person = z.infer<typeof Person>;

export const Edge = z.object({
  from: z.string(),
  to: z.string(),
  kind: z.string(),
  strength: z.number().min(0).max(1),
});
export type Edge = z.infer<typeof Edge>;

export const RelationshipGraph = z.object({
  people: z.array(Person),
  edges: z.array(Edge),
  seededWrong: z.array(z.object({ personId: z.string(), field: z.string() })),
});
export type RelationshipGraph = z.infer<typeof RelationshipGraph>;

export const GroundedClaim = z.object({ claim: z.string(), signalId: z.string() });
export type GroundedClaim = z.infer<typeof GroundedClaim>;

export const Story = z.object({
  text: z.string(),
  groundedIn: z.array(GroundedClaim),
});
export type Story = z.infer<typeof Story>;

export const Back = z.object({ label: z.string() });
export type Back = z.infer<typeof Back>;

export const ProfileCard = z.object({
  kind: z.literal("profile"),
  name: z.string(),
  oneLiner: z.string(),
  facts: z.array(z.string()),
  mark: z.string().optional(),
  gradient: z.string().optional(),
  back: Back,
});
export type ProfileCard = z.infer<typeof ProfileCard>;

// The user's beat-3 choices, folded into the ProfileCard (their own one-liner/mark win over LLM copy).
export const CardSeed = z.object({
  oneLiner: z.string().optional(),
  mark: z.string().optional(),
  gradient: z.string().optional(),
});
export type CardSeed = z.infer<typeof CardSeed>;

export const WowCard = z.object({
  kind: z.literal("wow"),
  headline: z.string(),
  detail: z.string(),
  back: Back,
});
export type WowCard = z.infer<typeof WowCard>;

export const GraphCard = z.object({
  kind: z.literal("graph"),
  graph: RelationshipGraph,
  back: Back,
});
export type GraphCard = z.infer<typeof GraphCard>;

export const StoryCard = z.object({
  kind: z.literal("story"),
  story: Story,
  back: Back,
});
export type StoryCard = z.infer<typeof StoryCard>;

export const MbtiCard = z.object({
  kind: z.literal("mbti"),
  type: z.string(),
  why: z.string(),
  back: Back,
});
export type MbtiCard = z.infer<typeof MbtiCard>;

export const Card = z.discriminatedUnion("kind", [
  ProfileCard,
  WowCard,
  GraphCard,
  StoryCard,
  MbtiCard,
]);
export type Card = z.infer<typeof Card>;

// --- The bento dossier (Part 5) — the FINAL reveal payload --------------------------------------
// Rides ON TOP of the Card union (which still backs cardsNode internally). Every compartment ("bit")
// is GROUNDED or it FAILS loud (CLAUDE.md §2): a bit's grounding IS the receipt the UI renders.
// Supersedes the loose WowCard/MbtiCard reveal — those fold into bits; Story + RelationshipGraph
// ride along as structured bit `value`s.

export const Mode = z.enum(["live", "cached"]); // honest in EVERY payload
export type Mode = z.infer<typeof Mode>;

export const Grounding = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("signal"), signalId: z.string() }), // ONE clickable receipt
  // aggregate over N; critic:true = survived the held-out critic; from:[] = honest absence (e.g. claimsCut)
  z.object({ kind: z.literal("computed"), from: z.array(z.string()), critic: z.boolean() }),
  z.object({ kind: z.literal("user"), source: z.enum(["drawn", "onboarding"]) }), // the one human-made bit
]);
export type Grounding = z.infer<typeof Grounding>;

export const Bit = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    label: z.string(),
    value: z.union([z.string(), z.record(z.string(), z.unknown())]),
    grounding: Grounding,
  }),
  // red FAILED badge, NEVER a fabricated value (a §2 silent fallback)
  z.object({ status: z.literal("failed"), label: z.string(), triedSource: z.string() }),
]);
export type Bit = z.infer<typeof Bit>;

export const DossierCard = z.object({
  kind: z.enum(["identity", "story", "stats", "people", "personality"]),
  title: z.string(),
  bits: z.array(Bit), // 3–6, ~5
});
export type DossierCard = z.infer<typeof DossierCard>;

// smiley null until /api/card (story 04) — degrade the Identity smiley bit to status:"failed",
// NEVER an empty-string default (that's a silent §2 fallback).
export const Dossier = z.object({
  cards: z.array(DossierCard),
  smiley: z.string().nullable(),
  proof: z.object({ peopleSurfaced: z.number(), claimsCut: z.number() }),
  mode: Mode,
});
export type Dossier = z.infer<typeof Dossier>;

// --- The map + Knot the connector (Part 7) -----------------------------------------------------

export const MapNode = z.object({
  userId: z.string(),
  name: z.string(),
  smiley: z.string().nullable(), // the drawn smiley avatar; null until /api/card
});
export type MapNode = z.infer<typeof MapNode>;

// The grounded unit is a TWO-SIDED claim: a "you both X" is unverifiable judged once, so split A/B and
// judge each against its own corpus. Each Similarity cites ONE real aSignalId from A + ONE bSignalId from B.
export const Similarity = z.object({
  dimension: z.enum([
    "shared-person",
    "shared-theme",
    "same-space",
    "shared-interest",
    "narrative-voice",
    "shared-origin",
    "parallel-arc",
  ]),
  theme: z.string(),
  aClaim: z.string(),
  aSignalId: z.string(),
  bClaim: z.string(),
  bSignalId: z.string(),
});
export type Similarity = z.infer<typeof Similarity>;

export const ConnectionStory = z.object({
  text: z.string(),
  groundedIn: z.array(Similarity), // === link.groundedIn (the bento tiles)
});
export type ConnectionStory = z.infer<typeof ConnectionStory>;

// --- Onboarding (Part 2) -----------------------------------------------------------------------
// Legacy: the old 3-field struct. Still exported (and still REQUIRED) so the existing /run + dot.ts
// path compiles unchanged — superseded by the free-turn v3 flow below (OnboardingTurn).
export const OnboardingAnswers = z.object({
  turningPoint: z.string(),
  uniqueStrength: z.string(),
  friendNote: z.string(),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswers>;

// v3 onboarding contract change: ONE seed question (daily routine) + free back-and-forth. Each USER
// turn persists as a Signal{source:"onboarding"}. role+content mirrors dot.ts's history shape.
export const OnboardingTurn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type OnboardingTurn = z.infer<typeof OnboardingTurn>;

export const CriticVerdict = z.object({
  verdict: z.enum(["emit", "regen"]),
  axes: z.object({ grounding: z.number(), voice: z.number() }),
  fabricatedClaims: z.array(z.string()),
  failReason: z.string().nullable(),
});
export type CriticVerdict = z.infer<typeof CriticVerdict>;

export const WsEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("scrape_progress"), pct: z.number(), etaSec: z.number() }),
  z.object({ type: z.literal("node_start"), node: z.string() }),
  z.object({ type: z.literal("node_done"), node: z.string(), ms: z.number() }),
  z.object({ type: z.literal("cards_ready"), cards: z.array(Card) }),
  z.object({ type: z.literal("failed"), node: z.string(), error: z.string() }),
]);
export type WsEvent = z.infer<typeof WsEvent>;
