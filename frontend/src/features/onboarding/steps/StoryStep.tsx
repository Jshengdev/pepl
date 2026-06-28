"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, ArrowRight } from "lucide-react";

// Step 1 — "your first story". A 60-second voice note transcribed live via the
// Web Speech API (real recognition, not a mock). The transcript fades out at the
// bottom behind a gradient mask, per the wireframe.

const DURATION = 60; // seconds

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

export function StoryStep({ onNext }: { onNext: (story: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [remaining, setRemaining] = useState(DURATION);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);

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

  const transcript = (finalText + " " + interim).trim();
  const hasStory = finalText.trim().length > 0;

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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
      <p className="text-sm font-semibold text-charcoal/60">your first story</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-charcoal sm:text-[28px]">
        tell us, how do you spend your day?
      </h1>

      {/* mic button — the tactile centerpiece */}
      <button
        type="button"
        onClick={recording ? stop : start}
        aria-label={recording ? "stop recording" : "start recording"}
        className={`group mt-10 flex h-44 w-56 flex-col items-center justify-center gap-3 rounded-[28px] border transition active:scale-[0.98] ${
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

      {/* continue — recording is encouraged but never required to move on */}
      <button
        type="button"
        onClick={() => {
          stop();
          onNext(finalText.trim());
        }}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        {hasStory ? "continue" : "skip for now"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
