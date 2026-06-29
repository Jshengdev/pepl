// SEED bios: infer {occupation,hometown,age,birthday} per persisted user from their signals, store in
// dossiers.bio so the card front fills. Usage: npx tsx --env-file=.env scripts/seed-bios.ts
import { inferBio } from "../src/agents/bio";
import { loadDossier } from "../src/memory/store";
import { createAdminClient } from "@insforge/sdk";

const db = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
}).database;

const { data } = await db.from("dossiers").select("user_id, owner_name, owner_email");
const users = (data ?? []) as Array<{ user_id: string; owner_name: string; owner_email: string }>;
console.log(`[bio] ${users.length} users: ${users.map((u) => u.owner_name).join(", ")}`);

await Promise.all(
  users.map(async (u) => {
    try {
      const d = await loadDossier(u.user_id);
      if (!d) return console.log(`[bio] ${u.owner_name}: no dossier, skip`);
      const bio = await inferBio(u.owner_name, u.owner_email, d.signals);
      const { error } = await db.from("dossiers").update({ bio }).eq("user_id", u.user_id);
      console.log(error ? `[bio] ${u.owner_name} SAVE ERROR: ${JSON.stringify(error)}` : `[bio] ${u.owner_name} saved ✓`);
    } catch (e) {
      console.log(`[bio] ${u.owner_name} FAILED: ${e instanceof Error ? e.message : e}`);
    }
  }),
);
console.log("[bio] done");
