// Ops util: mint a Google OAuth consent link (Composio managed auth) for a demo userId.
// Usage: npx tsx --env-file=.env scripts/connect.ts <userId> [gmail|calendar]
import { initiateGoogleConnect, getConnectionStatus } from "../src/ingest/composio/connect";

const userId = process.argv[2] ?? "johnny";
const provider = (process.argv[3] ?? "gmail") as "gmail" | "calendar";

const existing = await getConnectionStatus(userId, provider);
if (existing.connected) {
  console.log(`[connect] ${userId}/${provider} ALREADY connected (status=${existing.status}) — nothing to do.`);
} else {
  const r = await initiateGoogleConnect(userId, provider);
  console.log(`\n[connect] userId="${userId}" provider=${provider}`);
  console.log(`CONSENT_URL: ${r.redirectUrl}\n`);
}
