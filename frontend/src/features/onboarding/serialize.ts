// Serialize the designed avatar + card backing into the strings the backend's
// POST /api/card persists (smiley = an svg data-url, cardGradient = a css string).
// Same math as MeshAvatar/meshGradientStyle/cardStopsFromColors so the saved node
// IS what the user drew — never a stand-in (CLAUDE.md §2: no fake-real).
import { cardStopsFromColors, meshGradientStyle } from "./palette";
import type { AvatarDesign, Stroke } from "./types";

const R = 40; // orbit radius in % of the box — matches meshGradientStyle

function strokesSvg(strokes: Stroke[], strokeWidth: number): string {
  return strokes
    .map((s) =>
      s.length === 1
        ? `<circle cx="${(s[0].x * 100).toFixed(1)}" cy="${(s[0].y * 100).toFixed(1)}" r="${strokeWidth / 2}" fill="#fff"/>`
        : `<polyline points="${s
            .map((p) => `${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`)
            .join(" ")}" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
}

// The MeshAvatar (3 mesh blooms + white freehand strokes) as a standalone, round
// SVG data-url — usable directly as an <img src> on the map node.
export function serializeAvatar(design: AvatarDesign, strokeWidth = 6): string {
  const { backgroundColor } = meshGradientStyle(design.points);
  const defs = design.points
    .map((p, i) => {
      const cx = (50 + Math.cos(p.angle) * R).toFixed(1);
      const cy = (50 + Math.sin(p.angle) * R).toFixed(1);
      return `<radialGradient id="b${i}" cx="${cx}%" cy="${cy}%" r="66%"><stop offset="0" stop-color="${p.color}"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient>`;
    })
    .join("");
  const blooms = design.points
    .map((_, i) => `<rect width="100" height="100" fill="url(#b${i})"/>`)
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs>${defs}<clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath></defs>` +
    `<g clip-path="url(#c)"><rect width="100" height="100" fill="${backgroundColor}"/>${blooms}${strokesSvg(
      design.strokes,
      strokeWidth,
    )}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// One card backing's gradient (bottom→top) as a css string the backend stores.
export function serializeCardGradient(colors: string[], offset: number): string {
  const stops = cardStopsFromColors(colors, offset)
    .map((s) => `${s.color} ${(s.pos * 100).toFixed(0)}%`)
    .join(", ");
  return `linear-gradient(to top, ${stops})`;
}
