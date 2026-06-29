// memory/store.ts — the InsForge dossier store. One dossier per user_id, split across six tables:
//   dossiers (parent: owner + kind + verdict + seededWrong) and the children signals/people/edges/
//   stories/cards. Re-running a pipeline REPLACES a user's dossier: delete every row for that user_id,
//   then bulk re-insert. Errors are surfaced (§2 no silent fallbacks); an empty load is honest absence.
//   The drawn card (smiley + colors + gradient) lives in its OWN table (user_cards), NOT in dossiers —
//   it is made before the scrape and must survive saveDossier's delete+reinsert (see saveCard/loadCard).
import { createAdminClient, type InsForgeClient } from "@insforge/sdk";
import type { Signal, Person, Edge, RelationshipGraph, Story, CriticVerdict, Card, MapNode, Bio } from "../types";

// Lazy singleton so .env load order never matters (same as llm/client.ts resolving at call time).
let _admin: InsForgeClient | null = null;
function db() {
  if (!_admin) {
    const baseUrl = process.env.INSFORGE_URL;
    const apiKey = process.env.INSFORGE_API_KEY;
    if (!baseUrl || !apiKey)
      throw new Error(
        `[pepl:store] INSFORGE_URL and INSFORGE_API_KEY are required (read from backend/.env) — refusing to touch the dossier store`,
      );
    _admin = createAdminClient({ baseUrl, apiKey });
  }
  return _admin.database;
}

/** A {data,error} with error set THROWS — never swallow a DB failure into a default. */
function surface(label: string, error: unknown): void {
  if (error)
    throw new Error(`[pepl:store] ${label} -> ${typeof error === "string" ? error : JSON.stringify(error)}`);
}

export interface DossierWrite {
  signals: Signal[];
  graph: RelationshipGraph;
  story: Story | null;
  verdict: CriticVerdict | null;
  cards: Card[];
  kind: "bio" | "story";
}

export interface DossierRead {
  signals: Signal[];
  graph: RelationshipGraph;
  story: Story | null;
  verdict: CriticVerdict | null;
  cards: Card[];
}

// The drawn card (Part 4) — the node avatar + card style. smiley is the svg/data-url mark (required).
// smileyColors + cardGradient are front-end-owned shapes stored as jsonb so any shape round-trips.
export interface CardPayload {
  smiley: string;
  smileyColors?: unknown;
  cardGradient?: unknown;
}

const TABLES = ["signals", "people", "edges", "stories", "cards", "dossiers"] as const;

