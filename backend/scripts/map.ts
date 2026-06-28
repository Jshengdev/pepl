// Run the thematic connect-map across persisted dossiers.
// Usage: npx tsx --env-file=.env scripts/map.ts <userId> <userId> [userId...]
import { connectMap } from "../src/agents/connect-map";

const ids = process.argv.slice(2);
if (ids.length < 2) throw new Error("need >=2 userIds");
const res = await connectMap(ids);
for (const p of res.pairs) {
  console.log(`\n${p.a} <-> ${p.b}   score=${p.score}`);
  console.log("  themes:   " + p.sharedThemes.join(" · "));
  console.log("  analogy:  " + p.analogy);
  if (p.sharedInterests?.length) console.log("  interests: " + p.sharedInterests.join(", "));
  console.log("  groundedIn: " + p.groundedIn.length + " claims (both dossiers)");
}
