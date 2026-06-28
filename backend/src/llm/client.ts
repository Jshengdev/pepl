export type Tier = "GENERATOR" | "CRITIC" | "EXTRACT";

/**
 * Model slugs per provider. The held-out rule lives here: GENERATOR and CRITIC
 * must be different families (the critic never grades its own family's work).
 */
const MODELS: Record<string, Record<Tier, string>> = {
  openrouter: {
    GENERATOR: "anthropic/claude-sonnet-4.6",
    CRITIC: "qwen/qwen3-235b-a22b-2507",
    EXTRACT: "anthropic/claude-haiku-4.5",
  },
  insforge: {
    GENERATOR: "", // pepl: TODO fill from docs.insforge.dev at S2 — no invented slugs
    CRITIC: "", // pepl: TODO fill from docs.insforge.dev at S2 — no invented slugs
    EXTRACT: "", // pepl: TODO fill from docs.insforge.dev at S2 — no invented slugs
  },
};

const ENDPOINTS: Record<string, { baseUrl: string; keyEnv: string }> = {
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyEnv: "OPENROUTER_API_KEY" },
  insforge: { baseUrl: "", keyEnv: "INSFORGE_API_KEY" }, // pepl: TODO base URL from docs.insforge.dev at S2
};

export { MODELS };

/** Active provider, resolved at call time so .env load order never matters. */
function provider(): string {
  return process.env.LLM_PROVIDER ?? "insforge";
}

/** Model family = slug prefix before "/" (anthropic, qwen, google…). */
export function modelFamily(slug: string): string {
  return slug.split("/")[0] ?? slug;
}

/**
 * Fail CLOSED if the active provider's generator and critic share a family.
 * Called at boot and (later) per critic call. Throws on unfilled slugs too,
 * so booting on insforge before S2 fills the registry fails loudly.
 */
export function assertHeldOutCritic(): void {
  const p = provider();
  const models = MODELS[p];
  if (!models) throw new Error(`[pepl:llm] unknown LLM_PROVIDER="${p}" (known: ${Object.keys(MODELS).join(", ")})`);
  const gen = models.GENERATOR;
  const crit = models.CRITIC;
  if (!gen || !crit) {
    throw new Error(
      `[pepl:llm] provider "${p}" model slugs not filled (GENERATOR="${gen}", CRITIC="${crit}") — fill from docs.insforge.dev at S2 before booting on ${p}`,
    );
  }
  const genFam = modelFamily(gen);
  const critFam = modelFamily(crit);
  if (genFam === critFam) {
    throw new Error(
      `[pepl:llm] FATAL held-out violation: generator (${gen}) and critic (${crit}) share family "${genFam}" — the critic must never grade its own family's work`,
    );
  }
  console.log(`[pepl:llm] held-out assert -> generator=${gen} (${genFam}) != critic=${crit} (${critFam}) -> ok`);
}

export interface CompleteOptions {
  tier: Tier;
  system: string;
  prompt: string;
  /** Ask the gateway for a JSON object response. */
  json?: boolean;
  /** 0 for deterministic grading/extraction; omit for the provider default. */
  temperature?: number;
  /** Cap output tokens when a stage has a known bound. */
  maxTokens?: number;
}

/**
 * The single entry for every model call. Provider is swappable in this file alone.
 * Resolves base URL + key for the active provider; throws LOUDLY if the key is missing.
 * Not exercised at S1 — wired live at S2.
 */
export async function complete(opts: CompleteOptions): Promise<string> {
  const p = provider();
  const ep = ENDPOINTS[p];
  const models = MODELS[p];
  if (!ep || !models) throw new Error(`[pepl:llm] unknown LLM_PROVIDER="${p}" (known: ${Object.keys(MODELS).join(", ")})`);
  const model = models[opts.tier];
  if (!model) throw new Error(`[pepl:llm] provider "${p}" has no slug for tier ${opts.tier} — fill from docs.insforge.dev at S2`);
  if (!ep.baseUrl) throw new Error(`[pepl:llm] provider "${p}" base URL not set — fill from docs.insforge.dev at S2`);
  const key = process.env[ep.keyEnv];
  if (!key) throw new Error(`[pepl:llm] ${ep.keyEnv} is required for provider "${p}" (read from backend/.env) — refusing to call ${model}`);

  const t0 = Date.now();
  const res = await fetch(`${ep.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[pepl:llm] ${p} ${model} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`[pepl:llm] EMPTY_COMPLETION model=${model} tier=${opts.tier} (${Date.now() - t0}ms)`);
  console.log(`[pepl:llm] ${opts.tier} ${model} -> ${text.length} chars (${Date.now() - t0}ms)`);
  return text;
}
