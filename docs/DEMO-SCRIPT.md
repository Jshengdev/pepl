# Pebble — The Experience (UX journey + the story it serves)

> **Status: v1 — 2026-06-28.** The whole experience beat by beat: **what you see/do · what Pebble does & says · the output · how it feels · the story it serves.** This is the UX walkthrough (and the demo narrative). Flow = [EXPERIENCE.md](./EXPERIENCE.md) v3; backend per beat = [DESIGN-GOALS.md](./DESIGN-GOALS.md); what's real = [VERIFICATION.md](./VERIFICATION.md). Front-end visuals are Johnny's per-page examples.

## The story we're solving for (the frame)

People are **blind to themselves**. Your life is a scattered, digitized mess you will *never* sit down to organize — so you lack perspective on who you are and who's around you. The whole point of Pebble: **AI does the one thing only AI can — organize the mess and reflect it back — so you can do the one thing only you can — see yourself, and decide.** Every beat below is engineered toward one moment: **"…that's me. I see my life better."** And it's believable because *every line traces to something real* — receipts, not a horoscope.

Total experience: **~60–90s** (the onboarding + card-making *is* the loading; the reveal lands when the scrape finishes).

---

## Beat 0 · Landing (~5s)
- **See / do:** a calm page — **Pebble**, a one-liner, and one button: **Sign in with Google**. Nothing to read, nothing to configure.
- **Pebble says/does:** just an invitation (a soft glow). No "talk to our AI."
- **Output:** the door.
- **Feel:** safe, curious, zero friction. The promise is *"see a version of yourself,"* not *"give us your data."*
- **Story:** you're standing in front of the mess — and all that's asked of you is one click.
- *Tech firing:* — *(Composio on the next tap.)*

## Beat 1 · Sign in (~5s)
- **See / do:** click → the Google consent screen → back, you're in. That's it.
- **Pebble says/does:** the moment you land, it **silently starts reading your world** (Gmail + contacts, live). A small corner whisper: *"reading your world…"*. The AI is invisible.
- **Output:** you're signed in; the scrape is already running underneath.
- **Feel:** one move and done. Something is happening *for* you — effortlessly.
- **Story:** the effort-collapse begins. The thing you'd never do — organize your life — just started, and you didn't lift a finger.
- *Tech firing:* **Composio** (one Google OAuth = your account **and** the data grant).

## Beat 2 · The talking face — your first story (~30s)
- **See / do:** a little **face appears, its mouth moving** as it talks. It asks (out loud): *"so — how do you spend your day? doing anything today you normally do?"* You tap the **mic** and just… talk. It reacts — *"oh nice, is that a most-days thing or just today?"* — you answer again. Your words appear as a **live transcript that fades** at the bottom. At ~25s: *"ok, timer's about to be up…"* → *"thanks bro, ima send u over to my buddy."*
- **Pebble says/does:** a warm, slightly funny little buddy — listens, asks **one real follow-up**, captures your voice as part of what it knows. The scrape keeps running the whole time.
- **Output:** your spoken story → transcript → real signal about who you are.
- **Feel:** human and disarming. You're *talking to someone*, not filling a form — and the wait never feels like waiting.
- **Story:** you do the only-*you* step (tell your story, in your voice); it does the only-*AI* step (organize, underneath). The onboarding **is** the loading — and it's charming.
- *Tech firing:* **Grok** (the voice — STT/TTS; the face's mouth syncs to it). *(Its very first line is pre-warmed so it speaks instantly.)*

## Beat 3 · Make your card — the creative wait (~10–20s)
- **See / do:** *"create your profile"* — you **draw your own smiley face** and pick colors from the **three dots** around it. Then *"design your card background"* — choose a **gradient**, play with its heights and color combos.
- **Pebble says/does:** stays out of the way — you're making something that's *yours* while it finishes reading your world.
- **Output:** your smiley (your mark) + your card's look — your soon-to-be **node**.
- **Feel:** playful, expressive, ownership. Anticipation builds — you're decorating the card that's about to be filled with the truth of you.
- **Story:** you originate (your face, your colors); the machine organizes. Identity as something you *craft*, not a datasheet.
- *Tech firing:* — *(You.com + the engine are finishing underneath.)*

## Beat 4 · The reveal — "that's me" (THE HERO)
- **See / do:** the scrape finishes; the **background blurs**; **your card animates in — now full of your info — and becomes your node.** You **click it → all your cards spread open**: your **story**, your **stats**, your **people**.
- **Pebble says/does:** shows you **a version of yourself** — and every single line shows **where it came from** (*"from 3 emails with Teri"*, a cited link). Nothing is invented; anything it couldn't trace was **cut**.
- **Output:** your **dossier** — the story of *why you do what you do*, your numbers (who you lean on, how many people surfaced), your relationship graph — all grounded.
- **Feel:** the dopamine *and* the **"oh whoa."** Recognition: *that's actually me.* And you trust it because you can see the receipts — it read your real life, it didn't guess.
- **Story:** the payoff the whole thing was built for. Blind to yourself → **you see yourself**, organized, in one place, reflected back honestly. The mirror. *"I see my life better now."*
- *Tech firing:* **InsForge** (the generator + the **held-out critic** on a different model family that cuts anything ungrounded) · **You.com** (the cited web receipts).

## Beat 5 · The map — you're not alone
- **See / do:** your node drops onto a shared **map** — and there's **Knot, Dot's buddy** (the one she sent you to). Other nodes are there; Knot sits on a line between two of them. Click it: he hands you a **little generated story** — *"here's how your two stories connect."*
- **Knot says/does:** finds the **real overlap** between two dossiers (shared people, the same startup space, how you each tell your day), grounded **on both sides**, and narrates it in Dot's voice.
- **Output:** a node-map; a **semantic story link** between you and someone else.
- **Feel:** serendipity and belonging — *we're part of the same world.* Your story isn't an island; it rhymes with others'.
- **Story:** from seeing yourself → **seeing yourself in a larger context** ("you are the five people around you"). Perspective becomes connection.
- *Tech firing:* the engine over **two** dossiers + the same held-out critic (the link's claims trace to a *shared* signal, or they're cut).

---

## What it means (the close)

In about a minute and a half, a normal person — someone who would *never* sit down to journal or organize their life — handed over nothing but a sign-in and a 30-second chat, drew a smiley, and walked away **seeing themselves clearly**: their story in their own words, grounded in their real life, and connected to other people. That's the part only AI could collapse, and the meaning only they could make. **That's Pebble.**

## Honesty (engineered half-half — say it out loud if asked)
Everything is **live**: Composio reads your real Gmail, You.com cites the real web, the held-out critic really cuts ungrounded claims (it catches a planted lie — verified). **Two things are cached — both `// DEMO_CACHE:`, both produced by the same live pipeline:** Dot's *first* hello (pre-warmed so she speaks instantly), and the **friend nodes' input** (their dossiers are real pipeline output; only their input emails are recorded so I don't need four people's Gmail on stage — flippable to a live account with one flag). No backup video; any failure shows a loud red badge — never a fake. *"This is my real account; the reasoning, grounding, and critic are all live — and I can flip any friend to their real Google with one flag."*
