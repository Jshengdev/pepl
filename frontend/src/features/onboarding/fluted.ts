// Editable fluted-gradient renderer for the card maker + card backs.
//
// Ported from FlutedBackground.tsx's createFlutedGradient (the landing version),
// but reshaped for *editing*: you push new column heights (lifts) and a new
// palette window (stops) at any time and both lerp smoothly toward the target.
// The impressionist painterly pass (Monet grade + impasto relight + canvas
// weave + grain) is identical; the only perf change is caching the impasto
// height map per size instead of rebuilding it every frame.
//
// pepl: shares the algorithm with the landing component by design (kept
// separate so editing concerns don't bleed into the hero). Upgrade path: if a
// third caller appears, extract the core pixel pass into one module.

import type { GradStop } from "./palette";

export type FlutedConfig = {
  cols: number;
  base: number;
  intensity: number;
  blur: number;
  bg: string;
  grade: number;
  impasto: number;
  lightAngle: number;
  canvas: number;
  grain: number;
  grainColored: boolean;
  lifts: number[];
  stops: GradStop[];
};

export type FlutedController = {
  destroy: () => void;
  setLifts: (lifts: number[]) => void;
  setStops: (stops: GradStop[]) => void;
};

// Sensible defaults shared by the card maker + card backs. Vivid like the
// Browser Company card: low blur enough to keep bands, painterly pass on.
export const CARD_DEFAULTS: Omit<FlutedConfig, "lifts" | "stops"> = {
  cols: 5,
  base: 0.42,
  intensity: 0.4,
  blur: 18,
  bg: "#f3f4ea",
  grade: 0.14,
  impasto: 0.1,
  lightAngle: 156,
  canvas: 0.01,
  grain: 0.22,
  grainColored: true,
};

const RENDER_CAP = 380; // internal canvas width cap — the per-pixel pass is heavy
const LERP = 0.16;

