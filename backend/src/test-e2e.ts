// test-e2e.ts — the S2 grounding gate. STUB_MODE=0 runs the WHOLE pipeline LIVE on the real
// corpus (backend/data/precached-signals.json); STUB_MODE=1 is the CI fast path on stubs (no LLM,
// no spend). It asserts and PRINTS PASS/FAIL per check:
//   1. GRAPH FROM REAL DATA — MODE-AWARE: cache=gx-corpus shape (Johnny+Sarah+Teri, seededWrong empty);
//      live=zero hardcoded names + seededWrong empty; stub=canned corpus + seeded correction.
//   2. STORY GROUNDED — groundedIn non-empty and every signalId resolves to a real corpus id.
//   3. HELD-OUT CRITIC EMITS — verdict=emit, fabricatedClaims empty, axes ≥0.7, critic family ≠ generator family.
//   4. NEGATIVE CONTROL — inject a fabricated sentence, re-judge LIVE, assert verdict=regen and the flag is caught.
//   5. FAIL-CLOSED — the real regen loop throws (never emits) after MAX_RETRIES regens.
//   6. DOSSIER — the final boundary builds: 5 cards, 0 failed (smiley drawn), every ok-bit grounded, proof present (LIVE).
//   7. MAP LINK — Knot grounds a TWO-SIDED link (each side cites a real signal) OR returns null honestly (LIVE).
// Plus a sanity check that the five cards ship and the WS tape is complete (the visible demo output).
//   CACHE: STUB_MODE=0 COMPOSIO_MODE=cache LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts
//   LIVE:  STUB_MODE=0 COMPOSIO_MODE=live  LLM_PROVIDER=openrouter npx tsx --env-file=.env src/test-e2e.ts
//   CI:    STUB_MODE=1 npx tsx src/test-e2e.ts
import { runPipeline, regenToGrounded, MAX_RETRIES, currentMode } from "./orchestrator/run";
import { ingestNode } from "./ingest/ingest";
import { criticNode } from "./agents/critic";
import { buildDossier } from "./agents/dossier";
import { runConnector } from "./agents/connector";
import { loadDossier } from "./memory/store";
import { MODELS, modelFamily } from "./llm/client";
import type { CriticVerdict, Signal, Story, WsEvent } from "./types";

