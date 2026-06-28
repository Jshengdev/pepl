"use client";

import { useEffect, useState } from "react";
import { SocialGraph } from "../SocialGraph";
import { MeshAvatar } from "../MeshAvatar";
import { CardBack } from "../CardFaces";
import { PEPL_SMILEY } from "../defaults";
import type { AvatarDesign, CardDesign, Edge, OnboardingDesign, Person, ShapeKind } from "../types";

// Step 4 — the reveal, as a choreographed sequence:
//   assemble → the 3 card backings you made appear big (title = loading text)
//   stack    → once loaded, they gather into one deck with your avatar above
//   graph    → the deck fades out as the social graph (you + connections) fades in

const USER_ID = "teri";
const RW = 180; // reveal card base width
const RH = Math.round((RW * 600) / 470);

type Phase = "assemble" | "stack" | "graph";

// `entered` drives the initial scale-up (cards grow ~2× from the cards-step size).
function cardPhaseTransform(i: number, phase: Phase, entered: boolean): string {
  if (phase === "assemble") {
    const spread = entered ? 250 : 120;
    const scale = entered ? 1.9 : 0.95;
    return `translate(${(i - 1) * spread}px, 0px) scale(${scale})`;
  }
  // gathered into a single deck, sitting just below center (avatar goes above)
  return `translate(${(i - 1) * -4 + i * 12}px, ${74 + i * 9}px) scale(1.45)`;
}

function seededAvatar(colors: [string, string, string]): AvatarDesign {
  return {
    points: [
      { angle: -Math.PI / 2, color: colors[0] },
      { angle: Math.PI / 6, color: colors[1] },
      { angle: (5 * Math.PI) / 6, color: colors[2] },
    ],
    strokes: PEPL_SMILEY.map((s) => s.map((p) => ({ ...p }))),
  };
}

const SHAPES: ShapeKind[] = ["circle", "infinity", "rose"];
const LIFT_SETS = [
  [0.6, 1, 0.55, 1, 0.6],
  [0.4, 0.7, 1, 0.7, 0.4],
  [1, 0.6, 0.85, 0.6, 1],
];
function seededCards(baseOffset: number): CardDesign[] {
  return [0, 1, 2].map((i) => ({
    shape: SHAPES[i],
    offset: (baseOffset + i * 4) % 12,
    lifts: [...LIFT_SETS[i]],
  }));
}

function buildPeople(design: OnboardingDesign): Person[] {
  return [
    {
      id: USER_ID,
      rank: 1,
      name: "teri shim",
      age: "21 years old",
      hometown: "Hong Kong, HK",
      birthday: "Mar 28, 2005",
      occupation: "Student @ USC, Designer at Lemma",
      pos: { x: 25, y: 54 },
      avatar: design.avatar,
      cards: design.cards,
    },
    {
      id: "noa",
      rank: 2,
      name: "noa kim",
      age: "23 years old",
      hometown: "Seoul, KR",
      birthday: "Jul 14, 2003",
      occupation: "PM @ Figma",
      pos: { x: 74, y: 17 },
      avatar: seededAvatar(["#ef9a4a", "#4f9a93", "#9a6fc0"]),
      cards: seededCards(2),
    },
    {
      id: "leo",
      rank: 3,
      name: "leo park",
      age: "25 years old",
      hometown: "Lisbon, PT",
      birthday: "Nov 2, 2001",
      occupation: "Founder @ tide",
      pos: { x: 76, y: 80 },
      avatar: seededAvatar(["#1f5fa6", "#ea6a52", "#c3c66a"]),
      cards: seededCards(1),
    },
    {
      id: "maya",
      rank: 4,
      name: "maya chen",
      age: "22 years old",
      hometown: "Taipei, TW",
      birthday: "Sep 9, 2004",
      occupation: "Eng @ Notion",
      pos: { x: 48, y: 24 },
      avatar: seededAvatar(["#d65b97", "#4f93d6", "#7faa63"]),
      cards: seededCards(3),
    },
  ];
}

const EDGES: Edge[] = [
  { from: "teri", to: "noa", label: "both designers" },
  { from: "teri", to: "leo", label: "up building at 2am" },
  { from: "teri", to: "maya", label: "far from home" },
  { from: "noa", to: "leo", label: "ex-figma" },
  { from: "maya", to: "leo", label: "first-time founders" },
];

export function RevealStep({ design }: { design: OnboardingDesign }) {
  const [entered, setEntered] = useState(false); // drives the initial scale-up
  const [phase, setPhase] = useState<Phase>("assemble");

  useEffect(() => {
    console.log("[pepl:reveal] cards → scale up → stack → profile → graph");
    const t0 = window.setTimeout(() => setEntered(true), 40); // cards grow ~2×
    const t2 = window.setTimeout(() => setPhase("stack"), 1500); // gather into a deck
    const t3 = window.setTimeout(() => setPhase("graph"), 2900); // fade to the graph
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const people = buildPeople(design);
  const user = people[0];
  const isGraph = phase === "graph";

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center">
      {/* title only appears with the graph — the card phases are cards-only */}
      <div
        className="text-center transition-opacity duration-700"
        style={{ opacity: isGraph ? 1 : 0 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-charcoal">
          the people in your reflection
        </h1>
        <p className="mt-2 text-sm text-charcoal/60">
          tap anyone to see their cards · the lines show what you share
        </p>
      </div>

      <div className="relative mt-4 h-[560px] w-full max-w-5xl">
        {/* cards + avatar layer — fades out as the graph fades in */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: isGraph ? 0 : 1, pointerEvents: isGraph ? "none" : "auto" }}
        >
          {/* your avatar, surfacing above the gathered deck (appears after stacking) */}
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              transform: `translate(-50%, -50%) translateY(${phase === "assemble" ? -180 : -210}px) scale(${phase === "assemble" ? 0.7 : 1})`,
              opacity: phase === "assemble" ? 0 : 1,
              transition: "all 650ms cubic-bezier(0.22,1,0.36,1) 350ms",
            }}
          >
            <MeshAvatar
              points={user.avatar.points}
              strokes={user.avatar.strokes}
              strokeWidth={6}
              className="h-24 w-24 shadow-[0_10px_28px_-10px_rgba(42,42,40,0.5)]"
            />
          </div>

          {design.cards.map((card, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 transition-all duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: RW,
                height: RH,
                transform: `translate(-50%, -50%) ${cardPhaseTransform(i, phase, entered)}`,
                zIndex: phase === "assemble" ? i : 30 - i * 10,
              }}
            >
              <CardBack person={user} card={card} index={i} />
            </div>
          ))}
        </div>

        {/* graph layer — fades in for the final reveal */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: isGraph ? 1 : 0, pointerEvents: isGraph ? "auto" : "none" }}
        >
          {isGraph && <SocialGraph people={people} edges={EDGES} userId={USER_ID} />}
        </div>
      </div>
    </div>
  );
}
