"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MeshAvatar } from "./MeshAvatar";
import { CardStack } from "./CardStack";
import type { Edge, Person } from "./types";

// The reveal: a social graph of people, each node an avatar, each edge labeled
// with what the two share. Click a node to zoom smoothly into that person and
// flip through their stack of cards.

function FocusOverlay({ person, onBack }: { person: Person; onBack: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-cream/70 backdrop-blur-sm transition-opacity duration-500"
      style={{ opacity: shown ? 1 : 0 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-charcoal shadow-sm ring-1 ring-black/5 transition hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" /> graph
      </button>
      <div
        className="flex flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: shown ? "scale(1)" : "scale(0.85)", opacity: shown ? 1 : 0 }}
      >
        <CardStack person={person} />
      </div>
    </div>
  );
}

export function SocialGraph({
  people,
  edges,
  userId,
}: {
  people: Person[];
  edges: Edge[];
  userId: string;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const byId = (id: string) => people.find((p) => p.id === id)!;
  const focused = focusId ? byId(focusId) : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* graph layer — zooms toward the focused node and fades back */}
      <div
        className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={
          focused
            ? {
                transform: "scale(2.3)",
                transformOrigin: `${focused.pos.x}% ${focused.pos.y}%`,
                opacity: 0.12,
                pointerEvents: "none",
              }
            : { transform: "scale(1)", opacity: 1 }
        }
      >
        {/* edges */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {edges.map((e, i) => {
            const a = byId(e.from);
            const b = byId(e.to);
            return (
              <line
                key={i}
                x1={a.pos.x}
                y1={a.pos.y}
                x2={b.pos.x}
                y2={b.pos.y}
                stroke="#2a2a28"
                strokeOpacity={0.3}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

        {/* edge labels (HTML so text isn't distorted by the stretched viewBox) */}
        {edges.map((e, i) => {
          const a = byId(e.from);
          const b = byId(e.to);
          const mx = (a.pos.x + b.pos.x) / 2;
          const my = (a.pos.y + b.pos.y) / 2;
          return (
            <div
              key={i}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mx}%`, top: `${my}%` }}
            >
              <span className="whitespace-nowrap rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-medium text-charcoal/60 ring-1 ring-black/[0.04]">
                {e.label}
              </span>
            </div>
          );
        })}

        {/* nodes */}
        {people.map((p) => {
          const isUser = p.id === userId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setFocusId(p.id)}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${p.pos.x}%`, top: `${p.pos.y}%` }}
            >
              <MeshAvatar
                points={p.avatar.points}
                strokes={p.avatar.strokes}
                strokeWidth={6}
                className={`shadow-[0_8px_22px_-8px_rgba(42,42,40,0.5)] transition-transform group-hover:scale-110 ${
                  isUser ? "h-[88px] w-[88px] ring-2 ring-charcoal ring-offset-2" : "h-[72px] w-[72px]"
                }`}
              />
              <span className="text-xs font-semibold text-charcoal">
                {p.name}
                {isUser && <span className="text-charcoal/40"> · you</span>}
              </span>
            </button>
          );
        })}
      </div>

      {focused && <FocusOverlay person={focused} onBack={() => setFocusId(null)} />}
    </div>
  );
}
