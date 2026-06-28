"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CardStack } from "./CardStack";
import { Smiley, ModeBadge } from "./CardFaces";
import type { Dossier, MapLinkResp, MapNode } from "@/lib/pepl/types";

// The reveal: the real pepl map. The user (userId) sits at the center; every other persisted
// node is placed around them. Each node is the node's real `smiley` + `name` (no FE bio —
// the backend doesn't provide age/hometown/etc, so we don't show them). An edge to the center
// is drawn only when mapLink(userId, otherId) grounded an overlap; its label is the top
// similarity theme (or the connection-story gist). link:null → no edge + an honest "no overlap
// yet" tag. Click the user → their bento Dossier; click anyone else → the two-sided receipts.

type Placed = MapNode & { x: number; y: number };

// The edge label = a top Similarity.theme, else the ConnectionStory gist. null → draw no edge.
function edgeLabel(lk: MapLinkResp | undefined): string | null {
  if (!lk) return null;
  return lk.similarities[0]?.theme ?? lk.link?.text ?? null;
}

function FailedBadge({ what, error }: { what: string; error: string }) {
  return (
    <div role="alert" className="max-w-md rounded-2xl bg-red-50 px-5 py-4 text-left ring-1 ring-red-300">
      <span className="rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
        failed
      </span>
      <p className="mt-2 text-sm font-semibold text-charcoal">{what}</p>
      <p className="mt-1 break-words font-mono text-[11px] text-red-700/80">{error}</p>
    </div>
  );
}

