"use client";

import { useRef, useState } from "react";
import { CardFront, CardBack } from "./CardFaces";
import type { Person } from "./types";

// A person's stack of 3 cards. Front card shows info; the two behind are flipped
// to their gradient backs and peek to the lower-right. Tap to advance:
//   1. the top card sweeps off to the LEFT and flips over (info → gradient)
//   2. it tucks to the bottom of the deck while the next card slides forward a
//      little and flips over to reveal its info
// …cycling through all three.

const CARD_W = 264;
const CARD_H = 352;
const PEEK_X = 14;
const PEEK_Y = 11;

type Face = "info" | "grad";
type StackCard = { id: number; slot: number; face: Face };

const initial = (): StackCard[] => [
  { id: 0, slot: 0, face: "info" },
  { id: 1, slot: 1, face: "grad" },
  { id: 2, slot: 2, face: "grad" },
];

function slotTransform(slot: number, face: Face): string {
  const x = slot * PEEK_X;
  const y = slot * PEEK_Y;
  const scale = 1 - slot * 0.05;
  const rotateY = face === "grad" ? 180 : 0;
  return `translate(${x}px, ${y}px) scale(${scale}) rotateY(${rotateY}deg)`;
}
// the lifted-off-to-the-left, flipped pose used while a card is shuffled back
const LIFT = "translate(-155px, -8px) scale(0.9) rotateY(180deg) rotate(-4deg)";
const zForSlot = (slot: number) => 30 - slot * 10;

export function CardStack({ person }: { person: Person }) {
  const [stack, setStack] = useState<StackCard[]>(initial);
  const [lifting, setLifting] = useState<number | null>(null);
  const busy = useRef(false);

  function advance() {
    if (busy.current) return;
    busy.current = true;
    const front = stack.find((c) => c.slot === 0)!;
    // Phase 1 — top card sweeps left and flips over.
    setLifting(front.id);
    window.setTimeout(() => {
      // Phase 2 — it tucks to the back; the rest slide forward; new top → info.
      setLifting(null);
      setStack((prev) =>
        prev.map((c) => {
          const slot = (c.slot + 2) % 3;
          return { ...c, slot, face: slot === 0 ? "info" : "grad" };
        }),
      );
      window.setTimeout(() => {
        busy.current = false;
      }, 620);
    }, 520);
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
            className="absolute left-0 top-0 transition-transform duration-[540ms] ease-[cubic-bezier(0.34,1.2,0.4,1)] [transform-style:preserve-3d]"
            style={{
              width: CARD_W,
              height: CARD_H,
              transform: c.id === lifting ? LIFT : slotTransform(c.slot, c.face),
              zIndex: c.id === lifting ? 50 : zForSlot(c.slot),
            }}
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CardFront person={person} page={c.id} />
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
      <p className="text-xs font-medium text-charcoal/55">tap the stack to flip through →</p>
    </div>
  );
}
