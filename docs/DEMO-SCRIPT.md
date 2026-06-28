# Pebble — DEMO-SCRIPT

> **Status: DRAFT v0 — reflects Johnny's 2026-06-28 redirect. Confirm before SCOPE-LOCK is promoted to LOCKED.**
> Beat-by-beat judge-facing walkthrough. Owner: Story window. Hand to Build window once confirmed. Pairs with [EXPERIENCE.md](./EXPERIENCE.md) (the flow) + [reference/HACKATHON-GOTCHAS.md](./reference/HACKATHON-GOTCHAS.md) (the landmine map) + [reference/NARRATOR-THE-DOT.md](./reference/NARRATOR-THE-DOT.md) (Dot's voice).

## The protected hero (the one beat that must work live)

**Sign in with Gmail → Pebble reads your actual world → it shows you a version of yourself (your story + your stats), every line traceable to where it found it → you correct/deepen it just by talking → it updates live.** Everything else is theater around this. The multi-person **network graph is the "open endeavour"** — the aspirational stretch, demoed if it's solid, cut without apology if it's not.

## Track + stack (where each sponsor fires on screen)

| Sponsor | Fires at beat | What it does | Why it's innovative |
|---|---|---|---|
| **Composio** | Connect (signup) | live Gmail OAuth = sign-in + data grant in one | no separate signup; the auth *is* the ingest |
| **Grok** | Meet Dot | voice agent (STT/TTS) + reasoning — Dot talks, you talk back | the onboarding *is* a conversation, not a form |
| **InsForge** | Reveal + everywhere | model gateway (generate + held-out critic on **different** families) + db + deploy URL | the truth gate runs on it: a model can't catch its own confident lie |
| **You.com** | Reveal / receipts | citation-backed web search → public-footprint facts, each cited | every web-found claim carries a source |

Two numbers that ARE the proof (say them out loud): **"N real people surfaced from your actual Gmail"** and **"every claim is grounded — M were cut for no evidence."**

## The 3-minute script

| Time | Johnny does | Pebble does | What lands | Sponsor |
|---|---|---|---|---|
| **0:00–0:20** | Glow landing on screen. Speaks the problem. | idle glow, breathing | *"Your whole life is digitized and scattered across ten apps — and you'll never sit down to organize it. So you never actually see yourself."* The relatable mess (gx existential problem). | — |
| **0:20–0:35** | Clicks **Connect Gmail**, grants access. | OAuth → scrape kicks off; corner whisper `pebble is reading your world…` | Signup = data grant in one move. No friction, no "go talk to an AI." | **Composio** |
| **0:35–1:10** | **Meets Dot.** Answers ONE question live by voice ("a turning point in my life was…"). | Dot (Grok voice) wakes, asks; scrape runs underneath | The wait *is* the onboarding — charming, alive, not a spinner. You're telling your story (the only-you step). | **Grok** |
| **1:10–1:40** | Watches his card **prefill**; says one line back to tweak it. | builds the card: name (auto) + a story of *why you do what you do / what you've built* | AI organized; *you* originate. It's your story, refined by talking. | **InsForge** |
| **1:40–2:20** | **The reveal. Stops talking. Lets it land.** | Dot/GX-brand reveal: **a version of you** — your story + your stats | *"…oh. that's me."* Honest mirror + want-to-know. Drop the two proof-numbers here. | **InsForge** + **You.com** |
| **2:20–2:45** | **The catch (live):** taps a line, sees *where it came from* ("from 3 emails with Teri"), corrects it casually by talking. | shows the receipt; updates + deepens live | It's grounded **and** it learns from you. The receipt *is* the correction surface — no forms. | You.com / InsForge |
| **2:45–3:00** | Flashes the network forming; lands the tagline. | network graph animates (stretch) | *"Pebble. See your life better."* Name the stack; the vision lands. | — |

## The live-app flow (the real clickthrough, on real endpoints)

1. **Landing** — "Pebble", one-liner, the interactive glow. CTA: **Connect Gmail**.
2. **Connect** — Composio Gmail OAuth → `POST /ingest` kicks the scrape; WS `scrape_progress` drives the corner artifact.
3. **Meet Dot** — voice page; each answer → the model; Dot's reply streams (voice + text). Covers scrape latency.
4. **Build your card** — answers + scrape → `generate` prefills the card; "looks good" emits, or keep talking → regenerate. Held-out critic gates every version (grounded or cut).
5. **Reveal** — cards spread in the Dot/GX brand: **Profile · Story · Stats** (Network = stretch). Each card carries its receipts.
6. **Correct by talking** — tap a claim → see its source → say what it means → graph/story updates live (`correct` → regenerate → re-critic).

## Everything live (the call) — and the one engineered half-half

Pebble runs **live, end to end**: Composio Gmail, the Grok voice agent, You.com scrape, InsForge generate + held-out critic. **No backup video, no replay branch** (founder call — *"trust me, you'll make them work"*). We make live *work* by hardening it — the [gotchas](./reference/HACKATHON-GOTCHAS.md) are the playbook: CORS verified, env asserted at boot, every seam logged with count+latency, LLM fan-out throttled, write→read-back proven, retries on external calls, and **fail-loud** — any node failure shows a red FAILED badge, never a silent fake.

The **one** engineered half-half (CLAUDE.md §2): **Dot's first voice line is a cached Grok response** (`// DEMO_CACHE:` — real Grok TTS, precomputed + `prewarm()`ed) so she speaks the instant you land, zero cold-start. Every line after is live. That's the only cache; the logic is always live.

On stage: speak/type one answer live to prove it — *"this is my real Gmail; the reasoning is live."*

## Pitch framing (kill-lines, quotable)

- *"Pebble doesn't tell you who you are. It shows you — from your actual life — and lets you decide."* (only-AI / only-you)
- *"Machines prove; you mean."* (SOTARE #30)
- *"Every line traces to something real. No horoscopes."* (the grounding gate)
- *"People want to be told who they are. Pebble earns the right to — because it read your actual world."*

## Q&A pre-bakes

- **Is this real?** → *The logic is always live; the only cached thing is Dot's first hello.* Everything else runs on my real Gmail, right now.
- **Couldn't any chatbot do this?** → *It has no context. The moat is your real Gmail + the grounding gate that cuts anything it can't trace. A held-out critic on a different model family catches the confident lie.*
- **How is the AI not creepy?** → *It surfaces; it never concludes. Observational language, never clinical. You correct it by talking. It's a mirror, not a verdict.*

## Cut for the demo

Live OAuth re-grant on stage (use the connected account); multi-user/accounts; PNG share + card flip (layer if time); MBTI/personality card (shareable, if time); deep "little-by-little" prompting loop; the **network graph beyond a single animated reveal** (open endeavour).
