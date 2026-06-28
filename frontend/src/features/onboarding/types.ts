// Shared shapes for the onboarding DESIGN flow (the avatar + card backings the user sculpts).
// The reveal's people/edges/cards now come straight from the backend (MapNode / Similarity /
// Dossier in lib/pepl/types) — these onboarding types only cover what the user draws.
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

export type { GradStop };
