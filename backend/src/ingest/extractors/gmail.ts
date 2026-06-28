import type { Person, Edge } from "../../types";
import type { RawEmail } from "../composio/gmail";
import { slug, dedupeByNameVariant } from "./extract-helpers";

const RECENCY_DECAY_DAYS = 30;
const OWNER_ID = "you";

/** ring 0 = the owner; rings widen 1..3 as normalized closeness drops. */
export function ringFor(closeness: number): 0 | 1 | 2 | 3 {
  if (closeness >= 0.95) return 0;
  if (closeness >= 0.7) return 1;
  if (closeness >= 0.4) return 2;
  return 3;
}

function cleanName(raw: string | null | undefined): string {
  return (raw ?? "").replace(/[,;:.\s]+$/, "").trim();
}

/** Prefer the tidier display form: fewer punctuation marks, then longer. */
function cleanerName(a: string, b: string): string {
  const noise = (s: string) => (s.match(/[^a-z0-9\s]/gi) ?? []).length;
  if (noise(a) !== noise(b)) return noise(a) < noise(b) ? a : b;
  return a.length >= b.length ? a : b;
}

interface Agg {
  email: string;
  name: string;
  inbound: number;
  outbound: number;
  latestMs: number;
}

/**
 * Reconstruct the owner's relationship graph from raw emails. Per correspondent:
 * inbound = emails they sent the owner, outbound = emails the owner sent them.
 * closeness = (inbound+outbound)*(bidirectional?2:1)*exp(-daysSinceLatest/30),
 * NORMALIZED to 0..1 by the strongest tie in the set. Radial owner->person edges.
 */
export function peopleFromEmails(
  emails: RawEmail[],
  owner: { email: string },
): { people: Person[]; edges: Edge[] } {
  const t0 = Date.now();
  const ownerEmail = owner.email.toLowerCase();
  const now = Date.now();
  const agg = new Map<string, Agg>();

  const touch = (email: string, name: string, dateMs: number): Agg => {
    let a = agg.get(email);
    if (!a) {
      a = { email, name, inbound: 0, outbound: 0, latestMs: 0 };
      agg.set(email, a);
    }
    if (name && (!a.name || a.name === a.email)) a.name = name; // prefer a real display name over the bare address
    if (dateMs > a.latestMs) a.latestMs = dateMs;
    return a;
  };

  for (const e of emails) {
    const from = (e.fromEmail || "").toLowerCase();
    const parsed = e.date ? new Date(e.date).getTime() : NaN;
    const dateMs = Number.isNaN(parsed) ? 0 : parsed;
    if (from === ownerEmail) {
      for (const to of e.toEmails) {
        const t = (to || "").toLowerCase();
        if (!t || t === ownerEmail) continue;
        touch(t, t, dateMs).outbound++;
      }
    } else if (from) {
      touch(from, cleanName(e.fromName) || from, dateMs).inbound++;
    }
  }

  // Collapse the same person reached under multiple addresses / name forms.
  const merged = dedupeByNameVariant(
    [...agg.values()],
    (a) => a.name,
    (a, b) => ({
      email: a.email,
      name: cleanerName(a.name, b.name),
      inbound: a.inbound + b.inbound,
      outbound: a.outbound + b.outbound,
      latestMs: Math.max(a.latestMs, b.latestMs),
    }),
  );

  const scored = merged.map((a) => {
    const bidirectional = a.inbound > 0 && a.outbound > 0;
    const daysSinceLatest = a.latestMs ? Math.max(0, (now - a.latestMs) / 86_400_000) : 999;
    const recencyW = Math.exp(-daysSinceLatest / RECENCY_DECAY_DAYS);
    const raw = (a.inbound + a.outbound) * (bidirectional ? 2 : 1) * recencyW;
    const close = bidirectional && a.inbound + a.outbound >= 3;
    return { ...a, raw, close };
  });

  const maxRaw = scored.reduce((m, s) => Math.max(m, s.raw), 0);

  const ownerName = ownerEmail.split("@")[0] || OWNER_ID;
  const people: Person[] = [{ id: OWNER_ID, name: ownerName, ring: 0, closeness: 1 }];
  const edges: Edge[] = [];
  const usedIds = new Set<string>([OWNER_ID]);

  for (const s of scored.sort((a, b) => b.raw - a.raw)) {
    if (maxRaw <= 0) break; // every tie decayed to nothing — honest absence
    const closeness = Math.min(1, Math.round((s.raw / maxRaw) * 1000) / 1000);
    let id = slug(s.name) || slug(s.email);
    if (!id) continue;
    let n = 2;
    while (usedIds.has(id)) id = `${slug(s.name) || slug(s.email)}-${n++}`;
    usedIds.add(id);

    const ring = Math.max(1, ringFor(closeness)) as 1 | 2 | 3;
    const lastInteraction = s.latestMs ? new Date(s.latestMs).toISOString().slice(0, 10) : undefined;
    people.push({ id, name: s.name, ring, closeness, ...(lastInteraction ? { lastInteraction } : {}) });
    edges.push({ from: OWNER_ID, to: id, kind: s.close ? "close-friend" : "contact", strength: closeness });
  }

  console.log(
    `[pepl:ingest:gmail] peopleFromEmails in=${emails.length} people=${people.length} edges=${edges.length} maxRaw=${maxRaw.toFixed(2)} (${Date.now() - t0}ms)`,
  );
  if (people.length <= 1) {
    console.warn(
      `[pepl:ingest:gmail] WARN no correspondents derived from ${emails.length} emails (owner=${ownerEmail})`,
    );
  }
  return { people, edges };
}
