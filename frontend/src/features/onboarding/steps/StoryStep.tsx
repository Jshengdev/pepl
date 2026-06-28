"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, ArrowRight } from "lucide-react";
import { dotTurn } from "@/lib/pepl/api";

// Step 1 — "your first story". A 60-second voice note transcribed live via the
// Web Speech API (real recognition, not a mock). The transcript fades out at the
// bottom behind a gradient mask, per the wireframe. Each finished answer is sent
// to Dot (POST /api/dot/turn) — its reply drives the onboarding back-and-forth,
// and every user turn persists server-side as a Signal{source:"onboarding"}.

const DURATION = 60; // seconds

// Speak Dot's reply: the server audioUrl if present, else browser SpeechSynthesis.
// Audio play can be autoplay-blocked — an honest, logged absence (the text reply
// is always shown), never a faked success.
function speak(text: string, audioUrl: string | null) {
  if (typeof window === "undefined") return;
  if (audioUrl) {
    new Audio(audioUrl).play().catch((e) => console.warn("[pepl:story] audio blocked", e));
    return;
  }
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  synth.speak(new SpeechSynthesisUtterance(text));
}

// Minimal typing for the (non-standard-lib) Web Speech API.
type SRResult = { 0: { transcript: string }; isFinal: boolean };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SR = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SRCtor = new () => SR;

function getRecognitionCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

