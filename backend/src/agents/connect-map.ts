// agents/connect-map.ts — beat-5 thematic connect-map. Connects two people NOT by shared contacts,
// but by who they SEEM LIKE AS PEOPLE: shared themes / interests / values / how they answered onboarding,
// surfaced as a cosine-style similarity score (0..1) for the p5 repel-by-distance map. One GENERATOR
// call per pair, grounded in BOTH dossiers' real signal ids — no face-value or invented overlap.
import { z } from "zod";
import { loadDossier, type DossierRead } from "../memory/store";
import { complete } from "../llm/client";

// Cap signals per person so a 39-signal dossier doesn't blow the prompt; order by identity-relevance
// (onboarding answers first, then the signals the story was built on, then the rest).
const MAX_SIGNALS = 18;
const SIGNAL_CHARS = 200;

const ConnectPairLlm = z.object({
  score: z.number(), // cosine-style 0..1 — range-checked below, never clamped (a silent clamp would hide a bad call)
  sharedThemes: z.array(z.string()).min(2).max(4),
  analogy: z.string(),
  sharedInterests: z.array(z.string()),
  groundedIn: z.array(z.object({ claim: z.string(), signalId: z.string(), userId: z.string() })).min(2),
});

export interface ConnectPair {
  a: string;
  b: string;
  score: number;
  sharedThemes: string[];
  analogy: string;
  sharedInterests: string[];
  groundedIn: Array<{ claim: string; signalId: string; userId: string }>;
}

const SYSTEM = `You judge how alike two real people are AS PEOPLE — not by who they know, but by who they seem to be.

What "alike" means here: shared themes, shared interests, shared values, and a similar way of answering "who am I" — the texture of how they each show up, told through their own words (their story + their signals). Two people with the same job but opposite temperaments are NOT alike; two people from different worlds who both build to understand themselves ARE.

Output a JSON object:
{
  "score": number,            // cosine-style similarity 0..1 (e.g. 0.56). 1 = uncanny twins, 0 = nothing in common. Be discerning — most real pairs land 0.3..0.7.
  "sharedThemes": string[],   // 2-4 themes BOTH genuinely embody (e.g. "building tools to understand themselves")
  "analogy": string,          // ONE line: "You're both the kind of person who…" — vivid, specific, true of both
  "sharedInterests": string[],// concrete interests/domains/activities both actually show
  "groundedIn": [ { "claim": string, "signalId": string, "userId": string } ]
}

Hard grounding contract (this is what separates real similarity from face-value or invented overlap):
- Every theme, the analogy, and every interest must trace to evidence in BOTH people. Prove it in groundedIn.
- groundedIn MUST cite at least one real signalId for EACH userId — overlap claimed for only one side is a hard failure.
- Use ONLY signal ids shown for that person, and set "userId" to EXACTLY the userId label given for them. NEVER invent an id, NEVER attribute a signal to the wrong person.
- A "claim" is one concrete thing they share; pair it with the signalId (and userId) it rests on.

Return ONLY the JSON object.`;

/** One person's block: name + story (their voice) + identity-ordered, truncated signals (cite by id). */
function personBlock(userId: string, name: string, d: DossierRead): string {
  const onboarding = d.signals.filter((s) => s.source === "onboarding");
  const groundedIds = new Set((d.story?.groundedIn ?? []).map((c) => c.signalId));
  const core = d.signals.filter((s) => s.source !== "onboarding" && groundedIds.has(s.id));
  const rest = d.signals.filter((s) => s.source !== "onboarding" && !groundedIds.has(s.id));
  const ordered = [...onboarding, ...core, ...rest].slice(0, MAX_SIGNALS);
  const sig = ordered.map((s) => `[${s.id}] ${s.text.replace(/\s+/g, " ").trim().slice(0, SIGNAL_CHARS)}`).join("\n");
  const story = d.story?.text?.trim() || "(no story on file — ground in the signals)";
  return `### ${name} — userId: "${userId}"
Story (their own voice):
${story}

Signals (cite by id):
${sig || "(no signals)"}`;
}

/** Display name = the ring-0 subject of the dossier; falls back to the userId. */
function subjectName(userId: string, d: DossierRead): string {
  return d.graph.people.find((p) => p.ring === 0)?.name ?? userId;
}

