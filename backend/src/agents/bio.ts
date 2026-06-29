// agents/bio.ts — infer a concise profile (occupation/hometown/age/birthday) for a person from their
// signals (Gmail/corpus + You.com footprint). GROUNDED best-effort: occupation always; hometown/age only
// when stated or strongly inferable; birthday only on an explicit date — never a fabricated specific (§2).
import { complete } from "../llm/client";
import { Bio, type Signal } from "../types";

const SYSTEM = `You fill a profile card for a real person from signals about them (emails, public web footprint, notes).
Output ONLY this JSON: { "occupation": string, "hometown": string, "age": string, "birthday": string }
Rules:
- occupation: ALWAYS fill — their current role / what they build or do, inferred from the signals. <= 7 words.
- hometown: a city/place if stated or strongly inferable. A .edu email = that university's city (e.g. usc.edu -> Los Angeles); a company email = its HQ city. Else "".
- age: a number or tight range if inferable (a .edu/student email -> typical undergrad age ~20-22; "recent grad"; years active), else "".
- birthday: ONLY if an explicit date appears in the signals, else "".
- Accurate over full. NEVER fabricate a specific false fact (no invented birthday). Inferring a city/age from a real email domain is allowed and encouraged.
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
  console.log(`[pepl:bio] ${name}: occ="${bio.occupation}" home="${bio.hometown}" age="${bio.age}" bday="${bio.birthday}"`);
  return bio;
}
