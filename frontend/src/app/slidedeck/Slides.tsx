"use client";

import type { CSSProperties, ReactNode } from "react";
import { FlutedBackground } from "@/features/landing/FlutedBackground";
import { HeroGlobe } from "@/features/landing/HeroGlobe";
import { FADE_BG, PALETTE_HEXES } from "@/features/onboarding/palette";
import { CardBacking } from "@/features/onboarding/CardBacking";
import Link from "next/link";
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
// A soft warm baseline — a gentle wave that never dips to zero (sin across the row).
const WAVE = [0.5, 0.68, 0.66, 0.5, 0.34, 0.36, 0.5];

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
  align = "top",
}: {
  children: ReactNode;
  flutes?: ReactNode;
  align?: "top" | "bottom";
}) {
  // The padding biases the vertical centering toward the opposite end of the
  // flutes: "top" → text near the 1/3 mark (flutes grow from the bottom);
  // "bottom" → text near the 2/3 mark (flutes grow from the top).
  const bias = align === "top" ? "pb-[34cqh]" : "pt-[34cqh]";
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4ea]">
      {flutes}
      <div
        className={`relative z-10 flex h-full w-full flex-col items-center justify-center px-[10cqw] text-center ${bias}`}
      >
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
      flutes={<SlideFlutes start={9} lifts={ASCEND} pos="bottom" height="68%" />}
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
      flutes={<SlideFlutes start={3} lifts={DESCEND} pos="bottom" height="68%" />}
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

// ── 05 — The Product (subtle warm wave baseline on the bottom) ────────────────
// Labels (Connect / Dossier / Map) make the row scannable; the descriptions are
// Johnny's three phrases, near-verbatim.
const PRODUCT_STEPS = [
  { n: "01", label: "Connect", desc: "Pull info from your Gmail and online presence." },
  { n: "02", label: "Dossier", desc: "Build your dossier — 3 cards of grounded bits." },
  { n: "03", label: "Map", desc: "See how you relate to everyone else who signs up." },
];
function Product() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4ea]">
      {/* sage → citron → marigold → amber → coral window (palette idx 4) */}
      <SlideFlutes start={4} lifts={WAVE} pos="bottom" height="30%" />
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-[10cqw] pb-[8cqh] text-center">
        <Kicker n="05">The Product</Kicker>
        <Headline>
          Sign in once with Google. pepl builds your digital twin &mdash; who you
          are online right now.
        </Headline>
        <div
          className="animate-fade-up mt-[5cqw] grid w-full max-w-[74cqw] grid-cols-3 gap-[5cqw]"
          style={{ animationDelay: "0.24s" }}
        >
          {PRODUCT_STEPS.map((s) => (
            <div key={s.n} className="flex flex-col items-center text-center">
              <span
                className="text-[2.8cqw] font-semibold tabular-nums leading-none"
                style={{ color: ACCENT }}
              >
                {s.n}
              </span>
              <span className="mt-[1cqw] text-[2.1cqw] font-semibold leading-none text-charcoal">
                {s.label}
              </span>
              <span className="mt-[1.2cqw] max-w-[20cqw] text-[1.55cqw] font-light leading-snug text-charcoal/55">
                {s.desc}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 06 — The Stack (six tools; onboarding card-backs peek from the bottom) ─────
const STACK_TOOLS = [
  // Row order fills L→R, T→B so the two longest sit on the top row.
  { name: "InsForge", desc: "Agent-native cloud — provisioned, wired, and deployed from the CLI. Graph DB + row-level security + pgvector + realtime + model gateway." },
  { name: "You.com", desc: "The truth layer: people search, web scraping, citations. A held-out critic enforces every citation or cuts the claim." },
  { name: "Composio", desc: "One Google connection = sign-in and the Gmail / Calendar data source." },
  { name: "Nebius", desc: "Embeddings + inference behind the people-graph similarity." },
  { name: "Tavily", desc: "A second search lens — fast, broad, cross-checks You.com." },
  { name: "Grok / xAI", desc: "Powers the voice agent." },
];
// Three card-backs (cornflower / marigold / rose triads), each rotated to a
// different palette window — same fluted engine as the onboarding flow's cards.
const STACK_CARDS = [
  { colors: ["#1f5fa6", "#4f93d6", "#8fb3e8"], lifts: [0.6, 1, 0.55, 1, 0.6], offset: 1, tilt: -5 },
  { colors: ["#c3c66a", "#f2c14e", "#ef9a4a"], lifts: [0.4, 0.7, 1, 0.7, 0.4], offset: 6, tilt: 0 },
  { colors: ["#ea6a52", "#d65b97", "#9a6fc0"], lifts: [1, 0.6, 0.85, 0.6, 1], offset: 10, tilt: 5 },
];
function Stack() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f3f4ea]">
      {/* card-backs peek up from the bottom edge, clipped to their top ~2/3 */}
      <div className="animate-fade-in pointer-events-none absolute inset-x-0 bottom-0 z-0 flex translate-y-[14cqh] items-end justify-center gap-[6cqw]">
        {STACK_CARDS.map((c, i) => (
          <div
            key={i}
            className="aspect-[3/4] h-[42cqh]"
            style={{ transform: `rotate(${c.tilt}deg)` }}
          >
            <CardBacking colors={c.colors} lifts={c.lifts} offset={c.offset} radius={22} />
          </div>
        ))}
      </div>
      <div className="relative z-10 flex h-full w-full flex-col items-center px-[10cqw] pt-[7cqh] pb-[30cqh]">
        <Kicker n="06">The Stack</Kicker>
        <div className="grid w-full max-w-[78cqw] grid-cols-2 gap-x-[6cqw] gap-y-[3.2cqw] text-left">
          {STACK_TOOLS.map((t) => (
            <div key={t.name}>
              <div className="text-[2.3cqw] font-semibold leading-none text-charcoal">
                {t.name}
              </div>
              <div className="mt-[1cqw] text-[1.55cqw] font-light leading-snug text-charcoal/55">
                {t.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 07 — Live demo (subtle flutes on the bottom, behind the globe) ────────────
function Demo() {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#f3f4ea] pb-[16cqh]">
      <SlideFlutes start={0} lifts={VALLEY} pos="bottom" height="56%" />
      <div className="animate-fade-in relative z-10 aspect-square h-[52cqh]">
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
      <Link
        href="/signin"
        className="animate-fade-up relative z-10 mt-[3.5cqh] rounded-full bg-charcoal px-[3.5cqw] py-[1.6cqh] text-[2.1cqw] font-semibold text-white transition hover:opacity-90"
        style={{ animationDelay: "0.4s" }}
      >
        try it yourself — sign in &rarr;
      </Link>
    </div>
  );
}

export const SLIDES: { render: () => ReactNode }[] = [
  { render: Title },
  { render: Problem },
  { render: Existential },
  { render: Insight },
  { render: Product },
  { render: Stack },
  { render: Demo },
];