/** Write-through REPLACE: clear this user_id everywhere, then bulk re-insert the dossier. Fails LOUD. */
export async function saveDossier(
  userId: string,
  owner: { name: string; email: string },
  d: DossierWrite,
): Promise<void> {
  const t0 = Date.now();

  // REPLACE — one dossier per user_id, so wipe the prior rows before re-inserting.
  for (const table of TABLES) {
    const { error } = await db().from(table).delete().eq("user_id", userId);
    surface(`delete ${table} user=${userId}`, error);
  }

  // Bulk insert children (one array per table, never per-row chatter). Empty array = honest skip.
  if (d.signals.length) {
    const { error } = await db()
      .from("signals")
      .insert(d.signals.map((s) => ({ user_id: userId, signal_id: s.id, text: s.text, source: s.source })));
    surface(`insert signals (n=${d.signals.length})`, error);
  }
  if (d.graph.people.length) {
    const { error } = await db()
      .from("people")
      .insert(
        d.graph.people.map((p) => ({
          user_id: userId,
          person_id: p.id,
          name: p.name,
          ring: p.ring,
          closeness: p.closeness,
          last_interaction: p.lastInteraction ?? null,
        })),
      );
    surface(`insert people (n=${d.graph.people.length})`, error);
  }
  if (d.graph.edges.length) {
    const { error } = await db()
      .from("edges")
      .insert(
        d.graph.edges.map((e) => ({ user_id: userId, from_id: e.from, to_id: e.to, kind: e.kind, strength: e.strength })),
      );
    surface(`insert edges (n=${d.graph.edges.length})`, error);
  }
  if (d.story) {
    const { error } = await db()
      .from("stories")
      .insert([{ user_id: userId, kind: d.kind, text: d.story.text, grounded_in: d.story.groundedIn }]);
    surface("insert story", error);
  }
  if (d.cards.length) {
    const { error } = await db()
      .from("cards")
      .insert(d.cards.map((c) => ({ user_id: userId, kind: c.kind, payload: c })));
    surface(`insert cards (n=${d.cards.length})`, error);
  }

  // Parent row — upsert on the user_id PK (REPLACE-safe even if a prior delete was skipped).
  const { error } = await db()
    .from("dossiers")
    .upsert(
      [
        {
          user_id: userId,
          owner_name: owner.name,
          owner_email: owner.email,
          kind: d.kind,
          verdict: d.verdict,
          seeded_wrong: d.graph.seededWrong,
        },
      ],
      { onConflict: "user_id" },
    );
  surface(`upsert dossiers user=${userId}`, error);

  console.log(
    `[pepl:store] save user=${userId} signals=${d.signals.length} people=${d.graph.people.length} edges=${d.graph.edges.length} stories=${d.story ? 1 : 0} cards=${d.cards.length} (${Date.now() - t0}ms)`,
  );
}

/** Rehydrate a user's dossier from the six tables. null (logged) if there is no dossiers row. */
export async function loadDossier(userId: string): Promise<DossierRead | null> {
  const t0 = Date.now();

  const dossier = await db().from("dossiers").select("*").eq("user_id", userId).maybeSingle();
  surface(`select dossiers user=${userId}`, dossier.error);
  if (!dossier.data) {
    console.log(`[pepl:store] load user=${userId} -> absent (no dossiers row) (${Date.now() - t0}ms)`);
    return null;
  }
  const parent = dossier.data as { verdict: CriticVerdict | null; seeded_wrong: RelationshipGraph["seededWrong"] | null };

  const [sig, ppl, edg, sto, crd] = await Promise.all([
    db().from("signals").select("*").eq("user_id", userId),
    db().from("people").select("*").eq("user_id", userId),
    db().from("edges").select("*").eq("user_id", userId),
    db().from("stories").select("*").eq("user_id", userId),
    db().from("cards").select("*").eq("user_id", userId),
  ]);
  surface("select signals", sig.error);
  surface("select people", ppl.error);
  surface("select edges", edg.error);
  surface("select stories", sto.error);
  surface("select cards", crd.error);

  const signals: Signal[] = (sig.data ?? []).map((r: any) => ({ id: r.signal_id, text: r.text, source: r.source }));
  const people: Person[] = (ppl.data ?? []).map((r: any) => ({
    id: r.person_id,
    name: r.name,
    ring: r.ring,
    closeness: r.closeness,
    ...(r.last_interaction != null ? { lastInteraction: r.last_interaction } : {}),
  }));
  const edges: Edge[] = (edg.data ?? []).map((r: any) => ({ from: r.from_id, to: r.to_id, kind: r.kind, strength: r.strength }));
  const storyRow = (sto.data ?? [])[0];
  const story: Story | null = storyRow ? { text: storyRow.text, groundedIn: storyRow.grounded_in ?? [] } : null;
  const cards: Card[] = (crd.data ?? []).map((r: any) => r.payload);
  const graph: RelationshipGraph = { people, edges, seededWrong: parent.seeded_wrong ?? [] };

  console.log(
    `[pepl:store] load user=${userId} signals=${signals.length} people=${people.length} edges=${edges.length} stories=${story ? 1 : 0} cards=${cards.length} (${Date.now() - t0}ms)`,
  );
  return { signals, graph, story, verdict: parent.verdict, cards };
}

