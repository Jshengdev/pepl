import { Signal } from "../types";

/**
 * Dot — pepl's voice agent (beat-2, v3 free-turn flow). The BROWSER does speech<->text
 * (Web Speech API per INTEGRATION.md §Page 2): the `text` arriving in dotTurn IS the transcript.
 * The backend NEVER fakes STT — no audio ever reaches here. Grok (grok-4, xAI direct) writes Dot's
 * witty spoken reply; the front-end speaks it.
 *
 * The flow: introLine() = the CACHED opener + ONE seed question (instant, no live input to depend on
 * yet). Then a free back-and-forth — every user turn, Dot reacts to what they said + asks one
 * follow-up (done:false), so there is always ≥1 follow-up. When the FE's 30s timer fires wrapUp:true
 * (~25s), Dot says the timer line + buddy sign-off (done:true). Personality is light for v1:
 * talk · respond · follow up · respond · wrap.
 *
 * Grounding: every USER turn becomes a Signal{source:"onboarding"}, collected per user and folded
 * into the dossier as CORE grounding at reveal time (see onboardingSignals()).
 *
 * Grok is deliberately NOT llm/client (the held-out generator/critic gateway) — Dot's voice is its
 * own family, and the critic must never grade its own family's work.
 */

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// DEMO_CACHE: Dot's opener + seed question — the ONE engineered half-half. There is no user input
// on the first turn, so this line can't depend on anything live; it's a prewarmed constant for an
// instant open. EVERY line after this is live Grok reacting to the real transcript. (The seed
// wording is verbatim from reference/NARRATOR-THE-DOT.md §4; lowercased to Dot's voice DNA.)
const OPENER = "hey — i'm dot. i'm about to go read your whole world, but first, talk to me for a sec.";
const SEED_QUESTION = "how do you spend your day? doing anything today you normally do?";
const INTRO_TEXT = `${OPENER} ${SEED_QUESTION}`;

// The wrap beat — verbatim sign-off copy (intended UX, NOT a faked pipeline result). Deterministic
// so the final beat can't ramble past the 30s budget. From reference/NARRATOR-THE-DOT.md §4.
const WRAP_LINE = "ok, timer's about to be up…";
const SIGN_OFF = "thanks bro, ima send u over to my buddy.";

const VOICE = `you are dot — pepl's voice agent. you are a warm, funny, slightly sleepy-then-awake FRIEND, never a clinician, never a system, never a survey bot.

voice rules (keep these, vary the words):
- all-lowercase. casual. texting cadence. short, one-idea bubbles.
- grok-funny: a little irreverent, dry, never corny. one bit of whimsy max per line.
- you react to what they actually said — specific, not generic ("oh that's a real one" beats "thanks for sharing").
- you SURFACE, you never conclude FOR them. never label them ("you're an anxious person"). observational only.
- first person ("i"). present tense. no consultant-deck polish, no hedging, no bullet points.`;

// --- xAI Grok client (direct; this file owns its own model call by design) ---------------------

const XAI_BASE = process.env.XAI_BASE_URL ?? "https://api.x.ai/v1";
const GROK_PRIMARY = process.env.GROK_MODEL ?? "grok-4";
const GROK_FALLBACK = "grok-3";

