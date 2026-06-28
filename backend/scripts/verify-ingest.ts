// Harness A: live Gmail graph on the test account, then feed radial people/edges
// into the existing graphNode. Run: STUB_MODE=0 npx tsx --env-file=.env scripts/verify-ingest.ts
import { ingestNode } from "../src/ingest/ingest";
import { graphNode } from "../src/ingest/graph";

const USER_ID = "f2fe6fce-8c8f-40c2-b4ad-08f3275adbae";

async function main() {
  console.log("=== HARNESS A: live ingest ===");
  const { signals, people, edges } = await ingestNode({
    source: "live",
    userId: USER_ID,
    lookbackDays: 180,
  });

  const owner = people.find((p) => p.ring === 0);
  console.log("\n--- INGEST RESULT ---");
  console.log("derived owner:", owner ? `${owner.name} (id=${owner.id}, ring=${owner.ring}, closeness=${owner.closeness})` : "NONE");
  console.log("signals:", signals.length);
  console.log("people:", people.length, "edges:", edges.length);

  const closenessOk = people.every((p) => p.closeness >= 0 && p.closeness <= 1);
  const inner = [...people].sort((a, b) => b.closeness - a.closeness).slice(0, 8);
  console.log("\n--- INNER CIRCLE (top 8 by closeness) ---");
  for (const p of inner) console.log(`  ring ${p.ring}  closeness ${p.closeness.toFixed(3)}  ${p.name} (${p.id})`);

  console.log("\n--- GRAPH NODE (feed radial people/edges) ---");
  const graph = await graphNode({ people, edges });
  const ring0 = graph.people.filter((p) => p.ring === 0);
  const ringDist = [0, 1, 2, 3].map((r) => `r${r}=${graph.people.filter((p) => p.ring === r).length}`).join(" ");
  console.log("graph people:", graph.people.length, "edges:", graph.edges.length);
  console.log("ring distribution:", ringDist);
  console.log("seededWrong:", JSON.stringify(graph.seededWrong));

  console.log("\n--- ASSERTS ---");
  const checks = {
    signalsPositive: signals.length > 0,
    peopleGte3: people.length >= 3,
    closenessInRange: closenessOk,
    ownerRing0: !!owner,
    notAllEmpty: signals.length > 0 && people.length > 1,
    graphOneRing0: ring0.length === 1,
    graphHasSeed: graph.seededWrong.length === 1,
  };
  console.log(JSON.stringify(checks, null, 2));
  const allOk = Object.values(checks).every(Boolean);
  console.log(allOk ? "\nA: PASS" : "\nA: FAIL");
  if (!allOk) process.exit(1);
}

main().catch((err) => {
  console.error("A: THREW:", err);
  process.exit(1);
});
