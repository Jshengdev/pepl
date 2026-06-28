# Reference — Voice layer (Grok voice + live transcription, replacing iMessage)

The ONE thing pepl swaps vs doubles: **delivery.** Instead of texting your Double in iMessage, you **talk** to it — Grok voice out + live transcription in. Pattern proven in `dot`. The key (`XAI_API_KEY`) is already in `backend/.env`.

## The seam

doubles: `runTurn(text) → reply` → iMessage send.
pepl: **mic → live transcription (STT) → final transcript = the user turn → `runTurn(transcript) → reply → TTS (spoken)`.**
The engine ([DOUBLES-FEELING.md](./DOUBLES-FEELING.md)) is untouched — only the in/out layer changes.

## Voice OUT (TTS)

`POST https://api.x.ai/v1/tts`, header `Authorization: Bearer $XAI_API_KEY`, body `{ "text": "<≤600 chars>", "voice_id": "eve", "language": "en" }` → `audio/mpeg`. Cache by text + `prewarm()` so the first line is instant. **Autoplay blocked → degrade to text, never silence.** (dot: `packages/flow-proto/lib/voice.ts` hook + `app/api/tts/route.ts`.)

## Voice IN (live transcription / STT)

OpenAI-Realtime-compatible WebSocket: `wss://api.x.ai/v1/realtime?model=grok-voice-think-fast-1.1`, Bearer auth. On open send `session.update`:
```json
{ "voice": "eve", "modalities": ["audio","text"],
  "input_audio_transcription": { "model": "whisper-1" },
  "turn_detection": { "type": "server_vad" } }
```
Mic → base64 PCM → `input_audio_buffer.append`. Events:
- `conversation.item.input_audio_transcription.completed` → **final user transcript** (hand to `runTurn`)
- `response.audio_transcript.delta` → live reply text (stream to UI)
- `response.audio.delta` → reply audio chunks (decode + play)

`server_vad` = automatic turn-taking (no push-to-talk needed; add a manual `commit` button if you want push-to-talk). (dot: `packages/backend/src/voice/realtime.ts` → `openVoiceSession({ onTranscript, onSpokenDelta, onAudioDelta })`; gate `voice:check`.)

## Lift vs build

- **Lift from dot (copy-ready):** `voice/realtime.ts` (WS client + `openVoiceSession`), `voice/test-voice.ts` (the gate), the `/api/tts` route, `lib/voice.ts` (TTS hook).
- **Build for pepl (not in dot yet):** browser **mic capture** (MediaRecorder → PCM → base64), **audio playback** (Web Audio `AudioContext` for the PCM deltas), the **live-transcription UI** (partial + final transcript; the Double's reply streams in).
- Deps: `@ai-sdk/xai`, `ai`, `ws`, `zod`. Env: `XAI_API_KEY` (already set).

## Two voices, never crossed

The spoken voice = your **Double** (doubles persona/feel). The corner **system whisper** (scrape progress) is mono/separate (see the story window's `reference/NARRATOR-THE-DOT.md`). Keep them distinct.

## Open product reconciliation (Johnny / story window)

Whose voice do you talk to — **your Double** (speaks *as you*, full doubles impersonation) or **"Dot"** (a warm interviewer who reflects you back)? The engine reproduces doubles either way; this only sets the persona the **Talker** writes in. Per Johnny's "doubles feeling," default = **the Double**.
