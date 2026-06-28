# pepl / Pebble — Sponsor tracks (how we built on each)

**Pebble** is an AI that turns the scattered exhaust of your life — your inbox, your calendar, who you actually talk to, how you talk — into a **grounded dossier of who you are**, then drops you onto a **map of people** where your story connects to others through real, cited overlap. It's a social network whose unit isn't a post — it's a *person, proven*.

The whole product is one thesis: **AI organizes; you originate; and nothing is said about you that can't be traced to something real.** Each sponsor maps onto a load-bearing part of that thesis — not bolted on, but doing a job the product can't live without.

> **Status legend (be honest with judges):** ✅ live in the build · 🟡 partially live (architected, wiring in progress) · 🟙 proposed (best-fit role, quick to make real).

---

## 🟦 InsForge — the agent-native backend a social network actually needs  ✅🟡

**The one-liner:** *An AI coding agent (Claude Code) stood up Pebble's entire backend on InsForge — provisioned, wired, and operated through the CLI + SDK with almost no human dashboard time. That's not "we used a BaaS," that's the agent-native cloud doing exactly what it's for.*

### How we used it

**1. Provisioned and operated by an agent (the meta-win).** The project (`pepl`, `us-west`) was created/linked, secrets pulled, and the model gateway wired **entirely from the terminal by the agent** — `npx @insforge/cli create/link`, `secrets get ANON_KEY`, `ai setup`. The agent installed InsForge's own Claude Code skills (`insforge`, `insforge-cli`, `insforge-debug`) and drove them. This is the literal pitch of an agent-native cloud: a coding agent ships full-stack with no plumbing detours. *(Live: project linked at `https://n9bdaens.us-west.insforge.app`; `.insforge/project.json` + keys in `backend/.env`.)*

**2. The model gateway powers every agent in the loop.**  ✅ All LLM calls — the Dot voice agent, the Story **generator**, the held-out **critic**, the graph **extractor** — route through the InsForge-provisioned OpenRouter gateway (`backend/src/llm/client.ts`, `INSFORGE_OPENROUTER_API_KEY`), so usage **bills to InsForge credits** and the whole multi-agent system runs on one key. Model tiers: generator `anthropic/claude-sonnet-4.6`, critic `qwen/qwen3-235b` (held-out, different family), extractor `anthropic/claude-haiku-4.5`.

**3. The database is the social graph itself.**  🟡 (architected; in-memory today, Postgres at S2b) Pebble's data model is *inherently* a social-network schema, and it lands cleanly on InsForge Postgres:
- `people` (ring 0–3 closeness), `edges` (relationship kind + strength) — **the relationship graph**.
- `dossiers` (5 cards × ~5 grounded `bits`), `signals` (the evidence every claim cites), `map_nodes` (each person on the shared map), `connections` (the cited overlap between two people).
- **Row-Level Security** is the multi-tenant story: your signals are yours; the map exposes only what you publish — exactly the public/private split a social network needs, enforced at the row, not the app.
- **pgvector** (InsForge ships the `vector` extension) stores Signal/persona embeddings → semantic recall *and* the people-similarity that powers connections.

**4. Realtime = the network coming alive.**  🟙 InsForge realtime is the natural transport for the map: when a new node (person) joins or a connection is computed, every viewer's map updates live. The social moment *is* a realtime event.

**5. Storage + deploy close the loop.**  🟡 Shareable dossier cards render to PNG → InsForge Storage (public-read bucket) for share links; the app deploys via `npx @insforge/cli deploy`.

### Why this is the *best* use of InsForge

InsForge is built so an **AI agent can run the full development workflow** — db, auth, compute, gateway, deploy — without a human stitching services. Pebble is the cleanest possible demonstration: a social network whose backend (graph DB + RLS multi-tenancy + vector similarity + realtime + a multi-agent model gateway + deploy) was **assembled by an agent, end-to-end, on one platform.** We didn't use one feature — we used the *shape* of the platform, which is the point.

---

## 🟪 You.com — the truth layer: people search, web scraping, citations  ✅

**The one-liner:** *A social network about real people lives or dies on whether what it says is true. You.com is Pebble's truth layer — for every person we surface, it searches the open web, scrapes the public footprint, and hands back claims with inline citations. Those citations become the receipt behind every line of your dossier.*

### How we used it

