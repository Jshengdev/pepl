"use client";

import { useEffect, useRef } from "react";
import { Hourglass, MapPin, Cake, Briefcase, type LucideIcon } from "lucide-react";
import { MeshAvatar } from "./MeshAvatar";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "./fluted";
import { cardStops } from "./palette";
import type { CardDesign, Person } from "./types";

// The two faces of a pepl card, each filling its parent (the stack positions
// them). Front = Figma profile layout; Back = the fluted gradient backing.

const ROW_ICONS: LucideIcon[] = [Hourglass, MapPin, Cake, Briefcase];

export function CardFront({ person }: { person: Person }) {
  const rows: [string, string][] = [
    ["Age", person.age],
    ["Hometown", person.hometown],
    ["Birthday", person.birthday],
    ["Current Occupation", person.occupation],
  ];
  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-hidden rounded-[34px] border border-black/85 bg-white px-7 pb-8 pt-7">
      <MeshAvatar
        points={person.avatar.points}
        strokes={person.avatar.strokes}
        className="h-12 w-12"
        strokeWidth={6}
      />
      <div className="flex flex-col">
        <span className="text-lg font-semibold text-[#7b7b7b]">#{person.rank} of pepl</span>
        <span className="text-[32px] font-semibold leading-tight text-black">{person.name}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map(([label, val], i) => {
          const Icon = ROW_ICONS[i];
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#7b7b7b]">
                <Icon className="h-4 w-4" strokeWidth={2.2} />
                <span className="text-[13px] font-semibold">{label}</span>
              </div>
              <span className="pl-[22px] text-[13px] font-semibold text-black">{val}</span>
            </div>
          );
        })}
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
  useEffect(() => {
    if (!hostRef.current) return;
    const ctrl: FlutedController = createFluted(hostRef.current, {
      ...CARD_DEFAULTS,
      lifts: card.lifts.slice(),
      stops: cardStops(card.offset),
    });
    return () => ctrl.destroy();
  }, [card.lifts, card.offset]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px] border border-black/10">
      <div ref={hostRef} className="absolute inset-0" />
      <p className="absolute inset-x-0 top-5 text-center font-mono text-[9px] uppercase leading-snug tracking-[0.2em] text-charcoal/55">
        a reflection of
        <br />
        {person.name} · backing no.{index + 1}
      </p>
    </div>
  );
}
