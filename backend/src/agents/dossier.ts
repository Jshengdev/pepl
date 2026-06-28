// agents/dossier.ts — Part 5: the lunchbox / bento Dossier (THE HERO reveal payload).
// Reshapes the reveal's ALREADY-grounded, ALREADY-critic-passed outputs (Story · RelationshipGraph ·
// CriticVerdict + the raw Signal corpus) into 5 cards × ~5 grounded "bits". Every bit carries a Grounding
// receipt or it FAILS LOUD (CLAUDE.md §2):
//   • deterministic counts + graph facts          -> computed in code, critic:false
//   • the one human-made bit (the drawn smiley)    -> {kind:"user", source:"drawn"}  (status:"failed" if null,
//                                                     NEVER an empty-string default — that's a silent fallback)
//   • the interpretive facets (oneLiner, arc,      -> ONE GENERATOR pass; each MUST cite a REAL signal id, or
//     type, …)                                        we THROW (mirrors generator.ts). critic:true REUSES the
//                                                     reveal's held-out CriticVerdict — we do NOT re-run the
//                                                     judge ("reuse CriticVerdict, do NOT regenerate"):
//                                                     verdict==="emit" == the corpus these bits cite survived
//                                                     the held-out grounding critic.
//
// pepl: ceiling — synthesized sentences are asserted to cite a REAL signal id, but are not re-judged
// sentence-by-sentence; the critic:true flag rides on the reveal's verdict. Upgrade path: a per-bit
// held-out re-judge (criticNode over each facet) before tagging critic:true.
import { z } from "zod";
import { assertHeldOutCritic, complete } from "../llm/client";
import {
  Dossier,
  type Bit,
  type DossierCard,
  type Mode,
  type RelationshipGraph,
  type Story,
  type CriticVerdict,
  type Signal,
} from "../types";

export interface DossierInput {
  graph: RelationshipGraph;
  story: Story;
  verdict: CriticVerdict;
  signals: Signal[];
  smiley: string | null; // the drawn smiley (Part 4 /api/card); null until drawn -> Identity smiley bit FAILS
  mode: Mode; // honest in EVERY payload: "live" for the connected user, "cached" for the friend constellation
}

// ── The interpretive facets, synthesized in ONE GENERATOR pass. Each cites a real signal id (asserted). ──
const Cited = z.object({ value: z.string().min(1), signalId: z.string().min(1) });
const SYNTH_KEYS = [
  "oneLiner",
  "voiceSignature",
  "definingFact",
  "arc",
  "throughline",
  "origin",
  "drivingBelief",
  "icp",
  "mentor",
  "lateralEdge",
  "type",
  "why",
  "operatingMode",
  "principle",
  "growthEdge",
] as const;
type SynthKey = (typeof SYNTH_KEYS)[number];
const Synth = z.object(Object.fromEntries(SYNTH_KEYS.map((k) => [k, Cited])) as Record<SynthKey, typeof Cited>).partial();
type Synth = z.infer<typeof Synth>;

const SYNTH_SYSTEM = `You write the labeled facets of a person's DOSSIER — a "version of themselves" reflected back from their own signals. You are given their SIGNAL CORPUS (their own words + how the people around them talk — that IS the voice) and their STORY (already written and grounding-checked).

Ground EVERY facet in ONE specific signal by its id. Invent nothing. Name no one who is not in the people list. Use ONLY signal ids from the corpus below — citing an id that is not in the list is a hard failure. Honest not flattering, concrete not generic, no clichés, no hedges ("seems to", "appears to"); match the person's own register.

Output ONLY a JSON object. EACH value is an object { "value": string, "signalId": string } where signalId is the exact corpus id that grounds it. Include these keys (omit a key ONLY if the corpus genuinely gives you nothing real to ground it in — never pad, never fabricate):
{
  "oneLiner":       "one vivid sentence: who this person actually is",
  "voiceSignature": "how they talk — their register / word-choice / tone, one line",
  "definingFact":   "the single most defining, concrete fact about them",
  "arc":            "their narrative arc in one line (where they started -> where they are now)",
  "throughline":    "the one thread connecting everything they do",
  "origin":         "where it started — the origin moment or driver",
  "drivingBelief":  "the core belief that drives them, in their own spirit",
  "icp":            "the kind of person they are FOR / serve / build for (their ideal user)",
  "mentor":         "a REAL named person from the people list who guides or shapes them, and how",
  "lateralEdge":    "a surprising, non-obvious connection in their web",
  "type":           "a four-letter MBTI-style type their voice and behavior point to",
  "why":            "one honest paragraph justifying the type from specific things they say and do",
  "operatingMode":  "how they operate — their working mode",
  "principle":      "a core principle they build / live by",
  "growthEdge":     "their honest growth edge — where they are stretching"
}`;

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();
const nameTokens = (name: string): string[] => norm(name).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
const uniq = (xs: string[]): string[] => [...new Set(xs)];

