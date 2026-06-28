// RESET: delete every Composio connected account, so no cached/ACTIVE connection short-circuits the
// OAuth — the next sign-in must authorize fresh. Usage: npx tsx --env-file=.env scripts/composio-reset.ts
import { Composio } from "@composio/core";

const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });

const list: any = await c.connectedAccounts.list({});
const items: any[] = list.items ?? list.data ?? [];
console.log(`[composio-reset] found ${items.length} connected account(s)`);

for (const acc of items) {
  const id = acc.id ?? acc.connectionId;
  const who = acc.userId ?? acc.user_id ?? acc.entityId ?? "?";
  const tk = acc.toolkit?.slug ?? acc.appName ?? acc.toolkitSlug ?? "?";
  try {
    await c.connectedAccounts.delete(id);
    console.log(`[composio-reset] deleted ${id} user=${who} toolkit=${tk}`);
  } catch (e) {
    console.log(`[composio-reset] delete ${id} FAILED: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const after: any = await c.connectedAccounts.list({});
console.log(`[composio-reset] remaining: ${(after.items ?? after.data ?? []).length}`);
