// RESET: wipe every persisted user EXCEPT precached Sarah Fan. Real InsForge deletes, verified after.
// Usage: npx tsx --env-file=.env scripts/reset-users.ts
import { createAdminClient } from "@insforge/sdk";

const db = createAdminClient({
  baseUrl: process.env.INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
}).database;

const KEEP = "c2481162-35e8-49e3-a51f-0f76039d123f"; // Sarah Fan (precached seed node)
const TABLES = ["signals", "people", "edges", "stories", "cards", "user_cards", "dossiers"];

// Collect every user_id present (dossiers OR user_cards — a user can have a card before a dossier).
const ids = new Set<string>();
for (const t of ["dossiers", "user_cards"]) {
  const { data, error } = await db.from(t).select("user_id");
  if (error) console.log(`[reset] read ${t} error: ${JSON.stringify(error)}`);
  for (const r of (data ?? []) as Array<{ user_id: string }>) ids.add(r.user_id);
}
const toDelete = [...ids].filter((id) => id !== KEEP);
console.log(`[reset] users found=${ids.size}, deleting=${toDelete.length}, keeping Sarah(${KEEP})`);

for (const uid of toDelete) {
  for (const t of TABLES) {
    const { error } = await db.from(t).delete().eq("user_id", uid);
    if (error) console.log(`[reset] DELETE ${t} user=${uid} FAILED: ${JSON.stringify(error)}`);
  }
  console.log(`[reset] deleted user ${uid}`);
}

const { data } = await db.from("dossiers").select("user_id, owner_name");
console.log(`[reset] remaining dossiers: ${JSON.stringify(data)}`);