/** Real signal ids whose text OR source attribution mentions a name token of `name`. Honest, empty-able. */
function signalsMentioning(name: string, signals: Signal[]): string[] {
  const toks = nameTokens(name);
  if (!toks.length) return [];
  return signals.filter((s) => { const hay = norm(`${s.text} ${s.source}`); return toks.some((t) => hay.includes(t)); }).map((s) => s.id);
}

/** ONE GENERATOR pass for the interpretive facets. Reuses the cards.ts grounding contract; no story regen. */
async function synthesize(input: DossierInput): Promise<Synth> {
  const { graph, story, signals } = input;
  const me = graph.people.find((p) => p.ring === 0);
  const peopleBlock = graph.people.map((p) => `- ${p.name} (ring ${p.ring}, closeness ${p.closeness.toFixed(2)})`).join("\n");
  const edgeBlock = graph.edges.map((e) => `- ${e.from} —[${e.kind}]→ ${e.to} (strength ${e.strength.toFixed(2)})`).join("\n");
  const claimBlock = story.groundedIn.map((c) => `- "${c.claim}" [${c.signalId}]`).join("\n");
  const corpus = signals.map((s) => `[${s.id}] ${s.text.replace(/\s+/g, " ").trim().slice(0, 240)}`).join("\n");

  const prompt =
    `Subject (the person this dossier is about): ${me?.name ?? "(unknown)"}\n\n` +
    `People in their orbit:\n${peopleBlock || "(none)"}\n\n` +
    `Mapped relationships:\n${edgeBlock || "(none)"}\n\n` +
    `Their story, in their own voice:\n${story.text}\n\n` +
    `Grounded claims (already lifted from the corpus, each citing a signal):\n${claimBlock || "(none)"}\n\n` +
    `SIGNAL CORPUS (cite ids from HERE only):\n${corpus}\n\n` +
    `Return the JSON object of labeled facets now. Every signalId must be one of the ids above.`;

  const t0 = Date.now();
  console.log(`[pepl:dossier] -> GENERATOR synth: signals=${signals.length} people=${graph.people.length} claims=${story.groundedIn.length}`);
  const raw = await complete({ tier: "GENERATOR", system: SYNTH_SYSTEM, prompt, json: true, temperature: 0.4, maxTokens: 2000 });
  // Strip a stray ```json fence (deterministic, not a fallback), then parse — a parse failure THROWS.
  const json = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const synth = Synth.parse(JSON.parse(json));
  console.log(`[pepl:dossier] <- synth facets=${Object.keys(synth).length}/${SYNTH_KEYS.length} (${Date.now() - t0}ms)`);
  return synth;
}

/**
 * buildDossier — map the reveal's outputs into the bento Dossier. THROWS on any unresolvable receipt
 * (mirrors generator.ts); marks honest absences as status:"failed" (red badge), never a canned value.
 */
