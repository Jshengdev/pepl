// Full live pipeline on a connected Gmail account -> dossier persisted to InsForge.
// Usage: STUB_MODE=0 COMPOSIO_MODE=live npx tsx --env-file=.env scripts/run-live.ts <userId>
import { runPipeline } from "../src/orchestrator/run";
import { deriveIdentityFromGmail } from "../src/ingest/composio/gmail";

const userId = process.argv[2] ?? "johnny";
const owner = await deriveIdentityFromGmail(userId);
console.log(`\nowner: ${owner.name} <${owner.email}>\n`);

const res = await runPipeline(
  { source: `gmail:${userId}`, kind: "story" },
  (e) => {
    const node = (e as { node?: string }).node;
    const pct = (e as { pct?: number }).pct;
    console.log(`  [ws] ${e.type}${node ? `:${node}` : ""}${pct !== undefined ? ` ${pct}%` : ""}`);
  },
  { userId, owner },
);

console.log("\n=== PEOPLE (graph, by ring) ===");
for (const p of [...res.graph.people].sort((a, b) => a.ring - b.ring || b.closeness - a.closeness)) {
  console.log(`  ring${p.ring}  ${p.closeness.toFixed(2)}  ${p.name}`);
}
console.log("seededWrong:", JSON.stringify(res.graph.seededWrong));

console.log("\n=== STORY ===\n" + res.story.text);
console.log(`\ngroundedIn=${res.story.groundedIn.length} claims`);
console.log(
  `verdict=${res.verdict.verdict} grounding=${res.verdict.axes.grounding} voice=${res.verdict.axes.voice} fabricated=${res.verdict.fabricatedClaims.length}`,
);
console.log("cards:", res.cards.map((c) => c.kind).join(", "));
console.log(`\npersisted to InsForge user_id=${userId}`);