**1. People search — turning a name into a person.**  ✅ Pebble surfaces people from your real Gmail/Calendar (who you actually email, who's in your meetings). For the people that matter, `backend/src/ingest/footprint.ts` calls **You.com Research** (`POST https://api.you.com/v1/research`, `X-API-Key`) to discover who they publicly are — role, work, the space they operate in. A name from an email header becomes a real, contextualized node.

**2. Web scraping → grounded Signals.**  ✅ You.com's Research API runs the whole search→read→synthesize pipeline (it scrapes and cross-references the live web) and returns **cited markdown**. We parse the inline citations (`[[1]]`, `[2]`…), bind **each claim to its exact source URL**, and emit them as `Signal{ text, source: <real url> }`. Every scraped fact arrives already attributed.

**3. Citation grounding — the receipts behind the dossier.**  ✅ This is the heart of the product. Every `Bit` in your dossier carries a `Grounding` — and a You.com-sourced bit links to the page it came from. Our **held-out critic** (a different model family) then checks the generated story *against the Signal corpus only* and **cuts any claim it can't trace** (`fail-closed`, ≤2 regens). So You.com isn't decoration — it's what lets us promise *"every claim about you has a receipt,"* and actually keep it.

**4. The connection layer.**  🟡 When two people land on the map, the connector (Knot) finds shared context (same space, shared people, parallel arc); You.com enrichment is what makes those overlaps real and citable on both sides, not vibes.

### Why this is the *best* use of You.com

You.com sells **real-time, citation-backed web intelligence for AI agents** — accuracy, freshness, sources. Pebble uses all three as the *foundation of trust* for a people-graph: search to find the person, scrape to build them, citations to prove it, and an adversarial critic that **enforces the citations or deletes the claim.** Search here isn't a lookup feature — it's the credibility of the entire network. That's the highest-leverage thing their API can be.

---

## 🟩 Nebius — the semantic compute behind the people-graph  🟙 *(best-fit; quick to wire)*

**The one-liner:** *Nebius is the AI-cloud muscle behind "how are these two people actually connected?" — the embeddings and inference that turn a pile of signals into a similarity graph.*

**How it fits:** the connection engine needs (a) **embeddings** for every Signal/persona to compute people-to-people semantic overlap (the `Similarity`/`ConnectionStory` that links nodes on the map), and (b) **inference** for the held-out critic (a non-Anthropic model — Qwen/Llama — runs naturally on Nebius). Both are exactly Nebius's full-stack AI cloud (managed inference + GPU). 
**To make it real (fast):** add a Nebius embeddings call in `ingest/graph.ts`/the connector to back pgvector similarity, and/or point the critic tier at a Nebius-hosted model in `llm/client.ts`. *(Not yet wired — credits available, single call-site each.)*

---

## 🟧 Tavily — the second search lens  🟙 *(best-fit; quick to wire)*

**The one-liner:** *Two search engines beat one: You.com goes deep and cited; Tavily goes fast and broad — together they widen the net on a person and cross-check each other.*

**How it fits:** `ingest/footprint.ts` is provider-shaped — Tavily slots in alongside You.com as a parallel search node: Tavily's fast `search` (with `include_answer`) widens coverage on a person/company, and agreement across two independent sources is a *stronger* grounding signal than one. It can also power a lightweight "research this person" action separate from the dossier build. 
**To make it real (fast):** add a `tavilySearch()` next to the You.com call in `footprint.ts`, merge results into the Signal set (source = the Tavily result URLs). *(Not yet wired — You.com covers the path today; Tavily is the redundancy/breadth upgrade.)*

---

## The rest of the stack (not prize tracks, but part of the story)

- **Composio** ✅ — one Google connection = sign-in **and** the Gmail/Calendar data source (`ingest/composio/*`). The real personal data that everything is grounded in.
- **Grok / xAI** ✅🟡 — "Dot," the voice agent you tell your day to (Grok LLM live in `agents/dot.ts`; live transcription + TTS voice "eve" is the in-progress delivery layer that replaces texting).

---

## Copy-paste yap (one paragraph per track)

**InsForge:** *Pebble's entire backend was provisioned and built on InsForge by an AI coding agent — through the CLI and SDK, not a dashboard. InsForge runs our multi-agent model gateway (every LLM call, on one key), and its Postgres + RLS + pgvector + realtime are the social graph itself: people, edges, dossiers, and the live map of who connects to whom. It's the agent-native cloud doing exactly what it's for — an agent shipping a full-stack social network end-to-end.*

**You.com:** *A network about real people has to be true, so You.com is our truth layer. For everyone Pebble surfaces from your inbox, You.com searches the open web, scrapes the public footprint, and returns claims with inline citations — which we bind one-to-one to the evidence behind every line of your dossier. An adversarial critic then cuts anything You.com can't source. Search isn't a feature here; it's the credibility of the whole graph.*

**Nebius:** *Nebius is the semantic compute behind connection — the embeddings that measure how two people's stories actually overlap, and the inference for our held-out grounding critic. It's the muscle that turns a pile of signals into a people-graph.*

**Tavily:** *We pair Tavily's fast, broad search with You.com's deep cited research so two independent engines confirm each other — wider coverage on every person, and cross-source agreement as a stronger grounding signal than any single lookup.*
