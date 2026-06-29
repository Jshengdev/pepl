"use client";

import { useEffect, useRef } from "react";
import { Hourglass, MapPin, Briefcase, Sparkles, type LucideIcon } from "lucide-react";
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
  // Only show rows that actually have a grounded value (empty = not in the scrape, never faked).
  const rows = (
    [
      [Briefcase, "Occupation", person.occupation],
      [MapPin, "Based in", person.hometown],
      [Hourglass, "Age", person.age],
      [Sparkles, "Personality", person.personality],
    ] as [LucideIcon, string, string][]
  ).filter(([, , v]) => v);
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

      <div className="relative z-10 flex h-full flex-col px-6 pb-6 pt-7">
        {/* identity — name + the one line that captures them */}
        <p className="text-[13px] font-semibold text-[#6e6e6e]">#{person.rank} of pepl</p>
        <p className="mt-0.5 text-[25px] font-semibold leading-[1.04] tracking-tight text-black">
          {person.name}
        </p>
        {person.tagline && (
          <p className="mt-1 text-[12px] italic leading-snug text-[#8a8a8a]">{person.tagline}</p>
        )}

        {/* facts — label + value rows, only the grounded ones */}
        <div className="mt-4 flex flex-col gap-2 text-[11.5px]">
          {rows.map(([Icon, label, val]) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="mt-px h-3.5 w-3.5 shrink-0 text-[#9a9a9a]" strokeWidth={2} />
              <span className="font-semibold text-[#6e6e6e]">{label}</span>
              <span className="ml-1 font-semibold text-black">{val}</span>
            </div>
          ))}
        </div>

        {/* known for — the identity-defining things */}
        {person.facts.length > 0 && (
          <div className="mt-4">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#9a9a9a]">Known for</p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {person.facts.slice(0, 4).map((f, i) => (
                <li key={i} className="flex gap-1.5 text-[11.5px] leading-snug text-black">
                  <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-[#b0b0b0]" />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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
