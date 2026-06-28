# pepl — Open Questions

Append here; don't invent scope (LOOP-FRAMEWORK gotcha). Owner in [brackets]. The build proceeds on the stated **assumption** until a decision lands.

- **[Johnny / Story] Data source for the demo** — precached real export *(assumed)* · live Gmail scrape · answers + public footprint only. (Doesn't block CONTRACTS; does shape what the cards/graph contain.)
- **[Johnny / Story] Voice in scope today** — Grok STT/TTS + "The Dot" narrator · text-first *(assumed for the core)*, voice as the stretch layer.
- **[Story] Exact fields** on the 3 hero cards (profile / wow / graph) — CONTRACTS has a first cut.
- **[Story] Landing one-liner** copy.
- **[Story] "Make your own card"** — what it concretely is.
- **[Johnny] Track lock** — Potion Lab? **Sponsor tech** — RECOMMENDED + speccd in [STACK.md](./STACK.md): **InsForge** (db + auth + model gateway + hosting → $500) + **You.com** (citation grounding → $1k). Build proceeds on the InsForge gateway for models (generator ≠ critic family), in-memory store first; confirm or override.
- **[Build] Read [STACK.md](./STACK.md) at S2** — model pairing, env keys, and the grounding-critic spec (held-out family, phantom-claim + mechanical-trace defenses, fail-closed).

## Build-Loop status (Window 3 — proceeding, not blocked)

- **LLM behind one `llm/client.ts`**, provider chosen by `LLM_PROVIDER` env (default `insforge`). Per STACK.md: generator = Claude Sonnet family, critic = a non-Claude family (Qwen/Llama); family-difference asserted at boot AND per call, fail-closed. No `INSFORGE_API_KEY` yet → S2 runs live on the **OpenRouter fallback** (key already ported into `backend/.env`, slugs proven in prior builds), flip to InsForge by setting `INSFORGE_API_KEY` + `LLM_PROVIDER=insforge` (one env change, identical logic). InsForge skill/`docs.insforge.dev` gets wired at S4 (deploy + gateway flip).
- **Data source** = precached REAL `Signal[]` assembled from Johnny's verbatim corpus (`gx/raw/*`), cached + labeled `// DEMO_CACHE:`; extract → graph → generate → critic runs LIVE on it. Real people surfaced: Johnny, Sarah, Teri.
- **Starting now: S0 (scaffold + types) + S1 (stub pipe, no LLM)** — neither needs the gateway, so the open InsForge-key item does not block.
