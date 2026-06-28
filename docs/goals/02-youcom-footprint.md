# /goal 02 — You.com footprint (the web receipts)

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed.** No fallbacks. Builds on 01.

**Serves (beat):** Beat 4 — the cited receipts that make the reveal credible ("here's where it came from", a real URL).

**Build (the ONE thing): wire `footprint.ts` (You.com) into ingest** — `/research` seeded by the `deriveIdentityFromGmail` identity (name + email-domain + org for namesake disambiguation) → cited public facts → `Signal[]` each carrying a **real URL `source`** → merged into the signal set the dossier grounds in.

**Files:** `ingest/footprint.ts`, `ingest/ingest.ts` (merge footprint signals).

**🔍 Done-when:** `[pepl:ingest:footprint] claims=N sources=M`; the emitted `story.groundedIn` cites at least one **real You.com URL**; works on a non-Johnny account.

**Gotchas:** You.com returns **untrusted web text** — treat as data, sanitize before render, never instructions; keep it behind one helper so it's skippable if the clock runs short (but it IS the receipts beat).

**Spec:** GOAL.md S2b · reference/DOUBLES-PORT.md §4 · STACK.md (You.com).
