"use client";

import { useState } from "react";
import { CardFront, CardBack } from "./CardFaces";
import type { Person } from "./types";

// A person's stack of 3 cards. The front card shows info; the two behind are
// flipped to their gradient backs and peek out to the lower-right.
//
// Tap to advance — the choreography the design calls for:
//   1. the front card flips over (info → gradient)
//   2. it shuffles to the back of the stack, and as the next card slides
//      forward it flips over to reveal its info
// …cycling through all three.

const CARD_W = 264;
const CARD_H = 352;
const PEEK_X = 16; // per-slot offset toward lower-right
const PEEK_Y = 12;

type Face = "info" | "grad";
type StackCard = { id: number; slot: number; face: Face };

function initial(): StackCard[] {
  return [
    { id: 0, slot: 0, face: "info" },
    { id: 1, slot: 1, face: "grad" },
    { id: 2, slot: 2, face: "grad" },
  ];
}

function slotTransform(slot: number, face: Face): string {
  const x = slot * PEEK_X;
  const y = slot * PEEK_Y;
  const scale = 1 - slot * 0.05;
  const rotateY = face === "grad" ? 180 : 0;
  return `translate(${x}px, ${y}px) scale(${scale}) rotateY(${rotateY}deg)`;
}
const zForSlot = (slot: number) => 30 - slot * 10;

export function CardStack({ person }: { person: Person }) {
  const [stack, setStack] = useState<StackCard[]>(initial);
  const [busy, setBusy] = useState(false);

  function advance() {
    if (busy) return;
    setBusy(true);
    // Step 1 — flip the current front card to its gradient back, in place.
    setStack((prev) => prev.map((c) => (c.slot === 0 ? { ...c, face: "grad" } : c)));
    // Step 2 — shuffle: front → back, everyone else forward; the new front
    // flips to info as it slides up.
    window.setTimeout(() => {
      setStack((prev) =>
        prev.map((c) => {
          const slot = (c.slot + 2) % 3;
          return { ...c, slot, face: slot === 0 ? "info" : "grad" };
        }),
      );
      window.setTimeout(() => setBusy(false), 650);
    }, 430);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={advance}
        className="relative [perspective:1600px]"
        style={{ width: CARD_W + 2 * PEEK_X, height: CARD_H + 2 * PEEK_Y }}
        aria-label={`flip through ${person.name}'s cards`}
      >
        {stack.map((c) => (
          <div
            key={c.id}
            className="absolute left-0 top-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]"
            style={{
              width: CARD_W,
              height: CARD_H,
              transform: slotTransform(c.slot, c.face),
              zIndex: zForSlot(c.slot),
            }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CardFront person={person} />
            </div>
            <div
              className="absolute inset-0 [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <CardBack person={person} card={person.cards[c.id]} index={c.id} />
            </div>
          </div>
        ))}
      </button>
      <p className="text-xs font-medium text-charcoal/40">tap the stack to flip through →</p>
    </div>
  );
}
