# /goal 05 — Friends + Knot (the map / connect magic)

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed.** No fallbacks. **The ceiling — build only after 01–04 are green.**

**Serves (beat):** Beat 5 — you land on the map as a node; Knot connects you to friends through a real, two-sided story.

**Build (two things):**
1. **Friend constellation (S3):** `backend/data/friends/<name>.json` — recorded `Signal[]` shaped like a live pull, **real gx utterances re-sliced by SUBJECT** from `precached-signals.json` (place a few shared trio signals into BOTH a friend's corpus AND Johnny's so the link has real overlap), labeled `// DEMO_CACHE:`. `scripts/bake-friends.ts` runs EACH corpus through the SAME `runPipeline` → `saveDossier(friend-<name>)`. Floor 1 (Sarah); rec. 3 (+Teri +Shawn). **Nothing hand-authored.** *(Depends on 01: the `graph.ts:56` hint ripped + `seededWrong` dropped, else friends mislabel as Johnny / seed errors; each corpus needs ≥4 people.)*
2. **Knot (S3):** `GET /api/map -> {nodes: MapNode[], mode}` + `POST /api/map/link {a,b}` = `runConnector` in `agents/connector.ts` — sort the pair; overlap-find where each `Similarity` cites ONE real signal from EACH side or THROW; write the story; reuse `criticNode` **TWICE** (A-claims vs A-signals, B-claims vs B-signals; survives iff grounded on BOTH); merged flags → `regenToGrounded` ≤2 → 422; cache by sorted-pair key; `link:null` + WARN on honest 0-overlap.

**Files:** `data/friends/*.json`, `scripts/bake-friends.ts`, `agents/connector.ts`, `web/server.ts` (2 map routes), `types.ts` (`Similarity`/`ConnectionStory`/`MapNode` + 1-line generic widen of `regenToGrounded`).

**🔍 Done-when:** the map shows Johnny's live node + friend node(s) (drawn smileys as avatars); a link's every beat traces to a **shared** signal on BOTH sides; an invented overlap is CUT; the **curated non-overlapping pair returns `link:null`** (Knot's planted-lie test); `link(a,b)===link(b,a)`; a saved dossier rehydrates.

**Gotchas:** the **asymmetry trap** — judge PER SIDE, never one critic over the union; held-out family holds for Knot too (anthropic writes, qwen judges); DEMO_CACHE = the INPUT only; keep it LEAN (one new file + a data file + 2 routes + 4 zod types — reuse `criticNode`/`complete`/`regenToGrounded`).

**Spec:** reference/CONNECTOR-AND-FRIENDS.md (full) · GOAL.md S3 · DESIGN-GOALS Part 7/9.
