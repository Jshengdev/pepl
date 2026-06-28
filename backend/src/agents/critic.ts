import { defineNode } from "../nodes/defineNode";
import { Story, Signal, CriticVerdict } from "../types";
import { assertHeldOutCritic, complete } from "../llm/client";
import { z } from "zod";

const clamp01 = (n: unknown): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;

const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, " ").trim();

const CRITIC_SYSTEM = [
  "You are a HELD-OUT grounding critic — a different model family than the writer, so you never grade your own family's work.",
  "You are given OUTPUT TEXT about a person and a SIGNAL CORPUS. The signals are the ONLY ground truth; nothing outside them is sourced.",
  "PROCEDURE (systematic, not impressionistic): (1) extract EVERY factual claim from the output text — especially every named person, relationship, place, count, date, and quantity; (2) check EACH claim against the signals; (3) a claim with NO supporting signal is FABRICATED — quote it in fabricatedClaims as the EXACT substring, copied character-for-character from the output text.",
  "HARD RULE: every fabricatedClaims entry MUST appear verbatim in the OUTPUT TEXT. A phrase that is not in the output text cannot be flagged, no matter what the corpus says.",
  "TRACING IS SUBSTANCE-MATCH, NOT STRING-MATCH: a claim traces when any signal supports its content — paraphrase, rounding, reordering, or restating all count. Never flag a claim merely because its wording differs from a signal's.",
  "INTERPRETATION/FRAMING (\"likely\", \"suggests\", a reflection about the person) is NOT a factual claim — never flag it when the fact underneath traces.",
  "axes in 0..1: grounding = fraction of factual claims that trace to a signal (if fabricatedClaims is non-empty, grounding MUST be < 0.7). voice = how well the output matches the person's own register and word choice as drawn from the signals.",
  'verdict = "emit" iff fabricatedClaims is empty AND grounding >= 0.7 AND voice >= 0.7; otherwise "regen" with a one-sentence failReason naming the worst problem.',
  "Respond with JSON ONLY (no prose, no code fences):",
  '{"grounding":0.0,"voice":0.0,"verdict":"emit","failReason":null,"fabricatedClaims":[]}',
].join("\n");

export const criticNode = defineNode({
  name: "critic",
  in: z.object({ output: Story, signals: z.array(Signal) }),
  out: CriticVerdict,
  // pepl: S1 stub — S2 fills the live path (held-out LLM grounding judge).
  // Honest gate now: every grounded claim must cite a real signal id.
  stub: ({ output, signals }) => {
    const ids = new Set(signals.map((s) => s.id));
    const fabricatedClaims = output.groundedIn
      .filter((c) => !ids.has(c.signalId))
      .map((c) => c.claim);

    if (fabricatedClaims.length === 0) {
      return { verdict: "emit" as const, axes: { grounding: 1, voice: 1 }, fabricatedClaims: [], failReason: null };
    }
    return {
      verdict: "regen" as const,
      axes: { grounding: 0, voice: 1 },
      fabricatedClaims,
      failReason: `${fabricatedClaims.length} claim(s) cite signal ids not in the input: ${fabricatedClaims.join("; ")}`,
    };
  },
  // S2 live — THE TRUTH GATE. Held-out critic sees ONLY output.text + the Signal[] corpus
  // (never the generator's groundedIn reasoning or system prompt), then two deterministic,
  // loop-breaking defenses run IN CODE so a flag the LLM invents or a paraphrase it misreads
  // can never spiral the regen loop. Real fabrications survive all three checks.
  live: async ({ output, signals }) => {
    assertHeldOutCritic(); // per-call held-out defense; fail CLOSED before any paid call

    const corpus = signals.map((s) => `[${s.id}] ${s.text}`).join("\n");
    const prompt = [
      "SIGNAL CORPUS (the ONLY ground truth):",
      corpus,
      "",
      "OUTPUT TEXT UNDER REVIEW:",
      output.text,
    ].join("\n");

    console.log(`[pepl:critic] judging text=${output.text.length}chars vs corpus=${signals.length} signals`);
    const raw = await complete({ tier: "CRITIC", system: CRITIC_SYSTEM, prompt, json: true, temperature: 0 });

    // Tolerate a stray ```json fence, then JSON.parse — a parse failure THROWS (never a canned fallback).
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim()) as {
      grounding?: unknown;
      voice?: unknown;
      verdict?: unknown;
      failReason?: unknown;
      fabricatedClaims?: unknown;
    };

    const grounding = clamp01(parsed.grounding);
    const voice = clamp01(parsed.voice);
    const llmFlags: string[] = Array.isArray(parsed.fabricatedClaims)
      ? parsed.fabricatedClaims.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      : [];

    // DEFENSE 1 — PHANTOM-CLAIM: a fabricatedClaim the critic invented (not a substring of the
    // output it was grading) is dropped. Keeps fabricatedClaims a verbatim quote of output.text.
    const textNorm = norm(output.text);
    const phantoms = llmFlags.filter((c) => !textNorm.includes(norm(c)));
    if (phantoms.length) {
      console.warn(`[pepl:critic] PHANTOM-CLAIM dropped ${phantoms.length} flag(s) not present in output text: ${JSON.stringify(phantoms)}`);
    }
    let flags = llmFlags.filter((c) => textNorm.includes(norm(c)));

    // DEFENSE 2 — MECHANICAL-TRACE OVERRULE: a flag whose substance demonstrably lives in the
    // corpus is a paraphrase, not a fabrication. Substance = full containment, OR every numeric
    // token present, OR >=80% content-word overlap with SOME signal. Real fabrications (invented
    // people, fake facts) match none and survive.
    const corpusNorm = norm(signals.map((s) => s.text).join(" || "));
    const sigNorms = signals.map((s) => norm(s.text));
    const mechanicallyTraced = (claim: string): boolean => {
      const nc = norm(claim);
      if (!nc) return false;
      if (corpusNorm.includes(nc)) return true;
      const nums = nc.match(/\d[\d,.]*%?/g) ?? [];
      if (nums.length > 0 && nums.every((t) => corpusNorm.includes(t))) return true;
      const words = nc.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
      if (words.length >= 3) {
        for (const sig of sigNorms) {
          if (words.filter((w) => sig.includes(w)).length / words.length >= 0.8) return true;
        }
      }
      return false;
    };
    const traced = flags.filter(mechanicallyTraced);
    if (traced.length) {
      console.warn(`[pepl:critic] MECHANICAL-TRACE OVERRULE dropped ${traced.length} flag(s) whose substance is in the corpus: ${JSON.stringify(traced.map((c) => c.slice(0, 60)))}`);
    }
    flags = flags.filter((c) => !mechanicallyTraced(c));

    // Fail-CLOSED contract: recompute the verdict from the FINAL flags + axes (the held-out
    // critic's own verdict can be stale after the defenses prune flags). emit iff clean AND both
    // axes clear 0.7; else regen with a concrete reason.
    // pepl: ceiling — we trust the critic's grounding axis as-is. If clean-but-low-grounding stories
    // ever spiral the loop, add the sayhello zero-flag calibration floor (raise [0.55,0.7) -> 0.7).
    const verdict: "emit" | "regen" = flags.length === 0 && grounding >= 0.7 && voice >= 0.7 ? "emit" : "regen";
    const failReason =
      verdict === "emit"
        ? null
        : flags.length
          ? `FABRICATED claim(s) with no supporting signal: ${flags.map((c) => `"${c}"`).join("; ")}. Fail-CLOSED: cannot ship.`
          : typeof parsed.failReason === "string" && parsed.failReason
            ? parsed.failReason
            : `axis below 0.7: grounding=${grounding} voice=${voice}`;

    console.log(`[pepl:critic] grounding=${grounding} voice=${voice} -> fabricatedClaims=${JSON.stringify(flags)} -> verdict=${verdict}`);
    return { verdict, axes: { grounding, voice }, fabricatedClaims: flags, failReason };
  },
});

