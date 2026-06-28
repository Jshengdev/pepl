// pepl — the "set palette" used everywhere a user picks color:
// the profile mesh-gradient handles and the fluted card backings.
//
// Built per /colorize: a single harmonious wheel that blends Monet's
// "Water Lily Pond" painterly tones (sage, teal, periwinkle, lily rose —
// see globals.css --color-lily-*) with the vibrant Browser Company rainbow
// (deep blue → cyan → yellow → orange → red → magenta). The list is ordered
// as a *loop* around the hue wheel so that (a) any 3 picks harmonize for the
// mesh, and (b) any consecutive window reads like a Monet-toned spectrum for
// the fluted cards. orchid → ocean closes the loop (violet → blue).

export type Swatch = { name: string; hex: string };

export const SET_PALETTE: Swatch[] = [
  { name: "ocean", hex: "#1f5fa6" }, // deep bridge blue (Browser deep blue / Monet pond)
  { name: "cornflower", hex: "#4f93d6" },
  { name: "periwinkle", hex: "#8fb3e8" }, // Monet bridge light
  { name: "teal", hex: "#4f9a93" }, // lily teal
  { name: "sage", hex: "#7faa63" }, // lily green
  { name: "citron", hex: "#c3c66a" }, // soft chartreuse — the green→warm bridge
  { name: "marigold", hex: "#f2c14e" },
  { name: "amber", hex: "#ef9a4a" }, // sunset
  { name: "coral", hex: "#ea6a52" },
  { name: "crimson", hex: "#db4a5b" }, // Browser red → rose
  { name: "rose", hex: "#d65b97" }, // lily rose / magenta
  { name: "orchid", hex: "#9a6fc0" }, // violet, loops back to ocean
];

export const PALETTE_HEXES = SET_PALETTE.map((s) => s.hex);

// Monet cream the cards (and mesh) fade into — matches the fluted bg + globals.
export const FADE_BG = "#f3f4ea";

// ── color math ────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function lerpHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// Sample the looped palette at a continuous (fractional, wrapping) index so a
// drag that nudges the index shifts every stop a hair → "one color fade at a
// time," never a hard jump.
export function sampleLooped(idxFloat: number): string {
  const n = SET_PALETTE.length;
  const wrapped = ((idxFloat % n) + n) % n;
  const i = Math.floor(wrapped);
  const t = wrapped - i;
  return lerpHex(SET_PALETTE[i].hex, SET_PALETTE[(i + 1) % n].hex, t);
}

export type GradStop = { color: string; pos: number };

// How much of the 12-swatch wheel one card's gradient spans, bottom→top. ~the
// whole wheel, so a default card reads like the Browser Company rainbow (blue
// bottom → magenta top) with Monet green/teal woven through the middle.
export const SPECTRUM_SPAN = 11;

// Fluted card gradient stops (bottom→top). `offset` is the continuous position
// the user drags along a shape control; it rotates the palette window so the
// whole spectrum shifts — colors fade through the wheel one at a time. Bottom is
// the most saturated swatch; the top melts into FADE_BG, like the reference card.
export function cardStops(offset: number, count = 6, span = SPECTRUM_SPAN): GradStop[] {
  const step = span / count;
  const stops: GradStop[] = [];
  for (let i = 0; i < count; i++) {
    stops.push({
      color: sampleLooped(offset + i * step),
      pos: (i / count) * 0.9, // 0 → 0.75-ish, leaving the top for the fade
    });
  }
  stops.push({ color: FADE_BG, pos: 1 });
  return stops;
}

// Mesh gradient for the profile avatar: 3 radial blooms positioned by the orbit
// handles' angles, over a muted blend base so corners never go transparent.
export type MeshPoint = { angle: number; color: string };
export function meshGradientStyle(points: MeshPoint[]): {
  backgroundColor: string;
  backgroundImage: string;
} {
  // base = average of the three, pulled toward neutral so the blooms read.
  const rgbs = points.map((p) => hexToRgb(p.color));
  const avg = rgbToHex(
    rgbs.reduce((s, c) => s + c[0], 0) / rgbs.length,
    rgbs.reduce((s, c) => s + c[1], 0) / rgbs.length,
    rgbs.reduce((s, c) => s + c[2], 0) / rgbs.length,
  );
  const R = 40; // orbit radius in % of the box
  const image = points
    .map((p) => {
      const x = 50 + Math.cos(p.angle) * R;
      const y = 50 + Math.sin(p.angle) * R;
      return `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${p.color} 0%, transparent 66%)`;
    })
    .join(", ");
  return { backgroundColor: avg, backgroundImage: image };
}
