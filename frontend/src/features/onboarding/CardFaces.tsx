"use client";

import { useEffect, useRef, useState } from "react";
import { createFluted, CARD_DEFAULTS, type FlutedController } from "./fluted";
import { cardStopsFromColors, FADE_BG } from "./palette";
import type { Bit, DossierCard, Grounding, Mode } from "@/lib/pepl/types";

// The two faces of a pepl dossier card. Front = a DossierCard (title + its grounded bits,
// each compartment carrying its receipt or a red FAILED badge) on the same Monet cream the
// backs fade to, with the painterly tooth. Back = a fluted gradient backing. The bento
// Dossier is the source of truth — every value here comes straight from a backend Bit,
// never fabricated.
//
// FLAG (divergence): the Dossier carries NO card-style data (the user's drawn shape / lifts
// / colors live in the separate user_cards store, not in /reveal), so the back is decorative
// chrome on a fixed palette — not the user's designed backing.
const BACK_COLORS = ["#4f93d6", "#f2c14e", "#d65b97"];
const BACK_LIFTS = [0.6, 1, 0.55, 1, 0.6];

// painterly overlays for the card front — a lit canvas tooth (soft-light) + a fine grain
// (multiply), the same SVG-noise recipe the page uses in globals.css.
const PAPER_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.16' numOctaves='2' stitchTiles='stitch' result='n'/%3E%3CfeDiffuseLighting in='n' surfaceScale='1.8' diffuseConstant='1.05'%3E%3CfeDistantLight azimuth='235' elevation='56'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

// The receipt the UI shows for a grounded bit. We only have the IDs the contract returns
// (signalId / the computed-from set / the user source) — NOT the resolved source text or
// URL, which would need a signals lookup /reveal doesn't provide. FLAG: receipt = the id.
function receiptText(g: Grounding): string {
  switch (g.kind) {
    case "signal":
      return `receipt · signal ${g.signalId}`;
    case "computed":
      return `receipt · computed from ${g.from.length} signal(s)${g.critic ? " · critic-checked" : ""}`;
    case "user":
      return `receipt · you (${g.source})`;
  }
}

// Bit.value is string | record. Strings render verbatim; a structured value (e.g. a story
// or graph object) has no bespoke FE layout — render it honestly as compact JSON. FLAG.
function valueText(v: string | Record<string, unknown>): string {
  return typeof v === "string" ? v : JSON.stringify(v);
}

// MapNode/Dossier carry the avatar as an opaque `smiley` string ("svg/data-url mark" per the
// store) — there is no points/strokes/colors, so MeshAvatar cannot render it. We normalize
// the documented forms (data-url / http / raw <svg>) to an <img> src; an unknown encoding or
// a load error falls back to an honest neutral circle + initial (never a fabricated mesh
// face). FLAG: the smiley encoding for the seeded nodes is unverified.
function smileySrc(s: string): string | null {
  const t = s.trimStart();
  if (t.startsWith("data:image/")) return s;
  if (/^https?:\/\//i.test(t)) return s;
  if (t.startsWith("<svg")) return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
  return null;
}

export function Smiley({
  smiley,
  name,
  className = "",
}: {
  smiley: string | null;
  name: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = smiley ? smileySrc(smiley) : null;
  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setBroken(true)}
        className={`rounded-full bg-white object-cover ${className}`}
      />
    );
  }
  // honest-empty: no smiley drawn yet (or an encoding we can't render). The initial comes
  // from the backend `name`; we do NOT invent a face.
  const initial = name.trim()[0]?.toUpperCase() ?? "·";
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-charcoal/10 font-semibold text-charcoal/40 ${className}`}
      aria-label={smiley ? "smiley unavailable" : "no smiley yet"}
    >
      {initial}
    </div>
  );
}

export function ModeBadge({ mode }: { mode: Mode }) {
  const live = mode === "live";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`} />
      {mode}
    </span>
  );
}

function BitRow({ bit }: { bit: Bit }) {
  // FAIL LOUD: a failed bit is a visible red badge naming the tried source — never a value.
  if (bit.status === "failed") {
    return (
      <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 ring-1 ring-red-300">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-red-600 px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-white">
            failed
          </span>
          <span className="text-[11px] font-semibold text-charcoal">{bit.label}</span>
        </div>
        <p className="mt-1 text-[10px] text-charcoal/55">tried: {bit.triedSource}</p>
      </div>
    );
  }

  const g = bit.grounding;
  const isDrawnSmiley = g.kind === "user" && g.source === "drawn";
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2 ring-1 ring-black/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
          {bit.label}
        </span>
        <span
          title={receiptText(g)}
          className="shrink-0 cursor-help rounded-full bg-charcoal/[0.06] px-1.5 py-[3px] font-mono text-[8.5px] uppercase tracking-wide text-charcoal/45"
        >
          ⌖ {g.kind}
        </span>
      </div>
      {isDrawnSmiley && typeof bit.value === "string" ? (
        <Smiley smiley={bit.value} name="" className="mt-1.5 h-12 w-12" />
      ) : (
        <p className="mt-1 line-clamp-3 text-[12.5px] font-medium leading-snug text-black">
          {valueText(bit.value)}
        </p>
      )}
    </div>
  );
}

export function CardFront({ card }: { card: DossierCard }) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[34px] px-6 pb-6 pt-7"
      style={{ backgroundColor: FADE_BG }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50 mix-blend-soft-light"
        style={{ backgroundImage: PAPER_TEXTURE }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />
      <div className="relative flex h-full flex-col">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-charcoal/45">
          {card.kind}
        </p>
        <p className="mt-1 text-[20px] font-semibold leading-tight tracking-tight text-black">
          {card.title}
        </p>
        <div className="mt-3.5 flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {card.bits.map((bit, i) => (
            <BitRow key={i} bit={bit} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardBack({ card, index }: { card: DossierCard; index: number }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hostRef.current) return;
    const ctrl: FlutedController = createFluted(hostRef.current, {
      ...CARD_DEFAULTS,
      lifts: BACK_LIFTS.slice(),
      stops: cardStopsFromColors(BACK_COLORS, index * 4),
    });
    return () => ctrl.destroy();
  }, [index]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[34px]">
      <div ref={hostRef} className="absolute inset-0" />
      <p className="absolute inset-x-0 top-5 text-center font-mono text-[9px] uppercase leading-snug tracking-[0.2em] text-charcoal/55">
        pepl dossier
        <br />
        {card.kind} · {index + 1} of 5
      </p>
    </div>
  );
}
