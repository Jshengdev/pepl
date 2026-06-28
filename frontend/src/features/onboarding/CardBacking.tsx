"use client";

import { useEffect, useRef } from "react";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "./fluted";
import { cardStopsFromColors } from "./palette";

// The fluted gradient backing — ONE component used everywhere a card backing
// appears: the card maker, the reveal assembly, and the flip stack. Keeping it
// a single component (same size, radius, fluted config, label) means a card
// looks IDENTICAL as it animates between screens — no swap-in glitch. It fills
// its parent and lerps live when lifts/offset change.
export const BACKING_W = 236;
export const BACKING_H = Math.round((BACKING_W * 600) / 470); // 301

export function CardBacking({
  colors,
  lifts,
  offset,
  label,
  radius = 28,
}: {
  colors: string[];
  lifts: number[];
  offset: number;
  label?: React.ReactNode;
  radius?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<FlutedController | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    ctrlRef.current = createFluted(hostRef.current, {
      ...CARD_DEFAULTS,
      lifts: lifts.slice(),
      stops: cardStopsFromColors(colors, offset),
    });
    return () => ctrlRef.current?.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    ctrlRef.current?.setLifts(lifts);
  }, [lifts]);
  useEffect(() => {
    ctrlRef.current?.setStops(cardStopsFromColors(colors, offset));
  }, [offset, colors]);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: radius }}>
      <div ref={hostRef} className="absolute inset-0" />
      {label && (
        <div className="absolute inset-x-0 top-3 text-center font-mono text-[8px] uppercase leading-snug tracking-[0.18em] text-charcoal/55">
          {label}
        </div>
      )}
    </div>
  );
}