type RGB = [number, number, number];
function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function createFluted(
  container: HTMLElement,
  cfg: FlutedConfig,
): FlutedController {
  const BW = 470;
  const positions = cfg.stops.map((s) => Math.min(1, Math.max(0, s.pos)));
  // Animated state: column heights + per-stop colors both lerp toward a target.
  const curLifts = cfg.lifts.slice();
  const targetLifts = cfg.lifts.slice();
  const curCols: RGB[] = cfg.stops.map((s) => hexToRgb(s.color));
  const targetCols: RGB[] = cfg.stops.map((s) => hexToRgb(s.color));

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const sharp = document.createElement("canvas");
  const sx = sharp.getContext("2d")!;
  const blur = document.createElement("canvas");
  const bx = blur.getContext("2d", { willReadFrequently: true })!;
  let K = 1;
  let raf = 0;
  let heightMap: Float32Array | null = null; // cached impasto relief, rebuilt on resize

  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  const hf = (i: number) =>
    Math.max(0.04, cfg.base + curLifts[i] * cfg.intensity);

  function vn(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const hs = (a: number, b: number) => {
      const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return (n - Math.floor(n)) * 2 - 1;
    };
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hs(xi, yi);
    const b = hs(xi + 1, yi);
    const cc = hs(xi, yi + 1);
    const d = hs(xi + 1, yi + 1);
    const ab = a + (b - a) * u;
    const cd = cc + (d - cc) * u;
    return ab + (cd - ab) * v;
  }

  function rgbStr(c: RGB) {
    return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  }

  function drawSharp(t: CanvasRenderingContext2D, w: number, h: number) {
    t.fillStyle = cfg.bg;
    t.fillRect(0, 0, w, h);
    const colW = w / cfg.cols;
    for (let i = 0; i < cfg.cols; i++) {
      const top = h - hf(i) * h;
      const g = t.createLinearGradient(0, h, 0, top);
      for (let j = 0; j < positions.length; j++)
        g.addColorStop(positions[j], rgbStr(curCols[j]));
      t.fillStyle = g;
      t.fillRect(Math.floor(i * colW), top, Math.ceil(colW) + 1, h - top + 2);
    }
  }

  function buildHeight(w: number, h: number): Float32Array {
    const hm = new Float32Array(w * h);
    const sc = 1 / K;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        hm[y * w + x] =
          0.6 * vn(x * sc * 0.035, y * sc * 0.09) +
          0.4 * vn(x * sc * 0.08, y * sc * 0.19);
    return hm;
  }

  function painter(x: CanvasRenderingContext2D, w: number, h: number) {
    const sc = 1 / K;
    const hm = cfg.impasto > 0 ? heightMap : null;
    const a = (cfg.lightAngle * Math.PI) / 180;
    const el = 0.62;
    const lx = Math.cos(a) * Math.cos(el);
    const ly = Math.sin(a) * Math.cos(el);
    const lz = Math.sin(el);
    let hvx = lx;
    let hvy = ly;
    let hvz = lz + 1;
    const hl = Math.sqrt(hvx * hvx + hvy * hvy + hvz * hvz);
    hvx /= hl;
    hvy /= hl;
    hvz /= hl;
    const id = x.getImageData(0, 0, w, h);
    const d = id.data;
    for (let y = 0; y < h; y++)
      for (let xx = 0; xx < w; xx++) {
        const i4 = (y * w + xx) * 4;
        let cr = d[i4] / 255;
        let cg = d[i4 + 1] / 255;
        let cb = d[i4 + 2] / 255;
        const L = 0.299 * cr + 0.587 * cg + 0.114 * cb;
        if (cfg.grade > 0) {
          const gm = cfg.grade;
          const sM = Math.max(0, Math.min(1, (0.5 - L) / 0.5));
          const hM = Math.max(0, Math.min(1, (L - 0.55) / 0.45));
          const mM = Math.max(0, 1 - Math.abs(L - 0.5) * 2);
          cr += (0.24 - cr) * sM * 0.5 * gm; // violet-blue shadows
          cg += (0.19 - cg) * sM * 0.5 * gm;
          cb += (0.44 - cb) * sM * 0.5 * gm;
          cr += (1.0 - cr) * hM * 0.3 * gm; // warm highlights
          cg += (0.96 - cg) * hM * 0.3 * gm;
          cb += (0.84 - cb) * hM * 0.3 * gm;
          cr += (cr - L) * 0.4 * gm * mM; // broken-color midtones
          cg += (cg - L) * 0.4 * gm * mM;
          cb += (cb - L) * 0.4 * gm * mM;
        }
        if (hm) {
          const xm = xx > 0 ? xx - 1 : xx;
          const xp = xx < w - 1 ? xx + 1 : xx;
          const ym = y > 0 ? y - 1 : y;
          const yp = y < h - 1 ? y + 1 : y;
          const dx = hm[y * w + xp] - hm[y * w + xm];
          const dy = hm[yp * w + xx] - hm[ym * w + xx];
          const sc2 = 5 * cfg.impasto * K;
          let nx = -dx * sc2;
          let ny = -dy * sc2;
          const nl = Math.sqrt(nx * nx + ny * ny + 1);
          nx /= nl;
          ny /= nl;
          const nzn = 1 / nl;
          const diff = nx * lx + ny * ly + nzn * lz;
          const spec = Math.pow(Math.max(0, nx * hvx + ny * hvy + nzn * hvz), 22);
          const f = 1 + (diff - 0.55) * 0.6 * cfg.impasto;
          const sp = spec * 0.5 * cfg.impasto;
          cr = cr * f + sp;
          cg = cg * f + sp;
          cb = cb * f + sp;
        }
        if (cfg.canvas > 0) {
          const weave =
            (Math.sin(xx * sc * 0.7) * 0.5 + 0.5) *
            (Math.sin(y * sc * 0.7) * 0.5 + 0.5);
          const m = 1 - cfg.canvas * 0.16 * (1 - weave);
          cr *= m;
          cg *= m;
          cb *= m;
        }
        if (cfg.grain > 0) {
          const amt = cfg.grain * 0.37;
          if (cfg.grainColored) {
            cr += (Math.random() - 0.32) * amt;
            cg += (Math.random() - 0.32) * amt;
            cb += (Math.random() - 0.32) * amt;
          } else {
            const n = (Math.random() - 0.3) * amt;
            cr += n;
            cg += n;
            cb += n;
          }
        }
        d[i4] = clamp(cr * 255);
        d[i4 + 1] = clamp(cg * 255);
        d[i4 + 2] = clamp(cb * 255);
      }
    x.putImageData(id, 0, 0);
  }

  function render() {
    const w = canvas.width;
    const h = canvas.height;
    if (sharp.width !== w || sharp.height !== h) {
      sharp.width = w;
      sharp.height = h;
      blur.width = w;
      blur.height = h;
    }
    drawSharp(sx, w, h);
    bx.clearRect(0, 0, w, h);
    const blurPx = cfg.blur * K;
    bx.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
    bx.drawImage(sharp, 0, 0);
    bx.filter = "none";
    painter(bx, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(blur, 0, 0);
  }

  function loop() {
    let moving = false;
    for (let i = 0; i < cfg.cols; i++) {
      curLifts[i] += (targetLifts[i] - curLifts[i]) * LERP;
      if (Math.abs(targetLifts[i] - curLifts[i]) > 0.001) moving = true;
    }
    for (let j = 0; j < curCols.length; j++) {
      for (let k = 0; k < 3; k++) {
        curCols[j][k] += (targetCols[j][k] - curCols[j][k]) * LERP;
        if (Math.abs(targetCols[j][k] - curCols[j][k]) > 0.5) moving = true;
      }
    }
    render();
    raf = moving ? requestAnimationFrame(loop) : 0;
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function resize() {
    const r = container.getBoundingClientRect();
    const cw = r.width || BW;
    const ch = r.height || BW * 1.28;
    const scale = Math.min(1, RENDER_CAP / cw);
    const iw = Math.max(1, Math.round(cw * scale));
    const ih = Math.max(1, Math.round(ch * scale));
    K = iw / BW;
    canvas.width = iw;
    canvas.height = ih;
    heightMap = cfg.impasto > 0 ? buildHeight(iw, ih) : null;
    render();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  return {
    destroy() {
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      canvas.remove();
    },
    setLifts(lifts: number[]) {
      for (let i = 0; i < cfg.cols; i++) targetLifts[i] = lifts[i] ?? targetLifts[i];
      kick();
    },
    setStops(stops: GradStop[]) {
      for (let j = 0; j < targetCols.length && j < stops.length; j++)
        targetCols[j] = hexToRgb(stops[j].color);
      kick();
    },
  };
}
