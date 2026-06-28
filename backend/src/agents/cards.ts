import { z } from "zod";
import { defineNode } from "../nodes/defineNode";
import { complete } from "../llm/client";
import { Card, RelationshipGraph, Story } from "../types";

const Copy = z.object({
  oneLiner: z.string(),
  profileFacts: z.array(z.string()),
  wowHeadline: z.string(),
  wowDetail: z.string(),
  mbtiType: z.string(),
  mbtiWhy: z.string(),
});

export const cardsNode = defineNode({
  name: "cards",
  in: z.object({ graph: RelationshipGraph, story: Story }),
  out: z.object({ cards: z.array(Card) }),
  // pepl: S1 stub — S2 fills the live path
  stub: ({ graph, story }) => {
    const me = graph.people.find((p) => p.ring === 0);
    if (!me) throw new Error("[pepl:node:cards] no ring-0 person in graph");

    const cards: z.input<typeof Card>[] = [
      {
        kind: "profile",
        name: me.name,
        oneLiner: "Builder at the center of a small, dense network.",
        facts: [
          `Closeness score ${me.closeness.toFixed(2)}`,
          `${graph.people.length - 1} people in orbit`,
          `${graph.edges.length} mapped relationships`,
        ],
        back: { label: "Who is this?" },
      },
      {
        kind: "wow",
        headline: `${graph.edges.length} connections, one source.`,
        detail: `We reconstructed ${me.name}'s relationship web from raw signals — no manual entry.`,
        back: { label: "The numbers" },
      },
      {
        kind: "graph",
        graph,
        back: { label: "Your web" },
      },
      {
        kind: "story",
        story,
        back: { label: "Your story" },
      },
      {
        kind: "mbti",
        type: "ENFP",
        why: "Outward-reaching network shape and idea-led signals read as warm, exploratory, people-first.",
        back: { label: "Why this type?" },
      },
    ];

    return { cards };
  },

  live: async ({ graph, story }) => {
    const me = graph.people.find((p) => p.ring === 0);
    if (!me) throw new Error("[pepl:node:cards] no ring-0 person in graph");

    const others = graph.people.filter((p) => p.id !== me.id);
    const peopleBlock = others
      .map((p) => `- ${p.name} (ring ${p.ring}, closeness ${p.closeness.toFixed(2)})`)
      .join("\n");
    const edgeBlock = graph.edges
      .map((e) => `- ${e.from} —[${e.kind}]→ ${e.to} (strength ${e.strength.toFixed(2)})`)
      .join("\n");
    const claimBlock = story.groundedIn
      .map((c) => `- "${c.claim}" [${c.signalId}]`)
      .join("\n");

    const system =
      "You write the card copy for pepl — a tool that reconstructs a real person from their own signals. " +
      "Ground EVERY word ONLY in the graph and story provided below; invent nothing, name no one who is not present, " +
      "claim no fact the corpus does not support. Write like a thoughtful friend who has been watching them work: " +
      "honest not flattering, concrete not generic, no clichés, no hedges (\"seems to\", \"appears to\"). " +
      "For MBTI: guess the four-letter type their voice and behavior actually point to, then justify it in one " +
      "paragraph leaning on cognitive functions but anchored to specific things they say and do in the story — " +
      "not the generic type description.";

    const prompt =
      `Subject (the person these cards are about): ${me.name} (ring 0, closeness ${me.closeness.toFixed(2)})\n\n` +
      `People in their orbit (rediscovered from their signals):\n${peopleBlock || "(none)"}\n\n` +
      `Mapped relationships:\n${edgeBlock || "(none)"}\n\n` +
      `Their story, in their own voice:\n${story.text}\n\n` +
      `Grounded claims (real details lifted from the corpus, each citing a signal):\n${claimBlock || "(none)"}\n\n` +
      `Return a JSON object with exactly these keys:\n` +
      `{\n` +
      `  "oneLiner": "one vivid sentence capturing who ${me.name} actually is, grounded in the story",\n` +
      `  "profileFacts": ["3 short factual bullets about ${me.name}, each traceable to the story or graph"],\n` +
      `  "wowHeadline": "a short punchy headline for the single most surprising REAL detail in the corpus",\n` +
      `  "wowDetail": "1-2 sentences on that surprising detail, drawn verbatim-in-spirit from the corpus",\n` +
      `  "mbtiType": "FOUR_LETTER_TYPE",\n` +
      `  "mbtiWhy": "one honest paragraph justifying the type from ${me.name}'s actual voice and behavior"\n` +
      `}`;

    const t0 = Date.now();
    console.log(
      `[pepl:node:cards] -> GENERATOR copy: people=${others.length} edges=${graph.edges.length} claims=${story.groundedIn.length}`,
    );
    const raw = await complete({
      tier: "GENERATOR",
      system,
      prompt,
      json: true,
      temperature: 0.4,
      maxTokens: 800,
    });
    // Sonnet sometimes wraps the object in ```json fences; strip them, then parse. A parse failure THROWS.
    const json = raw.trim().replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    const copy = Copy.parse(JSON.parse(json));
    console.log(
      `[pepl:node:cards] <- copy oneLiner=${copy.oneLiner.length}c facts=${copy.profileFacts.length} mbti=${copy.mbtiType} (${Date.now() - t0}ms)`,
    );

    const cards: z.input<typeof Card>[] = [
      {
        kind: "profile",
        name: me.name,
        oneLiner: copy.oneLiner,
        facts: copy.profileFacts,
        back: { label: "Who is this?" },
      },
      {
        kind: "wow",
        headline: copy.wowHeadline,
        detail: copy.wowDetail,
        back: { label: "The detail you'd never guess" },
      },
      {
        kind: "graph",
        graph,
        back: { label: "Your web" },
      },
      {
        kind: "story",
        story,
        back: { label: "Your story" },
      },
      {
        kind: "mbti",
        type: copy.mbtiType,
        why: copy.mbtiWhy,
        back: { label: "Why this type?" },
      },
    ];

    return { cards };
  },
});
