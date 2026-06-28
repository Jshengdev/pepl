import type { RawEmail } from "../composio/gmail";
import { complete } from "../../llm/client";

// Local-part patterns that are unmistakably automated — dropped without asking the model.
const AUTOMATED_LOCAL =
  /^(no-?reply|do-?not-?reply|donotreply|notifications?|notify|mailer(-daemon)?|postmaster|bounce[ds]?|auto-?(reply|confirm)|alerts?)$/i;

// "USC" <anything@usc.edu>, "Handshake" <…@handshake.com>, "a16z" <…@a16z.com>:
// when the display name is literally inside the email's domain, the sender is the
// brand, not a person. The cheapest, highest-precision org tell.
function displayNameInDomain(name: string, domain: string): boolean {
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nameKey.length < 2) return false;
  const root = (domain.split(".")[0] ?? "").toLowerCase();
  return root.length >= 2 && root.includes(nameKey);
}

interface Sender {
  name: string;
  email: string;
  domain: string;
}

/**
 * Two-stage human filter. Stage 1 deterministically drops noreply/brand senders;
 * stage 2 asks the model ONCE, batched, to judge the remaining org-vs-person calls.
 * Never silently drops: if the model call fails, every ambiguous sender is KEPT
 * and the failure is logged LOUD.
 */
export async function classifyHumanSenders(emails: RawEmail[]): Promise<RawEmail[]> {
  const t0 = Date.now();
  if (emails.length === 0) {
    console.warn("[pepl:ingest:sender-classifier] WARN no emails to classify (n=0)");
    return [];
  }

  // Unique senders by address; first display name wins.
  const senders = new Map<string, Sender>();
  for (const e of emails) {
    if (senders.has(e.fromEmail)) continue;
    senders.set(e.fromEmail, {
      name: e.fromName || e.fromEmail,
      email: e.fromEmail,
      domain: e.fromEmail.split("@")[1] ?? "",
    });
  }

  // Stage 1: deterministic prefilter.
  const ambiguous: Sender[] = [];
  let autoDropped = 0;
  let brandDropped = 0;
  const humanEmails = new Set<string>();
  for (const s of senders.values()) {
    const local = s.email.split("@")[0] ?? "";
    if (AUTOMATED_LOCAL.test(local)) {
      autoDropped++;
      continue;
    }
    if (displayNameInDomain(s.name, s.domain)) {
      brandDropped++;
      continue;
    }
    ambiguous.push(s);
  }

  // Stage 2: one batched model call over the ambiguous org-vs-person cases.
  if (ambiguous.length > 0) {
    let verdicts: boolean[];
    try {
      verdicts = await classifyOrgVsPerson(ambiguous);
    } catch (err) {
      console.warn(
        `[pepl:ingest:sender-classifier] WARN model classify failed, KEEPING all ${ambiguous.length} ambiguous senders — ${err instanceof Error ? err.message : String(err)}`,
      );
      verdicts = ambiguous.map(() => true);
    }
    ambiguous.forEach((s, i) => {
      if (verdicts[i]) humanEmails.add(s.email);
    });
  }

  const kept = emails.filter((e) => humanEmails.has(e.fromEmail));
  console.log(
    `[pepl:ingest:sender-classifier] senders=${senders.size} autoDropped=${autoDropped} brandDropped=${brandDropped} ambiguous=${ambiguous.length} humans=${humanEmails.size} emailsKept=${kept.length}/${emails.length} (${Date.now() - t0}ms)`,
  );
  return kept;
}

const SYSTEM = `You classify email senders as an individual PERSON or an ORG.
- PERSON = a specific human (friend, colleague, classmate, a recruiter as a named individual).
- ORG = a company, school, club, newsletter, product, or automated service — even when the display name looks like a first name but is really a brand, and even when sent from a personal-looking address.
- Use the name AND domain together. "Sarah Chen"@usc.edu = person; "Daniel"@photon.codes = person; "USC"@usc.edu = org; "a16z" = org; "Handshake" = org; "Employer" = org (a generic role); "Brightspace" = org.
Return ONLY JSON: {"verdicts":[{"i":<index>,"type":"person"|"org"}]}. No prose, no markdown.`;

// Returns one boolean per sender, index-aligned: true = person (keep).
async function classifyOrgVsPerson(senders: Sender[]): Promise<boolean[]> {
  const list = senders.map((s, i) => `${i}. name="${s.name}" domain=${s.domain}`).join("\n");
  const text = await complete({
    tier: "EXTRACT",
    system: SYSTEM,
    prompt: `Classify these ${senders.length} senders:\n${list}`,
    json: true,
    temperature: 0,
  });
  return parseVerdicts(text, senders.length);
}

function parseVerdicts(raw: string, n: number): boolean[] {
  const json = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(json) as unknown;
  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { verdicts?: unknown })?.verdicts;
  if (!Array.isArray(arr)) throw new Error(`sender-classifier: no verdicts array in "${json.slice(0, 120)}"`);
  // Default keep (true) for any index the model omits — conservative, never silently drops.
  const out = new Array<boolean>(n).fill(true);
  for (const item of arr as Array<{ i?: number; type?: string }>) {
    if (typeof item?.i === "number" && item.i >= 0 && item.i < n) {
      out[item.i] = item.type !== "org";
    }
  }
  return out;
}
