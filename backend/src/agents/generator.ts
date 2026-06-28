import { defineNode } from "../nodes/defineNode";
import { RelationshipGraph, Signal, OnboardingAnswers, Story } from "../types";
import { complete } from "../llm/client";
import { z } from "zod";

const GenerateIn = z.object({
  graph: RelationshipGraph,
  signals: z.array(Signal),
  answers: OnboardingAnswers.optional(),
  kind: z.enum(["bio", "story"]),
});

const SYSTEM = `You ghostwrite a first-person piece for the SUBJECT of a corpus of signals.
The signals are the subject's own words and the way people around them talk — that IS the voice. Match the register exactly: casual, blunt, systems-minded, a little irreverent and self-deprecating, occasional profanity left intact ("jank ass notes", "some shit", "AI goon lord"). First person ("I"), present-tense, no consultant-deck polish, no clichés, no hedging.

Hard grounding contract:
- EVERY claim in the text must trace to a specific signal by its id.
- Use ONLY signal ids from the list given. NEVER invent an id. NEVER cite an id that is not in the list — that is a hard failure.
- A "claim" is one concrete assertion the text makes; pair it with the exact signal id it rests on.

Output ONLY a JSON object: { "text": string, "groundedIn": [{ "claim": string, "signalId": string }] }`;

function buildPrompt(input: z.infer<typeof GenerateIn>): string {
  // ANSWERS-AS-CORE-GROUNDING: the onboarding signals (source:"onboarding") are the subject's own
  // words about WHO THEY ARE — ground the piece in those FIRST, then enrich with everything else.
  const onboarding = input.signals.filter((s) => s.source === "onboarding");
  const rest = input.signals.filter((s) => s.source !== "onboarding");
  const fmt = (ss: typeof input.signals): string => ss.map((s) => `[${s.id}] ${s.text}`).join("\n");
  const orbit = input.graph.people.map((p) => `${p.name} (ring ${p.ring})`).join(", ");
  const ask =
    input.kind === "story"
      ? "Write a first-person STORY — the subject reading their own life back as a narrative arc (~150-220 words)."
      : "Write a first-person BIO — the subject introducing themselves (~120-180 words).";

  const primaryBlock = onboarding.length
    ? `PRIMARY GROUNDING — how the subject answered "who am I" (this is the CORE of who they are; build the spine of the piece HERE FIRST, then enrich; cite these ids):
${fmt(onboarding)}

ENRICHMENT SIGNALS (Gmail / calendar / footprint — add specific, true detail AROUND the primary grounding; cite by id):
${fmt(rest)}`
    : `SIGNALS (cite by id):
${fmt(rest)}`;

  return `${ask}

People in the subject's orbit (context only — ground content in the signals, not this list): ${orbit || "(none surfaced)"}

${primaryBlock}

Return the JSON object now. Every entry in groundedIn must use one of the signal ids above.`;
}

// pepl: S1 canned, contract-shaped. STUB_MODE=0 flips to the live LLM path below.
async function live(input: z.infer<typeof GenerateIn>): Promise<z.input<typeof Story>> {
  const ids = new Set(input.signals.map((s) => s.id));
  if (ids.size === 0) {
    // Honest absence: no corpus means nothing to ground in. Surface it, don't fake a story.
    throw new Error("[pepl:node:generate] refusing to write: 0 signals to ground in");
  }
  console.log(`[pepl:generate] -> LLM kind=${input.kind} signals=${ids.size} people=${input.graph.people.length}`);

  const raw = await complete({
    tier: "GENERATOR",
    system: SYSTEM,
    prompt: buildPrompt(input),
    json: true,
    temperature: 0.7,
    maxTokens: 1200,
  });

  // Strip a markdown ```json fence if the model added one (deterministic, not a fallback).
  const json = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const story = Story.parse(JSON.parse(json)); // parse failure / wrong shape THROWS — no fallback

  const fabricated = story.groundedIn.filter((c) => !ids.has(c.signalId));
  if (fabricated.length > 0) {
    throw new Error(
      `[pepl:node:generate] FABRICATED CITATIONS: ${fabricated.length} groundedIn entr${fabricated.length === 1 ? "y cites a" : "ies cite"} signal id not in the corpus -> ${fabricated.map((c) => c.signalId).join(", ")}`,
    );
  }
  console.log(`[pepl:generate] <- story text=${story.text.length} chars groundedIn=${story.groundedIn.length} (all ids real)`);
  return story;
}

export const generateNode = defineNode({
  name: "generate",
  in: GenerateIn,
  out: Story,
  live,
  stub: ({ signals }) => {
    // Ground only in signals that actually arrived — empty stays honest, never invented.
    const grounded = signals.slice(0, 4).map((s) => ({
      claim: `I keep coming back to this: ${s.text}`,
      signalId: s.id,
    }));
    if (grounded.length === 0) console.warn("[pepl:node:generate] no signals to ground in (n=0)");

    const text =
      "I never set out to be the person in the room who connects everyone, " +
      "but somewhere along the way it became the thing I'm known for. " +
      "The people closest to me would tell you I show up — for the small stuff " +
      "and the hard stuff — and that's the version of me I'm proudest of.";

    return { text, groundedIn: grounded };
  },
});

// Live smoke: STUB_MODE=0 npx tsx --env-file=.env src/agents/generator.ts
if (process.argv[1] && process.argv[1].endsWith("generator.ts")) {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const dataPath = fileURLToPath(new URL("../../data/precached-signals.json", import.meta.url));
  const signals = Signal.array().parse(JSON.parse(readFileSync(dataPath, "utf8")));
  // Minimal graph for the smoke — the live story grounds in signals, not this list.
  const graph = {
    people: [{ id: "johnny", name: "Johnny", ring: 0 as const, closeness: 1 }],
    edges: [],
    seededWrong: [],
  };
  const story = await generateNode({ graph, signals, kind: "story" });
  console.log("\n===== STORY TEXT =====\n" + story.text);
  console.log("\n===== GROUNDED IN =====\n" + JSON.stringify(story.groundedIn, null, 2));
}
