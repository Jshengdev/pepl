import { Signal, OnboardingAnswers } from "../types";

interface RawEmail {
  id: string;
  fromName: string;
  fromEmail: string;
  toEmails: string[];
  subject: string;
  snippet: string;
  date: string;
}

interface RawEvent {
  id: string;
  title: string;
  date: string;
  attendeeEmails: string[];
}

export function emailsToSignals(emails: RawEmail[]): Signal[] {
  const t0 = Date.now();
  const out = emails.map((e) =>
    Signal.parse({
      id: `gm-${e.id}`,
      text: `${e.subject} — ${e.snippet} (from ${e.fromName})`,
      source: `gmail:${e.fromEmail}`,
    }),
  );
  console.log(`[pepl:ingest:signalize] emails->signals (n=${out.length}, ms=${Date.now() - t0})`);
  if (emails.length && !out.length)
    console.warn(`[pepl:ingest:signalize] WARN emails->signals empty (in=${emails.length})`);
  return out;
}

export function eventsToSignals(events: RawEvent[]): Signal[] {
  const t0 = Date.now();
  const out = events.map((ev) =>
    Signal.parse({
      id: `cal-${ev.id}`,
      text: `${ev.title} (with ${ev.attendeeEmails.join(", ")})`,
      source: `calendar:${ev.date}`,
    }),
  );
  console.log(`[pepl:ingest:signalize] events->signals (n=${out.length}, ms=${Date.now() - t0})`);
  if (events.length && !out.length)
    console.warn(`[pepl:ingest:signalize] WARN events->signals empty (in=${events.length})`);
  return out;
}

export function answersToSignals(a: OnboardingAnswers): Signal[] {
  const out = [
    Signal.parse({ id: "ob-turning-point", text: a.turningPoint, source: "onboarding" }),
    Signal.parse({ id: "ob-unique-strength", text: a.uniqueStrength, source: "onboarding" }),
    Signal.parse({ id: "ob-friend-note", text: a.friendNote, source: "onboarding" }),
  ];
  console.log(`[pepl:ingest:signalize] answers->signals (n=${out.length})`);
  return out;
}
