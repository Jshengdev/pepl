"use client";

import { useEffect, useRef } from "react";

type Stop = { color: string; pos: number };
type FlutedConfig = {
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
  stops: Stop[];
};

type FlutedController = {
  destroy: () => void;
  setLifted: (on: boolean) => void;
};

// 9-column valley (outer tall, center lowest). Short at rest — they grow on
// hover. Soft, cute pastel palette — periwinkle blue → lavender → pink → peach
// → buttery yellow → cream. Mixes cool + warm so it doesn't read as fire.
const CONFIG: FlutedConfig = {
  cols: 9,
  base: 0.1, // very short columns at rest
  intensity: 0.22,
  blur: 6, // much less blur → sharp, distinct flutes
  bg: "#f3f4ea",
  grade: 0.12,
  impasto: 0.11,
  lightAngle: 156,
  canvas: 0.01,
  grain: 0, // no chunky internal grain — the fine site-wide grain handles tooth
  grainColored: true,
  lifts: [1.5, 0.75, 0.5, 0.25, 0, 0.25, 0.5, 0.75, 1.5], // outermost columns run taller
  stops: [
    { color: "#a7bce6", pos: 0 }, // soft periwinkle blue
    { color: "#cbb9e4", pos: 0.18 }, // lavender
    { color: "#f0bcd4", pos: 0.36 }, // soft pink
    { color: "#f8ccae", pos: 0.54 }, // peach
    { color: "#f6e4a6", pos: 0.72 }, // buttery yellow
    { color: "#f8eedb", pos: 0.88 }, // cream
    { color: "#f3f4ea", pos: 1 }, // fade to bg
  ],
};

// Hover response: every column grows taller, the outer ones most, and the
// whole thing saturates up.
const BASE_LIFT = 0.14; // every column grows at least this much taller
const EDGE_LIFT = 0.42; // extra height, scaled by how outer the column is
const SAT_BOOST = 0.5; // +50% saturation on hover
const RENDER_CAP = 960; // cap the internal canvas width — high enough for sharp
// flutes + fine texture, capped so the per-frame painterly pass stays smooth.

