"use client";

import { useEffect, useRef, useState } from "react";
import { SocialGraph } from "../SocialGraph";
import { ModeBadge } from "../CardFaces";
import { useRun } from "@/lib/pepl/useRun";
import { reveal, getMap, mapLink } from "@/lib/pepl/api";
import { getUserId } from "@/lib/pepl/session";
import type { Dossier, MapLinkResp, MapNode } from "@/lib/pepl/types";
import type { OnboardingDesign } from "../types";

// Step 4 — the reveal. Liveness rides the ONE WS hook (useRun); data is HTTP. When the run's
// cards land (WS cards_ready) — or immediately on a mid-run refresh, since this view usually
// mounts AFTER the scrape finished and the past event won't replay — we fetch the real
// payload: POST /reveal → the bento Dossier, GET /api/map → the nodes, and mapLink(you, each
// other) → the grounded edges. No placeholder people, no fabricated bio: the graph is 100%
// backend data.
//
// FLAG (divergence): `design` (the avatar + cards the user drew in onboarding) no longer feeds
// the reveal — node faces come from each MapNode.smiley and the user's stack is the Dossier.
// The drawn smiley reaches the backend via POST /api/card (story 04), which is NOT wired in
// this file; until then the user's MapNode.smiley is null → an honest-empty face.
// FLAG: `userId` defaults to the session id (getUserId → "johnny"); the parent (OnboardingFlow,
// outside this task's file scope) isn't wired to pass a real per-user id yet.
export function RevealStep({
  userId,
}: {
  userId?: string;
  // accepted for call-site compat (OnboardingFlow still passes it); the reveal no longer reads
  // it — see the FLAG above.
  design?: OnboardingDesign;
}) {
  const uid = userId || getUserId(); // || not ?? — the parent seeds "" before mount
  const run = useRun();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [nodes, setNodes] = useState<MapNode[] | null>(null);
  const [links, setLinks] = useState<Record<string, MapLinkResp>>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    // A node failure on the wire = fail loud, never hide.
    if (run.failed) {
      setError(`${run.failed.node}: ${run.failed.error}`);
      return;
    }
    if (loadedRef.current) return;

    let cancelled = false;
    async function load() {
      console.log(`[pepl:reveal] load user=${uid} (cardsReady=${run.cardsReady})`);
      let d: Dossier;
      let m: { nodes: MapNode[] };
      try {
        [d, m] = await Promise.all([reveal(uid), getMap()]);
      } catch (e) {
        // The reveal/map fetch failed — surface it (a red badge). If this was a too-early
        // rehydrate attempt, cards_ready re-runs this effect and clears it on success.
        if (!cancelled) setError((e as Error).message);
        return;
      }
      if (cancelled) return;
      loadedRef.current = true;
      setError(null);
      setDossier(d);
      setNodes(m.nodes);
      console.log(
        `[pepl:reveal] dossier cards=${d.cards.length} mode=${d.mode} nodes=${m.nodes.length}`,
      );

      // One mapLink per pair we draw: you ↔ each other node. A single edge failing is local
      // (a red badge on that edge); it does not sink the whole reveal.
      const peers = m.nodes.filter((n) => n.userId !== uid);
      await Promise.all(
        peers.map(async (n) => {
          try {
            const lk = await mapLink(uid, n.userId);
            if (!cancelled) setLinks((p) => ({ ...p, [n.userId]: lk }));
          } catch (e) {
            console.error(
              `[pepl:reveal] mapLink ${uid}×${n.userId} failed: ${(e as Error).message}`,
            );
            if (!cancelled) setLinkErrors((p) => ({ ...p, [n.userId]: (e as Error).message }));
          }
        }),
      );
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.cardsReady, run.failed]);

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

  if (!dossier || !nodes) {
    // honest loading — a breathing weave, never a spinner
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-charcoal/40"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-charcoal/60">weaving the reflections of your story…</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex w-full flex-col items-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal">the people in your reflection</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-charcoal/60">
        <ModeBadge mode={dossier.mode} />
        <span>
          {dossier.proof.peopleSurfaced} people surfaced · {dossier.proof.claimsCut} claims cut
        </span>
      </div>
      <p className="mt-1 text-sm text-charcoal/55">
        tap yourself for your dossier · tap anyone else for what you share
      </p>
      <div className="relative mt-4 h-[560px] w-full max-w-5xl">
        <SocialGraph
          userId={uid}
          nodes={nodes}
          links={links}
          linkErrors={linkErrors}
          dossier={dossier}
        />
      </div>
    </div>
  );
}
