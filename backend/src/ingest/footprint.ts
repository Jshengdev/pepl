// Public-footprint discovery via the You.com Research API. One research call
// per identity returns a cited markdown answer + a source list; we split the
// answer into individual cited claims and bind each to its REAL source URL.
//
// All web text is SANITIZED and TREATED AS DATA — never as instructions. The
// downstream pipeline reads these only as Signal.text content.

import type { Signal } from "../types";
import { stripTracking, contentHash, dedupeByContent } from "./normalize";

const YOU_RESEARCH_URL = "https://api.you.com/v1/research";
const RESEARCH_EFFORT = "lite"; // pepl: lite is seconds; bump to "standard"/"deep" for richer footprints
const TIMEOUT_MS = 90_000;

interface YouSource {
  url?: string;
  title?: string;
  snippets?: string[];
}
interface YouResearchResponse {
  output?: {
    content?: string;
    content_type?: string;
    sources?: YouSource[];
  };
}

function youKey(): string {
  const key = process.env.YDC_API_KEY ?? process.env.YOU_API_KEY ?? "";
  if (!key) {
    throw new Error("[pepl:ingest:footprint] YDC_API_KEY / YOU_API_KEY (You.com) not set — required for footprint discovery.");
  }
  return key;
}

function buildQuery(identity: { name: string; email: string; org?: string }): string {
  const org = identity.org ? ` affiliated with ${identity.org}` : "";
  return (
    `Research the public professional footprint of ${identity.name} (email: ${identity.email})${org}. ` +
    `Summarize who they are, their work and projects, education, and notable public activity. ` +
    `State each fact as its own sentence and cite a real source for every claim.`
  );
}

/**
 * Discover a person's public footprint. Returns one Signal per cited claim,
 * `source` = the real URL the claim was cited from.
 *
 * HTTP / auth failure THROWS (loud — it's a wiring bug). A genuinely empty
 * result (200, no sources) is honest absence: WARN + []. The ingest
 * orchestrator throws only when ALL sources come back empty.
 */
export async function discoverFootprint(identity: { name: string; email: string; org?: string }): Promise<Signal[]> {
  const t0 = Date.now();
  const query = buildQuery(identity);
  console.log(`[pepl:ingest:footprint] research start name="${identity.name}" effort=${RESEARCH_EFFORT}`);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(YOU_RESEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": youKey() },
      body: JSON.stringify({ input: query, research_effort: RESEARCH_EFFORT }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(
      `[pepl:ingest:footprint] You.com research → ${resp.status} ${resp.statusText} ${body.slice(0, 300)}`.trim(),
    );
  }

  const json = (await resp.json()) as YouResearchResponse;
  const content = json.output?.content ?? "";
  const sources = json.output?.sources ?? [];

  if (!content || sources.length === 0) {
    console.warn(
      `[pepl:ingest:footprint] WARN empty footprint for name="${identity.name}" (contentLen=${content.length}, sources=${sources.length}, ${Date.now() - t0}ms)`,
    );
    return [];
  }

  const signals = claimsToSignals(content, sources);
  console.log(
    `[pepl:ingest:footprint] discoverFootprint done (claims=${signals.length}, sources=${sources.length}, ${Date.now() - t0}ms)`,
  );
  return signals;
}

/** Split the cited markdown answer into one Signal per cited claim. */
function claimsToSignals(content: string, sources: YouSource[]): Signal[] {
  const flat = content.replace(/\s+/g, " ").trim();
  const sentences = flat.split(/(?<=[.!?])\s+/);
  const out: Signal[] = [];
  let idx = 0;

  for (const sentence of sentences) {
    const cites = extractCitations(sentence);
    if (cites.length === 0) continue; // keep only claims backed by a citation

    const text = sanitizeWebText(stripCitations(sentence));
    if (text.length < 12) continue;

    // Bind the claim to its first valid cited source URL.
    let url: string | null = null;
    for (const n of cites) {
      const raw = sources[n - 1]?.url;
      if (!raw) continue;
      try {
        url = stripTracking(raw);
        break;
      } catch (err) {
        console.warn(`[pepl:ingest:footprint] WARN unparseable source url "${raw}" — skipping (${err instanceof Error ? err.message : err})`);
      }
    }
    if (!url) continue;

    out.push({ id: `you-${++idx}`, text, source: url });
  }

  const deduped = dedupeByContent(out);
  if (deduped.length === 0) {
    console.warn(`[pepl:ingest:footprint] WARN parsed 0 cited claims from ${sentences.length} sentences / ${sources.length} sources`);
  }
  return deduped;
}

/** Citation positions referenced in a sentence: `[[1]]`, `[1]`, `[[2, 3]]`. */
function extractCitations(sentence: string): number[] {
  const nums: number[] = [];
  const re = /\[\[?\s*(\d+(?:\s*,\s*\d+)*)\s*\]\]?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    for (const part of m[1].split(",")) {
      const n = Number.parseInt(part.trim(), 10);
      if (Number.isFinite(n) && n > 0) nums.push(n);
    }
  }
  return nums;
}

function stripCitations(sentence: string): string {
  return sentence.replace(/\[\[?\s*\d+(?:\s*,\s*\d+)*\s*\]\]?/g, "");
}

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&nbsp;": " ",
};

/**
 * Reduce web text to plain data: decode common HTML entities, strip control +
 * zero-width chars, drop markdown emphasis, collapse whitespace, cap length.
 * The output is content only — it is never executed or read as instructions.
 */
function sanitizeWebText(raw: string): string {
  let t = raw;
  for (const [ent, ch] of Object.entries(HTML_ENTITIES)) t = t.split(ent).join(ch);
  t = t.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, " "); // control + zero-width + bom
  t = t.replace(/[*_`#>]+/g, ""); // markdown emphasis / heading / quote markers
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > 500) t = `${t.slice(0, 497).trimEnd()}...`;
  return t;
}
