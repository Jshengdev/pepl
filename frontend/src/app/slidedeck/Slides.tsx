"use client";

import type { CSSProperties, ReactNode } from "react";
import { FlutedBackground } from "@/features/landing/FlutedBackground";
import { HeroGlobe } from "@/features/landing/HeroGlobe";
import { FADE_BG, PALETTE_HEXES } from "@/features/onboarding/palette";
import { PeplMark } from "./PeplMark";

// Every size below is in container-query units (cqw/cqh) so the whole slide
// scales with the 16:9 stage — identical at any window size and in fullscreen.
// The stage sets `container-type: size` (see SlideDeck.tsx).
//
// Light theme: cream surfaces + charcoal text, matching the landing page. The
// one accent is the onboarding palette's coral.

const ACCENT = "#ea6a52"; // coral from the onboarding SET_PALETTE — reads on cream

// ── Per-slide fluted gradients ──────────────────────────────────────────────
// Colors are consecutive windows of the onboarding SET_PALETTE (saturated at the
// flute base, melting into FADE_BG at the tip). Shape comes from `lifts`; the
// band is masked so the flutes dissolve into the cream.
function palStops(start: number, n = 5): { color: string; pos: number }[] {
  const stops = Array.from({ length: n }, (_, i) => ({
    color: PALETTE_HEXES[(start + i) % PALETTE_HEXES.length],
    pos: (i / n) * 0.9,
  }));
  stops.push({ color: FADE_BG, pos: 1 });
  return stops;
}

// Column-height profiles — 7 flute columns per slide (one entry each, ~0–1.5).
const VALLEY = [1.4, 0.85, 0.4, 0, 0.4, 0.85, 1.4];
const ARCH = [0.25, 0.7, 1.15, 1.4, 1.15, 0.7, 0.25];
const ASCEND = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5];
const DESCEND = [1.5, 1.25, 1.0, 0.75, 0.5, 0.25, 0];
const LOWVALLEY = [0.45, 0.25, 0.1, 0, 0.1, 0.25, 0.45];

// Low blur keeps the 7 columns sharp and distinct (CONFIG.blur=6 is much softer).
const SHARP_BLUR = 2;

function SlideFlutes({
  start,
  lifts,
  pos = "bottom",
  height = "56%",
}: {
  start: number;
  lifts: number[];
  pos?: "bottom" | "top";
  height?: string;
}) {
  const isTop = pos === "top";
  const fade = `linear-gradient(to ${isTop ? "bottom" : "top"}, #000 26%, transparent)`;
  const style: CSSProperties = {
    height,
    WebkitMaskImage: fade,
    maskImage: fade,
    [isTop ? "top" : "bottom"]: 0,
  };
  return (
    <div
      aria-hidden="true"
      className="animate-fade-in pointer-events-none absolute inset-x-0"
      style={style}
    >
      {/* top flutes hang from the top edge: flip the canvas, keep the mask upright */}
      <div
        className="h-full w-full"
        style={isTop ? { transform: "scaleY(-1)" } : undefined}
      >
        <FlutedBackground stops={palStops(start)} lifts={lifts} blur={SHARP_BLUR} />
      </div>
    </div>
  );
}

// ── Shared content frame ─────────────────────────────────────────────────────
function Shell({
  children,
  flutes,
}: {
  children: ReactNode;
  flutes?: ReactNode;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4ea]">
      {flutes}
      {/* pb biases the vertical centering upward → the text group sits around the
          1/3 mark, freeing the bottom two-thirds for taller flutes. */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-[10cqw] pb-[34cqh] text-center">
        {children}
      </div>
    </div>
  );
}

function Kicker({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div
      className="animate-fade-up mb-[3cqw] flex items-center gap-[1.4cqw] text-[1.5cqw] font-semibold uppercase tracking-[0.28em]"
      style={{ color: ACCENT }}
    >
      <span>{n}</span>
      <span className="h-px w-[3cqw]" style={{ backgroundColor: `${ACCENT}66` }} />
      <span>{children}</span>
    </div>
  );
}

