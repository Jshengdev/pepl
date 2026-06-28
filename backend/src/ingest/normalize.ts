// URL + content-hash helpers for footprint dedup. Pure functions — no IO, no
// LLM. FAIL LOUD on invalid input; dedup is honest, never silent.

import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "trk",
  "mc_cid",
  "mc_eid",
]);

/**
 * Clean a URL: enforce http(s), lowercase host, drop `www.` + tracking params,
 * trim trailing slash. Preserves path + meaningful query params.
 * Throws on empty / unparseable input — a bad source URL is a caller bug.
 */
export function stripTracking(url: string): string {
  if (!url || url.trim().length === 0) {
    throw new Error("[pepl:ingest:normalize] stripTracking() received empty input — caller bug.");
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    try {
      parsed = new URL(`https://${url.trim()}`);
    } catch {
      throw new Error(`[pepl:ingest:normalize] stripTracking() could not parse "${url}" as a URL`);
    }
  }
  const scheme = parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.protocol : "https:";
  const host = parsed.host.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "");
  const kept: string[] = [];
  for (const [k, v] of parsed.searchParams) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) kept.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  }
  const query = kept.length ? `?${kept.join("&")}` : "";
  return `${scheme}//${host}${path}${query}`;
}

/**
 * SHA-256 of normalized text. Returns "" only when the cleaned content is empty
 * — callers treat an empty hash as "not dedupable" and keep the item.
 */
export function contentHash(text: string): string {
  if (!text) return "";
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean) return "";
  return createHash("sha256").update(clean, "utf-8").digest("hex");
}

/**
 * Drop items whose `text` collides on contentHash — first occurrence wins.
 * Items with an empty hash (no dedupable content) are always kept.
 */
export function dedupeByContent<T extends { text: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const h = contentHash(item.text);
    if (h && seen.has(h)) continue;
    if (h) seen.add(h);
    out.push(item);
  }
  return out;
}
