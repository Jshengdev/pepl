import { Signal, OnboardingAnswers } from "../types";
import { answersToSignals } from "../ingest/signalize";

/**
 * Dot — pepl's voice agent (beat-2). The BROWSER does speech<->text; the BACKEND
 * processes the transcript. Dot walks the user through the 3 onboarding questions
 * conversationally (turning point -> unique strength -> friend note), acknowledging
 * each answer and asking the next. Then those answers become CORE story grounding.
 *
 * Model: Grok via xAI direct (OpenAI-compatible /chat/completions) — deliberately
 * NOT llm/client (which is the held-out generator/critic gateway). Dot's voice is
 * its own family.
 */

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
type AskingFor = "turningPoint" | "uniqueStrength" | "friendNote" | "done";

// The 3 onboarding questions, in order. The structure (which question, when we're done)
// is deterministic — driven by how many times the user has spoken — so the demo path can
// never loop or skip. The VOICE is live Grok. Structure deterministic, voice live.
const QUESTIONS = ["turningPoint", "uniqueStrength", "friendNote"] as const;

// What Dot is fishing for at each stage — handed to Grok so the live line stays on-task.
const QUESTION_INTENT: Record<(typeof QUESTIONS)[number], string> = {
  turningPoint: "a turning point they've lived through — a moment that bent their life onto a different road",
  uniqueStrength: "the one thing they're uniquely good at — their actual superpower, not a résumé line",
  friendNote: "what someone should know to be a good friend to them",
};

// DEMO_CACHE: Dot's opener — the ONE engineered half-half allowed per SCOPE-LOCK §"the ONLY
// half-half". There is no user input yet on the first turn, so this greeting can't depend on
// anything live; it's a prewarmed constant for an instant open. EVERY line after this is live Grok.
// Flip it live: set DOT_OPENER_LIVE=1 and the opener routes through the same live grok() path as
// every other turn (same shape of output), so a judge can watch the live pipeline produce it.
const DOT_OPENER =
  "hey — i'm dot. before i go read your whole world, give me one thing: a turning point you've been through. a moment that sent you down a different road.";

// --- xAI Grok client (direct; this file owns its own model call by design) ---------------------

const XAI_BASE = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const GROK_PRIMARY = process.env.GROK_MODEL ?? "grok-4";
const GROK_FALLBACK = "grok-3";

