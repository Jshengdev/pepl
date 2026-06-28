# Pebble

**See yourself, clearly.** Pebble turns the scattered exhaust of your life — your inbox, your calendar, who you actually talk to, how you talk — into a grounded picture of who you are, then places you on a map of people where your story connects to others through real, cited overlap.

It's a different kind of social network: the unit isn't a post, it's a **person — proven**. Every line Pebble shows about you traces back to something real, or it doesn't get shown.

> Monorepo: a Next.js front end + a TypeScript (Hono) back end.

## How it works

1. **Sign in with Google.** One connection grants access to the signal already sitting in your Gmail and Calendar — no forms, no data entry.
2. **Talk to Dot.** A voice agent asks how your day goes while Pebble reads your world in the background. You answer out loud; it transcribes live.
3. **Draw your smiley.** A ten-second hand-drawn avatar — the one human, non-derived thing on your card.
4. **See your dossier.** A bento of cards — Identity, Story, Stats, People, Personality — where each compartment ("bit") carries a receipt: tap it and you see exactly where it came from (an email, a calendar event, a cited web page, or something you said).
5. **Find your people.** Your node drops onto a shared map. Pebble finds the genuine overlap between you and others — shared people, the same space, a parallel arc — grounded on both sides.

## Architecture

Pebble is one pipeline. A turn flows through typed nodes, each with a zod contract, streaming progress to the front end over WebSocket:

```
ingest ──→ extract ──→ graph ──→ generate ──→ critic ──→ cards
  │           │          │           │           │          │
 real      people +    radial +    story in    held-out    the
 signals    edges      lateral     your        grounding   dossier
(Gmail,     (LLM)      graph       voice       judge       (5 cards
 Calendar,                                                  × ~5 bits)
 web)
```

**Everything is a Signal.** A `Signal` is one atom of evidence — an email subject, a calendar event, a cited web sentence, a line you spoke to Dot — `{ id, text, source }`. Nothing downstream may assert anything that isn't backed by one.

**The dossier is grounded by construction.** Each `Bit` on a card carries a `Grounding`: a single `signal` receipt, a `computed` aggregate (with the signal ids it was derived from), or an honest `user` mark (your drawn smiley, your spoken answers). The generator writes your story; a **held-out critic** — a different model family than the generator, shown only the Signals and never the prose — checks every claim and **cuts anything it can't trace** (fail-closed, with bounded retries). What survives is what you see.

**The graph is the social layer.** People extracted from your interaction metadata are placed on concentric rings (you → inner circle → 2nd → 3rd) with typed, weighted edges. When two people share the map, a connector finds their real overlap and narrates it, grounded on both sides.

### Built on

- **Composio** — the Google sign-in *and* the data source. One OAuth connection pulls Gmail + Calendar; senders are classified (human vs. mailing list), and the interaction metadata becomes the relationship graph. (`backend/src/ingest/composio/`)

- **You.com — the web-evidence layer.** For each person Pebble surfaces, `backend/src/ingest/footprint.ts` calls the **You.com Research API** (`POST https://api.you.com/v1/research`, authenticated with the `X-API-Key` header). The response is citation-backed markdown; Pebble splits it into individual claims, parses the inline citation markers (`[[n]]`), and **binds each claim to its real source URL**, emitting one `Signal { text, source: <url> }` per cited fact (web text is sanitized and treated strictly as data). Those URLs are the receipts behind every web-sourced line in your dossier — and the held-out critic deletes any claim a source can't back. Search here isn't a feature bolted on the side; it's how Pebble keeps its promise that everything it says is verifiable.

- **InsForge — the backend platform.** Every model call in the system — Dot's replies, the story generator, the held-out critic, the graph extractor — routes through a single OpenAI-compatible **model gateway provisioned on InsForge** (`backend/src/llm/client.ts`, key `INSFORGE_OPENROUTER_API_KEY`), so the whole multi-agent loop runs on one key with the held-out invariant enforced right at the boundary (generator `anthropic/claude-sonnet-4.6` ≠ critic `qwen/qwen3-235b`). The project is provisioned and operated through the InsForge CLI and SDK (`@insforge/cli`, `@insforge/sdk`). InsForge Postgres — with row-level security and `pgvector` for similarity — is the persistence layer for the social graph (people, edges, dossiers, signals, connections), and InsForge serves the deploy.

- **Grok (xAI)** — Dot's voice: Grok generates Dot's replies during onboarding, with live transcription in and spoken delivery out. (`backend/src/agents/dot.ts`)

- **Next.js 16 / React 19** — the front end: the talking-face onboarding, the dossier reveal, and the people map (rendered with `react-globe.gl`).

## Project layout

```
backend/                  TypeScript + Hono
  src/
    agents/               dot · generator · critic · cards · connector
    ingest/               composio (gmail/calendar) · footprint (you.com) · graph · extractors
    llm/client.ts         the model gateway — one entry for every model call
    orchestrator/run.ts   the pipeline (ingest → … → cards) + WS events
    memory/store.ts       dossier persistence
    web/server.ts         Hono HTTP + /ws
    types.ts              zod contracts (Signal · Person · Edge · Dossier · Bit · Grounding · …)
frontend/                 Next.js 16 · React 19 · react-globe.gl
docs/                     design + build specs
```

## Running it

```bash
# backend
cd backend && npm install && npm run dev      # http://localhost:8787

# frontend
cd frontend && npm install && npm run dev     # http://localhost:3000
```

Copy `backend/.env.example` → `backend/.env` and fill the keys (Composio, You.com, the InsForge gateway, xAI). The pipeline is **fail-loud**: a missing key or a dead source surfaces immediately — it never silently fabricates a result.

## The one rule

Nothing about you is shown that can't be traced to something real. **AI organizes; you originate; the receipts keep it honest.**
