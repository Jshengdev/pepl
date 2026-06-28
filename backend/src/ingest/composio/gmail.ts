import { v3Execute, largestArrayInResponse, extractNextPageToken } from "./v3-execute";

export interface RawEmail {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmails: string[];
  subject: string;
  snippet: string;
  date: string;
}

// verbose:true alone stays under the ~6MB v3 cap (adding include_payload → 413).
const PER_PAGE = 25;

function parseFrom(raw: string): { name: string; email: string } {
  const s = raw.trim();
  const angle = s.match(/^(.*?)<\s*([^>\s]+@[^>\s]+)\s*>\s*$/);
  if (angle) {
    return { name: angle[1].trim().replace(/^"|"$/g, "").trim(), email: angle[2].trim().toLowerCase() };
  }
  const bare = s.match(/([^\s<>]+@[^\s<>]+)/);
  return { name: "", email: (bare ? bare[1] : s).toLowerCase() };
}

function parseRecipients(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const m = part.match(/([^\s<>]+@[^\s<>]+)/);
    if (m) out.push(m[1].toLowerCase());
  }
  return out;
}

function toRawEmail(raw: unknown): RawEmail | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const headers =
    (r.payload as { headers?: Array<{ name?: string; value?: string }> } | undefined)?.headers ?? [];
  const h: Record<string, string> = {};
  for (const x of headers) if (x?.name && typeof x.value === "string") h[x.name.toLowerCase()] = x.value;

  const from = h.from ?? (typeof r.sender === "string" ? r.sender : "");
  const subject = h.subject ?? (typeof r.subject === "string" ? r.subject : "");
  let snippet = typeof r.snippet === "string" ? r.snippet : typeof r.messageText === "string" ? r.messageText : "";
  snippet = snippet.slice(0, 200);

  let date = "";
  if (typeof r.internalDate === "string") {
    const ms = parseInt(r.internalDate, 10);
    if (Number.isFinite(ms)) date = new Date(ms).toISOString();
  }
  if (!date && typeof r.messageTimestamp === "string") {
    const d = new Date(r.messageTimestamp);
    if (!isNaN(d.getTime())) date = d.toISOString();
  }
  if (!date && h.date) {
    const d = new Date(h.date);
    if (!isNaN(d.getTime())) date = d.toISOString();
  }

  if (!from && !subject) return null;
  const { name: fromName, email: fromEmail } = parseFrom(from);
  const id = typeof r.messageId === "string" ? r.messageId : typeof r.id === "string" ? r.id : "";
  return {
    id,
    fromName,
    fromEmail,
    toEmails: parseRecipients(`${h.to ?? ""},${h.cc ?? ""}`),
    subject,
    snippet,
    date,
  };
}

// v3 BODY user_id = the Composio account (the `userId` arg). The ACTION arg
// user_id:"me" is Gmail's authenticated-mailbox selector — not the same thing.
async function pullGmail(userId: string, query: string, maxPages: number): Promise<RawEmail[]> {
  const t0 = Date.now();
  const all: RawEmail[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;

  while (pages < maxPages) {
    const args: Record<string, unknown> = { max_results: PER_PAGE, user_id: "me", query, verbose: true };
    if (pageToken) args.page_token = pageToken;

    const result = await v3Execute("GMAIL_FETCH_EMAILS", userId, args);
    if (result === null) {
      console.warn(`[pepl:ingest:gmail] WARN soft-fail (no account/timeout) user=${userId} query="${query}"`);
      break;
    }

    const msgs = largestArrayInResponse(result)
      .map(toRawEmail)
      .filter((m): m is RawEmail => m !== null);
    for (const m of msgs) {
      if (m.id && seen.has(m.id)) continue;
      if (m.id) seen.add(m.id);
      all.push(m);
    }
    pages++;

    pageToken = extractNextPageToken(result);
    if (!pageToken || msgs.length === 0) break;
  }

  console.log(`[pepl:ingest:gmail] pulled query="${query}" (n=${all.length}, pages=${pages}, ${Date.now() - t0}ms)`);
  return all;
}

export async function pullGmailMessages(
  userId: string,
  opts: { lookbackDays?: number; maxPages?: number },
): Promise<RawEmail[]> {
  const lookbackDays = opts.lookbackDays ?? 180;
  const maxPages = opts.maxPages ?? 40;
  const since = new Date(Date.now() - lookbackDays * 86_400_000);
  const q = `after:${since.getUTCFullYear()}/${String(since.getUTCMonth() + 1).padStart(2, "0")}/${String(since.getUTCDate()).padStart(2, "0")}`;
  return pullGmail(userId, q, maxPages);
}

// The owner is the most-frequent sender of their own sent mail.
export async function deriveIdentityFromGmail(userId: string): Promise<{ name: string; email: string }> {
  const t0 = Date.now();
  const sent = await pullGmail(userId, "in:sent", 2);
  if (sent.length === 0) {
    throw new Error(`[pepl:ingest:gmail] deriveIdentity: no sent mail for user=${userId} — cannot resolve owner`);
  }

  const tally = new Map<string, { name: string; count: number }>();
  for (const m of sent) {
    if (!m.fromEmail) continue;
    const e = tally.get(m.fromEmail) ?? { name: "", count: 0 };
    e.count++;
    if (!e.name && m.fromName) e.name = m.fromName;
    tally.set(m.fromEmail, e);
  }

  const top = [...tally.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  if (!top) {
    throw new Error(`[pepl:ingest:gmail] deriveIdentity: no sender in ${sent.length} sent messages for user=${userId}`);
  }

  const [email, info] = top;
  console.log(
    `[pepl:ingest:gmail] identity ${info.name || "(no name)"} <${email}> (sent=${sent.length}, senders=${tally.size}, ${Date.now() - t0}ms)`,
  );
  return { name: info.name || email, email };
}
