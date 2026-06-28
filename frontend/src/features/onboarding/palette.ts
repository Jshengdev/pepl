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

export type GradStop = { color: string; pos: number };

// ── deriving a card palette from the profile colors (/colorize math) ────────
// Each card's gradient is built from the 3 colors the user chose for their
// avatar, so the cards always feel like the person. The rule: convert the picks
// to HSL, sort by hue, then walk the wheel interpolating between adjacent picks
// (shortest hue path, incl. the wrap) to get a smooth *cyclic* color set. The
// shape dot rotates a window over that set; the bottom is saturated, the top
// melts into FADE_BG.
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}
function lerpHueShortest(a: number, b: number, t: number): number {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
}

// The cyclic color set derived from the profile colors. 3 picks × perPair → 12.
export function buildColorSet(colors: string[], perPair = 4): string[] {
  const hsls = colors.map(hexToHsl).sort((a, b) => a[0] - b[0]);
  const n = hsls.length;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = hsls[i];
    const b = hsls[(i + 1) % n];
    for (let j = 0; j < perPair; j++) {
      const t = j / perPair;
      out.push(
        hslToHex(
          lerpHueShortest(a[0], b[0], t),
          a[1] + (b[1] - a[1]) * t,
          a[2] + (b[2] - a[2]) * t,
        ),
      );
    }
  }
  return out;
}

function sampleSet(set: string[], idxFloat: number): string {
  const L = set.length;
  const w = ((idxFloat % L) + L) % L;
  const i = Math.floor(w);
  return lerpHex(set[i], set[(i + 1) % L], w - i);
}

// One card's gradient stops (bottom→top), derived from the profile colors.
// `offset` (driven by the shape dot) rotates the derived set so dragging fades
// through the person's own colors one at a time.
export function cardStopsFromColors(
  colors: string[],
  offset: number,
  count = 6,
): GradStop[] {
  const set = buildColorSet(colors);
  const step = set.length / count;
  const stops: GradStop[] = [];
  for (let i = 0; i < count; i++) {
    stops.push({ color: sampleSet(set, offset + i * step), pos: (i / count) * 0.9 });
  }
  stops.push({ color: FADE_BG, pos: 1 });
  return stops;
}

// How many distinct positions the shape dot cycles through (= set length).
export const SET_LEN = 12;

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
