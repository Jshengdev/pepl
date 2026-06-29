// Shared shapes for the onboarding flow. A backend will eventually populate the
// people/cards; until then RevealStep seeds placeholder data.
import type { GradStop } from "./palette";

export type ShapeKind = "circle" | "infinity" | "rose";

// One mesh bloom: a color picked from the palette, positioned by its orbit angle.
export type MeshPoint = { angle: number; color: string };

// A freehand stroke drawn on the avatar, normalized to 0..1 inside the circle.
export type Stroke = { x: number; y: number }[];

export type AvatarDesign = {
  points: MeshPoint[];
  strokes: Stroke[];
};

// One fluted card backing the user sculpts in CardsStep.
export type CardDesign = {
  shape: ShapeKind;
  offset: number; // continuous palette-window position (driven by the shape dot)
  lifts: number[]; // per-column heights, 0..1
};

// Everything the flow collects, handed to the reveal.
export type OnboardingDesign = {
  story: string;
  avatar: AvatarDesign;
  cards: CardDesign[];
};

// A profile node in the reveal graph (placeholder until the backend lands).
// Each person owns a stack of 3 card backings; flipping cycles through them.
export type Person = {
  id: string;
  rank: number;
  name: string;
  age: string;
  hometown: string;
  birthday: string;
  occupation: string;
  tagline: string;
  personality: string;
  facts: string[];
  pos: { x: number; y: number }; // node position on the graph, in %
  // the user's own card carries their designed avatar; others get a seeded mesh
  avatar: AvatarDesign;
  cards: CardDesign[];
};

// An edge in the social graph — what two people share, shown on the line.
export type Edge = { from: string; to: string; label: string };

export type { GradStop };