/**
 * Persist the user's drawn card (Part 4). Idempotent upsert on user_id — re-saving overwrites.
 * Lives in its own table, so saveDossier's delete+reinsert never touches it. smiley is required:
 * an empty/missing smiley THROWS rather than persisting an empty-string default (§2 no silent fallback).
 * Absent OPTIONAL colors/gradient persist as NULL — honest absence, not error-hiding.
 */
export async function saveCard(userId: string, card: CardPayload): Promise<void> {
  const t0 = Date.now();
  if (!card.smiley)
    throw new Error(`[pepl:store] saveCard user=${userId} -> smiley is required (refusing an empty-string default)`);

  const { error } = await db()
    .from("user_cards")
    .upsert(
      [
        {
          user_id: userId,
          smiley: card.smiley,
          smiley_colors: card.smileyColors ?? null,
          card_gradient: card.cardGradient ?? null,
        },
      ],
      { onConflict: "user_id" },
    );
  surface(`upsert user_cards user=${userId}`, error);

  console.log(
    `[pepl:store] saveCard user=${userId} smiley=${card.smiley.length}b colors=${card.smileyColors != null} gradient=${card.cardGradient != null} (${Date.now() - t0}ms)`,
  );
}

/** Read back the user's drawn card. null (logged) if they never saved one — the smiley bit then degrades to status:"failed". */
export async function loadCard(userId: string): Promise<CardPayload | null> {
  const t0 = Date.now();

  const { data, error } = await db().from("user_cards").select("*").eq("user_id", userId).maybeSingle();
  surface(`select user_cards user=${userId}`, error);
  if (!data) {
    console.log(`[pepl:store] loadCard user=${userId} -> absent (no user_cards row) (${Date.now() - t0}ms)`);
    return null;
  }

  const row = data as { smiley: string; smiley_colors: unknown; card_gradient: unknown };
  console.log(
    `[pepl:store] loadCard user=${userId} smiley=${row.smiley.length}b colors=${row.smiley_colors != null} gradient=${row.card_gradient != null} (${Date.now() - t0}ms)`,
  );
  return { smiley: row.smiley, smileyColors: row.smiley_colors, cardGradient: row.card_gradient };
}

/**
 * List every persisted user as a worldmap node ({userId, name, smiley}). One row per dossier, so a
 * user appears once they've finished onboarding (the "appear after onboarding" contract). The smiley
 * is joined from user_cards when the user drew one; null is an honest absence (NOT a fabricated
 * default), per §2. This is the keystone for "see each other" — every signed-up node in one list.
 */
export async function listMapNodes(): Promise<MapNode[]> {
  const t0 = Date.now();
  const [dos, crd] = await Promise.all([
    db().from("dossiers").select("user_id, owner_name, bio"),
    db().from("user_cards").select("user_id, smiley"),
  ]);
  surface("select dossiers (map nodes)", dos.error);
  surface("select user_cards (map nodes)", crd.error);

  const smileyBy = new Map<string, string>();
  for (const r of (crd.data ?? []) as Array<{ user_id: string; smiley: string }>) smileyBy.set(r.user_id, r.smiley);

  const nodes: MapNode[] = ((dos.data ?? []) as Array<{ user_id: string; owner_name: string; bio: Bio | null }>).map((r) => ({
    userId: r.user_id,
    name: r.owner_name,
    smiley: smileyBy.get(r.user_id) ?? null,
    bio: r.bio ?? null,
  }));

  const withSmiley = nodes.filter((n) => n.smiley).length;
  if (nodes.length === 0) console.warn(`[pepl:store] map nodes -> EMPTY (no dossiers persisted yet) (${Date.now() - t0}ms)`);
  else console.log(`[pepl:store] map nodes n=${nodes.length} withSmiley=${withSmiley} (${Date.now() - t0}ms)`);
  return nodes;
}
