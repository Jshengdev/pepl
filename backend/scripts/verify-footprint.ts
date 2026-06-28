// Harness B: live You.com footprint. Derive the owner from the test account, then
// discover their public footprint. Run: STUB_MODE=0 npx tsx --env-file=.env scripts/verify-footprint.ts
import { deriveIdentityFromGmail } from "../src/ingest/composio/gmail";
import { discoverFootprint } from "../src/ingest/footprint";

const USER_ID = "f2fe6fce-8c8f-40c2-b4ad-08f3275adbae";

async function main() {
  console.log("=== HARNESS B: live You.com footprint ===");
  const identity = await deriveIdentityFromGmail(USER_ID);
  console.log(`derived identity: ${identity.name} <${identity.email}>`);

  const signals = await discoverFootprint(identity);
  console.log(`\nfootprint signals: ${signals.length}`);
  for (const s of signals.slice(0, 5)) {
    console.log(`  - [${s.id}] ${s.text}`);
    console.log(`      source: ${s.source}`);
  }

  const cited = signals.find((s) => /^https?:\/\//.test(s.source));
  console.log("\n--- ASSERTS ---");
  console.log(JSON.stringify({ atLeastOne: signals.length >= 1, hasRealUrl: !!cited }, null, 2));
  if (cited) {
    console.log("\nSAMPLE CITED SIGNAL:");
    console.log(`  claim: ${cited.text}`);
    console.log(`  url:   ${cited.source}`);
  }
  const ok = signals.length >= 1 && !!cited;
  console.log(ok ? "\nB: PASS" : "\nB: FAIL (no cited signal with a real URL)");
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error("B: THREW:", err);
  process.exit(1);
});
