import { Composio } from "@composio/core";

import { getComposioKey, isComposioAvailable } from "./client";

export type GoogleProvider = "gmail" | "calendar";

const TOOLKIT_SLUG: Record<GoogleProvider, string> = {
  gmail: "gmail",
  calendar: "googlecalendar",
};

export interface InitiateResult {
  connectionId: string;
  redirectUrl: string;
  toolkit: string;
}

export interface ConnectionStatusResult {
  connected: boolean;
  status: string | null;
  connectionId: string | null;
  toolkit: string;
}

let _client: Composio | null = null;
function client(): Composio {
  if (!isComposioAvailable()) {
    throw new Error(
      "[pepl:ingest:connect] COMPOSIO_API_KEY missing or COMPOSIO_MODE != 'live' — cannot run the Google OAuth connect flow. Set both in .env.",
    );
  }
  if (!_client) _client = new Composio({ apiKey: getComposioKey() });
  return _client;
}

function toolkitFor(provider: GoogleProvider): string {
  const slug = TOOLKIT_SLUG[provider];
  if (!slug) {
    throw new Error(
      `[pepl:ingest:connect] unknown provider="${provider}" — expected one of ${Object.keys(TOOLKIT_SLUG).join(", ")}`,
    );
  }
  return slug;
}

async function ensureManagedAuthConfig(toolkitSlug: string): Promise<string> {
  const t0 = Date.now();
  const list = await client().authConfigs.list();
  const reuse = list.items.find(
    (c) => c.toolkit?.slug === toolkitSlug && c.isComposioManaged,
  );
  if (reuse) {
    console.log(
      `[pepl:ingest:connect] auth-config reused toolkit=${toolkitSlug} id=${reuse.id} (ms=${Date.now() - t0})`,
    );
    return reuse.id;
  }
  const created = await client().authConfigs.create(toolkitSlug, {
    type: "use_composio_managed_auth",
    name: `pepl-${toolkitSlug}`,
  });
  console.log(
    `[pepl:ingest:connect] auth-config created toolkit=${toolkitSlug} id=${created.id} managed=${created.isComposioManaged} (ms=${Date.now() - t0})`,
  );
  return created.id;
}

export async function initiateGoogleConnect(
  userId: string,
  provider: GoogleProvider,
): Promise<InitiateResult> {
  const t0 = Date.now();
  const toolkitSlug = toolkitFor(provider);
  console.log(
    `[pepl:ingest:connect] initiate start userId=${userId} provider=${provider} toolkit=${toolkitSlug}`,
  );

  const authConfigId = await ensureManagedAuthConfig(toolkitSlug);
  const req = await client().connectedAccounts.link(userId, authConfigId);

  if (!req.redirectUrl) {
    throw new Error(
      `[pepl:ingest:connect] initiate for ${toolkitSlug} (user=${userId}) returned no redirectUrl (connectionId=${req.id}). Managed Google OAuth should always produce a consent URL — check the auth config '${authConfigId}' is a valid managed Google OAuth app.`,
    );
  }

  console.log(
    `[pepl:ingest:connect] initiated userId=${userId} provider=${provider} connectionId=${req.id} host=${safeHost(req.redirectUrl)} (ms=${Date.now() - t0})`,
  );
  return { connectionId: req.id, redirectUrl: req.redirectUrl, toolkit: toolkitSlug };
}

export async function getConnectionStatus(
  userId: string,
  provider: GoogleProvider,
): Promise<ConnectionStatusResult> {
  const t0 = Date.now();
  const toolkitSlug = toolkitFor(provider);
  const list = await client().connectedAccounts.list({
    userIds: [userId],
    toolkitSlugs: [toolkitSlug],
  });
  const items = list.items ?? [];
  const active = items.find((i) => i.status === "ACTIVE");
  const chosen =
    active ??
    items
      .slice()
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))[0] ??
    null;

  const status = chosen?.status ?? null;
  const connected = status === "ACTIVE";
  if (!chosen) {
    console.log(
      `[pepl:ingest:connect] status none userId=${userId} provider=${provider} toolkit=${toolkitSlug} (ms=${Date.now() - t0})`,
    );
  } else {
    console.log(
      `[pepl:ingest:connect] status userId=${userId} provider=${provider} status=${status} connected=${connected} connectionId=${chosen.id} (ms=${Date.now() - t0})`,
    );
  }
  return { connected, status, connectionId: chosen?.id ?? null, toolkit: toolkitSlug };
}

export async function waitForGoogleConnection(
  connectionId: string,
  timeoutMs = 120_000,
): Promise<string> {
  console.log(
    `[pepl:ingest:connect] wait start connectionId=${connectionId} timeoutMs=${timeoutMs}`,
  );
  const acct = await client().connectedAccounts.waitForConnection(connectionId, timeoutMs);
  console.log(
    `[pepl:ingest:connect] wait complete connectionId=${connectionId} status=${acct.status}`,
  );
  return acct.status;
}

function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "(unparseable-url)";
  }
}