/** One LLM call for one pair. Throws (no fallback) on a fabricated/one-sided citation or an out-of-range score. */
async function connectOne(
  ua: string,
  da: DossierRead,
  ub: string,
  db: DossierRead,
): Promise<ConnectPair> {
  const na = subjectName(ua, da);
  const nb = subjectName(ub, db);
  const idsA = new Set(da.signals.map((s) => s.id));
  const idsB = new Set(db.signals.map((s) => s.id));

  const prompt = `Person A:
${personBlock(ua, na, da)}

Person B:
${personBlock(ub, nb, db)}

How alike are ${na} and ${nb} AS PEOPLE? Score 0..1, name 2-4 shared themes, ONE "you're both the kind of person who…" analogy, the interests they share, and a groundedIn that cites real signal ids from BOTH "${ua}" and "${ub}". Return the JSON now.`;

  const t0 = Date.now();
  console.log(`[pepl:connect] ${ua}×${ub} -> GENERATOR signals a=${idsA.size} b=${idsB.size}`);
  const raw = await complete({ tier: "GENERATOR", system: SYSTEM, prompt, json: true, temperature: 0.3, maxTokens: 1500 });

  // Strip a markdown ```json fence if present (deterministic, not a fallback), then parse — failure THROWS.
  const json = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const out = ConnectPairLlm.parse(JSON.parse(json));

  if (out.score < 0 || out.score > 1)
    throw new Error(`[pepl:connect] ${ua}×${ub} score out of range: ${out.score} (expected 0..1)`);

  // Fabrication / mis-attribution guard: every citation must be a real id for the right person.
  const allowed: Record<string, Set<string>> = { [ua]: idsA, [ub]: idsB };
  const bad = out.groundedIn.filter((g) => !allowed[g.userId] || !allowed[g.userId].has(g.signalId));
  if (bad.length)
    throw new Error(
      `[pepl:connect] ${ua}×${ub} FABRICATED CITATIONS: ${bad.map((g) => `${g.userId}:${g.signalId}`).join(", ")} not in that person's corpus`,
    );

  // Cross-grounding guard: overlap must be proven on BOTH sides, never one-sided/face-value.
  const sides = new Set(out.groundedIn.map((g) => g.userId));
  if (!sides.has(ua) || !sides.has(ub))
    throw new Error(
      `[pepl:connect] ${ua}×${ub} ONE-SIDED grounding: cited ${[...sides].join(", ") || "(none)"} — every shared theme must trace to BOTH people`,
    );

  console.log(
    `[pepl:connect] ${ua}×${ub} <- score=${out.score.toFixed(2)} themes=${out.sharedThemes.length} interests=${out.sharedInterests.length} grounded=${out.groundedIn.length} (${Date.now() - t0}ms)`,
  );
  return { a: ua, b: ub, ...out };
}

/**
 * Build the thematic connect-map for a set of users: every distinct pair scored by how alike they are
 * as people. Users with no dossier are an honest, logged absence (their pairs are skipped, not faked).
 */
export async function connectMap(userIds: string[]): Promise<{ pairs: ConnectPair[] }> {
  const t0 = Date.now();
  const ids = [...new Set(userIds)]; // dedupe — a person can't pair with themselves
  const loaded = (await Promise.all(ids.map(async (id) => [id, await loadDossier(id)] as const))).filter(
    (e): e is [string, DossierRead] => {
      if (!e[1]) console.warn(`[pepl:connect] user="${e[0]}" has no dossier — skipping its pairs (honest absence)`);
      return e[1] !== null;
    },
  );

  if (loaded.length < 2) {
    console.warn(`[pepl:connect] need >=2 loaded dossiers to pair, got ${loaded.length} of ${ids.length} requested`);
    return { pairs: [] };
  }

  const pairs: ConnectPair[] = [];
  for (let i = 0; i < loaded.length; i++)
    for (let j = i + 1; j < loaded.length; j++) {
      const [ua, da] = loaded[i];
      const [ub, db] = loaded[j];
      pairs.push(await connectOne(ua, da, ub, db));
    }

  console.log(`[pepl:connect] built ${pairs.length} pair(s) from ${loaded.length} dossiers (${Date.now() - t0}ms)`);
  return { pairs };
}

// Live smoke: npx tsx --env-file=.env src/agents/connect-map.ts
if (process.argv[1] && process.argv[1].endsWith("connect-map.ts")) {
  const { pairs } = await connectMap(["johnny", "demo-cache"]);
  console.log("\n===== CONNECT PAIRS =====\n" + JSON.stringify(pairs, null, 2));
}
