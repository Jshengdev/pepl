"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SLIDES } from "./Slides";

export function SlideDeck() {
  const [index, setIndex] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = SLIDES.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => Math.min(count - 1, Math.max(0, i + dir))),
    [count],
  );

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  // Arrow keys move between slides; `f` toggles fullscreen; Home/End jump.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
        case " ":
          e.preventDefault();
          go(1);
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          e.preventDefault();
          go(-1);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "Home":
          setIndex(0);
          break;
        case "End":
          setIndex(count - 1);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleFullscreen, count]);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const Slide = SLIDES[index].render;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex items-center justify-center bg-[#f3f4ea]"
    >
      {/* 16:9 stage — sized to fit any window, letterboxed, and held at 16:9 in
          fullscreen. `container-type: size` lets the slides size their type in
          cqw/cqh so everything scales with the stage. */}
      <div
        className="relative aspect-video overflow-hidden bg-[#f3f4ea] text-charcoal"
        style={{
          width: "min(100vw, calc(100vh * 16 / 9))",
          height: "min(100vh, calc(100vw * 9 / 16))",
          containerType: "size",
        }}
      >
        <div key={index} className="absolute inset-0">
          <Slide />
        </div>
      </div>

      {/* progress dots — each button keeps a 40×40 hit area; the visible pill is
          a small inner span (#16 minimum hit area). */}
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="group flex h-10 w-10 items-center justify-center"
          >
            <span
              className={`h-1.5 rounded-full transition-[width,background-color,transform] duration-300 group-active:scale-90 ${
                i === index
                  ? "w-6 bg-charcoal/80"
                  : "w-1.5 bg-charcoal/25 group-hover:bg-charcoal/50"
              }`}
            />
          </button>
        ))}
      </div>

      {/* slide counter + fullscreen toggle */}
      <div className="absolute bottom-1.5 right-2 flex items-center gap-1 text-charcoal/40">
        <span className="text-xs tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <button
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
          className="flex h-10 w-10 items-center justify-center transition-[color,transform] duration-150 hover:text-charcoal/80 active:scale-[0.96]"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isFs ? (
              <path d="M9 4v3a2 2 0 0 1-2 2H4M20 9h-3a2 2 0 0 1-2-2V4M4 15h3a2 2 0 0 1 2 2v3M15 20v-3a2 2 0 0 1 2-2h3" />
            ) : (
              <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
