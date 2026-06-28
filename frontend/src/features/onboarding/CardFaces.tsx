"use client";

import { useEffect, useRef } from "react";
import { Hourglass, MapPin, Cake, Briefcase, type LucideIcon } from "lucide-react";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "./fluted";
import { cardStopsFromColors } from "./palette";
import type { CardDesign, Person } from "./types";

// The two faces of a pepl card, each filling its parent (the stack positions
// them). Front = profile info (Figma layout); Back = the fluted gradient backing
// derived from the person's profile colors. No stroke on either face.

export function CardFront({ person }: { person: Person }) {
  const inlineRows: [LucideIcon, string, string][] = [
    [Hourglass, "Age", person.age],
    [MapPin, "Hometown", person.hometown],
    [Cake, "Birthday", person.birthday],
  ];
  return (
    <div className="flex h-full w-full flex-col rounded-[34px] bg-white px-7 pb-7 pt-8">
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
