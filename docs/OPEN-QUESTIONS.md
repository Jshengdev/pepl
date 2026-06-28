# pepl — Open Questions

Append here; don't invent scope (LOOP-FRAMEWORK gotcha). Owner in [brackets]. The build proceeds on the stated **assumption** until a decision lands.

## ✅ Resolved 2026-06-28 (Johnny) — see [SCOPE-LOCK.md](./SCOPE-LOCK.md) (LOCKED v1) + [EXPERIENCE.md](./EXPERIENCE.md) (v2)

- **Data source → LIVE end to end** (NOT precached). Composio Gmail OAuth = sign-in + account + ingest; You.com = footprint/grounding; **port doubles' scrape engine** → [reference/DOUBLES-PORT.md](./reference/DOUBLES-PORT.md). Only cache = Dot's first voice line.
- **Voice → core.** Dot = Grok voice agent (STT/TTS), replaces iMessage.
- **Track + sponsors → Potion Lab** · InsForge (gateway + db + deploy) + You.com (footprint/grounding) + Composio (sign-in + Gmail) + Grok (voice).
- **Hero → "see a version of yourself" / your icon** (story + journey meaning, grounded, correct-by-talking). Connect map = stretch.
- **"Make your own card" →** conversational prefill (answers + scrape prefill your card; approve or keep talking to refine).

## ⚠️ Story → Build handoff (act on these — direction changed)

- **The "Data source = precached gx corpus (Johnny/Sarah/Teri)" assumption in the status block below is SUPERSEDED.** Go **LIVE**: wire Composio Gmail + Calendar + You.com via the port plan in [reference/DOUBLES-PORT.md](./reference/DOUBLES-PORT.md). Keep the JSON only as a flag-flippable `// DEMO_CACHE:` of the INPUT, never the default.
- **Remove the hardcoded "Johnny/Sarah/Teri" subject hint** — ring-0 identity comes from `deriveIdentityFromGmail` (live); real people come from the connected account.
- **`COMPOSIO_API_KEY` is the one blocker** — empty row in `backend/.env`. Johnny drops it + connects his Google (`composio add gmail`); set `COMPOSIO_MODE=live`.
- S0/S1 (scaffold + stub pipe) unaffected — the swap is at S2 ingest. CONTRACTS stay source-agnostic; DOUBLES-PORT §4 maps the scrape onto Signal/Person/Edge/Story.
- **Build to [DESIGN-GOALS.md](./DESIGN-GOALS.md)** (backend MVP per page: endpoints + shapes + done-when + the sequenced S2a→S3c alignment fix). Front-end is deferred (Johnny supplies a per-page example) — build the backend to those contracts. Pin the **Reveal payload** shape there into `types.ts` (`WowCard`→`StatCard`; add `signalId` receipts to facts/stats).
- **[VERIFICATION.md](./VERIFICATION.md) is the realignment board** — per-step should-work vs working-now (verified by RUNNING it 2026-06-28: engine 6/6 GREEN live, but on the precached corpus with hardcoded names). Build the punch list S2a→S3c; keep each step's 🔍 verify green.

## Still open

- **[Johnny/Story] The reveal — "your icon":** single animated avatar that opens into panels, or a spread of cards? · **connect map: must-demo or stretch?** · card-builder = same artifact as the icon or a separate step? · the map's semantic-linking mechanism (shared people / themes / embeddings?).
- **[Johnny] Connect your Google + drop `COMPOSIO_API_KEY`** before the demo (the live-ingest blocker).
- **[Story] Landing one-liner** — proposed: *"Pebble reads your scattered digital life and shows you a version of yourself — every line traceable to something real."* Tagline *"See your life better."*
- **[Story] Exact stats-card fields** · **[Story/Design] brand skin** (Monet×Art-Nouveau vs dot clean vs blend).
- **[Build] Port-level defaults** (override in [reference/DOUBLES-PORT.md](./reference/DOUBLES-PORT.md) §6): lookback 180d · hybrid graph (deterministic radial + LLM lateral) · inbox-derived contacts · sender-classifier via gateway.
- **[Build] Read [STACK.md](./STACK.md) at S2** — model pairing, env keys, grounding-critic spec (held-out family, phantom-claim + mechanical-trace defenses, fail-closed).

## Build-Loop status (Window 3 — proceeding, not blocked)

- **LLM behind one `llm/client.ts`**, provider chosen by `LLM_PROVIDER` env (default `insforge`). Per STACK.md: generator = Claude Sonnet family, critic = a non-Claude family (Qwen/Llama); family-difference asserted at boot AND per call, fail-closed. No `INSFORGE_API_KEY` yet → S2 runs live on the **OpenRouter fallback** (key already ported into `backend/.env`, slugs proven in prior builds), flip to InsForge by setting `INSFORGE_API_KEY` + `LLM_PROVIDER=insforge` (one env change, identical logic). InsForge skill/`docs.insforge.dev` gets wired at S4 (deploy + gateway flip).
- **Data source** = precached REAL `Signal[]` assembled from Johnny's verbatim corpus (`gx/raw/*`), cached + labeled `// DEMO_CACHE:`; extract → graph → generate → critic runs LIVE on it. Real people surfaced: Johnny, Sarah, Teri.
- **Starting now: S0 (scaffold + types) + S1 (stub pipe, no LLM)** — neither needs the gateway, so the open InsForge-key item does not block.
