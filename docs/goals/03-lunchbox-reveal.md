# /goal 03 — The lunchbox reveal (the Dossier · THE HERO)

> Grounding: [../GROUNDING.md](../GROUNDING.md). **Done = run + observed.** **Grounding is asserted, not trusted** — throw on any unresolvable receipt. Builds on 01–02.

**Serves (beat):** Beat 4 — "that's me." Your dossier as a **lunchbox of 5 cards × ~5 grounded bits**.

**Build (the ONE thing): the `Dossier` payload + `POST /reveal`.**
- Add the bento types to `types.ts`: `Grounding` (`signal` | `computed{from[],critic}` | `user{source}`), `Bit` (`ok{label,value,grounding}` | `failed{label,triedSource}`), `DossierCard` (5 kinds × 3–6 bits), `Dossier{cards,smiley,proof,mode}`. **Supersedes** the loose `Reveal`/`WowCard`/`MbtiCard`.
- Add `buildDossier()` / `dossierNode` after `cardsNode` in `orchestrator/run.ts`, mapping `{graph, story, verdict, signals}` + persisted smiley → `DossierCard[]` (Story→Story card, RelationshipGraph→People card's `theGraph` bit value, CriticVerdict→`claimsCut`+`receipts`).
- Expose `POST /reveal {userId} -> Dossier`.
- **Assert grounding:** every `grounding.signalId` and every id in `computed.from` MUST be in the ingested signal set or `buildDossier` THROWS (mirror `generator.ts`). Synth bits → `kind:"computed",critic:true`; counts → `critic:false`; smiley → `kind:"user"`.

**The 5 cards (~25 bits):** Identity (smiley·name·oneLiner·voiceSignature·definingFact) · Story (arc·throughline·origin·drivingBelief·receipts) · Stats (peopleSurfaced·closestPerson·claimsCut·signalsRead·mappedRelationships) · People/Graph (innerCircle·mentor·icp·theGraph·lateralEdge) · Personality (type·why·operatingMode·principle·growthEdge).

**Files:** `types.ts`, `agents/` (`buildDossier`), `orchestrator/run.ts`, `web/server.ts` (`/reveal`).

**🔍 Done-when:** `/reveal` returns 5 cards / ~25 bits, every `ok` bit carries a `Grounding` receipt, `proof{peopleSurfaced,claimsCut}` + `mode:"live"` present, ungrounded already cut, any unresolvable bit renders `status:"failed"`; `[pepl:dossier] cards=5 bits=25 failed=0 mode=live`.

**Gotchas:** `claimsCut` legitimately uses `computed.from:[]` (honest absence — a cut claim has no surviving signal); a `failed` bit is a red badge, NEVER a canned value.

**Spec:** GOAL.md S2c · DESIGN-GOALS Part 5 (the bento shape + the 5-card/5-bit table).
