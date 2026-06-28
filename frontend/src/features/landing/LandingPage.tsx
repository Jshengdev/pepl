"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FlutedBackground } from "./FlutedBackground";
import { HeroGlobe } from "./HeroGlobe";

// Swap this one line to change the tagline.
const TAGLINE = "See the reflection of your story.";

export function LandingPage() {
  const [ctaHover, setCtaHover] = useState(false);

  // A quiet hello for the curious who open the console.
  useEffect(() => {
    const w = window as unknown as { __peplHi?: boolean };
    if (w.__peplHi) return;
    w.__peplHi = true;
    console.log("%cpepl", "font:700 22px ui-sans-serif,system-ui;color:#7fa0d8");
    console.log(
      "%c✦ you found the source — every story leaves a trace.",
      "color:#b08fb0;font-style:italic",
    );
  }, []);

  return (
    <main className="relative flex min-h-dvh w-full flex-col overflow-hidden">
      {/* Monet fluted-gradient backdrop (valley-shaped), behind everything. */}
      <div className="fixed inset-0 -z-10">
        <FlutedBackground lifted={ctaHover} />
      </div>

      {/* A large globe rising from the bottom — its top half is on-screen
          (~1.5× size; globe center sits at the bottom edge of the viewport). */}
      <div className="animate-fade-in absolute left-1/2 top-[54vh] z-0 aspect-square w-[min(93vh,129vw)] -translate-x-1/2">
        <HeroGlobe />
      </div>

      {/* Discoverability nudge for the globe — appears briefly, then fades. */}
      <p
        aria-hidden="true"
        className="hint-fade pointer-events-none absolute inset-x-0 top-[67%] z-[5] text-center text-sm italic text-charcoal/50"
      >
        tap the globe to trace your path
      </p>

      {/* Soft wash up top keeps the tagline legible over the globe. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[62vh] bg-gradient-to-b from-cream via-cream/80 to-transparent"
      />

      {/* pepl logo + wordmark — centered at the top. */}
      <header
        className="animate-fade-up absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 pt-7"
        style={{ animationDelay: "0.05s" }}
      >
        {/* logo mark — 3-point mesh gradient matching the flute palette
            (blue / yellow / pink pastels) with the white scribble "eyes" on top. */}
        <span
          aria-hidden="true"
          className="relative inline-flex h-6 w-6 overflow-hidden rounded-full transition-transform duration-300 ease-out hover:-rotate-[10deg] hover:scale-110"
          style={{
            backgroundColor: "#c7a6d2",
            backgroundImage: [
              "radial-gradient(circle at 18% 16%, #7fa0d8 0%, transparent 62%)",
              "radial-gradient(circle at 84% 22%, #ecd27a 0%, transparent 62%)",
              "radial-gradient(circle at 50% 92%, #e89ec0 0%, transparent 64%)",
            ].join(", "),
          }}
        >
          <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
            <path
              d="M30.1658 18.8018C30.1658 18.8219 30.4441 18.8644 30.9179 18.77C31.1134 18.6435 31.2176 18.3572 31.1449 18.1338C31.0723 17.9105 30.8195 17.7589 30 17.9027M16 21.3983C16 21.4187 16 21.4391 16.1257 21.4934C16.2513 21.5477 16.5027 21.6353 16.5987 21.5461C16.6948 21.4569 16.628 21.1883 16.364 20.8464M9.83984 26.0121C11.2785 26.8044 16.4017 29.2476 20.5223 30.1278C22.8368 30.2371 25.1147 30.0237 28.4304 29.0103C30.7138 28.2229 34.2171 26.8809 38.1601 25.2596"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="font-britti select-none text-xl font-normal lowercase tracking-tight text-charcoal">
          pepl
        </span>
      </header>

      {/* Hero content fills the viewport: tagline up top, CTA pinned bottom.
          pointer-events-none lets the cursor reach the globe through empty
          areas; interactive children re-enable events. */}
      <section className="pointer-events-none relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center px-6 text-center">
        <h1
          className="paint-text animate-fade-up mt-[11vh] max-w-3xl text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-charcoal sm:text-6xl md:text-7xl"
          style={{ animationDelay: "0.15s" }}
        >
          {TAGLINE}
        </h1>

        {/* CTA — light raised card: inset top highlight + soft 2px drop shadow
            for a slight 3D feel; the arrow slides right on hover. */}
        <Link
          href="/signin"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          className="animate-fade-up group pointer-events-auto mb-[8vh] mt-auto inline-flex items-center gap-2.5 rounded-xl bg-white py-3 pl-4 pr-6 text-charcoal ring-1 ring-charcoal/[0.07] shadow-[0_2px_5px_-1px_rgba(42,42,40,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] transition-transform active:scale-[0.96]"
          style={{ animationDelay: "0.3s" }}
        >
          <span className="text-base font-medium">begin your story</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </section>
    </main>
  );
}