export async function buildDossier(input: DossierInput): Promise<Dossier> {
  assertHeldOutCritic(); // per-call held-out defense; fail CLOSED before any paid call
  const t0 = Date.now();
  const { graph, story, verdict, signals, smiley, mode } = input;

  const me = graph.people.find((p) => p.ring === 0);
  if (!me) throw new Error("[pepl:dossier] no ring-0 subject in graph — refusing to build a dossier about no one");
  const others = graph.people.filter((p) => p.id !== me.id);

  const allIds = signals.map((s) => s.id);
  const idSet = new Set(allIds);

  // GROUNDING LAW: the story's own receipts must resolve too (defense in depth — generator already guards).
  const badStory = story.groundedIn.map((g) => g.signalId).filter((id) => !idSet.has(id));
  if (badStory.length) throw new Error(`[pepl:dossier] story.groundedIn cites ${badStory.length} id(s) not in corpus: ${badStory.join(", ")}`);

  // The interpretive facets carry critic:true ONLY if the reveal's held-out critic emitted (we REUSE its verdict).
  const critic = verdict.verdict === "emit";
  const synth: Synth = signals.length ? await synthesize(input) : {};
  if (!signals.length) console.warn("[pepl:dossier] 0 signals — every synthesized facet will FAIL (honest absence)");

  // Real signal ids the people/edges were surfaced from; falls back to the whole corpus (never an empty receipt).
  const peopleSignalIds = uniq(graph.people.flatMap((p) => signalsMentioning(p.name, signals)));
  const surfacedFrom = peopleSignalIds.length ? peopleSignalIds : allIds;

  // ── bit constructors ──────────────────────────────────────────────────────────────────────────
  /** A synthesized facet -> ok bit (computed,critic) on a REAL cited id; THROW on a fabricated id; FAIL if absent. */
  const synthBit = (key: SynthKey, label: string): Bit => {
    const c = synth[key];
    if (!c) return { status: "failed", label, triedSource: `GENERATOR synthesis (corpus surfaced no grounded "${key}")` };
    if (!idSet.has(c.signalId))
      throw new Error(`[pepl:dossier] FABRICATED CITATION: bit "${key}" cites signal "${c.signalId}" not in corpus (n=${idSet.size})`);
    return { status: "ok", label, value: c.value, grounding: { kind: "computed", from: [c.signalId], critic } };
  };
  /** A deterministic count/fact -> ok bit (computed,critic:false) over real ids; FAIL if it has no real receipt. */
  const countBit = (label: string, value: string, from: string[]): Bit => {
    const bad = from.filter((id) => !idSet.has(id));
    if (bad.length) throw new Error(`[pepl:dossier] bit "${label}" cites id(s) not in corpus: ${bad.join(", ")}`);
    return { status: "ok", label, value, grounding: { kind: "computed", from, critic: false } };
  };

  // ── Identity (smiley · name · oneLiner · voiceSignature · definingFact) ──────────────────────────
  const smileyBit: Bit = smiley === null
    ? { status: "failed", label: "Your smiley", triedSource: "user-drawn smiley (Part 4 /api/card) — not drawn yet" }
    : { status: "ok", label: "Your smiley", value: smiley, grounding: { kind: "user", source: "drawn" } };
  const nameMentions = signalsMentioning(me.name, signals);
  const nameBit: Bit = nameMentions.length
    ? countBit("Name", me.name, nameMentions)
    : { status: "failed", label: "Name", triedSource: `graph ring-0 vs signals (no signal evidences "${me.name}")` };
  const identity: DossierCard = {
    kind: "identity",
    title: "Identity",
    bits: [smileyBit, nameBit, synthBit("oneLiner", "One-liner"), synthBit("voiceSignature", "Voice signature"), synthBit("definingFact", "Defining fact")],
  };

  // ── Story (arc · throughline · origin · drivingBelief · receipts) ────────────────────────────────
  const receiptsBit: Bit = story.groundedIn.length
    ? {
        status: "ok",
        label: "Receipts",
        value: { groundedClaims: story.groundedIn.length, grounding: verdict.axes.grounding, voice: verdict.axes.voice, verdict: verdict.verdict },
        grounding: { kind: "computed", from: uniq(story.groundedIn.map((g) => g.signalId)), critic },
      }
    : { status: "failed", label: "Receipts", triedSource: "story.groundedIn (no surviving grounded claim)" };
  const storyCard: DossierCard = {
    kind: "story",
    title: "Story",
    bits: [synthBit("arc", "Arc"), synthBit("throughline", "Throughline"), synthBit("origin", "Origin"), synthBit("drivingBelief", "Driving belief"), receiptsBit],
  };

  // ── Stats (peopleSurfaced · closestPerson · claimsCut · signalsRead · mappedRelationships) ────────
  const closest = [...others].sort((a, b) => b.closeness - a.closeness)[0];
  const closestBit: Bit = closest
    ? (signalsMentioning(closest.name, signals).length
        ? countBit("Closest person", closest.name, signalsMentioning(closest.name, signals))
        : { status: "failed", label: "Closest person", triedSource: `graph (no signal evidences "${closest.name}")` })
    : { status: "failed", label: "Closest person", triedSource: "graph (no one but the subject surfaced)" };
  const stats: DossierCard = {
    kind: "stats",
    title: "Stats",
    bits: [
      countBit("People surfaced", String(others.length), surfacedFrom),
      closestBit,
      // claimsCut: HONEST ABSENCE — a cut claim has no surviving signal, so computed.from is legitimately [].
      { status: "ok", label: "Claims cut", value: String(verdict.fabricatedClaims.length), grounding: { kind: "computed", from: [], critic: false } },
      countBit("Signals read", String(signals.length), allIds),
      countBit("Mapped relationships", String(graph.edges.length), surfacedFrom),
    ],
  };

  // ── People / Graph (innerCircle · mentor · icp · theGraph · lateralEdge) ─────────────────────────
  const ring1 = others.filter((p) => p.ring === 1);
  const inner = ring1.length ? ring1 : [...others].sort((a, b) => b.closeness - a.closeness).slice(0, 3);
  const innerIds = uniq(inner.flatMap((p) => signalsMentioning(p.name, signals)));
  const innerBit: Bit = inner.length && innerIds.length
    ? countBit("Inner circle", inner.map((p) => p.name).join(", "), innerIds)
    : { status: "failed", label: "Inner circle", triedSource: "graph (no inner-ring people evidenced in signals)" };
  const peopleCard: DossierCard = {
    kind: "people",
    title: "People",
    bits: [
      innerBit,
      synthBit("mentor", "Mentor"),
      synthBit("icp", "Ideal person (ICP)"),
      // theGraph rides along as a structured bit value — the whole relationship web.
      { status: "ok", label: "The graph", value: graph as unknown as Record<string, unknown>, grounding: { kind: "computed", from: surfacedFrom, critic: false } },
      synthBit("lateralEdge", "Lateral edge"),
    ],
  };

  // ── Personality (type · why · operatingMode · principle · growthEdge) ────────────────────────────
  const personality: DossierCard = {
    kind: "personality",
    title: "Personality",
    bits: [synthBit("type", "Type"), synthBit("why", "Why"), synthBit("operatingMode", "Operating mode"), synthBit("principle", "Principle"), synthBit("growthEdge", "Growth edge")],
  };

  const cards = [identity, storyCard, stats, peopleCard, personality];
  const dossier = Dossier.parse({
    cards,
    smiley,
    proof: { peopleSurfaced: others.length, claimsCut: verdict.fabricatedClaims.length },
    mode,
  });

  // ── seam log (counts + latency); WARN with the failed bits so a silent gap is greppable. ──
  const allBits = cards.flatMap((c) => c.bits);
  const failed = allBits.filter((b) => b.status === "failed");
  console.log(
    `[pepl:dossier] cards=${cards.length} bits=${allBits.length} failed=${failed.length} mode=${mode} ` +
      `(critic=${critic} smiley=${smiley === null ? "null" : "drawn"}, ${Date.now() - t0}ms)`,
  );
  if (failed.length) console.warn(`[pepl:dossier] ${failed.length} FAILED bit(s): ${failed.map((b) => `${b.label}<-${(b as { triedSource: string }).triedSource}`).join(" | ")}`);
  return dossier;
}

