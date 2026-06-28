# /goal 06 — Deploy + freeze

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed.** Build after 01–05 green.

**Serves:** all — a public URL that serves the demo path live.

**Build (the ONE thing): deploy the demo path + freeze with buffer.**
- Fill the InsForge gateway model slugs (or stay on the OpenRouter-via-InsForge key — usage bills to InsForge credits → the prize).
- Deploy a public URL serving the full v3 path.
- **Rehearse the live path (no backup video — founder call):** harden, don't record.
- Freeze the submission with buffer.

**Files:** `llm/client.ts` (InsForge slugs, optional), deploy config (`vercel.json` / `@insforge/cli deploy`), `.env` on the deployed env.

**🔍 Done-when:** the public URL runs the **entire v3 journey live on a real connected account** (sign-in → Dot → scrape → lunchbox reveal → node → Knot); the live gate is green on the deployed env (`envReadiness` prints SET + `mode:live`); rehearsed end to end.

**Gotchas:** no backup video — the mitigation is a hardened, rehearsed live path (HACKATHON-GOTCHAS #7); apply the same env/CORS checks to the deployed env, not just local; rotate keys post-demo.

**Spec:** GOAL.md S4 · STACK.md (InsForge deploy) · reference/HACKATHON-GOTCHAS.md.
