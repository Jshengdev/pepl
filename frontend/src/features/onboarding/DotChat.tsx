"use client";

import { useEffect, useRef, useState } from "react";
import { dotIntro, dotTurn } from "@/lib/pepl/api";

// Self-contained Dot chat that works in ANY browser (Dia/Arc/Brave/Safari included):
// you TYPE your answer, Dot (Grok) replies, and the reply is spoken via the browser's
// speechSynthesis (output TTS works even where webkitSpeechRecognition does not).
// Drop in anywhere: <DotChat userId={uid} onDone={() => setStep("profile")} />.
//
// This is the reliable text-first path. Real mic voice (Grok Realtime, the way the
// dot project did it) is a separate upgrade — see useGrokVoice (if/when wired).

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

type Msg = { who: "dot" | "you"; text: string };

export function DotChat({ userId, onDone }: { userId: string; onDone?: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typed, setTyped] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const introRef = useRef<string | null>(null);
  const primedRef = useRef(false);

  // Dot greets on mount (shown immediately; spoken on the first gesture — browsers
  // block speech before one). Honest absence: if /api/dot/intro fails we log + skip.
  useEffect(() => {
    let on = true;
    dotIntro()
      .then((r) => {
        if (!on) return;
        introRef.current = r.text;
        setMsgs([{ who: "dot", text: r.text }]);
      })
      .catch((e) => console.warn("[pepl:dot] intro failed", e));
    return () => {
      on = false;
    };
  }, []);

  function primeVoice() {
    if (primedRef.current || !introRef.current) return;
    primedRef.current = true;
    speak(introRef.current);
  }

  async function send() {
    const text = typed.trim();
    if (!text || sending) return;
    if (!userId) {
      setError("no userId yet — connect first");
      return;
    }
    primeVoice();
    setMsgs((m) => [...m, { who: "you", text }]);
    setTyped("");
    setSending(true);
    setError(null);
    try {
      const res = await dotTurn({ userId, text });
      setMsgs((m) => [...m, { who: "dot", text: res.reply.text }]);
      speak(res.reply.text);
      console.log(`[pepl:dot] turn ok (done=${res.done})`);
    } catch (e) {
      console.error("[pepl:dot] turn failed", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-6 ${
              m.who === "dot"
                ? "self-start bg-charcoal/[0.05] text-charcoal/80"
                : "self-end bg-charcoal text-white"
            }`}
          >
            {m.who === "dot" && (
              <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-charcoal/40">
                dot
              </span>
            )}
            {m.text}
          </div>
        ))}
        {sending && <div className="h-10 w-32 animate-pulse self-start rounded-2xl bg-charcoal/[0.06]" />}
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          dot couldn’t respond — {error}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onFocus={primeVoice}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="type your answer…"
          className="flex-1 rounded-full border border-charcoal/10 bg-white px-4 py-2.5 text-[15px] text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-charcoal/15"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending}
          className="rounded-full bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          send
        </button>
      </div>

      {onDone && msgs.filter((m) => m.who === "you").length > 0 && (
        <button
          type="button"
          onClick={onDone}
          className="self-center text-sm font-medium text-charcoal/50 transition hover:text-charcoal"
        >
          continue →
        </button>
      )}
    </div>
  );
}
