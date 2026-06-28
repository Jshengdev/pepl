import type { RawEvent } from "../composio/calendar";
import type { Person, Edge, Signal } from "../../types";

interface OwnerRef {
  id: string;
  name?: string;
  email: string;
}

// Conference rooms, shared/resource calendars, and no-reply addresses are not
// people — they must not become person nodes.
const NON_HUMAN_ATTENDEE =
  /(\.calendar\.google\.com$|@resource\.|^(no-?reply|noreply|donotreply|notifications?|notify)@)/i;

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "of", "for", "with",
  "is", "be", "are", "was", "were", "has", "have", "had", "do", "not", "no",
  "meeting", "call", "chat", "sync", "catch", "up", "weekly", "daily", "monthly",
  "my", "our", "your", "team", "office", "zoom", "google", "meet", "x", "vs",
]);

function isHumanAttendee(email: string, ownerEmail: string): boolean {
  return (
    !!email &&
    email.includes("@") &&
    email.toLowerCase() !== ownerEmail.toLowerCase() &&
    !NON_HUMAN_ATTENDEE.test(email)
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// "sarah.chen@co.com" → "Sarah Chen"
function humanizeEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ringFor(closeness: number): 1 | 2 | 3 {
  if (closeness >= 0.7) return 1;
  if (closeness >= 0.4) return 2;
  return 3;
}

/**
 * Pure, zero-LLM extraction: co-attendees become person nodes radiating off the
 * owner, recurring meeting-title themes become topic Signals. Closeness is
 * meeting-count weighted by recency (exp decay over 30d), normalized 0..1.
 */
export function peopleFromEvents(
  events: RawEvent[],
  owner: OwnerRef,
): { people: Person[]; edges: Edge[]; topicSignals: Signal[] } {
  const t0 = Date.now();
  const now = Date.now();

  // --- Co-attendees → people ---
  const byAttendee = new Map<string, { count: number; latest: number }>();
  for (const ev of events) {
    const when = new Date(ev.date).getTime();
    const ts = Number.isFinite(when) ? when : now;
    for (const email of ev.attendeeEmails) {
      if (!isHumanAttendee(email, owner.email)) continue;
      const entry = byAttendee.get(email);
      if (entry) {
        entry.count++;
        if (ts > entry.latest) entry.latest = ts;
      } else {
        byAttendee.set(email, { count: 1, latest: ts });
      }
    }
  }

  const raw = new Map<string, number>();
  for (const [email, { count, latest }] of byAttendee) {
    const days = Math.max(0, (now - latest) / 86_400_000);
    raw.set(email, count * Math.exp(-days / 30));
  }
  const maxRaw = Math.max(...raw.values(), 1e-9);

  const people: Person[] = [];
  const edges: Edge[] = [];
  for (const [email, { count, latest }] of byAttendee) {
    const closeness = Math.min(1, (raw.get(email) ?? 0) / maxRaw);
    const id = slug(email.split("@")[0] ?? email);
    people.push({
      id,
      name: humanizeEmail(email),
      ring: ringFor(closeness),
      closeness,
      lastInteraction: new Date(latest).toISOString().slice(0, 10),
    });
    edges.push({
      from: owner.id,
      to: id,
      kind: closeness >= 0.7 ? "close-contact" : "meets-with",
      strength: closeness,
    });
    void count;
  }

  // --- Recurring title themes → topic Signals ---
  const tokenCounts = new Map<string, number>();
  for (const ev of events) {
    const seen = new Set<string>();
    for (const tok of ev.title.toLowerCase().split(/[\s\-_,.!?:;/\\()[\]{}"'`]+/)) {
      if (tok.length > 2 && !STOPWORDS.has(tok) && !/^\d+$/.test(tok) && !seen.has(tok)) {
        seen.add(tok);
        tokenCounts.set(tok, (tokenCounts.get(tok) ?? 0) + 1);
      }
    }
  }
  const topicSignals: Signal[] = [];
  for (const [token, count] of tokenCounts) {
    if (count >= 2) {
      topicSignals.push({
        id: `cal-topic-${slug(token)}`,
        text: `Recurring meeting theme: "${token}" appears across ${count} calendar events`,
        source: "calendar",
      });
    }
  }

  console.log(
    `[pepl:ingest:calendar] peopleFromEvents events=${events.length} people=${people.length} edges=${edges.length} topics=${topicSignals.length} (${Date.now() - t0}ms)`,
  );
  return { people, edges, topicSignals };
}