// ── Live-check (direct run): STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/agents/dossier.ts ──
// Builds a Dossier from the persisted "demo-cache" dossier (loadDossier outputs) and prints cards/bits/failed.
if (process.argv[1] && process.argv[1].endsWith("dossier.ts")) {
  const { loadDossier } = await import("../memory/store");
  const userId = process.argv[2] ?? "demo-cache";
  const d = await loadDossier(userId);
  if (!d) throw new Error(`[pepl:dossier] no persisted dossier for "${userId}" — run the cache pipeline first`);
  if (!d.story || !d.verdict) throw new Error(`[pepl:dossier] "${userId}" has no story/verdict (story=${!!d.story} verdict=${!!d.verdict})`);
  // smiley not in the dossier store (Part 4 persists it separately) — null here exercises the FAILED smiley bit.
  const dossier = await buildDossier({ graph: d.graph, story: d.story, verdict: d.verdict, signals: d.signals, smiley: null, mode: "cached" });
  console.log("\n===== DOSSIER (" + userId + ") =====");
  for (const c of dossier.cards) {
    console.log(`\n## ${c.title} (${c.kind}) — ${c.bits.length} bits`);
    for (const b of c.bits) {
      if (b.status === "ok") {
        const v = typeof b.value === "string" ? b.value.slice(0, 90) : JSON.stringify(b.value).slice(0, 90);
        const g = b.grounding.kind === "computed" ? `computed[from=${b.grounding.from.length},critic=${b.grounding.critic}]` : b.grounding.kind === "signal" ? `signal[${b.grounding.signalId}]` : `user[${b.grounding.source}]`;
        console.log(`  OK     · ${b.label}: ${v}  <${g}>`);
      } else {
        console.log(`  FAILED · ${b.label}: ${b.triedSource}`);
      }
    }
  }
  const allBits = dossier.cards.flatMap((c) => c.bits);
  const failed = allBits.filter((b) => b.status === "failed").length;
  console.log(`\n===== SUMMARY: cards=${dossier.cards.length} bits=${allBits.length} failed=${failed} mode=${dossier.mode} proof=${JSON.stringify(dossier.proof)} =====`);
  process.exit(0);
}
