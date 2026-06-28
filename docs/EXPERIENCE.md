# Pebble — Experience (MVP)

Product name **Pebble** (repo `pepl`). The living journey doc — Window 2 owns it. **v1 reflects Johnny's 2026-06-28 redirect** (live data, voice-agent Dot, "see a version of yourself" as the hero, network graph as the open endeavour). The beat-by-beat is in [DEMO-SCRIPT.md](./DEMO-SCRIPT.md); Dot's voice is in [reference/NARRATOR-THE-DOT.md](./reference/NARRATOR-THE-DOT.md).

## The one-line experience

You sign in with Gmail, talk to Dot for a minute while Pebble reads your world, and then you **see a version of yourself** — your story and your stats, every line traceable to where it came from, and you sharpen it just by talking. *AI organizes; you originate.*

## The flow (the "glow")

1. **Landing** — one cute page: the word **Pebble**, a one-liner, an interactive **glow** you can play with. One CTA: **Connect Gmail**.
2. **Connect (signup = data grant)** — **Composio Gmail OAuth** (reuse `doubles`' Gmail integration). Signing in *is* granting the scrape; it kicks off in the background immediately. No separate signup, no "go talk to an AI."
3. **Meet Dot (voice-agent onboarding-as-loading)** — you talk to **Dot, a Grok voice agent** (voice from the `dot` project). She asks a few questions to pull your story out — this *is* the onboarding, and it covers the scrape latency. Replaces the old iMessage agent. Three questions (voice **or** text):
   1. A **turning point** you've encountered in your life.
   2. The **one thing you're uniquely good at**.
   3. What someone should know to **be a good friend to you**.
   - A persistent **corner artifact** (system whisper) shows scrape progress (`people found · 60%`) so the wait makes sense.
4. **Build your card (conversational prefill → refine)** — your answers + the scrape **prefill** your card. Low-level facts (name) auto; the meat is a **story of *why* you do what you do / what you've tried to build**. You say *"looks good"* or **keep talking to Dot to optimize** — a slow, casual iteration. You tell your story; its job is to organize it back to you.
5. **See a version of yourself (the reveal — the hero)** — a Dot/GX-brand reveal: **a version of you**, your story + your stats. *People want to be told who they are* — this is the want-to-know hit and the honest mirror, at once.
6. **Correct by talking (receipts = the correction surface)** — every surfaced thing shows **where we found it** ("pulled from 3 emails with Teri"), casually. You adjust by **explaining what it means to you** — no forms, no field-editing. This single move is the grounding gate (made visible), the correction loop, and the deepening.

## The cards (the "version of yourself")

A folder of cards in the Dot/GX brand. Per card: view → **click → modal** (detail + its receipts) → *(if time)* flip + download PNG to share.

- **Profile card** — name + basics (auto, low-level).
- **Story card** *(the hero)* — *why you do what you do / what you've built*, in your voice, **grounded** (every claim → a source).
- **Stats card** — your numbers (people surfaced, who recurs most, etc.) — the want-to-know hook.
- **Network / relationship card** *(the open endeavour — stretch)* — see below.
- *Cute shareables if time:* **MBTI guess**, your **story** as a post.

Every card is **grounded** (traceable claims), **correct-by-talking**, and shows its receipts.

## The network / relationship graph (the open endeavour)

The aspirational centerpiece, scoped as the **stretch** — *"a really interesting thing we keep as the open endeavour."* Not random dots — a **planetary orbit / electron-molecule** model: **you** at center; rings outward (inner → 1st → 2nd → 3rd); lines showing how multiple people connect; people from your stories/scrape placed by closeness. Demoed as a single animated reveal if it's solid; cut without apology if it's not. *Future:* "how closely related am I to X?" ("you are the 5 people around you").

## Voice & narrator (now core)

**Dot is a Grok voice agent** — voice in (your answers) and voice out (Dot talks). Voice from the `dot` project, adapted in [reference/NARRATOR-THE-DOT.md](./reference/NARRATOR-THE-DOT.md). Two voices, never crossed: **Dot** (warm, spoken) and the **system whisper** (mono, lowercase — the scrape-progress corner artifact). Engineering: cache audio by text + `prewarm()` so the first line is instant; autoplay-block **degrades to text, never silence**.

## Design system

**Dot/GX brand**, skeuomorphic and alive. *Open design fork (not blocking):* the original EXPERIENCE called for **Monet × Art Nouveau × Y2K-nature** (painterly, glassy folder, Art-Nouveau cards); the `dot` reference brings a **clean, light, depth-from-light** system (one accent hue, mono system voice, blur-up motion, nothing bounces). Johnny said "match with GX Vision / little dot brand scheme." → **Decide which skin** (or the blend) at design time; the motion/voice discipline from `dot` carries over regardless.

## Scope reality (≈6 hrs, all-live) — the hero cut

- **Must demo (protect live, full sequence):** Connect Gmail → scrape → **Dot voice Q&A** → **build-your-card** → **see a version of yourself (story + stats), grounded** → **correct by talking**. Hero = the reveal + the receipt-correction.
- **Open endeavour (stretch):** the multi-person **network graph**.
- **Everything live** (Composio Gmail, Grok voice, You.com scrape, InsForge generate+critic). The **one** engineered half-half: **Dot's first voice line is a cached Grok response** (prewarmed, instant); everything after live. **No backup video.** We harden the live path (the gotchas are the playbook) and **fail loud** (red badge), never a silent fake.
- **Layer if time:** card flip + PNG share · MBTI card · richer network · glow polish.

## Resolved (was: open questions)

- **Data source** → **LIVE** (Composio Gmail signup + You.com scrape + `doubles` scraping logic ported). Only cache = Dot's first voice line. *(was: precache assumed)*
- **Voice** → **in scope, core** (Dot = Grok voice agent). *(was: text-first)*
- **Track + sponsors** → **Potion Lab** · InsForge (gateway + deploy) + You.com (grounding node) + Composio (Gmail) + Grok (voice).
- **Hero** → **see a version of yourself** (story + stats, grounded, correct-by-talking); network graph = open endeavour.

Still open: landing **one-liner** copy · exact **Stats card** fields · the **design skin** fork above · (tech) whether Composio or `doubles`' direct Google OAuth carries Gmail.
