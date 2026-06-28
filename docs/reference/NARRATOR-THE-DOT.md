# Reference — "The Dot" narrator (voice + reusable copy for Pebble)

pepl's onboarding-as-loading uses a narrator, **"The Dot" (Dot)**, lifted from Johnny's `dot` project. **The `dot` project is a health app** — its verbatim copy is about doctors/reports and must **not** ship in Pebble. What we reuse is the **voice DNA**, the **two-voice structure**, the **TTS/copy-as-data engineering pattern**, and the **blur-up motion** — plus a **pepl-adapted script** (below, §4–5) that's ready to ship as text.

Owner: Story window (this is experience/copy). Build window consumes §4–6. See `EXPERIENCE.md` (the flow Dot narrates) and `HACKATHON-GOTCHAS.md` (voice/TTS is the #1 flaky thing — text-first, TTS gated).

---

## 1. Voice DNA (the rules — keep these, change the words)

Dot is a **poke-driven character** — a glow/dot you literally **poke awake**, who narrates herself in **first person** while the experience loads. The voice is a **calm, sleepy-then-warm friend** (Grok-funny), **never a clinician or a system**.

- **all-lowercase, casual, texting cadence** — `"okay okayyy. im awake now."`. Short, one-idea bubbles.
- **staccato for emphasis** — `"say. hello. im dot."`
- **wakes → greets → says what she does → hands the artifact back to you (agency)**.
- **never a verdict.** She surfaces; she never concludes *for* you. (This is the gx "only-AI does only-AI; you do only-you" principle, in voice form: *"i won't tell you who you are. i'll show you. you decide."*)
- **≤1 whimsy per surface; never whimsy on a money/gate moment.**

## 2. Two voices, never crossed

| Voice | Who | Look | Job |
|---|---|---|---|
| **Dot (character)** | warm, spoken/first-person | Onest, sentence bubbles | greets, narrates, invites — the personality |
| **System (whisper)** | terse status *about* the work | **IBM Plex Mono, lowercase, 8–13px, tabular-nums** | progress: `"pebble is reading…"`, `"your people · 60%"`, `"12 found"` |

Dot *speaks*; the system *whispers what's happening*. Don't let them blur — the contrast is the polish. (This maps cleanly onto pepl's `EXPERIENCE.md` **scrape-progress corner artifact** = the system whisper, and the narrator bubbles = Dot.)

## 3. Verbatim reference lines from `dot` (cadence reference — DO NOT SHIP, health domain)

These exist only to let the build *hear* the rhythm. They are health-app copy; **do not put them in Pebble**.

> "hi, this is dot." · "okay okayyy. im awake now." · "say. hello. im dot." · "messy is okay. just talk." · "i'll never tell you you're fine." · "and the report? it's yours. tell it how you feel." · "DOT. Tell it how you feel."

System-whisper reference: `"dot is reflecting…"` · `"the story so far · 60%"` · `"12 caught"` · `"reflecting · live grok"`.

---

## 4. Pebble-adapted narrator script (READY TO SHIP as text; voice = stretch)

Mapped to `EXPERIENCE.md`'s flow. Copy lives as data (one `script.ts`), phase components never change. Each line is a Dot bubble unless tagged `[whisper]` (system mono).

**Landing — the glow you poke**
- prompt: `"poke the glow"`
- `"hi. i'm dot."`
- `"okay okayyy. i'm up."`

**What Pebble does (invisible-AI framing, funny)**
- `"here's the deal: i read the mess so you don't have to."`
- `"your contacts, your emails, the whole pile. i sort it — you just look."`
- `"i won't tell you who you are. i'll show you. you decide."`

**Make your own card (the cute interaction)**
- `"first, let's make your card. don't overthink it."`
- `"nobody knows their own one-liner. that's literally my job."`

**Three onboarding questions** (answer by voice *or* text)
1. `"tell me about a turning point — a before-and-after moment in your life."`
2. `"the one thing you're weirdly good at. brag a little, i won't tell."`
3. `"what should someone know to be a good friend to you?"`
- between answers: `"okay. noted."` → `"one more."`

**Scrape running (system whisper, corner artifact)**
- `[whisper] "pebble is reading your world…"`
- `[whisper] "people found · 60%"`
- `[whisper] "your story · forming"`

**Ready → reveal**
- `"okay. i've got a picture of you."`
- `"bringing up your cards now."`
- button: `"open it →"`

**The reveal payoff + the correction hook**
- `"this is you — pulled from your actual life, not made up."`
- `"here's how i see your circle. drag anyone i misjudged closer or further."` ← *the activation invite. Do NOT say the graph is wrong-on-purpose; the instinct to fix it is the magic (gx semi-rage-bait).*
- after a correction lands: `"got it. that changes the picture."`

**The landing tagline (Dot's "hands it back to you" line)**
- `"see your life better."`  *(pepl's equivalent of dot's "tell it how you feel" — the agency handoff. Alt: `"this is yours."`)*

> **Tone guardrail (from `HACKATHON-GOTCHAS.md` §6):** observational, never clinical or mind-reading. Dot says *"here's how i see your circle,"* never *"you're an anxious person."* She surfaces; the user means.

## 5. System-whisper copy (the scrape-progress corner artifact)

IBM Plex Mono, lowercase, tabular-nums. Honest absence is fine; **show a count, not a spinner**:
- `"pebble is reading…"` → `"contacts · 142"` → `"people who recur · 12"` → `"your map · 80%"` → `"ready"`
- on a node failing (fail-loud, per §2 of gotchas): `"extract · failed · retrying"` (red), never a silent stall.

## 6. Engineering reuse (pull from `dot`, don't rebuild)

- **Copy-as-data:** one `script.ts` (`Dot.greet`, `Dot.questions[]`, `Dot.reveal`) — copy is data, phase components are dumb. Lets us tune voice after the skeleton runs.
- **Motion = blur-up:** every content swap "develops" like a photo (`opacity .25→1, blur(7px)→0, ~420ms`, re-trigger via React `key`). **Never a spinner** for instant data; one signature ease `cubic-bezier(0.16,1,0.3,1)`; nothing bounces. Reduced-motion guard mandatory (clamp to 0.01ms).
- **Voice/TTS pattern (STRETCH, gated):** `lib/voice.ts` — TTS by Grok voice, **cache audio blobs by text**, `prewarm()` so the first gesture-line is instant, **autoplay-blocked fails quiet (text still shows)**. Keep voice behind a flag (`VOICE=1`); text is the default demo path. *(dot's own gotchas: STT 404, autoplay block, realtime unknowns — voice is the flakiest thing on stage.)*

> **Open micro-decision (defer to Johnny):** narrator name stays **"Dot"** per `EXPERIENCE.md`, but "Pebble + Dot" could become one mark (a pebble *is* a dot). Not blocking — flagged in `OPEN-QUESTIONS.md` if it matters.
