// Dedupe the worldmap to ONE node each: johnny (demo target) + Sarah + a single Teri. Deletes the
// duplicate login nodes. Usage: npx tsx --env-file=.env scripts/dedupe-demo.ts
import { createAdminClient } from "@insforge/sdk";

const db = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
}).database;

const SARAH = "c2481162-35e8-49e3-a51f-0f76039d123f";
const TABLES = ["signals", "people", "edges", "stories", "cards", "user_cards", "dossiers"];

const { data } = await db.from("dossiers").select("user_id, owner_name");
const rows = (data ?? []) as Array<{ user_id: string; owner_name: string }>;

const keep = new Set<string>(["johnny", SARAH]);
let keptTeri = false;
for (const r of rows) {
  if (keep.has(r.user_id)) continue;
  if (/teri/i.test(r.owner_name) && !keptTeri) {
    keep.add(r.user_id);
    keptTeri = true;
  }
}

const toDelete = rows.filter((r) => !keep.has(r.user_id));
console.log(`[dedupe] keep=${[...keep].length} delete=${toDelete.length}`);
for (const r of toDelete) {
  for (const t of TABLES) await db.from(t).delete().eq("user_id", r.user_id);
  console.log(`[dedupe] deleted ${r.user_id} (${r.owner_name})`);
}

const { data: after } = await db.from("dossiers").select("user_id, owner_name");
console.log(`[dedupe] remaining: ${JSON.stringify(after)}`);
