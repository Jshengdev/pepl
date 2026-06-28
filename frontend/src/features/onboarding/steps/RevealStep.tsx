"use client";

import { useEffect, useState } from "react";
import { SocialGraph } from "../SocialGraph";
import { PEPL_SMILEY } from "../defaults";
import type { AvatarDesign, CardDesign, Edge, OnboardingDesign, Person, ShapeKind } from "../types";

// Step 4 — the reveal. "Loading finishes" (a short weave), then the social graph
// populates: the user at the center, connected to the people pepl surfaced.
//
// Placeholder people + edges until the backend lands. The user's node carries
// their designed avatar + the 3 backings they made; others are seeded.

const USER_ID = "teri";

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
  const [ready, setReady] = useState(false);
  useEffect(() => {
    console.log("[pepl:reveal] weaving graph…");
    const t = window.setTimeout(() => {
      setReady(true);
      console.log("[pepl:reveal] graph populated");
    }, 1600);
    return () => window.clearTimeout(t);
  }, []);

  const people = buildPeople(design);

  if (!ready) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-bounce rounded-full bg-charcoal/40"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-charcoal/60">
          weaving the reflections of your story…
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex w-full flex-col items-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal">the people in your reflection</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        tap anyone to see their cards · the lines show what you share
      </p>
      <div className="relative mt-4 h-[560px] w-full max-w-5xl">
        <SocialGraph people={people} edges={EDGES} userId={USER_ID} />
      </div>
    </div>
  );
}
