"use client";

import type { ReactNode } from "react";
import { FlutedBackground } from "@/features/landing/FlutedBackground";
import { HeroGlobe } from "@/features/landing/HeroGlobe";
import { PeplMark } from "./PeplMark";

// Every size below is in container-query units (cqw/cqh) so the whole slide
// scales with the 16:9 stage — identical at any window size and in fullscreen.
// The stage sets `container-type: size` (see SlideDeck.tsx).

const ACCENT = "#ef9866"; // coral from the flute palette — the deck's one accent

// ── Shared pieces ──────────────────────────────────────────────────────────
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[10cqw] text-center">
      {children}
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
      className="animate-fade-up max-w-[76cqw] text-balance font-semibold leading-[1.05] tracking-tight text-cream"
      style={{ fontSize: size, animationDelay: "0.08s" }}
    >
      {children}
    </h2>
  );
}

function Sub({ children }: { children: ReactNode }) {
  return (
    <p
      className="animate-fade-up mt-[3cqw] max-w-[62cqw] text-pretty text-[2.2cqw] font-light leading-tight text-cream/55"
      style={{ animationDelay: "0.18s" }}
    >
      {children}
    </p>
  );
}

// ── 01 — Title ──────────────────────────────────────────────────────────────
function Title() {
  return (
    <div className="relative h-full w-full bg-black">
      {/* Gradient flutes as a warm valley rising from the bottom edge, fading
          up into the black so there's no seam. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[58%]"
        style={{
          WebkitMaskImage: "linear-gradient(to top, #000 30%, transparent)",
          maskImage: "linear-gradient(to top, #000 30%, transparent)",
        }}
      >
        <FlutedBackground bg="#000000" />
      </div>

      {/* logo + wordmark, big & centered, with the tagline underneath */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pb-[5cqh]">
        <div className="animate-fade-up flex items-center gap-[2cqw]">
          <PeplMark className="h-[8.5cqw] w-[8.5cqw]" />
          <span className="font-britti text-[11cqw] font-normal lowercase leading-none tracking-tight text-cream">
            pepl
          </span>
        </div>
        <p
          className="animate-fade-up mt-[3.2cqw] text-[2.4cqw] font-light tracking-tight text-cream/65"
          style={{ animationDelay: "0.18s" }}
        >
          See the reflection of your story.
        </p>
      </div>
    </div>
  );
}

// ── 02 — The Problem ─────────────────────────────────────────────────────────
function Problem() {
  return (
    <Shell>
      <Kicker n="02">The Problem</Kicker>
      <Headline>
        Most people lack perspective on their lives because they don&rsquo;t sit
        down to organize it and see it.
      </Headline>
      <Sub>The longer you go without reflecting, it just gets blurry.</Sub>
    </Shell>
  );
}

// ── 03 — The existential root ────────────────────────────────────────────────
function Existential() {
  return (
    <Shell>
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
        Who am I? Why am I here? How do I connect with other people?
      </p>
      <p
        className="animate-fade-up mt-[2.4cqw] text-[1.9cqw] font-light text-cream/55"
        style={{ animationDelay: "0.36s" }}
      >
        The depression epidemic is a symptom, not the root issue.
      </p>
    </Shell>
  );
}

// ── 04 — The Insight ─────────────────────────────────────────────────────────
function Insight() {
  return (
    <Shell>
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
        <span className="text-cream/25">&middot;</span>
        <span>Best Friend.</span>
        <span className="text-cream/25">&middot;</span>
        <span>Great Film.</span>
      </div>
    </Shell>
  );
}

// ── 05 — Live demo ───────────────────────────────────────────────────────────
function Demo() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black">
      <div className="animate-fade-in relative aspect-square h-[62cqh]">
        <HeroGlobe />
      </div>
      <div
        className="animate-fade-up mt-[1cqh] flex items-center gap-[1.6cqw]"
        style={{ animationDelay: "0.25s" }}
      >
        <PeplMark className="h-[3cqw] w-[3cqw]" />
        <span className="text-[3.2cqw] font-semibold tracking-tight text-cream">
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
