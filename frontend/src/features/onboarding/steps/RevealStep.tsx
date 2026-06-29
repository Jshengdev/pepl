"use client";

import { useEffect, useState } from "react";
import { SocialGraph } from "../SocialGraph";
import { MeshAvatar } from "../MeshAvatar";
import { CardBack } from "../CardFaces";
import { PEPL_SMILEY } from "../defaults";
import type { AvatarDesign, CardDesign, Edge, OnboardingDesign, Person, ShapeKind } from "../types";
import { getMap, mapLink } from "@/lib/pepl/api";
import { getUserId } from "@/lib/pepl/session";
import type { MapNode } from "@/lib/pepl/types";

// Step 4 — the reveal, choreographed: assemble → stack → graph.
// WIRED to the live backend: the people + edges are the REAL relationship graph
// (GET /api/map + POST /api/map/link), not placeholders. The user's avatar + cards are the
// ones THEY drew (design); other nodes get a seeded mesh (decorative only). Edge labels are
// the connector's GROUNDED "what you share" (mapLink similarities), or omitted on no overlap.
// Bios (age/hometown/…) aren't in the scrape, so they stay empty — never fabricated (§2).

const RW = 180; // reveal card base width
const RH = Math.round((RW * 600) / 470);

type Phase = "assemble" | "stack" | "graph";

function cardPhaseTransform(i: number, phase: Phase, entered: boolean): string {
  if (phase === "assemble") {
    const spread = entered ? 250 : 120;
    const scale = entered ? 1.9 : 0.95;
    return `translate(${(i - 1) * spread}px, 0px) scale(${scale})`;
  }
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

// Stable mesh palette per person id (so a node's seeded face doesn't flicker between renders).
const PALETTES: [string, string, string][] = [
  ["#ef9a4a", "#4f9a93", "#9a6fc0"],
  ["#1f5fa6", "#ea6a52", "#c3c66a"],
  ["#d65b97", "#4f93d6", "#7faa63"],
  ["#e0a35a", "#6a8fd6", "#c06f9a"],
  ["#5aa0e0", "#e07a4a", "#7ac06f"],
];
function paletteFor(id: string): [string, string, string] {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

// You at center; everyone else on a ring around you (positions in % of the canvas).
function layout(idx: number, total: number, isUser: boolean): { x: number; y: number } {
  if (isUser) return { x: 50, y: 55 };
  const others = Math.max(1, total - 1);
  const ang = -Math.PI / 2 + (2 * Math.PI * (idx - 1)) / others;
  return { x: Math.round(50 + 33 * Math.cos(ang)), y: Math.round(50 + 30 * Math.sin(ang)) };
}

// Map a real backend MapNode → the reveal's Person model. Real name; your drawn avatar/cards
// for you, a seeded mesh for others; bios empty (the scrape has no age/hometown — no fabrication).
function toPerson(node: MapNode, idx: number, total: number, uid: string, design: OnboardingDesign): Person {
  const isUser = node.userId === uid;
  return {
    id: node.userId,
    rank: idx + 1,
    name: node.name,
    age: node.bio?.age ?? "",
    hometown: node.bio?.hometown ?? "",
    birthday: "",
    occupation: node.bio?.occupation ?? "",
    tagline: node.bio?.tagline ?? "",
    personality: node.bio?.personality ?? "",
    facts: node.bio?.facts ?? [],
    pos: layout(idx, total, isUser),
    avatar: isUser ? design.avatar : seededAvatar(paletteFor(node.userId)),
    cards: isUser ? design.cards : seededCards(idx),
  };
}

export function RevealStep({ design }: { design: OnboardingDesign }) {
  const uid = getUserId();
  const [entered, setEntered] = useState(false);
  const [phase, setPhase] = useState<Phase>("assemble");
  const [people, setPeople] = useState<Person[] | null>(null);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState<string | null>(null);

  // The choreography (independent of the data fetch).
  useEffect(() => {
    console.log("[pepl:reveal] cards → scale up → stack → graph");
    const t0 = window.setTimeout(() => setEntered(true), 40);
    const t2 = window.setTimeout(() => setPhase("stack"), 1500);
    const t3 = window.setTimeout(() => setPhase("graph"), 2900);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  // WIRE: real relationship graph + grounded connector edges.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await getMap();
        if (cancelled) return;
        // user first (the choreography treats people[0] as you).
        const sorted = [...m.nodes].sort((a, b) =>
          a.userId === uid ? -1 : b.userId === uid ? 1 : 0,
        );
        const ppl = sorted.map((n, i) => toPerson(n, i, sorted.length, uid, design));
        setPeople(ppl);
        console.log(`[pepl:reveal] map nodes=${sorted.length} mode=${m.mode}`);

        // one grounded edge per peer: you ↔ peer, labeled with the connector's top similarity.
        const peers = sorted.filter((n) => n.userId !== uid);
        const es: Edge[] = [];
        await Promise.all(
          peers.map(async (n) => {
            try {
              const lk = await mapLink(uid, n.userId);
              const label = lk.link ? lk.similarities[0]?.theme ?? "connected" : null;
              if (label && !cancelled) es.push({ from: uid, to: n.userId, label });
            } catch (e) {
              console.error(`[pepl:reveal] mapLink ${uid}×${n.userId}: ${(e as Error).message}`);
            }
          }),
        );
        if (!cancelled) setEdges(es);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (error) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-md rounded-2xl bg-red-50 px-6 py-5 text-center ring-1 ring-red-300"
      >
        <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          failed
        </span>
        <p className="mt-3 text-sm font-semibold text-charcoal">the reveal couldn&apos;t load</p>
        <p className="mt-1 break-words font-mono text-[11px] text-red-700/80">{error}</p>
      </div>
    );
  }

  if (!people || people.length === 0) {
    // honest loading — a breathing weave, never a spinner
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-charcoal/40"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-charcoal/60">bringing up the people in your reflection…</p>
      </div>
    );
  }

  const user = people[0];
  const isGraph = phase === "graph";

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center">
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
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: isGraph ? 0 : 1, pointerEvents: isGraph ? "none" : "auto" }}
        >
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

        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: isGraph ? 1 : 0, pointerEvents: isGraph ? "auto" : "none" }}
        >
          {isGraph && <SocialGraph people={people} edges={edges} userId={uid} />}
        </div>
      </div>
    </div>
  );
}