// The two-sided receipts for a pair: the grounded story + each Similarity citing BOTH sides
// (your claim+signal and theirs). Honest-empty when nothing grounded; red badge on failure.
function SimilaritiesPanel({
  name,
  link,
  linkError,
}: {
  name: string;
  link: MapLinkResp | undefined;
  linkError: string | undefined;
}) {
  if (linkError) return <FailedBadge what={`couldn't link you with ${name}`} error={linkError} />;
  if (!link || (link.link === null && link.similarities.length === 0)) {
    return (
      <div className="max-w-md rounded-2xl bg-white/70 px-5 py-6 text-center ring-1 ring-black/[0.05]">
        <p className="text-sm font-semibold text-charcoal/70">no overlap yet</p>
        <p className="mt-1 text-xs text-charcoal/45">
          nothing grounded between you and {name} (the link came back null — we won&apos;t invent one)
        </p>
      </div>
    );
  }
  return (
    <div className="flex max-h-[78%] w-full max-w-lg flex-col gap-3 overflow-y-auto px-2">
      <div className="flex items-center justify-center gap-2">
        <ModeBadge mode={link.mode} />
        <span className="text-xs font-medium text-charcoal/55">you · {name}</span>
      </div>
      {link.link && (
        <p className="rounded-2xl bg-white/80 px-4 py-3 text-center text-[15px] font-medium leading-snug text-charcoal ring-1 ring-black/[0.05]">
          {link.link.text}
        </p>
      )}
      {link.similarities.map((s, i) => (
        <div key={i} className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/[0.05]">
          <p className="text-[10px] font-mono uppercase tracking-wide text-charcoal/40">
            {s.dimension} · {s.theme}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg bg-charcoal/[0.03] p-2">
              <p className="text-[9px] font-semibold uppercase text-charcoal/40">you</p>
              <p className="mt-0.5 text-charcoal">{s.aClaim}</p>
              <span
                title={`receipt · signal ${s.aSignalId}`}
                className="mt-1 inline-block cursor-help rounded-full bg-charcoal/[0.06] px-1.5 py-px font-mono text-[8.5px] text-charcoal/45"
              >
                ⌖ {s.aSignalId}
              </span>
            </div>
            <div className="rounded-lg bg-charcoal/[0.03] p-2">
              <p className="text-[9px] font-semibold uppercase text-charcoal/40">{name}</p>
              <p className="mt-0.5 text-charcoal">{s.bClaim}</p>
              <span
                title={`receipt · signal ${s.bSignalId}`}
                className="mt-1 inline-block cursor-help rounded-full bg-charcoal/[0.06] px-1.5 py-px font-mono text-[8.5px] text-charcoal/45"
              >
                ⌖ {s.bSignalId}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FocusOverlay({
  node,
  isUser,
  dossier,
  link,
  linkError,
  onBack,
}: {
  node: Placed;
  isUser: boolean;
  dossier: Dossier;
  link: MapLinkResp | undefined;
  linkError: string | undefined;
  onBack: () => void;
}) {
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
        className="flex w-full flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: shown ? "scale(1)" : "scale(0.85)", opacity: shown ? 1 : 0 }}
      >
        {isUser ? (
          <CardStack dossier={dossier} />
        ) : (
          <SimilaritiesPanel name={node.name} link={link} linkError={linkError} />
        )}
      </div>
    </div>
  );
}

export function SocialGraph({
  userId,
  nodes,
  links,
  linkErrors,
  dossier,
}: {
  userId: string;
  nodes: MapNode[];
  links: Record<string, MapLinkResp>;
  linkErrors: Record<string, string>;
  dossier: Dossier;
}) {
  const [focusId, setFocusId] = useState<string | null>(null);

  // The user at the center (fall back to the dossier's smiley if the map omits self); the rest
  // on a ring around them.
  const selfNode = nodes.find((n) => n.userId === userId);
  const others = nodes.filter((n) => n.userId !== userId);
  const center: Placed = {
    userId,
    name: selfNode?.name ?? "you",
    smiley: selfNode?.smiley ?? dossier.smiley,
    x: 50,
    y: 50,
  };
  const R = 34;
  const placedOthers: Placed[] = others.map((n, i) => {
    const angle = (i / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: 50 + R * Math.cos(angle), y: 50 + R * Math.sin(angle) };
  });
  const placed = [center, ...placedOthers];
  const focused = focusId ? placed.find((p) => p.userId === focusId) ?? null : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={
          focused
            ? {
                transform: "scale(2.3)",
                transformOrigin: `${focused.x}% ${focused.y}%`,
                opacity: 0.12,
                pointerEvents: "none",
              }
            : { transform: "scale(1)", opacity: 1 }
        }
      >
        {/* edges — center ↔ each other node, only where mapLink grounded an overlap */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {placedOthers.map((n) =>
            edgeLabel(links[n.userId]) ? (
              <line
                key={n.userId}
                x1={center.x}
                y1={center.y}
                x2={n.x}
                y2={n.y}
                stroke="#2a2a28"
                strokeOpacity={0.3}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>

        {/* edge labels (HTML so text isn't distorted by the stretched viewBox) */}
        {placedOthers.map((n) => {
          const label = edgeLabel(links[n.userId]);
          if (!label) return null;
          const mx = (center.x + n.x) / 2;
          const my = (center.y + n.y) / 2;
          return (
            <button
              key={n.userId}
              type="button"
              onClick={() => setFocusId(n.userId)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${mx}%`, top: `${my}%` }}
            >
              <span className="whitespace-nowrap rounded-full bg-cream/90 px-2.5 py-1 text-[11px] font-medium text-charcoal/70 ring-1 ring-black/[0.04] transition hover:text-charcoal">
                {label}
              </span>
            </button>
          );
        })}

        {/* nodes */}
        {placed.map((p) => {
          const isUser = p.userId === userId;
          const hasError = !isUser && linkErrors[p.userId];
          const noOverlap = !isUser && !edgeLabel(links[p.userId]) && !hasError;
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => setFocusId(p.userId)}
              className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <Smiley
                smiley={p.smiley}
                name={p.name}
                className={`shadow-[0_8px_22px_-8px_rgba(42,42,40,0.5)] transition-transform group-hover:scale-110 ${
                  isUser
                    ? "h-[88px] w-[88px] ring-2 ring-charcoal ring-offset-2"
                    : `h-[72px] w-[72px] ${noOverlap ? "opacity-55" : ""}`
                }`}
              />
              <span className="text-xs font-semibold text-charcoal">
                {p.name}
                {isUser && <span className="text-charcoal/40"> · you</span>}
              </span>
              {hasError && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  link failed
                </span>
              )}
              {noOverlap && (
                <span className="text-[10px] font-medium text-charcoal/40">no overlap yet</span>
              )}
            </button>
          );
        })}
      </div>

      {focused && (
        <FocusOverlay
          node={focused}
          isUser={focused.userId === userId}
          dossier={dossier}
          link={links[focused.userId]}
          linkError={linkErrors[focused.userId]}
          onBack={() => setFocusId(null)}
        />
      )}
    </div>
  );
}
