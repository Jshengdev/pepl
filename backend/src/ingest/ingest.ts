import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { Signal, Person, Edge, OnboardingAnswers } from "../types";
import { defineNode } from "../nodes/defineNode";
import { isComposioAvailable } from "./composio/client";
import { deriveIdentityFromGmail, pullGmailMessages } from "./composio/gmail";
import { pullCalendarEvents } from "./composio/calendar";
import { classifyHumanSenders } from "./extractors/sender-classifier";
import { peopleFromEmails } from "./extractors/gmail";
import { peopleFromEvents } from "./extractors/calendar";
import { discoverFootprint } from "./footprint";
import { discoverViaTavily, tavilyEnabled } from "./tavily";
import { emailsToSignals, eventsToSignals, answersToSignals } from "./signalize";

const OWNER_ID = "you";
const TEST_USER_ID = "f2fe6fce-8c8f-40c2-b4ad-08f3275adbae";

// DEMO_CACHE: backend/data/precached-signals.json is a recorded INPUT corpus shaped
// exactly like a live Gmail/Calendar/footprint pull. COMPOSIO_MODE=cache loads it so
// the extract->graph->generate->critic pipeline runs LIVE on real-shaped signals with
// zero network; COMPOSIO_MODE=live (default) runs the real pull in liveIngest(). Flip
// the one env var to swap — the processing downstream is identical either way.
const CORPUS_PATH = resolve(process.cwd(), "data/precached-signals.json");

function loadCorpus(): z.infer<typeof Signal>[] {
  const t0 = Date.now();
  const signals = z.array(Signal).parse(JSON.parse(readFileSync(CORPUS_PATH, "utf8")));
  if (!signals.length)
    throw new Error(`[pepl:node:ingest] empty corpus at ${CORPUS_PATH} — refusing to run pipeline on zero signals`);
  console.log(`[pepl:node:ingest] cache corpus loaded (n=${signals.length}, ${Date.now() - t0}ms)`);
  return signals;
}

// S1 canned corpus for stub mode; stable descriptive ids generated claims reference.
const CORPUS: z.infer<typeof Signal>[] = [
  {
    id: "sig-housewarming",
    text: "Johnny hosted a housewarming last weekend — Sarah brought her famous lemon cake and Teri showed up an hour early to help set up the kitchen.",
    source: "post",
  },
  {
    id: "sig-cofounder-sarah",
    text: "Sarah and Johnny have been building together since the USC days; she's the person he calls first when a launch is on fire.",
    source: "onboarding",
  },
  {
    id: "sig-teri-mentor",
    text: "Teri mentored Johnny through his first fundraise and still does a monthly walk-and-talk to keep him honest about the roadmap.",
    source: "email",
  },
  {
    id: "sig-enfp-systems",
    text: "Johnny thinks in systems and runs hot on ideas — half-finished whiteboards everywhere, but he ships when Sarah holds the deadline.",
    source: "onboarding",
  },
  {
    id: "sig-sarah-marathon",
    text: "Sarah is training for the LA Marathon and dragged Johnny into 6am runs; he complains every time and shows up every time.",
    source: "post",
  },
  {
    id: "sig-teri-dinner",
    text: "Teri invited Johnny and Sarah to a quarterly founders' dinner — that's where the three of them first connected the dots on pepl.",
    source: "email",
  },
];

interface SourceResult {
  signals: Signal[];
  people: Person[];
  edges: Edge[];
}
const EMPTY: SourceResult = { signals: [], people: [], edges: [] };

// Per-source soft-fail: a dead source is an honest, logged absence (WARN + []),
// never a thrown build. ingest THROWS only when the UNION is empty (see liveIngest).
async function soft(name: string, fn: () => Promise<SourceResult>): Promise<SourceResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(
      `[pepl:node:ingest] source=${name} ok (signals=${r.signals.length}, people=${r.people.length}, edges=${r.edges.length}, ${Date.now() - t0}ms)`,
    );
    return r;
  } catch (err) {
    console.warn(
      `[pepl:node:ingest] WARN source=${name} soft-fail -> [] (${Date.now() - t0}ms): ${err instanceof Error ? err.message : String(err)}`,
    );
    return EMPTY;
  }
}