// ── Smoke test (direct run only): STUB_MODE=0 npx tsx --env-file=.env src/agents/critic.ts ──
// A hand-crafted Story: 5 true claims grounded in real signals + ONE fabrication about a
// non-existent person. Asserts the held-out critic flags ONLY the fabrication.
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const signals = z
      .array(Signal)
      .parse(JSON.parse(readFileSync(path.resolve(dir, "../../data/precached-signals.json"), "utf8")));

    const FABRICATED = "His sister Maria runs a bakery in Lisbon.";
    const text = [
      "Johnny is building a startup he called gx, and it's in a pre-product, pre-idea phase.",
      "Sarah and Teri are his two other cofounders.",
      "His friend Jasmine is genuinely his ICP, for people who are desperately questioning themselves.",
      "He's a very disorganized person, so it helps to have something agentic that organizes his chaos.",
      "He started journaling, so he has all his stuff in kind of one place now.",
      FABRICATED,
    ].join(" ");
    const output = {
      text,
      groundedIn: [
        { claim: "building a startup he called gx", signalId: "sig-gx-genesis" },
        { claim: "Sarah and Teri are his two other cofounders", signalId: "sig-cofounder-trio" },
        { claim: "Jasmine is genuinely his ICP", signalId: "sig-jasmine-icp" },
        { claim: "a very disorganized person", signalId: "sig-disorganized-needs-agentic" },
        { claim: "started journaling", signalId: "sig-started-journaling" },
      ],
    };

    console.log("════════ critic LIVE smoke test ════════");
    const verdict = await criticNode({ output, signals });
    console.log("VERDICT:", JSON.stringify(verdict, null, 2));

    const trueSubjects = ["sarah", "teri", "jasmine", "gx", "journaling", "disorganized"];
    const checks: [string, boolean][] = [
      ["verdict === regen", verdict.verdict === "regen"],
      ["exactly one fabricatedClaim", verdict.fabricatedClaims.length === 1],
      ["every flag is a verbatim substring of output.text", verdict.fabricatedClaims.every((c) => text.includes(c))],
      ["the flag is the Maria fabrication", verdict.fabricatedClaims.some((c) => c.toLowerCase().includes("maria"))],
      ["no true claim flagged", !verdict.fabricatedClaims.some((c) => trueSubjects.some((s) => c.toLowerCase().includes(s)))],
    ];
    let ok = true;
    for (const [name, pass] of checks) {
      console.log(`  ${pass ? "PASS" : "FAIL"} · ${name}`);
      if (!pass) ok = false;
    }
    if (!ok) {
      console.error("❌ critic smoke RED");
      process.exit(1);
    }
    console.log("✅ critic smoke GREEN — held-out critic flagged ONLY the fabricated claim");
    process.exit(0);
  })().catch((e) => {
    console.error("critic smoke FAILED (threw):", e instanceof Error ? (e.stack ?? e.message) : e);
    process.exit(1);
  });
}
