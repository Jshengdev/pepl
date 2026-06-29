// SEED johnny from the precached corpus (no live Gmail) — restores the demo node + johnny on the map.
// Usage: COMPOSIO_MODE=cache STUB_MODE=0 npx tsx --env-file=.env scripts/seed-johnny.ts
import { runPipeline } from "../src/orchestrator/run";

const owner = { name: "Johnny Sheng", email: "johnnysh@usc.edu" };
console.log("[seed] johnny via DEMO_CACHE corpus (extract→graph→generate→critic→cards→save)…");

const res = await runPipeline(
  { source: "cache:johnny", kind: "story" },
  (e) => {
    const n = (e as { node?: string }).node;
    console.log(`  [ws] ${e.type}${n ? ":" + n : ""}`);
  },
  { userId: "johnny", owner },
);

console.log(
  `[seed] johnny DONE: people=${res.graph.people.length} cards=${res.cards.length} verdict=${res.verdict.verdict}`,
);
console.log(`[seed] story: ${res.story.text.slice(0, 120)}…`);
console.log(`[seed] persisted to InsForge user_id=johnny`);
