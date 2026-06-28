"use client";

import { useEffect, useState } from "react";

// The shared progress strip at the bottom of every onboarding screen: a tiny
// elapsed timer on the left, then a row of 8px squares that fill with progress,
// and the step label with a 3-dot loader animation.
const SQUARES = 44;

export function LoadingBar({ progress, label }: { progress: number; label: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(elapsed / 60);
  const ss = (elapsed % 60).toString().padStart(2, "0");
  const filled = Math.round(progress * SQUARES);

  return (
    <div className="absolute inset-x-0 bottom-0 px-10 pb-6">
      <div className="flex items-center gap-3">
        <span className="w-8 shrink-0 text-[10px] font-semibold tabular-nums text-charcoal/55">
          {mm}:{ss}
        </span>
        <div className="flex flex-1 items-center justify-between">
          {Array.from({ length: SQUARES }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-[2px] transition-colors duration-300"
              style={{ backgroundColor: i < filled ? "#52524f" : "rgba(42,42,40,0.08)" }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        <span className="text-[10px] font-medium tracking-[0.06em] text-charcoal/55">{label}</span>
        <span className="flex items-end gap-[2px] pb-px">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-[3px] w-[3px] animate-bounce rounded-full bg-charcoal/45"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
