// orchestrator/run.ts — drives the node sequence end to end with the ≤2-retry regen loop.
//   ingest -> extract -> graph -> [correct?] -> generate -> critic ──emit──> cards -> cards_ready
//                                                              │regen
//                                            regenerate (force-cut flagged claims) ←─┘  (max 2, then THROW)
// Every stage emits node_start/node_done(ms); on any throw it emits a `failed` WsEvent THEN rethrows
// (fail LOUD, never a canned value). If grounding still fails after 2 retries we refuse to ship.
import { z } from "zod";
import { ingestNode } from "../ingest/ingest";
import { extractNode, graphNode, correctGraph, mergeGraphInputs } from "../ingest/graph";
import { answersToSignals } from "../ingest/signalize";
import { generateNode } from "../agents/generator";
import { criticNode } from "../agents/critic";
import { cardsNode } from "../agents/cards";
import { buildDossier } from "../agents/dossier";
import { saveDossier, loadCard } from "../memory/store";
import { broadcast } from "../web/server";
import {
  OnboardingAnswers,
  CardSeed,
  type Signal,
  type RelationshipGraph,
  type Story,
  type CriticVerdict,
  type Card,
  type Dossier,
  type Mode,
  type WsEvent,
} from "../types";

export const MAX_RETRIES = 2; // ≤2 regen retries, then fail-CLOSED (docs/CONTRACTS.md)

/** System mode, honest in EVERY payload: a cache-corpus run is "cached", a live scrape is "live". */
export const currentMode = (): Mode => (process.env.COMPOSIO_MODE === "cache" ? "cached" : "live");

export const Correction = z.object({
  personId: z.string(),
  field: z.string(),
  value: z.unknown().optional(),
});
export type Correction = z.infer<typeof Correction>;

export const RunInput = z.object({
  source: z.string(),
  answers: OnboardingAnswers.optional(),
  kind: z.enum(["bio", "story"]),
  correction: Correction.optional(),
});
export type RunInput = z.infer<typeof RunInput>;

export interface PipelineResult {
  graph: RelationshipGraph;
  story: Story;
  verdict: CriticVerdict;
  cards: Card[];
  dossier: Dossier | null; // null ONLY on the stub CI path (no LLM) — an honest absence, never a fake
}

/** Who the dossier is for + about. Present => the finished dossier is written through to InsForge. */
export interface RunContext {
  userId: string;
  owner: { name: string; email: string };
}

/**
 * The grounding regen loop, lifted out of runPipeline so its fail-CLOSED contract is unit-testable
 * without a live 3× regen: while the judge says "regen", recut the flagged claims, regenerate, and
 * re-judge. After `maxRetries` regens we refuse to ship — emit `failed` THEN throw (never a canned value).
 */
export async function regenToGrounded(
  initial: { story: Story; verdict: CriticVerdict },
  regenerate: () => Promise<Story>,
  judge: (story: Story) => Promise<CriticVerdict>,
  onEvent: (e: WsEvent) => void,
  maxRetries = MAX_RETRIES,
): Promise<{ story: Story; verdict: CriticVerdict }> {
  let { story, verdict } = initial;
  for (let retry = 0; verdict.verdict === "regen"; retry += 1) {
    if (retry >= maxRetries) {
      const error = `grounding failed after ${retry + 1} generations (fail-CLOSED, refusing to ship): ${verdict.failReason ?? "ungrounded claims remain"}`;
      onEvent({ type: "failed", node: "critic", error });
      throw new Error(`[pepl:run] ${error}`);
    }
    const cut = new Set(verdict.fabricatedClaims);
    console.log(
      `[pepl:run] regen ${retry + 1}/${maxRetries} -> recut ${cut.size} flagged claim(s): ${verdict.failReason ?? ""}`,
    );
    const draft = await regenerate();
    // force-cut any flagged claim the new draft still carries — never ship one the judge rejected.
    story = { ...draft, groundedIn: draft.groundedIn.filter((g) => !cut.has(g.claim)) };
    verdict = await judge(story);
  }
  return { story, verdict };
}

// Wrap a stage: node_start -> run -> node_done(ms). On throw, emit `failed` THEN rethrow — never swallow.
async function step<T>(onEvent: (e: WsEvent) => void, node: string, fn: () => Promise<T>): Promise<T> {
  onEvent({ type: "node_start", node });
  const tn = Date.now();
  try {
    const out = await fn();
    onEvent({ type: "node_done", node, ms: Date.now() - tn });
    return out;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    onEvent({ type: "failed", node, error });
    throw err;
  }
}

/** What a reveal needs from the preceding ingest, plus the user's beat-2/beat-3 inputs. */
export interface RevealInput {
  graph: RelationshipGraph;
  signals: Signal[];
  kind: "bio" | "story";
  answers?: z.infer<typeof OnboardingAnswers>;
  cardSeed?: z.infer<typeof CardSeed>;
}

/**
 * BEAT 1 — ingest -> extract -> graph. Streams scrape_progress + node_start/node_done, returns the
 * reconstructed graph and the raw signal corpus so the reveal can ground in them. No story yet.
 */
