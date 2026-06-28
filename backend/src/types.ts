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
  back: Back,
});
export type ProfileCard = z.infer<typeof ProfileCard>;

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

export const OnboardingAnswers = z.object({
  turningPoint: z.string(),
  uniqueStrength: z.string(),
  friendNote: z.string(),
});
export type OnboardingAnswers = z.infer<typeof OnboardingAnswers>;

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
