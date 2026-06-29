// ENRICH every persisted user: scrape You.com footprint (internet) for their name+email, merge with
// their existing signals (Gmail/corpus), and regenerate story+cards so the dossier reflects everything.
// Robust: a failure keeps the existing dossier (saveDossier only fires after generate/critic succeed).
// Usage: npx tsx --env-file=.env scripts/enrich.ts
import { discoverFootprint } from "../src/ingest/footprint";
import { runReveal } from "../src/orchestrator/run";
import { loadDossier } from "../src/memory/store";
import { createAdminClient } from "@insforge/sdk";

const db = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
}).database;

const { data } = await db.from("dossiers").select("user_id, owner_name, owner_email");
const users = (data ?? []) as Array<{ user_id: string; owner_name: string; owner_email: string }>;
console.log(`[enrich] ${users.length} users: ${users.map((u) => u.owner_name).join(", ")}`);

await Promise.all(
  users.map(async (u) => {
    const tag = `${u.owner_name}(${u.user_id.slice(0, 8)})`;
    try {
      const existing = await loadDossier(u.user_id);
      if (!existing) return console.log(`[enrich] ${tag}: no dossier, skip`);

      let fp: Array<{ id: string; text: string; source: string }> = [];
      try {
        fp = await discoverFootprint({ name: u.owner_name, email: u.owner_email });
      } catch (e) {
        console.log(`[enrich] ${tag}: you.com footprint failed: ${e instanceof Error ? e.message : e}`);
      }
      console.log(`[enrich] ${tag}: +${fp.length} you.com footprint signals (had ${existing.signals.length})`);

      const have = new Set(existing.signals.map((s) => s.id));
      const merged = [...existing.signals, ...fp.filter((s) => !have.has(s.id))];

      const res = await runReveal(
        { graph: existing.graph, signals: merged, kind: "story" },
        { userId: u.user_id, owner: { name: u.owner_name, email: u.owner_email } },
        () => {},
      );
      console.log(`[enrich] ${tag}: DONE signals=${merged.length} cards=${res.cards.length} verdict=${res.verdict.verdict}`);
    } catch (e) {
      console.log(`[enrich] ${tag}: ENRICH FAILED (kept existing): ${e instanceof Error ? e.message : e}`);
    }
  }),
);
console.log("[enrich] all done");