interface GrokOpts {
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
 * One Grok call. On a grok-4 error we retry the IDENTICAL request on grok-3 — a model-AVAILABILITY
 * fallback only (grok-4 isn't always provisioned), NOT a logic fallback: we never return a canned
 * value, we just try the same prompt on a sibling model and still throw loud if that one fails too.
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

// pepl: no Grok/xAI TTS endpoint exists, so audioUrl is ALWAYS null and the front-end speaks Dot's
// text with browser SpeechSynthesis (INTEGRATION.md §Page 2: mouth-sync from text/amplitude). We
// NEVER fabricate an audio url — that would be a §2 silent fake. Upgrade path: when a real TTS
// endpoint is provisioned, set DOT_TTS_URL and synth here. Until a client is wired, a set
// DOT_TTS_URL fails LOUD rather than letting us quietly ship a fake/missing url.
function tts(_text: string): string | null {
  if (process.env.DOT_TTS_URL)
    throw new Error("[pepl:dot] DOT_TTS_URL is set but no TTS client is wired — refusing to fake/skip an audio url");
  return null;
}

// --- Per-user onboarding session --------------------------------------------------------------
// pepl: in-memory per-user session (collect). Durable persistence happens when the dossier is saved
// at reveal — the wire layer folds onboardingSignals(userId) in as CORE grounding (saveDossier in
// memory/store.ts). Ceiling: lost on a backend restart; fine for the 30-second onboarding window.

interface Session {
  history: { role: "user" | "assistant"; content: string }[];
  signals: Signal[];
}

const sessions = new Map<string, Session>();

function session(userId: string): Session {
  let s = sessions.get(userId);
  if (!s) {
    // Seed the cached opener as the conversation's first beat so live Grok has it as context.
    s = { history: [{ role: "assistant", content: INTRO_TEXT }], signals: [] };
    sessions.set(userId, s);
  }
  return s;
}

function turnDirective(): ChatMsg {
  return {
    role: "system",
    content: `${VOICE}

right now: the user just answered (their words are the last 'user' message). in ONE short line, react to the SPECIFIC thing they said — warm, a little funny, specific not generic. then ask ONE natural follow-up that digs a little deeper into their day / their world. ≤2 short sentences total, all lowercase. no preamble, no summary, no lists.`,
  };
}

// --- Public API -------------------------------------------------------------------------------

export interface DotIntro {
  text: string;
  audioUrl: string | null;
}

/** The cached opener + ONE seed question — instant, no live call (DEMO_CACHE). audioUrl: FE speaks it. */
export function introLine(): DotIntro {
  console.log(`[pepl:dot] intro (cached opener+seed — DEMO_CACHE, ${INTRO_TEXT.length}c)`);
  return { text: INTRO_TEXT, audioUrl: tts(INTRO_TEXT) };
}

export interface DotTurnArgs {
  userId: string;
  /** The transcript — the browser's STT produced it. We never re-derive or invent it. */
  text: string;
  /** The FE's ~25s timer fired: reply the wrap + buddy sign-off and end the conversation. */
  wrapUp?: boolean;
}

export interface DotReply {
  transcript: string;
  reply: { text: string; audioUrl: string | null };
  done: boolean;
}

/**
 * Advance the onboarding conversation by one Dot turn. `text` IS the transcript (browser STT); we
 * bank it as a Signal{source:"onboarding"} (CORE grounding), then either wrap (done:true) or have
 * live Grok react + ask one follow-up (done:false). done is driven by wrapUp so the FE's 30s timer
 * owns when it ends — never a hidden turn-count fallback.
 */
export async function dotTurn(args: DotTurnArgs): Promise<DotReply> {
  const { userId, wrapUp = false } = args;
  const transcript = args.text?.trim();
  if (!userId) throw new Error("[pepl:dot] dotTurn: userId required");
  if (!transcript)
    throw new Error("[pepl:dot] dotTurn: empty text — browser STT produced nothing (never fake a transcript)");

  const s = session(userId);

  // The user turn IS the transcript. Record it + bank it as a CORE grounding signal (honest source).
  s.history.push({ role: "user", content: transcript });
  const sig = Signal.parse({ id: `ob-${userId}-${s.signals.length}`, text: transcript, source: "onboarding" });
  s.signals.push(sig);

  // The wrap beat: verbatim sign-off copy, deterministic so it can't overrun the 30s budget.
  if (wrapUp) {
    const text = `${WRAP_LINE} ${SIGN_OFF}`;
    s.history.push({ role: "assistant", content: text });
    console.log(`[pepl:dot] turn user=${userId} WRAP done=true signals=${s.signals.length}`);
    return { transcript, reply: { text, audioUrl: tts(text) }, done: true };
  }

  // Otherwise: live Grok reacts to what they said + asks ONE follow-up (done:false keeps the
  // back-and-forth alive until the timer wraps it — guarantees ≥1 follow-up).
  const t0 = Date.now();
  const messages: ChatMsg[] = [turnDirective(), ...s.history];
  const text = (await grok(messages, { temperature: 0.85, maxTokens: 160 })).trim();
  if (!text) throw new Error(`[pepl:dot] dotTurn: empty Grok reply user=${userId}`);
  s.history.push({ role: "assistant", content: text });
  const userTurns = s.history.filter((m) => m.role === "user").length;
  console.log(
    `[pepl:dot] turn user=${userId} done=false userTurns=${userTurns} reply=${text.length}c signals=${s.signals.length} (${Date.now() - t0}ms)`,
  );
  return { transcript, reply: { text, audioUrl: tts(text) }, done: false };
}

/**
 * Collect a user's onboarding turns as CORE grounding signals (source:"onboarding"). The reveal
 * folds these in FIRST so the story grounds in what the user said about their own day, then in
 * Gmail/footprint. Honest absence: [] (logged WARN) if they never spoke — never invented.
 */
export function onboardingSignals(userId: string): Signal[] {
  const sigs = sessions.get(userId)?.signals ?? [];
  if (!sigs.length) console.warn(`[pepl:dot] onboardingSignals WARN user=${userId} -> 0 (no onboarding turns banked)`);
  else console.log(`[pepl:dot] onboardingSignals user=${userId} -> ${sigs.length}`);
  return sigs;
}

// --- Live smoke: npx tsx --env-file=.env src/agents/dot.ts -------------------------------------
if (process.argv[1] && process.argv[1].endsWith("dot.ts")) {
  console.log(`\n[smoke] models: primary=${GROK_PRIMARY} fallback=${GROK_FALLBACK}\n`);
  const userId = "smoke-johnny";

  // 1) The instant cached intro.
  console.log("===== INTRO (cached) =====");
  console.log(JSON.stringify(introLine()));

  // 2) A real user answer -> live grok-4 witty reply + one follow-up (done:false).
  const t1 = await dotTurn({
    userId,
    text: "honestly just code all day. woke up, coffee, been debugging a voice agent for like four hours straight.",
  });
  console.log("\n===== TURN 1 (live grok-4) =====");
  console.log(`done=${t1.done} audioUrl=${t1.reply.audioUrl}`);
  console.log(`transcript: ${t1.transcript}`);
  console.log(`reply: ${t1.reply.text}`);

  // 3) The wrap beat (FE ~25s timer) -> sign-off, done:true.
  const t2 = await dotTurn({
    userId,
    text: "yeah pretty normal day for me to be deep in it like this.",
    wrapUp: true,
  });
  console.log("\n===== TURN 2 (wrapUp) =====");
  console.log(`done=${t2.done} audioUrl=${t2.reply.audioUrl}`);
  console.log(`reply: ${t2.reply.text}`);

  // 4) The banked onboarding grounding.
  console.log("\n===== ONBOARDING SIGNALS =====");
  console.log(JSON.stringify(onboardingSignals(userId), null, 2));
}
