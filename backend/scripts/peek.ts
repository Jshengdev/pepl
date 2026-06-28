// Gmail-scoped peek: derive owner + pull email + build the radial closeness graph.
// Deterministic (no LLM, no orchestrator) so it can run without touching the rest of the pipeline.
// Usage: COMPOSIO_MODE=live npx tsx --env-file=.env scripts/peek.ts <userId>
import { deriveIdentityFromGmail, pullGmailMessages } from "../src/ingest/composio/gmail";
import { peopleFromEmails } from "../src/ingest/extractors/gmail";

const userId = process.argv[2] ?? "johnny";
console.log(`\n=== Gmail peek · userId="${userId}" ===`);

const owner = await deriveIdentityFromGmail(userId);
console.log(`owner (deriveIdentityFromGmail): ${owner.name} <${owner.email}>`);

const emails = await pullGmailMessages(userId, { lookbackDays: 180, maxPages: 10 });
console.log(`emails pulled (180d): ${emails.length}`);

const { people, edges } = peopleFromEmails(emails, { email: owner.email });
console.log(`people=${people.length} edges=${edges.length}`);

const inner = [...people].sort((a, b) => b.closeness - a.closeness).slice(0, 12);
console.log(`\ninner circle (top 12 by closeness):`);
for (const p of inner) {
  console.log(`  ring${p.ring}  ${p.closeness.toFixed(3)}  ${p.name}${p.lastInteraction ? `  (last: ${p.lastInteraction})` : ""}`);
}