export function StoryStep({
  userId,
  onNext,
}: {
  userId: string;
  onNext: (story: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [remaining, setRemaining] = useState(DURATION);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);

  // Dot back-and-forth: each finished answer → one turn; reply.text is shown +
  // spoken. story accumulates the user's words across turns (handed to onNext).
  const [dotReply, setDotReply] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState(0);
  const [dotError, setDotError] = useState<string | null>(null);
  const [story, setStory] = useState("");

  const recRef = useRef<SR | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    // Feature-detect after mount: SpeechRecognition is window-only, so checking
    // it during render would mismatch SSR. This is the legitimate "read a
    // browser API on mount" case the lint rule otherwise guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
  }, []);

  function stop() {
    console.log("[pepl:story] stop recording");
    recRef.current?.stop();
    recRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    setRecording(false);
    setInterim("");
  }

  function start() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let fin = "";
      let intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) fin += r[0].transcript;
        else intr += r[0].transcript;
      }
      if (fin) setFinalText((prev) => (prev + " " + fin).trim());
      setInterim(intr);
    };
    rec.onerror = (e) => console.warn("[pepl:story] recognition error", e.error);
    rec.onend = () => {
      // Chrome auto-stops on silence; restart while time remains.
      if (recRef.current === rec && remaining > 0) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
    console.log("[pepl:story] start recording (60s)");

    const startedAt = Date.now();
    tickRef.current = setInterval(() => {
      const left = Math.max(0, DURATION - Math.round((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left <= 0) stop();
    }, 200);
  }

  useEffect(() => () => stop(), []); // cleanup on unmount

  // Send the just-spoken answer to Dot as one turn, then clear it for the next.
  async function talkToDot() {
    stop();
    const text = finalText.trim();
    if (!text || sending) return;
    if (!userId) {
      setDotError("no userId yet — connect first");
      return;
    }
    console.log(`[pepl:story] dot turn (n=${turns + 1}, chars=${text.length})`);
    setSending(true);
    setDotError(null);
    try {
      const res = await dotTurn({ userId, text });
      setStory((s) => (s ? `${s} ${text}` : text));
      setDotReply(res.reply.text);
      setTurns((t) => t + 1);
      setFinalText("");
      setInterim("");
      speak(res.reply.text, res.reply.audioUrl);
      console.log(`[pepl:story] dot replied (done=${res.done}, chars=${res.reply.text.length})`);
    } catch (e) {
      console.error("[pepl:story] dot turn failed", e);
      setDotError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  const transcript = (finalText + " " + interim).trim();
  const hasStory = finalText.trim().length > 0;
  const hasUnsent = !recording && hasStory;

  // Keep the newest text pinned to the bottom: measure overflow past 3 lines and
  // scroll the block up by that amount (smoothly, via a CSS transition).
  useEffect(() => {
    const el = scrollRef.current;
    const wrap = wrapRef.current;
    if (!el || !wrap) return;
    const over = el.scrollHeight - wrap.clientHeight;
    setScrollOffset(over > 0 ? over : 0);
  }, [transcript]);

  return (
    <div className="mx-auto flex h-full w-full max-w-xl flex-1 flex-col items-center text-center">
      <p className="text-sm font-semibold text-charcoal/60">your first story</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-[28px]">
        tell us, how do you spend your day?
      </h1>

      {/* the recording group, vertically centered in the remaining space */}
      <div className="flex w-full flex-1 flex-col items-center justify-center">
      {/* mic button — the tactile centerpiece */}
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? "stop recording" : "start recording"}
        className={`group flex h-44 w-56 flex-col items-center justify-center gap-3 rounded-[28px] border transition active:scale-[0.98] ${
          recording
            ? "border-transparent bg-charcoal text-white shadow-[0_10px_30px_-8px_rgba(42,42,40,0.45)]"
            : "border-charcoal/10 bg-charcoal/[0.04] text-charcoal hover:bg-charcoal/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_6px_18px_-10px_rgba(42,42,40,0.3)]"
        }`}
      >
        <span className="relative flex items-center justify-center">
          {recording && (
            <span className="absolute h-16 w-16 animate-ping rounded-full bg-white/20" />
          )}
          {recording ? <Square className="h-8 w-8 fill-current" /> : <Mic className="h-9 w-9" />}
        </span>
        <span className="text-sm font-medium">
          {recording ? "recording — tap to stop" : "tap to start recording"}
        </span>
      </button>

      {/* timer */}
      <div className="mt-7 text-5xl font-bold tabular-nums tracking-tight text-charcoal">
        {fmt(remaining)}
      </div>

      {/* transcript — capped at 3 lines, newest at the bottom, older lines
          scrolling up and dissolving into the bg through a top gradient mask */}
      <div
        ref={wrapRef}
        className="relative mt-5 h-[84px] w-full max-w-md overflow-hidden"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 45%, #000 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 45%, #000 100%)",
        }}
      >
        <div
          ref={scrollRef}
          className="flex min-h-[84px] flex-col justify-end px-2 text-center text-[15px] leading-7 text-charcoal/70"
          style={{
            transform: `translateY(${-scrollOffset}px)`,
            transition: "transform 380ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <p>
            {transcript ||
              (supported
                ? "your words appear here as you speak…"
                : "voice transcription needs Chrome or Edge — you can still continue.")}
          </p>
        </div>
      </div>

      {/* Dot's reply — a light talking face (text + spoken). Loading = a
          breathing-glow bar (never a spinner); error = a red FAILED badge. */}
      {(sending || dotReply || dotError) && (
        <div className="mt-5 w-full max-w-md">
          {dotError ? (
            <div
              role="alert"
              className="rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 ring-1 ring-red-200"
            >
              pepl couldn’t respond — {dotError}
            </div>
          ) : sending ? (
            <div className="h-12 animate-pulse rounded-2xl bg-charcoal/[0.06]" aria-hidden />
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl bg-charcoal/[0.04] px-4 py-3 text-left ring-1 ring-black/[0.04]">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-charcoal/45">
                pepl
              </span>
              <p className="text-[15px] leading-6 text-charcoal/80">{dotReply}</p>
            </div>
          )}
        </div>
      )}

      {/* one smart action: send the spoken answer to Dot (incl. follow-ups),
          else continue once you've talked, else skip. */}
      <button
        type="button"
        disabled={sending}
        onClick={() => {
          if (hasUnsent) {
            void talkToDot();
          } else {
            stop();
            onNext(story || finalText.trim());
          }
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {hasUnsent ? (turns === 0 ? "talk to pepl" : "reply to pepl") : turns > 0 ? "continue" : "skip for now"}
        <ArrowRight className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
