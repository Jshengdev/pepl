"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "../fluted";
import { cardStopsFromColors, SET_LEN } from "../palette";
import type { CardDesign, ShapeKind } from "../types";

// Step 3 — "design your card backgrounds". Three fluted backings, each gradient
// derived from the colors chosen for the profile avatar. Drag the column handles
// to sculpt heights; drag the dot around each shape to rotate the color set.

const CARD_W = 236;
const CARD_H = Math.round((CARD_W * 600) / 470); // keep the 470:600 card ratio
const COLS = CARD_DEFAULTS.cols;
const PALETTE_LEN = SET_LEN; // one full loop of the shape sweeps the whole set

// ── shape math (viewBox 0..100, centered at 50) ─────────────────────────────
function shapePoint(kind: ShapeKind, theta: number): { x: number; y: number } {
  if (kind === "circle") {
    const R = 34;
    return { x: 50 + R * Math.cos(theta), y: 50 + R * Math.sin(theta) };
  }
  if (kind === "infinity") {
    // Lemniscate of Gerono: x=cosθ, y=sinθ·cosθ → a horizontal figure-eight.
    const A = 40;
    return { x: 50 + A * Math.cos(theta), y: 50 + A * Math.sin(theta) * Math.cos(theta) };
  }
  // Rose curve r = cos(2θ) → four petals.
  const R = 40;
  const r = Math.cos(2 * theta);
  return { x: 50 + R * r * Math.cos(theta), y: 50 + R * r * Math.sin(theta) };
}

function shapePath(kind: ShapeKind): string {
  const N = 180;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const { x, y } = shapePoint(kind, (i / N) * Math.PI * 2);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return d + "Z";
}

