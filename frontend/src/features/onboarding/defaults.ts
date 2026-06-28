// Starting designs for the flow. The pepl "smiley" scribble (two eyes + a
// smile, echoing the logo mark) seeds the profile drawing so it's never blank,
// and is reused to give seeded reveal people a face.
import type { AvatarDesign, CardDesign, Stroke } from "./types";

export const PEPL_SMILEY: Stroke[] = [
  [{ x: 0.4, y: 0.45 }], // left eye (single point → dot)
  [{ x: 0.59, y: 0.42 }], // right eye
  [
    { x: 0.35, y: 0.54 },
    { x: 0.42, y: 0.6 },
    { x: 0.5, y: 0.625 },
    { x: 0.585, y: 0.595 },
    { x: 0.645, y: 0.53 },
  ], // smile
];

export const DEFAULT_AVATAR: AvatarDesign = {
  points: [
    { angle: -Math.PI / 2, color: "#4f93d6" }, // top — cornflower
    { angle: Math.PI / 6, color: "#f2c14e" }, // lower-right — marigold
    { angle: (5 * Math.PI) / 6, color: "#d65b97" }, // lower-left — rose
  ],
  strokes: PEPL_SMILEY.map((s) => s.map((p) => ({ ...p }))),
};

const WAVY: number[] = [0.6, 1, 0.55, 1, 0.6]; // double-peak, like the wireframe

export const DEFAULT_CARDS: CardDesign[] = [
  { shape: "circle", offset: 0, lifts: [...WAVY] },
  { shape: "infinity", offset: 4, lifts: [...WAVY] },
  { shape: "rose", offset: 8, lifts: [...WAVY] },
];
