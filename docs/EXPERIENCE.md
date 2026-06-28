# Pebble — Experience (MVP)

Product name **Pebble** (repo `pepl`). The MVP experience spec, captured from Johnny's walkthrough. Living journey doc — Window 2 owns it.

## Design system

**Skeuomorphic × Y2K × nature.** Color like a **Monet painting** (soft, painterly). **Art Nouveau** for the card designs. A glassy folder; an interactive **"glow"** motif on the landing. Cute, tactile, alive — not flat / corporate.

## The flow (the "glow")

1. **Landing** — one cute single page: the word **Pebble**, a one-liner, and an interactive **glow** you can play with. One CTA: *Sign in / Try it out*.
2. **Google SSO** — sign in.
3. **Onboarding-as-loading** — the scrape takes a while, so the wait *is* the onboarding (and it's cute, not a spinner):
   - A persistent **corner artifact** shows scrape progress (% + time left) and follows you through onboarding, so the wait makes sense.
   - **Make your own card** — a cute interaction (with Claude) where you shape/parse your card instead of writing about yourself cold (you don't know your own one-liner).
   - **Narrator: "The Dot"** — our narrator, in **Grok voice** (funny). Reuse the **dot project's initial-loading narrator voice** (`/Users/johnnysheng/code/dot`).
   - **Three onboarding questions** (answer by Grok voice **or** text):
     1. A **turning point** you've encountered in your life.
     2. The **one thing you're uniquely good at**.
     3. What someone should know to **be a good friend to you**.
4. **Ready → reveal** — press the (now-ready) button, or finishing the questions lands you on *"bringing up your cards now."*
5. **The dopamine reveal** — a **glassy folder** appears; your cards populate into it; you **click to unpackage**; cards spread onto a **desktop** (cofounder.co.uk-style). Pull cards out, sort, explore.

## The cards

A folder of cards on a desktop. Per card: pull out → view on desktop → **click → modal** (detail) → **flip over** (back names the card) → **download PNG** to share. Art Nouveau formatting.

Three hero cards + cute shareables:
- **Profile card** — your basic info.
- **The "wow" card** — the immediate dopamine hit (shareable).
- **Relationship graph card** — the functional centerpiece (expandable).
- **+ cute shareables** — e.g., **MBTI guess**, your **story**.

Surfaced content = what we find about you (online + your three answers): your **story**, **personality (guesses MBTI)**, **profile**, **relationship graph**.

## The relationship graph (the functional piece)

**Not random dots** — a **planetary orbit / electron-molecule** model:
- **You** at the center.
- Rings outward: **inner circle → 1st → 2nd → 3rd connection**, people placed by closeness.
- **Lines** between rings show how you connect to each person.
- People named in your stories / inferred-closer land on the right ring.
- **Click to expand → modal** with the full orbit.
- *Future:* "how closely related am I to X?" answered from your network ("you are the 5 people around you").

## Voice & narrator

Grok voice for the onboarding questions; **"The Dot"** as narrator, using the **dot project's initial-loading voice**. Voice or text input.

## Open questions (decisions for a buildable 6-hr spec)

- Landing **one-liner** copy.
- **Data source for the demo:** Gmail scrape? a precached export? built from the three answers + public footprint? (Drives what the cards/graph contain.)
- Is **voice (Grok STT/TTS)** in scope today, or text-first with voice as a stretch?
- The exact **fields** on the three hero cards.
- What **"make your own card"** concretely is.

## Scope reality (≈6 hrs) — proposed hero cut

- **Hero (must demo):** the **reveal** — folder → unpackage → cards on the desktop → open the **relationship-orbit** + **profile/story** cards → *it's grounded* (really you, really your people).
- **Layer if time:** glow landing · Grok-voice onboarding + Dot narrator · scrape-progress corner artifact · card flip + PNG share · MBTI card.
- **Precache (engineered half-half):** the scrape — the corner timer is a staged artifact; the real extract → graph → story pipeline runs behind it.
- **Simplify for time:** live Gmail OAuth → precached export; full voice → text-first; elaborate animations → only the few that sell the dopamine moment.
