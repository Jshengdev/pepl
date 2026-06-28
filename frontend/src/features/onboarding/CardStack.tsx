"use client";

import { useRef, useState } from "react";
import { CardFront, CardBack, ModeBadge } from "./CardFaces";
import type { Dossier } from "@/lib/pepl/types";

// The user's bento Dossier as a flip stack: one card per DossierCard (the 5 lunchbox
// compartments — identity / story / stats / people / personality). The front shows that
// card's grounded bits; the two behind peek to the lower-right on their gradient backs.
// Tap to advance:
//   1. the top card sweeps off to the LEFT and flips over (bits → gradient)
//   2. it tucks to the bottom of the deck while the next card slides forward and flips to
//      reveal its bits
// …cycling through all of them. Mode (live/cached) + the proof numbers ride above the deck.

const CARD_W = 264;
const CARD_H = 352;
const PEEK_X = 14;
const PEEK_Y = 11;
const MAX_PEEK = 2; // only the top 3 cards peek; deeper ones stack behind the third

type Face = "info" | "grad";
type StackCard = { id: number; slot: number; face: Face };

function slotTransform(slot: number, face: Face): string {
  const s = Math.min(slot, MAX_PEEK);
  const x = s * PEEK_X;
  const y = s * PEEK_Y;
  const scale = 1 - s * 0.05;
  const rotateY = face === "grad" ? 180 : 0;
  return `translate(${x}px, ${y}px) scale(${scale}) rotateY(${rotateY}deg)`;
}
// the lifted-off-to-the-left, flipped pose used while a card is shuffled back
const LIFT = "translate(-155px, -8px) scale(0.9) rotateY(180deg) rotate(-4deg)";
const zForSlot = (slot: number) => 40 - slot * 6;

export function CardStack({ dossier }: { dossier: Dossier }) {
  const cards = dossier.cards;
  const N = cards.length;
  const [stack, setStack] = useState<StackCard[]>(() =>
    cards.map((_, i) => ({ id: i, slot: i, face: i === 0 ? "info" : "grad" })),
  );
  const [lifting, setLifting] = useState<number | null>(null);
  const busy = useRef(false);

  function advance() {
    if (busy.current || N < 2) return;
    busy.current = true;
    const front = stack.find((c) => c.slot === 0)!;
    // Phase 1 — top card sweeps left and flips over.
    setLifting(front.id);
    window.setTimeout(() => {
      // Phase 2 — it tucks to the back; the rest slide forward; new top → bits.
      setLifting(null);
      setStack((prev) =>
        prev.map((c) => {
          const slot = (c.slot + N - 1) % N;
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
      <div className="flex items-center gap-2 text-[11px]">
        <ModeBadge mode={dossier.mode} />
        <span className="font-medium text-charcoal/60">
          {dossier.proof.peopleSurfaced} people surfaced · {dossier.proof.claimsCut} claims cut
        </span>
      </div>

      <button
        type="button"
        onClick={advance}
        className="relative [perspective:1600px]"
        style={{ width: CARD_W + 2 * PEEK_X, height: CARD_H + 2 * PEEK_Y }}
        aria-label="flip through your dossier cards"
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
              <CardFront card={cards[c.id]} />
            </div>
            <div
              className="absolute inset-0 [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <CardBack card={cards[c.id]} index={c.id} />
            </div>
          </div>
        ))}
      </button>
      <p className="text-xs font-medium text-charcoal/55">
        tap the stack to flip through your {N} cards →
      </p>
    </div>
  );
}
