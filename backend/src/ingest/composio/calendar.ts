import { v3Execute, largestArrayInResponse, extractNextPageToken } from "./v3-execute";

export interface RawEvent {
  id: string;
  title: string;
  date: string;
  attendeeEmails: string[];
}

// EVENTS_LIST default page size; absolute max 2500.
const CAL_PER_PAGE = 250;

function toRawEvent(raw: unknown): RawEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = ((r.summary as string) ?? (r.title as string) ?? "").toString().trim();
  const startObj = r.start as { dateTime?: string; date?: string } | undefined;
  const date = startObj?.dateTime ?? startObj?.date ?? "";
  if (!title || !date) return null;

  const attendeesRaw = Array.isArray(r.attendees) ? (r.attendees as Array<Record<string, unknown>>) : [];
  const attendeeEmails = attendeesRaw
    .filter(
      (a) =>
        a.self !== true &&
        a.responseStatus !== "declined" &&
        typeof a.email === "string" &&
        (a.email as string).length > 0,
    )
    .map((a) => (a.email as string).toLowerCase());

  return { id: typeof r.id === "string" ? r.id : "", title, date, attendeeEmails };
}

function collect(result: unknown, all: RawEvent[], seen: Set<string>): number {
  const events = largestArrayInResponse(result)
    .map(toRawEvent)
    .filter((e): e is RawEvent => e !== null);
  for (const e of events) {
    if (e.id && seen.has(e.id)) continue;
    if (e.id) seen.add(e.id);
    all.push(e);
  }
  return events.length;
}

// Primary: EVENTS_LIST (camelCase, paginated). Fallback on empty:
// FIND_EVENT (snake_case, single page).
export async function pullCalendarEvents(
  userId: string,
  opts: { lookbackDays?: number },
): Promise<RawEvent[]> {
  const t0 = Date.now();
  const lookbackDays = opts.lookbackDays ?? 180;
  const now = new Date();
  const timeMin = new Date(now.getTime() - lookbackDays * 86_400_000).toISOString();
  const timeMax = now.toISOString();

  const all: RawEvent[] = [];
  const seen = new Set<string>();
  let pageToken: string | undefined;
  let pages = 0;

  while (true) {
    const args: Record<string, unknown> = {
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: CAL_PER_PAGE,
      singleEvents: true,
      orderBy: "startTime",
    };
    if (pageToken) args.pageToken = pageToken;

    const result = await v3Execute("GOOGLECALENDAR_EVENTS_LIST", userId, args);
    if (result === null) {
      console.warn(`[pepl:ingest:calendar] WARN soft-fail (no account/timeout) user=${userId}`);
      break;
    }

    const seenThisPage = collect(result, all, seen);
    pages++;
    pageToken = extractNextPageToken(result);
    if (!pageToken || seenThisPage === 0) break;
  }

  if (all.length === 0) {
    const fb = await v3Execute("GOOGLECALENDAR_FIND_EVENT", userId, {
      calendar_id: "primary",
      time_min: timeMin,
      time_max: timeMax,
      max_results: CAL_PER_PAGE,
      single_events: true,
    });
    if (fb !== null) collect(fb, all, seen);
  }

  console.log(`[pepl:ingest:calendar] pulled (n=${all.length}, pages=${pages}, ${Date.now() - t0}ms)`);
  return all;
}
