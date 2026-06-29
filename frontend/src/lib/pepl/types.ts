// pepl UI types. Single source of truth = backend/src/types.ts (the zod schemas are the law),
// vendored verbatim into ./contract.ts so the frontend deploys self-contained (Vercel sees only
// frontend/). Type-only re-export: erased at build → zero zod in the browser bundle, and the
// compiler catches any drift from the contract shapes (INTEGRATION.md law 1: never redefine a shape).
import type {
  Dossier,
  DossierCard,
  Bit,
  Grounding,
  MapNode,
  Similarity,
  ConnectionStory,
  WsEvent,
  RelationshipGraph,
  Person,
  Edge,
  Mode,
} from "./contract";

export type {
  Dossier,
  DossierCard,
  Bit,
  Grounding,
  MapNode,
  Similarity,
  ConnectionStory,
  WsEvent,
  RelationshipGraph,
  Person,
  Edge,
  Mode,
};

// --- Route envelopes ---------------------------------------------------------------------------
// The per-route request/response shapes from the contract (HANDOFF.md §2 / INTEGRATION.md).
// These are NOT in backend/src/types.ts (they're route-level wrappers, not domain shapes), so the
// lib owns them — but composed from the backend atoms above, never redefining a domain shape.

export type Provider = "gmail"; // the only provider in scope

export type ConnectInitiateResp = { connectionId: string; redirectUrl: string };

export type ConnectStatusResp = { connected: boolean; email?: string };

// audioUrl may be null → the UI falls back to browser SpeechSynthesis (never a silent gap).
export type DotIntroResp = { text: string; audioUrl: string | null };

export type DotTurnReq = { userId: string; text: string; wrapUp?: boolean };
export type DotTurnResp = {
  transcript: string;
  reply: { text: string; audioUrl: string | null };
  done: boolean;
};

export type SaveCardReq = {
  userId: string;
  smiley: string;
  smileyColors?: string[];
  cardGradient?: string;
};
export type SaveCardResp = { ok: boolean };

export type MapResp = { nodes: MapNode[]; mode: Mode };

// link is null on an honest 0-overlap (never a canned rhyme); similarities === link.groundedIn.
export type MapLinkResp = {
  link: ConnectionStory | null;
  similarities: Similarity[];
  mode: Mode;
};
