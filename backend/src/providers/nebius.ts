// Nebius Token Factory — OpenAI-compatible inference + embeddings.
// Provider shape brought from the sia config (base_url + NEBIUS_API_KEY, client_kind "openai").
// Opt-in via NEBIUS_ENABLED (off by default); when off, callers skip it and nothing else changes.
//
// Two roles in pepl:
//   1) An LLM provider tier — registered in llm/client.ts as "nebius" (gpt-oss-120b generator,
//      Qwen3 critic — held-out, different family). Activate with LLM_PROVIDER=nebius.
//   2) Embeddings for people-similarity (the connection graph): nebiusEmbed() -> vectors,
//      cosineSimilarity() to score how two people's signal-sets overlap.

const NEBIUS_BASE = process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.us-central1.nebius.com/v1";
const EMBED_MODEL = process.env.NEBIUS_EMBED_MODEL ?? "Qwen/Qwen3-Embedding-8B";

/** Nebius is opt-in. Off by default — the rest of the pipeline never depends on it. */
export function nebiusEnabled(): boolean {
  return process.env.NEBIUS_ENABLED === "true";
}

function nebiusKey(): string {
  const key = process.env.NEBIUS_API_KEY ?? "";
  if (!key) throw new Error("[pepl:nebius] NEBIUS_API_KEY not set — required when NEBIUS_ENABLED=true.");
  return key;
}

/** Embed texts via Nebius (OpenAI-compatible /embeddings). One vector per input, order preserved. */
export async function nebiusEmbed(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const t0 = Date.now();
  const res = await fetch(`${NEBIUS_BASE}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${nebiusKey()}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[pepl:nebius] embeddings -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { data?: Array<{ embedding: number[] }> };
  const vecs = (data.data ?? []).map((d) => d.embedding);
  if (vecs.length !== texts.length)
    throw new Error(`[pepl:nebius] embedding count mismatch: got ${vecs.length} for ${texts.length} inputs`);
  console.log(`[pepl:nebius] embedded ${vecs.length} texts model=${EMBED_MODEL} (${Date.now() - t0}ms)`);
  return vecs;
}

/** Cosine similarity between two vectors — the people-overlap score for the connection graph. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
