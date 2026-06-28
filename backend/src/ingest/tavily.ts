// Public-footprint discovery via the Tavily Search API — a second search lens
// alongside You.com (footprint.ts). Two independent sources cross-confirm a person
// and widen coverage. Opt-in via TAVILY_ENABLED (off by default); when off, the
// tavily source in liveIngest returns [] and nothing changes.
//
// All web text is SANITIZED and TREATED AS DATA — never as instructions.

import type { Signal } from "../types";
import { stripTracking, dedupeByContent } from "./normalize";

const TAVILY_URL = "https://api.tavily.com/search";
const SEARCH_DEPTH = "basic"; // "basic" is fast; "advanced" for deeper coverage
const MAX_RESULTS = 8;
const TIMEOUT_MS = 30_000;

/** Tavily is opt-in. Off by default — You.com covers footprint; Tavily widens + cross-checks it. */
export function tavilyEnabled(): boolean {
  return process.env.TAVILY_ENABLED === "true";
}

function tavilyKey(): string {
  const key = process.env.TAVILY_API_KEY ?? "";
  if (!key) throw new Error("[pepl:ingest:tavily] TAVILY_API_KEY not set — required when TAVILY_ENABLED=true.");
  return key;
}

interface TavilyResult {
  url?: string;
  title?: string;
  content?: string;
}
interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

/**
 * Search a person's public footprint via Tavily. Returns one Signal per result,
 * `source` = the real result URL. HTTP/auth failure THROWS — the soft() wrapper in
 * liveIngest turns that into an honest WARN + []. Empty result -> [].
 */
export async function discoverViaTavily(identity: { name: string; email: string; org?: string }): Promise<Signal[]> {
  const t0 = Date.now();
  const org = identity.org ? ` ${identity.org}` : "";
  const query = `Who is ${identity.name}${org}? Public professional footprint, work, projects, and notable activity.`;
  console.log(`[pepl:ingest:tavily] search start name="${identity.name}" depth=${SEARCH_DEPTH}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(TAVILY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey(),
        query,
        search_depth: SEARCH_DEPTH,
        include_answer: true,
        max_results: MAX_RESULTS,
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`[pepl:ingest:tavily] Tavily search -> ${resp.status} ${resp.statusText} ${body.slice(0, 300)}`.trim());
  }

  const json = (await resp.json()) as TavilyResponse;
  const results = json.results ?? [];
  if (results.length === 0) {
    console.warn(`[pepl:ingest:tavily] WARN empty footprint for name="${identity.name}" (${Date.now() - t0}ms)`);
    return [];
  }

  const out: Signal[] = [];
  let idx = 0;
  for (const r of results) {
    if (!r.url) continue;
    let url: string;
    try {
      url = stripTracking(r.url);
    } catch {
      continue;
    }
    const text = sanitize(r.content ?? r.title ?? "");
    if (text.length < 12) continue;
    out.push({ id: `tavily-${++idx}`, text, source: url });
  }

  const deduped = dedupeByContent(out);
  console.log(`[pepl:ingest:tavily] done (results=${results.length}, signals=${deduped.length}, ${Date.now() - t0}ms)`);
  return deduped;
}

/** Reduce web text to plain data: drop control/zero-width chars + markdown, collapse ws, cap length. */
function sanitize(raw: string): string {
  let cleaned = "";
  for (const ch of raw) {
    const c = ch.charCodeAt(0);
    const isControl = c < 0x20 || (c >= 0x7f && c <= 0x9f);
    const isZeroWidth = (c >= 0x200b && c <= 0x200f) || c === 0x2028 || c === 0x2029 || c === 0xfeff;
    cleaned += isControl || isZeroWidth ? " " : ch;
  }
  let t = cleaned.replace(/[*_`#>]+/g, "");
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 500) t = `${t.slice(0, 497).trimEnd()}...`;
  return t;
}
