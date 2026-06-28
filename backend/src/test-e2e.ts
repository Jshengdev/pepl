// test-e2e.ts — the S2 grounding gate. STUB_MODE=0 runs the WHOLE pipeline LIVE on the real
// corpus (backend/data/precached-signals.json); STUB_MODE=1 is the CI fast path on stubs (no LLM,
// no spend). It asserts and PRINTS PASS/FAIL per check:
//   1. GRAPH FROM REAL DATA — ≥4 people, ring-0 subject + Sarah + Teri, every person traceable to a
//      signal (no invented people), seededWrong non-empty.
//   2. STORY GROUNDED — groundedIn non-empty and every signalId resolves to a real corpus id.
//   3. HELD-OUT CRITIC EMITS — verdict=emit, fabricatedClaims empty, axes ≥0.7, critic family ≠ generator family.
//   4. NEGATIVE CONTROL — inject a fabricated sentence, re-judge LIVE, assert verdict=regen and the flag is caught.
//   5. FAIL-CLOSED — the real regen loop throws (never emits) after MAX_RETRIES regens.
// Plus a sanity check that the five cards ship and the WS tape is complete (the visible demo output).
//   LIVE:  STUB_MODE=0 npx tsx --env-file=.env src/test-e2e.ts
//   CI:    STUB_MODE=1 npx tsx src/test-e2e.ts
import { runPipeline, regenToGrounded, MAX_RETRIES } from "./orchestrator/run";
import { ingestNode } from "./ingest/ingest";
import { criticNode } from "./agents/critic";
import { MODELS, modelFamily } from "./llm/client";
import type { CriticVerdict, Signal, Story, WsEvent } from "./types";

const LIVE = process.env.STUB_MODE === "0";

const events: WsEvent[] = [];
const onEvent = (e: WsEvent): void => {
  events.push(e);
};

