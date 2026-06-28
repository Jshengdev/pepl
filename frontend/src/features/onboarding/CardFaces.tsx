"use client";

import { useEffect, useRef } from "react";
import { Hourglass, MapPin, Cake, Briefcase, type LucideIcon } from "lucide-react";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "./fluted";
import { cardStopsFromColors, FADE_BG } from "./palette";
import type { CardDesign, Person } from "./types";

// The two faces of a pepl card, each filling its parent (the stack positions
// them). Front = profile info (Figma layout) on the same Monet cream the backs
// fade to, with the same painterly tooth; Back = the fluted gradient backing
// derived from the person's profile colors. No stroke on either face.

// painterly overlays for the card front — a lit canvas tooth (soft-light) + a
// fine grain (multiply), the same SVG-noise recipe the page uses in globals.css.
const PAPER_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.16' numOctaves='2' stitchTiles='stitch' result='n'/%3E%3CfeDiffuseLighting in='n' surfaceScale='1.8' diffuseConstant='1.05'%3E%3CfeDistantLight azimuth='235' elevation='56'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function CardFront({ person }: { person: Person }) {
  const inlineRows: [LucideIcon, string, string][] = [
    [Hourglass, "Age", person.age],
    [MapPin, "Hometown", person.hometown],
    [Cake, "Birthday", person.birthday],
  ];
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[34px]"
      style={{ backgroundColor: FADE_BG }}
    >
      {/* painterly tooth — canvas texture + grain, matching the gradient backs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: PAPER_TEXTURE, backgroundSize: "180px 180px", opacity: 0.6, mixBlendMode: "soft-light" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", opacity: 0.14, mixBlendMode: "multiply" }}
      />

      <div className="relative z-10 flex h-full flex-col px-7 pb-7 pt-8">
        {/* identity — tight pair, the loudest thing on the card */}
        <p className="text-[15px] font-semibold text-[#6e6e6e]">#{person.rank} of pepl</p>
        <p className="mt-0.5 text-[29px] font-semibold leading-[1.04] tracking-tight text-black">
          {person.name}
        </p>

        {/* info — generous gap from the name, tight gaps between rows */}
        <div className="mt-7 flex flex-col gap-3.5 text-[12.5px]">
          {inlineRows.map(([Icon, label, val]) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-[#9a9a9a]" strokeWidth={2} />
              <span className="font-semibold text-[#6e6e6e]">{label}</span>
              <span className="ml-1.5 font-semibold text-black">{val}</span>
            </div>
          ))}
          {/* occupation — value drops to its own line (can run long) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-[#9a9a9a]" strokeWidth={2} />
              <span className="font-semibold text-[#6e6e6e]">Current Occupation</span>
            </div>
            <span className="font-semibold text-black">{person.occupation}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardBack({
  person,
  card,
  index,
}: {
  person: Person;
  card: CardDesign;
  index: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const colors = person.avatar.points.map((p) => p.color);
  useEffect(() => {
    if (!hostRef.current) return;
    const ctrl: FlutedController = createFluted(hostRef.current, {
      ...CARD_DEFAULTS,
      lifts: card.lifts.slice(),
      stops: cardStopsFromColors(colors, card.offset),
    });
    return () => ctrl.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.lifts, card.offset, colors.join()]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px]">
      <div ref={hostRef} className="absolute inset-0" />
      <p className="absolute inset-x-0 top-5 text-center font-mono text-[9px] uppercase leading-snug tracking-[0.2em] text-charcoal/55">
        a reflection of
        <br />
        {person.name} · backing no.{index + 1}
      </p>
    </div>
  );
}