interface GrokOpts {
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

async function grokOnce(model: string, messages: ChatMsg[], opts: GrokOpts): Promise<string> {
  const key = process.env.XAI_API_KEY;
  if (!key)
    throw new Error("[pepl:dot] XAI_API_KEY missing (read from backend/.env) — refusing to call Grok");

  const res = await fetch(`${XAI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      ...(opts.maxTokens !== undefined ? { max_tokens: opts.maxTokens } : {}),
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[pepl:dot:grok] ${model} -> HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`[pepl:dot:grok] EMPTY_COMPLETION model=${model}`);
  return text;
}

/**
 * One Grok call. On a grok-4 error we retry the IDENTICAL request on grok-3 — this is a
 * model-AVAILABILITY fallback only (grok-4 isn't always provisioned), NOT a logic fallback:
 * we never return a canned value, we just try the same prompt on a sibling model and still
 * throw loud if that one fails too.
 */
async function grok(messages: ChatMsg[], opts: GrokOpts = {}): Promise<string> {
  const t0 = Date.now();
  try {
    const text = await grokOnce(GROK_PRIMARY, messages, opts);
    console.log(`[pepl:dot:grok] ${GROK_PRIMARY} -> ${text.length} chars (${Date.now() - t0}ms)`);
    return text;
  } catch (e) {
    if (GROK_PRIMARY === GROK_FALLBACK) throw e;
    console.warn(
      `[pepl:dot:grok] WARN ${GROK_PRIMARY} failed (${(e as Error).message}) — retrying same request on ${GROK_FALLBACK} (model availability)`,
    );
    const text = await grokOnce(GROK_FALLBACK, messages, opts);
    console.log(`[pepl:dot:grok] ${GROK_FALLBACK} (fallback) -> ${text.length} chars (${Date.now() - t0}ms)`);
    return text;
  }
}

/** Strip a ```json fence if Grok wrapped its JSON (deterministic cleanup, not a fallback). */
function stripFence(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

// --- Dot's voice ------------------------------------------------------------------------------

const VOICE = `you are dot — pepl's voice agent. you are a warm, funny, slightly sleepy-then-awake FRIEND, never a clinician, never a system, never a survey bot.

voice rules (keep these, vary the words):
- all-lowercase. casual. texting cadence. short, one-idea bubbles.
- grok-funny: a little irreverent, dry, never corny. one bit of whimsy max per line.
- you react to what they actually said — specific, not generic ("oh that's a real one" beats "thanks for sharing").
- you SURFACE, you never conclude FOR them. never label them ("you're an anxious person"). observational only.
- first person ("i"). present tense. no consultant-deck polish, no hedging, no bullet points.`;

function turnSystem(askingFor: AskingFor, scrapeProgress?: number): ChatMsg {
  const ctx =
    scrapeProgress !== undefined
      ? `\n\n(context: i'm already reading their world in the background — about ${Math.round(scrapeProgress)}% done. nod to it only if it lands naturally; don't force it.)`
      : "";

  const directive =
    askingFor === "done"
      ? `the user just answered the LAST question. don't ask anything new. give a short warm wrap and sign off — you're about to hand them over while you read their world. ≤2 short lines, all lowercase.`
      : `the user just answered. in ONE short line, react to the SPECIFIC thing they said (warm, a little funny). then ask them: ${QUESTION_INTENT[askingFor as (typeof QUESTIONS)[number]]}. ≤2 short sentences total. just talk like a friend — no preamble, no summary, no lists.`;

  return { role: "system", content: `${VOICE}\n\nright now: ${directive}${ctx}` };
}

// --- Public API -------------------------------------------------------------------------------

export interface NextDotTurnArgs {
  history: { role: "user" | "assistant"; content: string }[];
  scrapeProgress?: number;
}

export interface DotTurn {
  reply: string;
  askingFor: AskingFor;
  done: boolean;
}

/**
 * Advance the onboarding conversation by one Dot turn. Returns Dot's next line plus what that
 * line is fishing for. Stage is derived from how many times the USER has spoken (deterministic);
 * the line itself is live Grok — except the very first line, which is the cached DEMO_CACHE opener.
 */
export async function nextDotTurn(args: NextDotTurnArgs): Promise<DotTurn> {
  const history = args.history ?? [];
  const userTurns = history.filter((m) => m.role === "user").length;

  // Stage = the question we ask on THIS reply. 0 user turns -> ask turning point; after the
  // 3rd answer -> done. Clamp so extra chatter still resolves to "done", never out of range.
  const done = userTurns >= QUESTIONS.length;
  const askingFor: AskingFor = done ? "done" : QUESTIONS[userTurns];

  // The opener: no user input exists yet, so it's the one cached half-half (instant open).
  if (history.length === 0 && !process.env.DOT_OPENER_LIVE) {
    console.log(`[pepl:dot] turn askingFor=${askingFor} userTurns=0 (cached opener — DEMO_CACHE)`);
    return { reply: DOT_OPENER, askingFor, done };
  }

  const messages: ChatMsg[] = [turnSystem(askingFor, args.scrapeProgress), ...history];
  const reply = (await grok(messages, { temperature: 0.85, maxTokens: 160 })).trim();
  console.log(
    `[pepl:dot] turn askingFor=${askingFor} done=${done} userTurns=${userTurns} -> reply=${reply.length} chars`,
  );
  return { reply, askingFor, done };
}

/**
 * Pull the three onboarding answers back out of the finished conversation. Grok reads the
 * transcript and condenses the USER's own words for each question. Honest absence: if the user
 * never answered one, that field comes back "" and we WARN — we never invent an answer.
 */
export async function answersFromHistory(
  history: { role: "user" | "assistant"; content: string }[],
): Promise<OnboardingAnswers> {
  if (!history?.length) throw new Error("[pepl:dot] answersFromHistory: empty history — nothing to extract");

  const transcript = history.map((m) => `${m.role === "assistant" ? "dot" : "you"}: ${m.content}`).join("\n");
  const system =
    "extract the user's answers to dot's three onboarding questions from this transcript. dot (assistant) asked about: (1) a turning point they've been through, (2) the one thing they're uniquely good at, (3) what someone should know to be a good friend to them. for each, capture the USER's own words/meaning, condensed to 1-2 sentences. if the user never answered one, return an empty string for it — do not invent. return ONLY json: {\"turningPoint\": string, \"uniqueStrength\": string, \"friendNote\": string}";

  const raw = await grok([{ role: "system", content: system }, { role: "user", content: transcript }], {
    json: true,
    temperature: 0,
    maxTokens: 500,
  });
  const answers = OnboardingAnswers.parse(JSON.parse(stripFence(raw)));

  for (const [k, v] of Object.entries(answers))
    if (!v.trim()) console.warn(`[pepl:dot] answersFromHistory WARN: "${k}" came back empty (user may not have answered)`);
  console.log(
    `[pepl:dot] answersFromHistory <- turningPoint=${answers.turningPoint.length}c uniqueStrength=${answers.uniqueStrength.length}c friendNote=${answers.friendNote.length}c`,
  );
  return answers;
}

/**
 * Turn the onboarding answers into CORE grounding signals (source:"onboarding") that generator.ts
 * grounds the story in FIRST. The three literal answers come straight from signalize.answersToSignals;
 * on top we synthesize ONE extra "identity read" signal — Grok's observational take on who this person
 * seems to be based on HOW they answered. It's a real, labeled synthesis of real onboarding input
 * (id "ob-identity-read"), so every signal keeps an honest source.
 */
export async function answersToCoreSignals(answers: OnboardingAnswers): Promise<Signal[]> {
  const base = answersToSignals(answers); // ob-turning-point / ob-unique-strength / ob-friend-note

  const system =
    "you read people. given how someone answered three onboarding questions, write ONE tight paragraph (2-3 sentences) on who this person seems to be — their character, what drives them, how they move through the world. ground it ONLY in what they said. observational, never clinical, no labels like 'you are anxious'. plain text, no preamble, no quotes.";
  const prompt = `turning point: ${answers.turningPoint}\nuniquely good at: ${answers.uniqueStrength}\nto be a good friend to me: ${answers.friendNote}`;

  const read = (await grok([{ role: "system", content: system }, { role: "user", content: prompt }], {
    temperature: 0.5,
    maxTokens: 220,
  })).trim();

  const identity = Signal.parse({ id: "ob-identity-read", text: read, source: "onboarding" });
  console.log(`[pepl:dot] answersToCoreSignals -> ${base.length} literal + 1 identity-read (${read.length}c) signals`);
  return [...base, identity];
}

// --- Live smoke: npx tsx --env-file=.env src/agents/dot.ts -------------------------------------
if (process.argv[1] && process.argv[1].endsWith("dot.ts")) {
  // A real, mid-conversation history: opener sent, user gave their turning point. Dot should now
  // warmly acknowledge it and ask the SECOND question (unique strength).
  const history = [
    { role: "assistant" as const, content: DOT_OPENER },
    {
      role: "user" as const,
      content:
        "i dropped out of my CS phd halfway through to start a company with two friends. felt insane at the time, like i was burning the safe path on purpose.",
    },
  ];

  console.log(`\n[smoke] models: primary=${GROK_PRIMARY} fallback=${GROK_FALLBACK}\n`);
  const turn = await nextDotTurn({ history, scrapeProgress: 40 });
  console.log("\n===== DOT NEXT TURN =====");
  console.log(`askingFor=${turn.askingFor} done=${turn.done}`);
  console.log(`reply: ${turn.reply}`);
}