// The real pull. Owner identity (ring 0) is derived first, then Gmail / Calendar /
// footprint / onboarding fan out in parallel and each soft-fails independently. The
// radial people+edges (real interaction metadata) are returned alongside the signals
// so graphNode can merge them with extract's LLM lateral edges.
async function liveIngest(
  userId: string,
  lookbackDays: number,
  answers?: z.infer<typeof OnboardingAnswers>,
): Promise<{ signals: Signal[]; people: Person[]; edges: Edge[] }> {
  const t0 = Date.now();
  console.log(`[pepl:node:ingest] live start user=${userId} lookbackDays=${lookbackDays} answers=${answers ? "yes" : "no"}`);

  const identity = await deriveIdentityFromGmail(userId);

  const [gmail, calendar, footprint, tavily, onboarding] = await Promise.all([
    soft("gmail", async () => {
      // pepl: demo latency cap — the Gmail pagination dominates a live run. maxPages 6 (~150 msgs in the
      // 90d window) keeps the whole run ~<2min, and the scrape is masked by the reveal beats anyway.
      // Ceiling: only the most recent ~150 messages; upgrade path: raise maxPages or paginate in the bg.
      const emails = await pullGmailMessages(userId, { lookbackDays, maxPages: 6 });
      const humans = await classifyHumanSenders(emails);
      return { signals: emailsToSignals(humans), ...peopleFromEmails(humans, { email: identity.email }) };
    }),
    soft("calendar", async () => {
      const events = await pullCalendarEvents(userId, { lookbackDays });
      const { people, edges, topicSignals } = peopleFromEvents(events, {
        id: OWNER_ID,
        name: identity.name,
        email: identity.email,
      });
      return { signals: [...eventsToSignals(events), ...topicSignals], people, edges };
    }),
    soft("footprint", async () => ({ ...EMPTY, signals: await discoverFootprint({ name: identity.name, email: identity.email }) })),
    // Optional second search lens (sponsor, off by default). When TAVILY_ENABLED!=="true" this is a clean no-op.
    soft("tavily", async () =>
      tavilyEnabled()
        ? { ...EMPTY, signals: await discoverViaTavily({ name: identity.name, email: identity.email }) }
        : EMPTY,
    ),
    soft("onboarding", async () => ({ ...EMPTY, signals: answers ? answersToSignals(answers) : [] })),
  ]);

  const signals = [gmail, calendar, footprint, tavily, onboarding].flatMap((s) => s.signals);

  // Radial people across both sources (dedupe by id; first source wins). The owner
  // is forced to ring 0 / closeness 1 with the DERIVED name — never hardcoded.
  const byId = new Map<string, Person>();
  for (const p of [...gmail.people, ...calendar.people]) if (!byId.has(p.id)) byId.set(p.id, p);
  byId.set(OWNER_ID, { id: OWNER_ID, name: identity.name, ring: 0, closeness: 1 });
  const people = [...byId.values()];
  const edges = [...gmail.edges, ...calendar.edges];

  console.log(
    `[pepl:node:ingest] live union owner="${identity.name}" <${identity.email}> signals=${signals.length} people=${people.length} edges=${edges.length} (${Date.now() - t0}ms)`,
  );

  if (signals.length === 0)
    throw new Error(
      `[pepl:node:ingest] ALL sources empty for user=${userId} (gmail/calendar/footprint/onboarding) — refusing to fabricate a graph`,
    );

  return { signals, people, edges };
}

export const ingestNode = defineNode({
  name: "ingest",
  in: z.object({
    source: z.string(),
    userId: z.string().optional(),
    lookbackDays: z.number().optional(),
    answers: OnboardingAnswers.optional(),
  }),
  out: z.object({
    signals: z.array(Signal),
    people: z.array(Person).default([]),
    edges: z.array(Edge).default([]),
  }),
  stub: ({ source }) => {
    if (!CORPUS.length) console.warn(`[pepl:node:ingest] WARN empty corpus for source="${source}"`);
    return { signals: CORPUS };
  },
  live: async ({ source, userId, lookbackDays, answers }) => {
    const mode = process.env.COMPOSIO_MODE ?? "live";
    const uid = userId ?? process.env.INGEST_USER_ID ?? TEST_USER_ID;
    if (mode === "cache") {
      console.log(`[pepl:node:ingest] live(cache) source="${source}" — DEMO_CACHE input corpus`);
      return { signals: loadCorpus(), people: [], edges: [] };
    }
    if (mode !== "live")
      throw new Error(`[pepl:node:ingest] unknown COMPOSIO_MODE="${mode}" (expected "live" or "cache")`);
    if (!isComposioAvailable())
      throw new Error(
        `[pepl:node:ingest] COMPOSIO_MODE=live but COMPOSIO_API_KEY missing — set the key or COMPOSIO_MODE=cache (never silently falling back to the cache)`,
      );
    return liveIngest(uid, lookbackDays ?? 90, answers); // pepl: 90d default — demo latency cap (see liveIngest gmail)
  },
});