function Headline({
  children,
  size = "4.4cqw",
}: {
  children: ReactNode;
  size?: string;
}) {
  return (
    <h2
      className="animate-fade-up max-w-[76cqw] text-balance font-semibold leading-[1.05] tracking-tight text-charcoal"
      style={{ fontSize: size, animationDelay: "0.08s" }}
    >
      {children}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade-up mt-[3cqw] max-w-[62cqw] text-pretty text-[2.2cqw] font-light leading-tight text-charcoal/55"
      style={{ animationDelay: "0.18s" }}
    >
      {children}
    </p>
  );
}

// ── 01 — Title (flutes on the bottom) ────────────────────────────────────────
function Title() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4ea]">
      <SlideFlutes start={6} lifts={VALLEY} pos="bottom" height="64%" />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pb-[32cqh]">
        <div className="animate-fade-up flex items-center gap-[2cqw]">
          <PeplMark className="h-[8.5cqw] w-[8.5cqw]" />
          <span className="font-britti text-[11cqw] font-normal lowercase leading-none tracking-tight text-charcoal">
            pepl
          </span>
        </div>
        <p
          className="animate-fade-up mt-[3.2cqw] text-[2.4cqw] font-light tracking-tight text-charcoal/65"
          style={{ animationDelay: "0.18s" }}
        >
          See the reflection of your story.
        </p>
      </div>
    </div>
  );
}

// ── 02 — The Problem (flutes on the top) ─────────────────────────────────────
function Problem() {
  return (
    <Shell flutes={<SlideFlutes start={2} lifts={ARCH} pos="top" height="34%" />}>
      <Kicker n="02">The Problem</Kicker>
      <Headline>
        Most people lack perspective on their lives because they don&rsquo;t sit
        down to organize it and see it.
      </Headline>
      <Sub>The longer you go without reflecting, it just gets blurry.</Sub>
    </Shell>
  );
}

// ── 03 — The existential root (flutes low → high) ────────────────────────────
function Existential() {
  return (
    <Shell
      flutes={<SlideFlutes start={9} lifts={ASCEND} pos="bottom" height="56%" />}
    >
      <Headline size="4cqw">
        People who can&rsquo;t understand themselves, can&rsquo;t understand
        others.
      </Headline>
      <Sub>
        When work is automated and people have more time for themselves, the next
        biggest problem is an existential one.
      </Sub>
      <p
        className="animate-fade-up mt-[2.6cqw] max-w-[64cqw] text-pretty text-[2.6cqw] font-medium italic leading-tight"
        style={{ color: ACCENT, animationDelay: "0.28s" }}
      >
        Who am I? Why am I here? How do I connect with other people? The
        depression epidemic is a symptom, not the root issue.
      </p>
    </Shell>
  );
}

// ── 04 — The Insight (flutes high → low) ─────────────────────────────────────
function Insight() {
  return (
    <Shell
      flutes={<SlideFlutes start={3} lifts={DESCEND} pos="bottom" height="56%" />}
    >
      <Kicker n="04">The Insight</Kicker>
      <Headline>
        People find answers by seeing themselves through a new perspective
        &mdash; often externally.
      </Headline>
      <div
        className="animate-fade-up mt-[4cqw] flex items-center gap-[3cqw] text-[2.7cqw] font-medium"
        style={{ color: ACCENT, animationDelay: "0.24s" }}
      >
        <span>Therapist.</span>
        <span className="text-charcoal/25">&middot;</span>
        <span>Best Friend.</span>
        <span className="text-charcoal/25">&middot;</span>
        <span>Great Film.</span>
      </div>
    </Shell>
  );
}

// ── 05 — Live demo (subtle flutes on the bottom, behind the globe) ────────────
function Demo() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#f3f4ea]">
      <SlideFlutes start={0} lifts={LOWVALLEY} pos="bottom" height="42%" />
      <div className="animate-fade-in relative z-10 aspect-square h-[62cqh]">
        <HeroGlobe />
      </div>
      <div
        className="animate-fade-up relative z-10 mt-[1cqh] flex items-center gap-[1.6cqw]"
        style={{ animationDelay: "0.25s" }}
      >
        <PeplMark className="h-[3cqw] w-[3cqw]" />
        <span className="text-[3.2cqw] font-semibold tracking-tight text-charcoal">
          live demo
        </span>
      </div>
    </div>
  );
}

export const SLIDES: { render: () => ReactNode }[] = [
  { render: Title },
  { render: Problem },
  { render: Existential },
  { render: Insight },
  { render: Demo },
];
