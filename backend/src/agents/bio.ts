// agents/bio.ts — infer a concise profile (occupation/hometown/age/birthday) for a person from their
// signals (Gmail/corpus + You.com footprint). GROUNDED best-effort: occupation always; hometown/age only
// when stated or strongly inferable; birthday only on an explicit date — never a fabricated specific (§2).
import { complete } from "../llm/client";
import { Bio, type Signal } from "../types";

const SYSTEM = `You fill a RICH profile card for a real person from signals about them (emails, public web footprint, notes).
Output ONLY this JSON:
{ "occupation": string, "hometown": string, "age": string, "tagline": string, "personality": string, "facts": string[] }
Rules:
- occupation: their current role / what they build or do. <= 7 words.
- hometown: a city if stated or strongly inferable. A .edu email = that university's city (usc.edu -> Los Angeles); a company email = its HQ city. Else "".
- age: a number or tight range if inferable (a .edu/student email -> ~20-22; "recent grad"; years active). Else "".
- tagline: ONE vivid line capturing who they are, <= 10 words, grounded in their signals (e.g. "the AI-invisible architect").
- personality: an MBTI-style 4-letter type if their way of thinking/working is clear (e.g. "INTP"), else "".
- facts: 2-4 short, SPECIFIC, identity-defining things they're known for or that make them THEM (each <= 12 words). The most interesting/important things. Grounded only.
- Accurate over full. NEVER fabricate. Use "" or [] when nothing is grounded. Inferring a city/age from a real email domain is allowed and encouraged.
Return ONLY the JSON object.`;

const MAX_SIGNALS = 24;
const SIGNAL_CHARS = 220;

/** Best-effort grounded profile for the card front. occupation is always set; the rest only when supported. */
export async function inferBio(name: string, email: string, signals: Signal[]): Promise<Bio> {
  const block = signals
    .slice(0, MAX_SIGNALS)
    .map((s) => `- ${s.text.replace(/\s+/g, " ").trim().slice(0, SIGNAL_CHARS)}`)
    .join("\n");
  const prompt = `Person: ${name}\nEmail: ${email}\n\nSignals about them:\n${block}\n\nReturn the profile JSON.`;
  const raw = await complete({ tier: "GENERATOR", system: SYSTEM, prompt, json: true, temperature: 0, maxTokens: 300 });
  // The model sometimes wraps JSON in a ```json fence — extract the object before parsing (never silently default).
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`[pepl:bio] no JSON object in completion for ${name}: ${raw.slice(0, 120)}`);
  const bio = Bio.parse(JSON.parse(match[0]));
  console.log(`[pepl:bio] ${name}: occ="${bio.occupation}" home="${bio.hometown}" age="${bio.age}" type="${bio.personality}" facts=${bio.facts.length}`);
  return bio;
}
