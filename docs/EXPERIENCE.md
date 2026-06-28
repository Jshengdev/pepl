# Pebble — Experience (MVP)

Product name **Pebble** (repo `pepl`). The living journey doc — Window 2 owns it. **v2 captures Johnny's 2026-06-28 e2e walkthrough** (sign-in = Composio account + data; voice onboard; live collection via doubles-logic + You.com + LinkedIn; the "your icon" reveal; the connect map). Beat-by-beat → [DEMO-SCRIPT.md](./DEMO-SCRIPT.md); Dot's voice → [reference/NARRATOR-THE-DOT.md](./reference/NARRATOR-THE-DOT.md). **Everything live** (only Dot's first voice line is cached).

## The one-line experience

You sign in once; Pebble reads your world and builds your **dossier**; you talk to Dot for a minute while it collects everything about you; then you **see a version of yourself** — your icon, your story, what your journey means — and you connect to other people on a shared map.

## The flow (v2 — Johnny's e2e)

1. **Landing** — one page: **Pebble**, a one-liner, the interactive **glow**. One button: **Sign in**.
2. **Sign in → Composio (does two things at once)**
   - **Creates your account** from your Google email.
   - **Grabs your Composio data** (Gmail / Contacts / Calendar) as the raw context for your **dossier** (your profile/program).
3. **Onboard — the voice module (Dot)** — you **talk to Dot** about your experience: she asks, you respond out loud, she replies **wittily** ("that was beautiful — thank you"). The talking *is* the onboarding. **In parallel, behind the screen:**
   - **Composio extracts** + the **`doubles` scraping logic** (ported) lines up *who you are / what you do* from your data.
   - **You.com** runs the **main collection** — "capture everything" about you across the web (many collection paths).
   - **LinkedIn / career** is a primary source (demo seed: `linkedin.com/in/johnny--sheng`).
4. **Card-builder (interactive, fills time)** — a short interactive step where you shape your **dossier card**, sized to cover the collection latency while the scripts run.
5. **The reveal — "your icon"** — an **animated personal icon** presents your **thoughts**: what your info *means*, what you *want*, the **story you can tell** and the **story you're already telling**, and **what your journey means** across everything you do. Career-anchored (LinkedIn). It also surfaces **how your journey rhymes with others'** — the bridge to the map. *(This is The Double's triangulation: the story you tell vs the story you live — grounded, not invented.)*
6. **The map — connect / multiplayer** — a **second person signs in** and joins the shared space (**"the blast"**); you can **click each other**, see the basics, and you're shown on a **map** where your stored data **links you semantically** (how your journeys connect).

**Hero (protected live, full sequence):** sign-in → collection runs live (Composio + doubles-logic + You.com + LinkedIn) → **"your icon" reveal** (your story + what your journey means), grounded → **connect on the map**.

## The dossier & the icon (the payoff content)

Built live from your Gmail + web + LinkedIn + your voice answers, the **dossier** is your grounded self-model; **"your icon"** is how it's presented back — an animation that shows:
- **Who you are / what you do** (career-anchored, from LinkedIn + email).
- **Your story** — *why* you do what you do / what you've built, in your voice.
- **The throughline** — what your journey *means*; the story you tell vs the story you're already living.
- **Your stats** — your numbers (people surfaced, who you lean on, etc.) — the want-to-know hit.
- Every line shows **where it came from** (the receipt); you adjust by **talking**, no forms. *(grounding gate + correction in one move.)*

> **Open (sharpen with Johnny):** is "your icon" a single animated avatar/mark that *opens into* these panels, or a spread of cards (Profile / Story / Stats)? The card-builder (step 4) — is the card you build the same artifact as the icon, or a separate pre-reveal step?

## The map (connect / multiplayer)

Multiple people who've signed in connect in a shared space ("the blast"): click a person → see the basics; the **map** shows how you're linked, with your stored data making the connections **semantic** ("you are the 5 people around you"). The ambitious, world-building beat.

> **Open (sharpen with Johnny):** is the two-person live connect a **must-demo** beat, or the **stretch / "open endeavour"**? It's the most ambitious live moment (two real accounts + semantic linking).

## Voice & narrator (core)

**Dot is a Grok voice agent** — voice in (your spoken answers) and voice out (Dot, witty + warm). Voice from `dot`, adapted in [reference/NARRATOR-THE-DOT.md](./reference/NARRATOR-THE-DOT.md). Two voices, never crossed: **Dot** (warm, spoken) and the **system whisper** (mono — the collection-progress artifact). Dot's **first line is a cached/prewarmed Grok response** (instant open); everything after live; autoplay-block degrades to text, never silence.

## Design system

**Dot/GX brand**, skeuomorphic and alive. *Open design fork (not blocking):* original EXPERIENCE called for **Monet × Art-Nouveau × Y2K-nature**; the `dot` reference brings a **clean, depth-from-light** system (one accent hue, mono system voice, blur-up motion, nothing bounces). Johnny: "match GX Vision / little dot brand scheme." → decide the skin at design time; the `dot` motion + two-voice discipline carries over regardless.

## Scope reality (≈6 hrs, everything live) — the hero cut

- **Must demo (protect live):** Sign-in (Composio) → live collection (doubles-logic + You.com + LinkedIn) → **Dot voice onboard** → **card-builder** → **"your icon" reveal** (story + journey meaning, grounded, correct-by-talking).
- **Open endeavour (likely stretch — confirm):** the **connect map** (second person + semantic linking).
- **One engineered half-half:** Dot's first voice line cached (prewarmed). Everything else live. **No backup video.** Harden the live path (the [gotchas](./reference/HACKATHON-GOTCHAS.md) are the playbook); **fail loud** (red badge), never a silent fake.
- **Layer if time:** card flip + PNG share · MBTI card · richer map · glow polish.

## Resolved (was: open questions)

- **Data source** → **LIVE.** Composio Gmail (= sign-in + account + ingest) · You.com main collection · **LinkedIn/career** · `doubles` scraping logic ported. Only cache = Dot's first voice line.
- **Voice** → **core** (Dot = Grok voice agent).
- **Track + sponsors** → **Potion Lab** · InsForge (gateway + db + deploy) + You.com (collection/grounding) + Composio (sign-in + Gmail) + Grok (voice).
- **Hero** → **"see a version of yourself" / your icon** (story + journey meaning, grounded, correct-by-talking). Map = connect beat.

Still open: the **icon vs cards** form (above) · the **map: must-demo vs stretch** (above) · landing **one-liner** · exact **stats** fields · the **design skin** fork · (tech) Composio vs `doubles` direct OAuth for Gmail.
