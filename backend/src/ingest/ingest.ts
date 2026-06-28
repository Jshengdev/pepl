import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { Signal } from "../types";
import { defineNode } from "../nodes/defineNode";

// DEMO_CACHE: precached real corpus assembled from gx; the extract->graph->generate->critic
// pipeline runs LIVE on it; swap this file's source for a Gmail export to go fully live.
const CORPUS_PATH = resolve(process.cwd(), "data/precached-signals.json");

/** Read + validate the real Signal corpus. Missing/empty/invalid fails LOUD — no fallback. */
function loadCorpus(): z.infer<typeof Signal>[] {
  const t0 = Date.now();
  const raw = readFileSync(CORPUS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const signals = z.array(Signal).parse(parsed);
  if (!signals.length) {
    throw new Error(`[pepl:node:ingest] empty corpus at ${CORPUS_PATH} — refusing to run pipeline on zero signals`);
  }
  console.log(`[pepl:node:ingest] loaded corpus from ${CORPUS_PATH} (n=${signals.length}, ${Date.now() - t0}ms)`);
  return signals;
}

// pepl: S1 stub — S2 loads the real precached corpus
// Stable, descriptive ids: generated claims later reference these by signalId.
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

export const ingestNode = defineNode({
  name: "ingest",
  in: z.object({ source: z.string() }),
  out: z.object({ signals: z.array(Signal) }),
  stub: ({ source }) => {
    if (!CORPUS.length) {
      console.warn(`[pepl:node:ingest] WARN empty corpus for source="${source}"`);
    }
    return { signals: CORPUS };
  },
  live: ({ source }) => {
    console.log(`[pepl:node:ingest] live load for source="${source}"`);
    return { signals: loadCorpus() };
  },
});