// Ported from flute-generator.html's createFlutedGradient(): side-by-side
// gradient columns, each anchored at the bottom and stretched to its own
// height, faded into the background, with an impressionist painterly pass
// (Monet grade + impasto relight + canvas weave + grain). The column heights
// + a global saturation animate toward a "lifted" target via a smooth lerp.
function createFlutedGradient(
  container: HTMLElement,
  cfg: FlutedConfig,
): FlutedController {
  const BW = 470;
  const BH = 600;
  const stops = cfg.stops.slice().sort((a, b) => a.pos - b.pos);
  const c = (cfg.cols - 1) / 2;
  const outer = cfg.lifts.map((_, i) => Math.abs(i - c) / (c || 1)); // 0 center → 1 edge
  const base = cfg.lifts.slice();
  const cur = base.slice();
  const target = new Array(cfg.cols).fill(0);
  let satCur = 0;
  let satTarget = 0;

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const s = document.createElement("canvas");
  const sx = s.getContext("2d")!;
  const bcv = document.createElement("canvas");
  const bx = bcv.getContext("2d", { willReadFrequently: true })!;
  let K = 1;
  let raf = 0;
  // Impasto height map depends only on resolution, not on the animating column
  // heights — build it once per size, not every frame.
  let hmCache: Float32Array | null = null;
  let hmW = 0;
  let hmH = 0;

  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
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
  const hf = (i: number) => Math.max(0.04, cfg.base + cur[i] * cfg.intensity);

  function drawSharp(t: CanvasRenderingContext2D, w: number, h: number) {
    t.fillStyle = cfg.bg;
    t.fillRect(0, 0, w, h);
    const colW = w / cfg.cols;
    for (let i = 0; i < cfg.cols; i++) {
      const top = h - hf(i) * h;
      const g = t.createLinearGradient(0, h, 0, top);
      for (let j = 0; j < stops.length; j++)
        g.addColorStop(Math.min(1, Math.max(0, stops[j].pos)), stops[j].color);
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
    const satNow = satCur;
    let hm: Float32Array | null = null;
    if (cfg.impasto > 0) {
      if (!hmCache || hmW !== w || hmH !== h) {
        hmCache = buildHeight(w, h);
        hmW = w;
        hmH = h;
      }
      hm = hmCache;
    }
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
          cr += (0.24 - cr) * sM * 0.5 * gm; // banish black -> violet-blue shadows
          cg += (0.19 - cg) * sM * 0.5 * gm;
          cb += (0.44 - cb) * sM * 0.5 * gm;
          cr += (1.0 - cr) * hM * 0.3 * gm; // warm high-key highlights
          cg += (0.96 - cg) * hM * 0.3 * gm;
          cb += (0.84 - cb) * hM * 0.3 * gm;
          cr += (cr - L) * 0.4 * gm * mM; // broken-color midtone saturation
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
        if (satNow > 0) {
          // pull each channel away from luminance → more saturated
          const Lc = 0.299 * cr + 0.587 * cg + 0.114 * cb;
          cr = Lc + (cr - Lc) * (1 + satNow);
          cg = Lc + (cg - Lc) * (1 + satNow);
          cb = Lc + (cb - Lc) * (1 + satNow);
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
    if (s.width !== w || s.height !== h) {
      s.width = w;
      s.height = h;
      bcv.width = w;
      bcv.height = h;
    }
    drawSharp(sx, w, h);
    bx.clearRect(0, 0, w, h);
    const blurPx = cfg.blur * K;
    bx.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
    bx.drawImage(s, 0, 0);
    bx.filter = "none";
    painter(bx, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bcv, 0, 0);
  }
  function loop() {
    let moving = false;
    for (let i = 0; i < cfg.cols; i++) {
      const goal = base[i] + target[i];
      cur[i] += (goal - cur[i]) * 0.14;
      if (Math.abs(goal - cur[i]) > 0.001) moving = true;
    }
    satCur += (satTarget - satCur) * 0.14;
    if (Math.abs(satTarget - satCur) > 0.002) moving = true;
    render();
    raf = moving ? requestAnimationFrame(loop) : 0;
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function setLifted(on: boolean) {
    for (let i = 0; i < cfg.cols; i++)
      target[i] = on ? BASE_LIFT + outer[i] * EDGE_LIFT : 0;
    satTarget = on ? SAT_BOOST : 0;
    kick();
  }
  function resize() {
    const r = container.getBoundingClientRect();
    const cw = r.width || BW;
    const ch = r.height || BH;
    const scale = Math.min(1, RENDER_CAP / cw);
    const iw = Math.max(1, Math.round(cw * scale));
    const ih = Math.max(1, Math.round(ch * scale));
    K = iw / BW;
    canvas.width = iw;
    canvas.height = ih;
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
    setLifted,
  };
}

export function FlutedBackground({
  lifted = false,
  bg,
  stops,
  lifts,
  blur,
}: {
  lifted?: boolean;
  bg?: string;
  // Optional palette window (saturated bottom → fade-bg top) and per-column
  // heights. Used by the slide deck to give each slide its own fluted shape +
  // onboarding-palette colors; the landing passes neither and keeps CONFIG.
  stops?: Stop[];
  lifts?: number[];
  // Optional blur override — lower = sharper, more distinct flute columns.
  blur?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ctrl = useRef<FlutedController | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const cfg: FlutedConfig = { ...CONFIG };
    if (stops) cfg.stops = stops;
    if (lifts) {
      cfg.lifts = lifts;
      cfg.cols = lifts.length;
    }
    if (blur !== undefined) cfg.blur = blur;
    if (bg) {
      // bg override recolors the canvas fill; without explicit stops it also
      // recolors the final fade stop so the flutes rise out of that background.
      cfg.bg = bg;
      if (!stops)
        cfg.stops = CONFIG.stops.map((s, i) =>
          i === CONFIG.stops.length - 1 ? { ...s, color: bg } : s,
        );
    }
    ctrl.current = createFlutedGradient(ref.current, cfg);
    return () => ctrl.current?.destroy();
  }, [bg, stops, lifts, blur]);
  useEffect(() => {
    ctrl.current?.setLifted(lifted);
  }, [lifted]);
  return <div ref={ref} className="h-full w-full" />;
}
