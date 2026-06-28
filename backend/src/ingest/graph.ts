import { z } from "zod";
import { defineNode } from "../nodes/defineNode";
import { complete } from "../llm/client";
import { Signal, Person, Edge, RelationshipGraph } from "../types";

/** ring 0 = you; 1..3 widen as closeness drops. */
function ringFor(closeness: number): 0 | 1 | 2 | 3 {
  if (closeness >= 0.95) return 0;
  if (closeness >= 0.7) return 1;
  if (closeness >= 0.4) return 2;
  return 3;
}

const EXTRACT_SYSTEM = `You read raw signals about ONE subject and reconstruct their relationship graph — the people who matter to them and how those people connect — the way a sharp friend would after reading their messages.

Return the people and the edges between them. Hard rules:
- Every person and every edge MUST be supported by the signals. Never invent anyone.
- The subject themself IS a person, with closeness 1.
- closeness is 0..1: how close this person is to the SUBJECT (a cofounder or best friend is high; a passing acquaintance is low), inferred from how the signals talk about them and how often.
- strength is 0..1: how strong the relationship on that edge is.
- id is kebab-case derived from the name ("Lauren Kinsella" -> "lauren-kinsella"; a first name alone is fine when that's all the signals give).
- lastInteraction ONLY if a signal actually implies recency; otherwise omit it.
- kind is a short relationship label ("cofounder", "close-friend", "mentor", "icp-friend").

Return ONLY JSON, no prose, no markdown:
{"people":[{"id":"...","name":"...","closeness":0.0-1.0,"lastInteraction":"..."}],"edges":[{"from":"<id>","to":"<id>","kind":"...","strength":0.0-1.0}]}`;

export const extractNode = defineNode({
  name: "extract",
  in: z.object({ signals: z.array(Signal) }),
  out: z.object({ people: z.array(Person), edges: z.array(Edge) }),
  // S1 canned graph; live path extracts the real people/edges from the signals.
  stub: ({ signals }) => {
    if (signals.length === 0)
      throw new Error("[pepl:node:extract] no signals to extract from");

    const people: Person[] = [
      { id: "you", name: "You", ring: 0, closeness: 1, lastInteraction: "today" },
      { id: "sarah", name: "Sarah", ring: ringFor(0.8), closeness: 0.8, lastInteraction: "2 days ago" },
      { id: "teri", name: "Teri", ring: ringFor(0.55), closeness: 0.55, lastInteraction: "3 weeks ago" },
    ];

    const edges: Edge[] = [
      { from: "you", to: "sarah", kind: "close-friend", strength: 0.8 },
      { from: "you", to: "teri", kind: "colleague", strength: 0.55 },
      { from: "sarah", to: "teri", kind: "acquaintance", strength: 0.3 },
    ];

    return { people, edges };
  },
  live: async ({ signals }) => {
    if (signals.length === 0)
      throw new Error("[pepl:node:extract] no signals to extract from");

    const hint =
      'The subject of these signals is Johnny Sheng (id: "johnny"). Recurring names you will likely find include Sarah and Teri (Johnny\'s cofounders), Lauren, Shawn, and Jasmine. Include a person ONLY if the signals support them, and ground closeness in what the signals actually say.';
    const corpus = signals.map((s) => `[${s.id}] ${s.text} (${s.source})`).join("\n");
    const prompt = `${hint}\n\nSIGNALS (${signals.length}):\n${corpus}`;

    console.log(`[pepl:node:extract] EXTRACT in: signals=${signals.length} chars=${prompt.length}`);
    const text = await complete({ tier: "EXTRACT", system: EXTRACT_SYSTEM, prompt, json: true, temperature: 0 });
    // Haiku sometimes fences JSON despite response_format; strip the fence, then parse (a bad parse still THROWS).
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const parsed = JSON.parse(json) as {
      people: Array<{ id: string; name: string; closeness: number; lastInteraction?: string }>;
      edges: Edge[];
    };

    const people: Person[] = parsed.people.map((p) => ({ ...p, ring: ringFor(p.closeness) }));
    console.log(`[pepl:node:extract] EXTRACT out: people=${people.length} edges=${parsed.edges.length}`);
    return { people, edges: parsed.edges };
  },
});