// ── one card: canvas + column-height handles ────────────────────────────────
function FlutedCard({
  design,
  colors,
  index,
  dim,
  onLifts,
}: {
  design: CardDesign;
  colors: string[];
  index: number;
  dim: boolean;
  onLifts: (lifts: number[]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<FlutedController | null>(null);
  const dragCol = useRef<number | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    ctrlRef.current = createFluted(hostRef.current, {
      ...CARD_DEFAULTS,
      lifts: design.lifts.slice(),
      stops: cardStopsFromColors(colors, design.offset),
    });
    console.log(`[pepl:cards] card ${index} mounted`);
    return () => ctrlRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ctrlRef.current?.setLifts(design.lifts);
  }, [design.lifts]);
  useEffect(() => {
    ctrlRef.current?.setStops(cardStopsFromColors(colors, design.offset));
  }, [design.offset, colors]);

  function liftFromEvent(e: React.PointerEvent): number {
    const rect = cardRef.current!.getBoundingClientRect();
    const relY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    const heightFrac = 1 - relY;
    return Math.min(1, Math.max(0, (heightFrac - CARD_DEFAULTS.base) / CARD_DEFAULTS.intensity));
  }
  function onColDown(i: number, e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragCol.current = i;
    const lifts = design.lifts.slice();
    lifts[i] = liftFromEvent(e);
    onLifts(lifts);
  }
  function onColMove(e: React.PointerEvent) {
    if (dragCol.current === null) return;
    const lifts = design.lifts.slice();
    lifts[dragCol.current] = liftFromEvent(e);
    onLifts(lifts);
  }
  function onColUp() {
    dragCol.current = null;
  }

  return (
    <div
      ref={cardRef}
      className="relative shrink-0 overflow-hidden rounded-[28px]"
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div ref={hostRef} className="absolute inset-0" />

      <p className="absolute inset-x-0 top-3 text-center font-mono text-[8px] uppercase leading-tight tracking-[0.18em] text-charcoal/55">
        designed in pepl
        <br />
        backing no.{index + 1}
      </p>

      {/* column-height handles — drag a tick up/down to set that column.
          fades out as the cards step exits into the reveal. */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{ opacity: dim ? 0 : 1, pointerEvents: dim ? "none" : "auto" }}
      >
        {Array.from({ length: COLS }).map((_, i) => {
          const heightFrac = CARD_DEFAULTS.base + design.lifts[i] * CARD_DEFAULTS.intensity;
          const left = `${((i + 0.5) / COLS) * 100}%`;
          return (
            <div
              key={i}
              onPointerDown={(e) => onColDown(i, e)}
              onPointerMove={onColMove}
              onPointerUp={onColUp}
              className="group absolute inset-y-0 w-8 -translate-x-1/2 cursor-ns-resize touch-none"
              style={{ left }}
            >
              <div className="absolute bottom-[4%] left-1/2 top-[8%] w-px -translate-x-1/2 bg-charcoal/15" />
              <div
                className="absolute left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-charcoal/75 shadow transition-transform group-hover:scale-125"
                style={{ top: `${(1 - heightFrac) * 100}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── one shape control (drag the white dot to rotate the colors) ─────────────
function ShapeControl({
  design,
  gid,
  onOffset,
}: {
  design: CardDesign;
  gid: number;
  onOffset: (offset: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const theta = (design.offset / PALETTE_LEN) * Math.PI * 2;
  const dot = shapePoint(design.shape, theta);

  function setFromEvent(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let a = Math.atan2(e.clientY - cy, e.clientX - cx);
    if (a < 0) a += Math.PI * 2;
    onOffset((a / (Math.PI * 2)) * PALETTE_LEN);
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className="h-[134px] w-[134px] cursor-grab touch-none select-none active:cursor-grabbing"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromEvent(e);
      }}
    >
      <defs>
        {/* grain/tooth clipped to the shape, matching the cards' texture */}
        <filter id={`shapeGrain-${gid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="m" />
          <feComponentTransfer in="m" result="g">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feComposite in="g" in2="SourceAlpha" operator="in" result="grain" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="grain" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={shapePath(design.shape)}
        fill="none"
        stroke="#bdbdb8"
        strokeWidth={11}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#shapeGrain-${gid})`}
      />
      <circle cx={dot.x} cy={dot.y} r={7} fill="#ffffff" stroke="rgba(42,42,40,0.45)" strokeWidth={2} />
    </svg>
  );
}

export function CardsStep({
  value,
  colors,
  onChange,
  onNext,
  onBack,
}: {
  value: CardDesign[];
  colors: string[];
  onChange: (cards: CardDesign[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  function update(i: number, patch: Partial<CardDesign>) {
    onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function next() {
    // exit: the lines + shapes disappear and the backings grow, then reveal
    setLeaving(true);
    window.setTimeout(onNext, 620);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <h1
        className="text-2xl font-bold tracking-tight text-charcoal transition-opacity duration-500"
        style={{ opacity: leaving ? 0 : 1 }}
      >
        design your card backgrounds
      </h1>
      <p
        className="mt-2 text-sm text-charcoal/60 transition-opacity duration-500"
        style={{ opacity: leaving ? 0 : 1 }}
      >
        drag the handles to sculpt the columns · drag the dot around each shape to shift the colors
      </p>

      <div
        className="mt-10 flex items-start gap-5 transition-transform duration-[620ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: leaving ? "scale(1.16)" : "scale(1)" }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="back"
          className="mt-28 flex h-10 w-10 items-center justify-center rounded-full text-charcoal/45 transition hover:bg-charcoal/5 hover:text-charcoal"
          style={{ opacity: leaving ? 0 : 1 }}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        {value.map((card, i) => (
          <div key={i} className={`flex flex-col items-center gap-4 ${i === 1 ? "-mt-3" : ""}`}>
            <FlutedCard
              design={card}
              colors={colors}
              index={i}
              dim={leaving}
              onLifts={(lifts) => update(i, { lifts })}
            />
            <div className="transition-opacity duration-500" style={{ opacity: leaving ? 0 : 1 }}>
              <ShapeControl design={card} gid={i} onOffset={(offset) => update(i, { offset })} />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={next}
          aria-label="next"
          className="mt-28 flex h-10 w-10 items-center justify-center rounded-full text-charcoal/70 transition hover:bg-charcoal/5 hover:text-charcoal"
          style={{ opacity: leaving ? 0 : 1 }}
        >
          <ArrowRight className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