const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail: string): void {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? "PASS" : "FAIL"} · ${name} — ${detail}`);
}

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

/** A person is traceable when a name token (≥3 chars) shows up verbatim in the corpus the extractor saw
 *  — text AND source attribution (e.g. Shawn is named only in his signals' source). No invented people. */
function traceable(name: string, signals: Signal[]): boolean {
  const tokens = norm(name).split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  const corpus = norm(signals.map((s) => `${s.text} ${s.source}`).join(" || "));
  return tokens.some((t) => corpus.includes(t));
}

async function main(): Promise<void> {
  console.log(
    `════════ pepl S2 gate · full pipeline ${LIVE ? "LIVE on the real corpus" : "on stubs (CI fast path)"} ════════\n`,
  );

  // ── CHECK 5 first: pure unit-check of the REAL regen loop (no LLM, no spend). A judge that always
  // says "regen" must drive regenToGrounded to THROW after exactly MAX_RETRIES regens — never emit. ──
  const forcedRegen: CriticVerdict = {
    verdict: "regen",
    axes: { grounding: 0, voice: 1 },
    fabricatedClaims: ["forced fabrication for the fail-closed unit-check"],
    failReason: "forced regen (fail-closed unit-check)",
  };
  const dummyStory: Story = { text: "draft", groundedIn: [] };
  let regenCalls = 0;
  let failClosedThrew = false;
  let failClosedEmitted = false;
  try {
    await regenToGrounded(
      { story: dummyStory, verdict: forcedRegen },
      async () => {
        regenCalls += 1;
        return dummyStory;
      },
      async () => forcedRegen, // judge never relents
      () => {},
    );
    failClosedEmitted = true; // returning without throwing == it shipped an ungrounded story
  } catch {
    failClosedThrew = true;
  }
  check(
    "5· FAIL-CLOSED: regen loop THROWS (never emits) after MAX_RETRIES regens",
    failClosedThrew && !failClosedEmitted && regenCalls === MAX_RETRIES,
    `threw=${failClosedThrew} emitted=${failClosedEmitted} regenAttempts=${regenCalls} maxRetries=${MAX_RETRIES}`,
  );

  // Ingest separately to hold the real signal-id set the grounding checks resolve against.
  const { signals } = await ingestNode({ source: LIVE ? "precached-signals" : "stub" });
  const idSet = new Set(signals.map((s) => s.id));

  // ── Run the WHOLE pipeline (live executors when STUB_MODE=0). Any failure propagates & fails the gate. ──
  const { graph, story, verdict, cards } = await runPipeline(
    { source: LIVE ? "precached-signals" : "stub", kind: "story" },
    onEvent,
  );

  // ── PASTE the real artifacts for the record. ──
  const peopleAndRings = graph.people
    .map((p) => `  ${p.name} (id=${p.id}, ring ${p.ring}, closeness ${p.closeness.toFixed(2)})`)
    .join("\n");
  console.log("\n── people + rings (rediscovered from the signals) ──\n" + peopleAndRings);
  console.log(`  seededWrong = ${JSON.stringify(graph.seededWrong)}`);
  console.log("\n── generated story (the subject reading their own life back) ──\n" + story.text);
  console.log(
    `\n── critic verdict ──\n  verdict=${verdict.verdict} grounding=${verdict.axes.grounding} voice=${verdict.axes.voice} fabricated=${JSON.stringify(verdict.fabricatedClaims)} failReason=${verdict.failReason ?? "null"}`,
  );

  console.log("\n── checks ──");

  // CHECK 1 — GRAPH FROM REAL DATA.
  const subject = graph.people.find((p) => p.ring === 0);
  const hasName = (n: string): boolean => graph.people.some((p) => norm(p.name).includes(n));
  const untraceable = graph.people.filter((p) => !traceable(p.name, signals)).map((p) => p.name);
  const minPeople = LIVE ? 4 : 3;
  const subjectOk = LIVE ? !!subject && norm(subject.name).includes("johnny") : !!subject;
  // In LIVE every person (subject included) is grounded in a signal; the stub's synthetic "You" isn't, so
  // STUB checks traceability only for the non-subject people the stub does draw from its corpus.
  const traceOk = LIVE ? untraceable.length === 0 : untraceable.filter((n) => norm(n) !== norm(subject?.name ?? "")).length === 0;
  check(
    "1· GRAPH FROM REAL DATA: ≥4 people, ring-0 subject + Sarah + Teri, every person traceable, seededWrong non-empty",
    graph.people.length >= minPeople &&
      subjectOk &&
      hasName("sarah") &&
      hasName("teri") &&
      traceOk &&
      graph.seededWrong.length > 0,
    `people=${graph.people.length} subject=${subject?.name ?? "none"} sarah=${hasName("sarah")} teri=${hasName("teri")} untraceable=[${untraceable.join(",") || "none"}] seededWrong=${graph.seededWrong.length}`,
  );

  // CHECK 2 — STORY GROUNDED.
  const unresolved = story.groundedIn.filter((g) => !idSet.has(g.signalId)).map((g) => g.signalId);
  check(
    "2· STORY GROUNDED: groundedIn non-empty AND every signalId resolves to a real corpus signal",
    story.groundedIn.length > 0 && unresolved.length === 0,
    `claims=${story.groundedIn.length} unresolved=[${unresolved.join(",") || "none"}]`,
  );

  // CHECK 3 — HELD-OUT CRITIC EMITS + held-out family. Provider defaults to the live target (openrouter)
  // when LLM_PROVIDER is unset (CI), and reflects the real env on the live run.
  const provider = process.env.LLM_PROVIDER ?? "openrouter";
  const genFam = modelFamily(MODELS[provider]?.GENERATOR ?? "");
  const critFam = modelFamily(MODELS[provider]?.CRITIC ?? "");
  const heldOut = !!genFam && !!critFam && genFam !== critFam;
  check(
    "3· HELD-OUT CRITIC EMITS: verdict=emit, fabricatedClaims empty, axes ≥0.7, critic family ≠ generator family",
    verdict.verdict === "emit" &&
      verdict.fabricatedClaims.length === 0 &&
      verdict.axes.grounding >= 0.7 &&
      verdict.axes.voice >= 0.7 &&
      heldOut,
    `verdict=${verdict.verdict} fabricated=${verdict.fabricatedClaims.length} grounding=${verdict.axes.grounding} voice=${verdict.axes.voice} provider=${provider} generator=${genFam} critic=${critFam} heldOut=${heldOut}`,
  );

  // CHECK 4 — NEGATIVE CONTROL: tamper the EMITTED story with a fabricated sentence naming a
  // non-existent person, then re-judge with the SAME held-out critic. It MUST flip to regen and
  // catch the lie. (The bad signalId also trips the stub critic, so the proof holds on the CI path.)
  const INJECTED = "Johnny's sister Maria flew in from Lisbon for the housewarming.";
  const tampered: Story = {
    text: `${story.text} ${INJECTED}`,
    groundedIn: [...story.groundedIn, { claim: INJECTED, signalId: "sig-fabricated-does-not-exist" }],
  };
  const tamperedVerdict = await criticNode({ output: tampered, signals });
  const caught =
    tamperedVerdict.verdict === "regen" && tamperedVerdict.fabricatedClaims.some((c) => /maria/i.test(c));
  console.log(
    `  negative-control re-judge -> verdict=${tamperedVerdict.verdict} fabricated=${JSON.stringify(tamperedVerdict.fabricatedClaims)}`,
  );
  check(
    "4· NEGATIVE CONTROL: injected fabrication forces verdict=regen AND lands in fabricatedClaims",
    caught,
    `verdict=${tamperedVerdict.verdict} caughtMaria=${tamperedVerdict.fabricatedClaims.some((c) => /maria/i.test(c))}`,
  );

  // SANITY — the demo path's visible output: five cards ship (incl. the graph card embedding the graph)
  // and the WS tape has a node_start/node_done pair per stage plus cards_ready.
  const graphCard = cards.find((c) => c.kind === "graph");
  const embedsGraph =
    !!graphCard && graphCard.kind === "graph" && JSON.stringify(graphCard.graph) === JSON.stringify(graph);
  const stages = ["ingest", "extract", "graph", "generate", "critic", "cards"];
  const missingPairs = stages.filter(
    (s) =>
      !events.some((e) => e.type === "node_start" && e.node === s) ||
      !events.some((e) => e.type === "node_done" && e.node === s),
  );
  const cardsReady = events.some((e) => e.type === "cards_ready");
  check(
    "+· DEMO OUTPUT: ≥5 cards (graph card embeds the graph) AND WS tape complete (pairs + cards_ready)",
    cards.length >= 5 && embedsGraph && missingPairs.length === 0 && cardsReady,
    `cards=${cards.length} kinds=[${cards.map((c) => c.kind).join(",")}] embedsGraph=${embedsGraph} missingPairs=[${missingPairs.join(",") || "none"}] cards_ready=${cardsReady}`,
  );

  const failed = results.filter((r) => !r.pass);
  if (failed.length === 0) {
    console.log(
      `\n✅ S2 GATE GREEN (${LIVE ? "LIVE" : "STUB"}) — ${results.length}/${results.length} checks · ${signals.length} signals → ` +
        `${graph.people.length} people → ${story.groundedIn.length} grounded claims → ${verdict.verdict} → ` +
        `${cards.length} cards · negative-control caught the lie · ${events.length} ws events`,
    );
    process.exit(0);
  }

  console.error(`\n❌ S2 GATE RED (${LIVE ? "LIVE" : "STUB"}) — ${failed.length} check(s) failed:`);
  for (const f of failed) console.error(`  ✗ ${f.name} — ${f.detail}`);
  console.error(
    "offending data:",
    JSON.stringify(
      { verdict, seededWrong: graph.seededWrong, people: graph.people.map((p) => `${p.name}:${p.ring}`) },
      null,
      2,
    ),
  );
  process.exit(1);
}

main().catch((e) => {
  console.error("E2E FAILED (threw):", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
