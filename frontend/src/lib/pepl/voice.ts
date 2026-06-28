"use client";

// Dot's REAL Grok "eve" voice. POST text -> /api/tts (server-side xAI) -> mp3 blob
// -> play. Works in ANY browser (Dia/Arc/Safari included) — it's plain audio
// playback, not the Chrome-only webkitSpeechRecognition. Blobs are cached by text
// so a repeated line is instant. Autoplay before a user gesture fails QUIET — the
// text is always shown, and the next gesture-triggered line speaks (never faked).

const cache = new Map<string, Promise<string>>();

function audioUrl(text: string): Promise<string> {
  if (!cache.has(text)) {
    cache.set(
      text,
      (async () => {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`tts ${res.status}`);
        return URL.createObjectURL(await res.blob());
      })(),
    );
  }
  return cache.get(text)!;
}

/** Warm the cache without playing, so the first gesture-triggered line is instant. */
export function prewarmVoice(text: string): void {
  audioUrl(text).catch(() => cache.delete(text));
}

let current: HTMLAudioElement | null = null;

/** Speak `text` in Dot's Grok voice. Resolves when playback ends (or fails quiet). */
export async function speak(text: string): Promise<void> {
  try {
    const url = await audioUrl(text);
    current?.pause();
    const a = new Audio(url);
    current = a;
    await a.play();
    await new Promise<void>((resolve) => {
      a.onended = () => resolve();
      a.onerror = () => resolve();
    });
  } catch (e) {
    // autoplay-blocked or a tts error — the text reply is always shown; never fake success.
    console.warn("[pepl:voice] speak failed/blocked", e);
  }
}