export const graphNode = defineNode({
  name: "graph",
  in: z.object({ people: z.array(Person), edges: z.array(Edge) }),
  out: RelationshipGraph,
  // S1 canned ring placement; live path places rings by closeness + seeds the correction beat.
  stub: ({ people, edges }) => {
    const placed = people.map((p) => ({ ...p, ring: ringFor(p.closeness) }));

    // Deliberate wrong field: push Teri one ring too far out so the user
    // corrects it — the correction beat. Honest, labeled, removed by correctGraph.
    const teri = placed.find((p) => p.id === "teri");
    if (!teri) throw new Error("[pepl:node:graph] expected seeded person 'teri' to place wrong field on");
    teri.ring = 3;

    return { people: placed, edges, seededWrong: [{ personId: "teri", field: "ring" }] };
  },
  live: ({ people, edges }) => {
    if (people.length < 4)
      throw new Error(`[pepl:node:graph] too few people for a real graph (${people.length} < 4)`);

    // The subject (highest closeness) is the sole ring-0 center; everyone else rings outward by closeness.
    const subject = people.reduce((m, p) => (p.closeness > m.closeness ? p : m), people[0]);
    const placed = people.map((p) =>
      p.id === subject.id
        ? { ...p, ring: 0 as const }
        : { ...p, ring: Math.max(1, ringFor(p.closeness)) as 1 | 2 | 3 },
    );

    // Sanity: the graph must have rediscovered the real shape from the signals — assert, don't patch.
    const has = (n: string) => placed.some((p) => p.name.toLowerCase().includes(n));
    if (!has("sarah") || !has("teri"))
      throw new Error(`[pepl:node:graph] expected Sarah and Teri in the graph (got: ${placed.map((p) => p.name).join(", ")})`);

    // Correction beat, grounded in sig-rage-bait-correction ("Teri's here, Johnny's here — that's so wrong"):
    // seed ONE wrong ring on the thinnest-but-real person (closest to the edge of the graph, still
    // backed by an edge) so the user goes "that's wrong" and corrects it. correctGraph drops the seed.
    const subjectId = placed.find((p) => p.ring === 0)?.id;
    const candidate = placed
      .filter((p) => p.id !== subjectId && p.ring < 3 && edges.some((e) => e.from === p.id || e.to === p.id))
      .sort((a, b) => a.closeness - b.closeness)[0];
    if (!candidate)
      throw new Error("[pepl:node:graph] no thin-but-real person to seed the correction beat on");
    candidate.ring = (candidate.ring + 1) as 0 | 1 | 2 | 3;
    const seededWrong = [{ personId: candidate.id, field: "ring" }];

    console.log(
      `[pepl:node:graph] people=${placed.length} edges=${edges.length} seededWrong=${seededWrong.length} wrong=${candidate.id}.ring`,
    );
    return { people: placed, edges, seededWrong };
  },
});

/** Apply a user correction and drop the matching seededWrong entry. */
export function correctGraph(
  graph: RelationshipGraph,
  c: { personId: string; field: string; value?: unknown },
): RelationshipGraph {
  const t0 = Date.now();
  const person = graph.people.find((p) => p.id === c.personId);
  if (!person) throw new Error(`[pepl:correctGraph] unknown personId '${c.personId}'`);

  const people = graph.people.map((p) =>
    p.id === c.personId ? { ...p, [c.field]: c.value ?? p[c.field as keyof Person] } : p,
  );
  const seededWrong = graph.seededWrong.filter(
    (s) => !(s.personId === c.personId && s.field === c.field),
  );

  const updated = RelationshipGraph.parse({ ...graph, people, seededWrong });
  console.log(
    `[pepl:correctGraph] ${c.personId}.${c.field} applied seededWrong=${updated.seededWrong.length} (${Date.now() - t0}ms)`,
  );
  return updated;
}
