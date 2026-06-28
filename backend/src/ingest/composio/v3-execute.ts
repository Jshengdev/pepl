import { getComposioKey, isComposioAvailable } from "./client";

const COMPOSIO_V3 = "https://backend.composio.dev/api/v3";
const RETRY_BACKOFF_MS = [500, 1500, 4500];

type V3Outcome =
  | { kind: "ok"; data: unknown }
  | { kind: "soft_fail" } // ConnectedAccountNotFound, timeout, no key
  | { kind: "retryable"; reason: string } // 429, 403 userRateLimitExceeded
  | { kind: "hard_fail"; error: Error };

/**
 * Direct call to /api/v3/tools/execute/{ACTION_NAME}.
 * Soft-fail → null (no account, timeout). Hard-fail → throw. Retries 429 / 403
 * userRateLimitExceeded with exponential backoff (500 → 1500 → 4500ms).
 */
export async function v3Execute(
  actionName: string,
  userId: string,
  args: Record<string, unknown>,
  timeoutMs = 12_000,
): Promise<unknown> {
  if (!isComposioAvailable()) return null;
  const key = getComposioKey();
  const t0 = Date.now();

  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    const outcome = await v3Once(actionName, userId, args, key, timeoutMs);

    if (outcome.kind === "ok") {
      const n = largestArrayInResponse(outcome.data).length;
      console.log(`[pepl:ingest:composio] ${actionName} ok (n=${n}, ${Date.now() - t0}ms)`);
      return outcome.data;
    }
    if (outcome.kind === "soft_fail") return null;
    if (outcome.kind === "retryable" && attempt < RETRY_BACKOFF_MS.length) {
      const backoffMs = RETRY_BACKOFF_MS[attempt];
      console.warn(
        `[pepl:ingest:composio] WARN ${actionName} rate-limited, retry ${attempt + 1}/${RETRY_BACKOFF_MS.length} in ${backoffMs}ms — ${outcome.reason}`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      continue;
    }
    if (outcome.kind === "retryable") {
      throw new Error(
        `[pepl:ingest:composio] ${actionName} rate-limited after ${RETRY_BACKOFF_MS.length + 1} attempts: ${outcome.reason}`,
      );
    }
    throw outcome.error;
  }
  throw new Error(`[pepl:ingest:composio] ${actionName} fell out of retry loop`);
}

async function v3Once(
  actionName: string,
  userId: string,
  args: Record<string, unknown>,
  key: string,
  timeoutMs: number,
): Promise<V3Outcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${COMPOSIO_V3}/tools/execute/${actionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ user_id: userId, arguments: args }),
      signal: ctrl.signal,
    });

    if (!resp.ok) {
      let body: { error?: { slug?: string; message?: string } } | null = null;
      try {
        body = (await resp.json()) as { error?: { slug?: string; message?: string } };
      } catch {
        /* non-JSON body — proceed with null body */
      }
      const slug = body?.error?.slug;

      // Soft-fail: user hasn't OAuth'd this toolkit yet.
      if (resp.status === 400 && slug === "ActionExecute_ConnectedAccountNotFound") {
        console.warn(
          `[pepl:ingest:composio] WARN ${actionName} no connected account for user=${userId} → soft-fail (null)`,
        );
        return { kind: "soft_fail" };
      }
      // Retryable: rate limit (429) or quota-exceeded 403 per Composio docs.
      if (resp.status === 429) {
        return { kind: "retryable", reason: `429 ${body?.error?.message ?? ""}`.trim() };
      }
      if (resp.status === 403 && (body?.error?.message ?? "").toLowerCase().includes("ratelimit")) {
        return { kind: "retryable", reason: "403 userRateLimitExceeded" };
      }

      return {
        kind: "hard_fail",
        error: new Error(
          `[pepl:ingest:composio] ${actionName} → ${resp.status} ${resp.statusText}` +
            (slug ? ` (slug=${slug})` : "") +
            (body?.error?.message ? ` message=${body.error.message}` : ""),
        ),
      };
    }

    const json = (await resp.json()) as { data?: unknown; error?: unknown };
    if (json.error) {
      return {
        kind: "hard_fail",
        error: new Error(
          `[pepl:ingest:composio] ${actionName} responded with error: ${JSON.stringify(json.error)}`,
        ),
      };
    }
    return { kind: "ok", data: json.data ?? null };
  } catch (err) {
    if ((err as { name?: string }).name === "AbortError") {
      console.warn(`[pepl:ingest:composio] WARN ${actionName} timeout after ${timeoutMs}ms → soft-fail (null)`);
      return { kind: "soft_fail" };
    }
    return { kind: "hard_fail", error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Walk a deeply nested Composio response and return the largest array of
 * objects — the payload regardless of how the action wraps it. Capped at
 * depth 1000 against pathological inputs.
 */
export function largestArrayInResponse(result: unknown): unknown[] {
  if (!result || typeof result !== "object") return [];
  const stack: unknown[] = [result];
  let best: unknown[] = [];
  let depth = 0;
  while (stack.length > 0 && depth < 1000) {
    depth++;
    const node = stack.pop();
    if (Array.isArray(node)) {
      if (node.length > best.length) best = node;
      continue;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) {
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }
  return best;
}

/** Walk the response tree for the first non-empty string `nextPageToken`. */
export function extractNextPageToken(result: unknown): string | undefined {
  if (!result || typeof result !== "object") return undefined;
  const stack: unknown[] = [result];
  let depth = 0;
  while (stack.length > 0 && depth < 200) {
    depth++;
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    if (typeof obj.nextPageToken === "string" && obj.nextPageToken.length > 0) {
      return obj.nextPageToken;
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return undefined;
}