export async function runIngest(
  input: RunInput,
  ctx?: RunContext,
  onEvent: (e: WsEvent) => void = broadcast,
): Promise<{ graph: RelationshipGraph; signals: Signal[] }> {
  const t0 = Date.now();
  console.log(`[pepl:run] ingest start source="${input.source}" user=${ctx?.userId ?? "(ephemeral)"}`);

  const { signals, people: radialPeople, edges: radialEdges } = await step(onEvent, "ingest", async () => {
    onEvent({ type: "scrape_progress", pct: 33, etaSec: 2 });
    onEvent({ type: "scrape_progress", pct: 80, etaSec: 1 });
    return ingestNode({ source: input.source, userId: ctx?.userId, answers: input.answers });
  });

  const lateral = await step(onEvent, "extract", () => extractNode({ signals }));
  const merged = mergeGraphInputs({ people: radialPeople, edges: radialEdges }, lateral);
  const graph = await step(onEvent, "graph", () => graphNode(merged));

  console.log(
    `[pepl:run] ingest done people=${graph.people.length} edges=${graph.edges.length} signals=${signals.length} (${Date.now() - t0}ms)`,
  );
  return { graph, signals };
}

/**
 * BEAT 4 — generate -> critic (≤2-retry regen loop) -> cards -> saveDossier. Grounds the story in the
 * corpus from runIngest; if the user answered onboarding, those answers fold in as the PRIMARY grounding.
 */
export async function runReveal(
  args: RevealInput,
  ctx?: RunContext,
  onEvent: (e: WsEvent) => void = broadcast,
): Promise<{ story: Story; verdict: CriticVerdict; cards: Card[]; dossier: Dossier | null }> {
  const t0 = Date.now();
  const { graph, kind, answers, cardSeed } = args;

  // ANSWERS-AS-CORE-GROUNDING: fold the onboarding answers into the corpus as citable signals
  // (source:"onboarding") so the story grounds in HOW THE USER ANSWERED first, then in Gmail/footprint.
  // Dedupe by id so the full-pipeline path (ingest already added them) never doubles them.
  const have = new Set(args.signals.map((s) => s.id));
  const onboarding = answers ? answersToSignals(answers).filter((s) => !have.has(s.id)) : [];
  const signals = onboarding.length ? [...args.signals, ...onboarding] : args.signals;
  if (onboarding.length)
    console.log(`[pepl:run] reveal +${onboarding.length} onboarding signal(s) as primary grounding`);

  const initialStory = await step(onEvent, "generate", () => generateNode({ graph, signals, answers, kind }));
  const initialVerdict = await step(onEvent, "critic", () => criticNode({ output: initialStory, signals }));

  const { story, verdict } = await regenToGrounded(
    { story: initialStory, verdict: initialVerdict },
    () => step(onEvent, "generate", () => generateNode({ graph, signals, answers, kind })),
    (draft) => step(onEvent, "critic", () => criticNode({ output: draft, signals })),
    onEvent,
  );

  const { cards } = await step(onEvent, "cards", () => cardsNode({ graph, story, cardSeed }));
  onEvent({ type: "cards_ready", cards });

  // Write-through: persist the finished dossier to InsForge (REPLACE per user_id). Fails LOUD.
  if (ctx) await saveDossier(ctx.userId, ctx.owner, { signals, graph, story, verdict, cards, kind });

  // FINAL BOUNDARY — reshape the grounded outputs into the bento Dossier (the hero reveal payload). The
  // drawn smiley lives in its own table (saved pre-scrape via /api/card); null until drawn -> the Identity
  // smiley bit degrades to status:"failed" (honest absence), never an empty-string default. buildDossier
  // THROWS on any unresolvable receipt, so `step` emits failed{node:"dossier"} then rethrows — fail LOUD.
  // The Dossier is a live-LLM boundary (synthesizes facets + asserts the held-out critic): on the stub CI
  // path (no LLM) it is an honest null (logged), never a faked value; on the live path it always builds.
  let dossier: Dossier | null = null;
  if (process.env.STUB_MODE === "0") {
    const smiley = ctx ? (await loadCard(ctx.userId))?.smiley ?? null : null;
    dossier = await step(onEvent, "dossier", () =>
      buildDossier({ graph, story, verdict, signals, smiley, mode: currentMode() }),
    );
  } else {
    console.log("[pepl:run] dossier skipped (STUB_MODE != 0 — the bento Dossier is a live-LLM boundary)");
  }

  console.log(`[pepl:run] reveal done cards=${cards.length} verdict=${verdict.verdict} (${Date.now() - t0}ms)`);
  return { story, verdict, cards, dossier };
}

/** Full pipeline: runIngest THEN runReveal (correction applied between the two, as in the demo flow). */
export async function runPipeline(
  input: RunInput,
  onEvent: (e: WsEvent) => void = broadcast,
  ctx?: RunContext,
): Promise<PipelineResult> {
  const t0 = Date.now();
  console.log(
    `[pepl:run] start source="${input.source}" kind=${input.kind}${input.correction ? " +correction" : ""}`,
  );

  const ingested = await runIngest(input, ctx, onEvent);
  const { signals } = ingested;
  let graph = ingested.graph;
  if (input.correction) {
    graph = correctGraph(graph, input.correction);
    console.log(`[pepl:run] correction applied seededWrong=${graph.seededWrong.length}`);
  }

  const { story, verdict, cards, dossier } = await runReveal(
    { graph, signals, answers: input.answers, kind: input.kind },
    ctx,
    onEvent,
  );

  console.log(`[pepl:run] done cards=${cards.length} verdict=${verdict.verdict} (${Date.now() - t0}ms)`);
  return { graph, story, verdict, cards, dossier };
}
