// List Composio connected accounts (userId + status + toolkit) so we know whose Gmail is connected.
// Usage: npx tsx --env-file=.env scripts/composio-list.ts
import { Composio } from "@composio/core";

const c = new Composio({ apiKey: process.env.COMPOSIO_API_KEY! });
const list: any = await c.connectedAccounts.list({});
const items: any[] = list.items ?? list.data ?? [];
console.log(`[composio-list] ${items.length} connected account(s):`);
for (const a of items) {
  console.log(
    `  status=${a.status} user=${a.userId ?? a.entityId ?? a.user_id ?? "?"} toolkit=${a.toolkit?.slug ?? a.toolkitSlug ?? "?"} id=${a.id}`,
  );
}