const LIVE = process.env.STUB_MODE === "0"; // STUB_MODE=0 -> real LLM (cache corpus OR a live scrape)
// CHECK-1 mode awareness: under STUB_MODE=0 the run is either the recorded gx corpus (COMPOSIO_MODE=cache)
// or a real Gmail scrape (COMPOSIO_MODE=live). Each has a different, honest graph shape to assert.
const CACHE = LIVE && (process.env.COMPOSIO_MODE ?? "live") === "cache";
const LIVE_SCRAPE = LIVE && (process.env.COMPOSIO_MODE ?? "live") === "live";

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
  // runReveal now builds + exposes the bento Dossier (the final boundary); pipelineDossier is null only on stub.
  const { graph, story, verdict, cards, dossier: pipelineDossier } = await runPipeline(
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

  // CHECK 1 — GRAPH FROM REAL DATA (MODE-AWARE). Three honest shapes:
  //   • CACHE (gx corpus): ≥4 people, ring-0 Johnny + Sarah + Teri, every person traceable, seededWrong EMPTY (v3 live graph has no correction beat).
  //   • LIVE_SCRAPE (real Gmail): ≥4 people, a real ring-0 subject, ZERO hardcoded names, every person traceable, seededWrong EMPTY.
  //   • STUB (CI): the canned corpus — ≥3 people, ring-0 subject + Sarah + Teri, the stub seeds seededWrong (the correction beat).
  const subject = graph.people.find((p) => p.ring === 0);
  const hasName = (n: string): boolean => graph.people.some((p) => norm(p.name).includes(n));
  const untraceable = graph.people.filter((p) => !traceable(p.name, signals)).map((p) => p.name);
  const detail1 = `mode=${CACHE ? "cache" : LIVE_SCRAPE ? "live-scrape" : "stub"} people=${graph.people.length} subject=${subject?.name ?? "none"} sarah=${hasName("sarah")} teri=${hasName("teri")} untraceable=[${untraceable.join(",") || "none"}] seededWrong=${graph.seededWrong.length}`;
  if (CACHE) {
    check(
      "1· GRAPH (cache gx corpus): ≥4 people, ring-0 Johnny + Sarah + Teri, every person traceable, seededWrong EMPTY",
      graph.people.length >= 4 &&
        !!subject && norm(subject.name).includes("johnny") &&
        hasName("sarah") && hasName("teri") &&
        untraceable.length === 0 &&
        graph.seededWrong.length === 0,
      detail1,
    );
  } else if (LIVE_SCRAPE) {
    check(
      "1· GRAPH (live scrape): ≥4 people, a ring-0 subject, ZERO hardcoded names, every person traceable, seededWrong EMPTY",
      graph.people.length >= 4 &&
        !!subject &&
        untraceable.length === 0 &&
        graph.seededWrong.length === 0,
      detail1,
    );
  } else {
    // STUB: the synthetic "You" subject isn't in the corpus, so trace only the non-subject people the stub draws.
    const traceOk = untraceable.filter((n) => norm(n) !== norm(subject?.name ?? "")).length === 0;
    check(
      "1· GRAPH (stub corpus): ≥3 people, ring-0 subject + Sarah + Teri, every (non-subject) person traceable, seededWrong seeded",
      graph.people.length >= 3 &&
        !!subject &&
        hasName("sarah") && hasName("teri") &&
        traceOk &&
        graph.seededWrong.length > 0,
      detail1,
    );
  }

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

  // CHECK 6 — DOSSIER (the final boundary). The reveal's already-grounded outputs reshape into the bento
  // Dossier. Build with a drawn-smiley fixture so the one human bit grounds too, then assert: 5 cards, 0
  // FAILED bits on the cache corpus, EVERY ok-bit's receipt resolves to a REAL corpus signal id (the
  // grounding law — never weakened), proof present, AND runReveal exposed the same dossier (wiring).
  // (LIVE only — synthesizing the facets + asserting the held-out critic need the LLM.)
  if (LIVE) {
    const SMILEY_FIXTURE = "data:image/svg+xml;demo-drawn-smiley"; // stands in for the Part-4 /api/card draw
    const dossier = await buildDossier({ graph, story, verdict, signals, smiley: SMILEY_FIXTURE, mode: currentMode() });
    const allBits = dossier.cards.flatMap((c) => c.bits);
    const failedBits = allBits.filter((b) => b.status === "failed").map((b) => b.label);
    // GROUNDING LAW: every ok bit's computed/signal receipt must resolve to a real corpus id (user-grounding has none).
    const ungrounded = allBits.flatMap((b) => {
      if (b.status !== "ok") return [];
      if (b.grounding.kind === "signal") return idSet.has(b.grounding.signalId) ? [] : [`${b.label}:${b.grounding.signalId}`];
      if (b.grounding.kind === "computed") return b.grounding.from.filter((id) => !idSet.has(id)).map((id) => `${b.label}:${id}`);
      return [];
    });
    const proofOk = Number.isFinite(dossier.proof.peopleSurfaced) && Number.isFinite(dossier.proof.claimsCut);
    const wired = !!pipelineDossier && pipelineDossier.cards.length === 5; // runReveal built + exposed it
    check(
      "6· DOSSIER: final boundary builds — 5 cards, 0 failed (smiley drawn), every ok-bit grounded, proof present, wired into runReveal",
      dossier.cards.length === 5 && failedBits.length === 0 && ungrounded.length === 0 && proofOk && wired,
      `cards=${dossier.cards.length} bits=${allBits.length} failed=[${failedBits.join(",") || "none"}] ungrounded=[${ungrounded.join(",") || "none"}] proof=${JSON.stringify(dossier.proof)} wired=${wired}`,
    );

    // CHECK 7 — MAP LINK (Knot). Two persisted nodes -> a TWO-SIDED grounded story (each side cites a real
    // signal of THAT person), or link:null honestly on no real overlap (never a canned rhyme). Asserts the
    // grounding from BOTH sides against the two real signal-id sets.
    const A_ID = "johnny";
    const B_ID = "f2fe6fce-8c8f-40c2-b4ad-08f3275adbae"; // Teri (persisted, live)
    const [da, db] = await Promise.all([loadDossier(A_ID), loadDossier(B_ID)]);
    let linkPass = false;
    let linkDetail: string;
    if (!da || !db) {
      linkDetail = `cannot prove a link — missing persisted dossier (${A_ID}=${!!da} ${B_ID}=${!!db})`;
    } else {
      const idsA = new Set(da.signals.map((s) => s.id));
      const idsB = new Set(db.signals.map((s) => s.id));
      const res = await runConnector(A_ID, B_ID);
      if (res.link === null) {
        linkPass = res.similarities.length === 0; // honest absence
        linkDetail = `link:null (honest absence) similarities=${res.similarities.length} mode=${res.mode}`;
      } else {
        const twoSided =
          res.similarities.length > 0 &&
          res.similarities.every((s) => idsA.has(s.aSignalId) && idsB.has(s.bSignalId));
        linkPass = twoSided && res.link.text.trim().length > 0;
        linkDetail = `linked text=${res.link.text.length}c similarities=${res.similarities.length} twoSided=${twoSided} mode=${res.mode}`;
      }
    }
    check(
      "7· MAP LINK: Knot grounds a TWO-SIDED link (each side cites a real signal) OR returns null honestly",
      linkPass,
      linkDetail,
    );
  }

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
