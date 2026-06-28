// orchestrator/run.ts — drives the node sequence end to end with the ≤2-retry regen loop.
//   ingest -> extract -> graph -> [correct?] -> generate -> critic ──emit──> cards -> cards_ready
//                                                              │regen
//                                            regenerate (force-cut flagged claims) ←─┘  (max 2, then THROW)
// Every stage emits node_start/node_done(ms); on any throw it emits a `failed` WsEvent THEN rethrows
// (fail LOUD, never a canned value). If grounding still fails after 2 retries we refuse to ship.
import { z } from "zod";
import { ingestNode } from "../ingest/ingest";
import { extractNode, graphNode, correctGraph, mergeGraphInputs } from "../ingest/graph";
import { generateNode } from "../agents/generator";
import { criticNode } from "../agents/critic";
import { cardsNode } from "../agents/cards";
import { broadcast } from "../web/server";
import {
  OnboardingAnswers,
  type RelationshipGraph,
  type Story,
  type CriticVerdict,
  type Card,
  type WsEvent,
} from "../types";

export const MAX_RETRIES = 2; // ≤2 regen retries, then fail-CLOSED (docs/CONTRACTS.md)

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

export async function runPipeline(
  input: RunInput,
  onEvent: (e: WsEvent) => void = broadcast,
): Promise<PipelineResult> {
  const t0 = Date.now();
  console.log(
    `[pepl:run] start source="${input.source}" kind=${input.kind}${input.correction ? " +correction" : ""}`,
  );

  // Wrap a stage: node_start -> run -> node_done(ms). On throw, emit `failed` THEN rethrow — never swallow.
  async function step<T>(node: string, fn: () => Promise<T>): Promise<T> {
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

  const { signals, people: radialPeople, edges: radialEdges } = await step("ingest", async () => {
    onEvent({ type: "scrape_progress", pct: 33, etaSec: 2 });
    onEvent({ type: "scrape_progress", pct: 80, etaSec: 1 });
    return ingestNode({ source: input.source, answers: input.answers });
  });

  const lateral = await step("extract", () => extractNode({ signals }));
  const merged = mergeGraphInputs({ people: radialPeople, edges: radialEdges }, lateral);
  let graph = await step("graph", () => graphNode(merged));

  if (input.correction) {
    graph = correctGraph(graph, input.correction);
    console.log(`[pepl:run] correction applied seededWrong=${graph.seededWrong.length}`);
  }

  const initialStory = await step("generate", () =>
    generateNode({ graph, signals, answers: input.answers, kind: input.kind }),
  );
  const initialVerdict = await step("critic", () => criticNode({ output: initialStory, signals }));

  const { story, verdict } = await regenToGrounded(
    { story: initialStory, verdict: initialVerdict },
    () => step("generate", () => generateNode({ graph, signals, answers: input.answers, kind: input.kind })),
    (draft) => step("critic", () => criticNode({ output: draft, signals })),
    onEvent,
  );

  const { cards } = await step("cards", () => cardsNode({ graph, story }));
  onEvent({ type: "cards_ready", cards });

  console.log(
    `[pepl:run] done cards=${cards.length} verdict=${verdict.verdict} (${Date.now() - t0}ms)`,
  );
  return { graph, story, verdict, cards };
}
