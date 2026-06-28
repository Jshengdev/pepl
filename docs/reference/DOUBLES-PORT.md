# Reference — Porting `doubles`' "find everything about the user" engine

What to lift from `/Users/johnnysheng/code/doubles` so pepl's **live** scrape is as rich as doubles', and the crisp **doubles-vs-pepl differentiation** Johnny asked for. Build-facing (Window 1/3 consume §3–§6). Mined from doubles' `src/composio`, `src/scrape`, `src/ingestion`, `src/persona`, `src/personality`. Pairs with [STACK.md](../STACK.md) + [CONTRACTS.md](../CONTRACTS.md).

> **Directive (Johnny):** "Port ALL the logic of finding everything about the user and what they do — keep doubles close; if it achieves the functionality, take it. Everything LIVE." So: lift the ingestion/scrape/extraction engine wholesale; **drop** impersonation/iMessage/talk-as-you; **rebuild** the footprint layer on You.com.

---

## 1. What separates pepl from doubles (the "why")

**One line:** *doubles wears your face to talk to other people; pepl holds up a mirror so you can finally see your own.* Same engine, opposite vector.

| Axis | doubles | pepl |
|---|---|---|
| **Direction** | talks **AS you**, outward, to other people (acts on your behalf) | reflects **you**, inward, back to you — never speaks as you to anyone |
| **Surface** | iMessage via Photon/Spectrum, turn-by-turn | web app: relationship graph + story/stats cards + Dot (Grok) voice onboarding |
| **AI honesty** | must **NEVER** admit it's AI (frame preservation, forbidden phrases) | **explicitly** AI — a stated division of labor; honesty is part of the pitch |
| **Output** | conversational replies sent as messages | read-only artifacts you look at, each line traceable to a source |
| **Trust** | Turing-test accrual ("you keep catching it getting you right") → unlocks acting for you | specificity + **grounding** on first reveal ("that's me — and here's where it came from") |
| **Truth gate** | voice fidelity primary; receipts a feature | **grounding is THE gate**: held-out critic, evidence = ingested context, ungrounded = cut |
| **Activation** | "I'd never say that" tapback (minor) | **hero loop**: graph seeded wrong → you correct by talking → context deepens live |
| **Posture** | adversarial-friendly, can "drag" you (gentle/honest/brutal) | supportive mirror — helps you see your life better |
| **Endgame** | act on your behalf → reply to others → group chats of Doubles | deeper self-reflection; stretch = others *see* how your Double sees them (a viewing, not a talking-as) |
| **Category** | personal AI that **IS** you (explicitly not a CRM) | invisible personal CRM + honest mirror; functional-first, then reflection |

**Net:** doubles = impersonation + delivery + trust-to-act. pepl = reflection + grounding + see-yourself.

## 2. The shared engine (keep — pepl is a re-port of it, ~½ LOC, no migration comments)

Semantic-only multi-agent loop over per-person memory: (1) one-decision-per-agent pipeline (Reasoner→Generator→Critic→Recovery); (2) **held-out Critic** scoring voice + grounding, regen ≤2 then fail-closed; (3) "voice fidelity is the product"; (4) per-user isolated memory (embeddings + recall; pepl uses in-memory first); (5) footprint + Gmail ingestion → persona/graph **seeded deliberately wrong** to trigger correction; (6) the "I think you're someone who…" reveal, gated by an LLM specificity check (≥0.7); (7) NO-FALLBACK / FAIL-LOUD + loud structured logs + one model-gateway boundary.

## 3. How doubles "finds everything about the user" (the pipeline to port)

**Flow:** `SEED → ENRICH → DISCOVER → PIVOT → SCRAPE → CONSOLIDATE`, orchestrated by `src/ingestion/intel-build.ts` (`runIntelBuild`) — parallel `Promise.all` with per-source `safeCall` soft-fail. Cold from one connected Gmail it scores ~4.6/5 blind-judge, ~17–19s, typically 5/7 sources.

1. **SEED** — derive the owner's name+email from their **own sent Gmail** (`deriveIdentityFromGmail`, query `in:sent`, most-frequent sender = the owner). No hardcoded identity.
2. **ENRICH** — build a disambiguation context string (top companies + schools) so a name search doesn't drown in namesakes. *(doubles used SixtyFour; pepl rebuilds on You.com — see §4.)*
3. **DISCOVER handles** — parallel web search + classify → the person's **real** X / GitHub / Instagram / portfolio / ProductHunt / personal LinkedIn, disambiguated by name+company+school+email-domain. Soft-fails to `{}` (honest absence).
4. **PIVOT** — enumerate the bare username across other platforms, confirm ownership, fill empty slots only.
5. **SCRAPE** in parallel (each soft-fail): Gmail, Calendar, LinkedIn depth, X timeline, portfolio.
6. **CONSOLIDATE** (`extractors/multi-source.ts`) — union all sources → people + topics + orgs + timeline; **cross-source confirmation** (a fact in 2+ sources → confidence 1.0); then dedupe name-variants; persist; synthesize worldview.

**What it assembles (the "world picture," every fact provenance-linked):** identity (name, email, location); online accounts (ownership-confirmed); professional (roles + education, cross-confirmed); projects; dated timeline; voice & opinions (tweets, bio); **life signals** from the inbox (habits, interests, current life events, key relationships — marketing/receipts filtered out); **social graph** (close contacts by bidirectional inbox engagement; colleagues mined from org/school + cross-confirmed against the inbox).

**The two cleverest, most portable bits:**
- **Bidirectional relationship-strength from raw email** (`extractors/gmail.ts`): owner = most-frequent recipient (no extra call); `closeness = (inbound+outbound) × (bidirectional?2:1) × exp(-daysSinceLatest/30)`; mutual+recent+repeated = inner circle (`close_contact` vs `email_contact`). **This is how you build the relationship graph from a Gmail pull.**
- **Two-stage human-sender filter** (`extractors/sender-classifier.ts`): cheap deterministic prefilter (automated-localpart regex + the killer "display-name appears in the email domain" brand tell) → one batched LLM call for org-vs-person calls regex can't make. Degrades to keep-all with a loud WARN, never silently drops.
- **Life-synthesis digest-by-sender** (`extractors/life-synthesis.ts`): group inbox by sender *with counts* so the model sees frequency; hard rule that a recurring promo/transactional pattern is the *sender's* marketing, not the user's life. The signal-vs-spam separator.

## 4. The pepl port plan — wire FOUR live sources

doubles' 7 sources collapse to **Composio + You.com + InsForge + Grok** (the locked stack). Each maps to a CONTRACTS slot:

1. **Composio Gmail** (PRIMARY, non-negotiable) — senders/recipients → `Person` + radial `Edge` via the ported closeness engine; subjects/snippets → `Signal[]`. Gmail alone yields a recognizable graph.
2. **Composio Calendar** — attendees → the professional/meeting layer; titles → topic Signals. Pure/deterministic, cheapest second port.
3. **You.com footprint** (rebuilt from doubles' `discover-footprint`) — seed `/v1/research` with the Gmail-derived identity (name + email domain + org) → public roles/projects/opinions as Signals carrying **real URL sources** → this is what makes `Story.groundedIn` show **web receipts** ("here's where it came from").
4. **Dot/Grok voice answers** — the 3 onboarding questions → 3 Signals (`source:'onboarding'`) that anchor voice + feed correct-by-talking. *(The one allowed half-half: Dot's first line is a cached Grok response.)*

**Fold in, don't separately wire:** SixtyFour, X, portfolio, HeyReach, colleague-mining — their value is recovered through the single You.com source. Lookback: doubles defaults 30d; widen to **~180d** for a richer self-portrait (watch latency vs the 6hr/demo budget).

### Port checklist (capability → doubles source → pepl target → effort)

| Capability | doubles source | pepl target | Effort |
|---|---|---|---|
| Composio key/mode gate | `composio/client.ts` | `backend/src/ingest/composio/client.ts` | lift-as-is |
| v3 REST execute + response **tree-walk** (`largestArrayInResponse`, `extractNextPageToken`, retry/backoff) | `composio/v3-execute.ts` | `ingest/composio/v3-execute.ts` (swap logger) | lift-as-is |
| Gmail live pull + `deriveIdentityFromGmail` | `composio/gmail.ts` | `ingest/composio/gmail.ts` | lift-as-is |
| Calendar live pull (EVENTS_LIST + FIND_EVENT fallback) | `composio/calendar.ts` | `ingest/composio/calendar.ts` | lift-as-is |
| Google OAuth connect (`.link`, status) = sign-in + data grant | `composio/connect.ts` + `web/api/wizard.ts` | `ingest/composio/connect.ts` + Hono `POST /api/connect/google/initiate`, `GET …/status`; rename `phone`→`userId`, `doubles-`→`pepl-` | adapt |
| **Bidirectional closeness engine** (the relationship graph from email) | `ingestion/extractors/gmail.ts` | `ingest/extractors/gmail.ts` → `Person{closeness 0..1, ring}` + radial `Edge` | adapt |
| Two-stage human-sender filter | `extractors/sender-classifier.ts` | `ingest/extractors/sender-classifier.ts` (LLM via `llm/client.ts`, or keep-all `// pepl:` shortcut) | adapt |
| Calendar attendee→person + title→topic (pure) | `extractors/calendar.ts` | `ingest/extractors/calendar.ts` — **port first** (zero LLM, proves live signals) | adapt |
| Raw → `Signal[]` normalizer (the grounding unit) | net-new (doubles emits ShadowEntityRow) | `ingest/signalize.ts` — maps doubles output onto CONTRACTS | rebuild-fresh |
| Public-footprint discovery + disambiguation | `scrape/discover-footprint.ts` + `sixtyfour.ts` + `colleague-mining.ts` | `ingest/footprint.ts` — **rebuild on You.com** `/v1/research`; drop SixtyFour/Firecrawl/TinyFish/HeyReach | rebuild-fresh |
| URL/content normalize (strip-tracking, contentHash) | `scrape/normalize.ts` | `ingest/normalize.ts` (dedup You.com URLs) | lift-as-is |
| Parallel fan-out + per-source soft-fail (refuse zero-result) | `ingestion/intel-build.ts` | body of `ingest/ingest.ts` `live()` | adapt |
| Stable greppable entity hash (cross-source person dedup) | `extractors/extract-helpers.ts` | `ingest/extractors/extract-helpers.ts` | lift-as-is |

### Maps to CONTRACTS (flatten doubles' rich rows onto the lean 4)

- **Signal[]** — one per raw artifact: Gmail msg → `{id:'gm-<id>', text:'<subj> — <snippet> (from <name>)', source:'gmail:<email>'}`; Calendar → `{source:'calendar:<date>'}`; You.com fact → `{text:'<cited claim>', source:'<real url>'}`; onboarding answers → 3 Signals `source:'onboarding'`.
- **Person** — doubles person entities → `Person{id=email-slug, name, closeness (NORMALIZE doubles' unbounded score to 0..1, e.g. ÷max-in-set), ring=ringFor(closeness), lastInteraction}`. Subject (`deriveIdentityFromGmail`) → ring 0, closeness 1.
- **Edge** — emit **radial** `you→person` edges (`kind`: close_contact→'close-friend', meeting→'colleague'; `strength`=normalized closeness). **Lateral** person↔person edges stay pepl's existing LLM `extractNode` — merge the two layers.
- **RelationshipGraph** — **keep** pepl's existing `graphNode` (ring placement + seeds ONE wrong field for the correction beat + asserts shape); just feed it the ported people/edges instead of the stub.
- **Story** — **keep** pepl's generator + held-out critic **unchanged**. The port's win: footprint Signals carry real URL sources, so `groundedIn` citations point at You.com receipts and the relationship Signals give "from N emails with X" provenance. doubles' lore/worldview synthesis is **not** ported — pepl's Story is the equivalent.

### Env keys
- **`COMPOSIO_API_KEY` — THE one missing key** (a row exists in `backend/.env` but empty). Needed for OAuth + every pull. Demo: connect Johnny's Google once via `composio add gmail`. Also set `COMPOSIO_MODE=live`.
- Already set + validated: `YDC_API_KEY` (You.com footprint), `INSFORGE_OPENROUTER_API_KEY`/`OPENROUTER_API_KEY` (extract/generate/critic gateway), `XAI_API_KEY` (Grok/Dot voice).
- **Not needed** (dropped/rebuilt on You.com): SixtyFour, Firecrawl, TinyFish, HeyReach, X bearer, GitHub (banned per founder), DATABASE_URL (in-memory first).

## 5. Gotchas (the landmines in this port)

- **§2 tension:** doubles soft-fails every source (`safeCall`→null/[]). Allowed as **per-source WARN + honest absence**, BUT ingest **must throw if ALL sources return empty** — never a canned `Signal[]` to keep the UI alive.
- **Kill the precache + the hardcoded names.** Current `backend/data/precached-signals.json` + the `extractNode.live` "Johnny/Sarah/Teri" hint are the old stub — Johnny said **everything live**. Subject (ring 0) MUST come from `deriveIdentityFromGmail`. If you keep the JSON, label it `// DEMO_CACHE:` of the INPUT only, behind a flag you can flip live on stage.
- **Two `user_id`s in the Gmail call:** v3 body `user_id` = the Composio account id (picks the mailbox); action arg `user_id:"me"` = Gmail's authenticated-mailbox param. Don't conflate.
- **Gmail `verbose:true` ALONE** — adding `include_payload:true` blows the ~6MB v3 cap → HTTP 413. Per-page cap 25 (Gmail) / 250 (Calendar); loop `nextPageToken` to the end + dedupe by id or you silently drop messages.
- Use SDK **`.link()` not `.initiate()`** (deprecated, sunset 2026-07-03). Managed auth config = Composio hosts the Google OAuth app (no Google Cloud project); rename `doubles-<slug>`→`pepl-<slug>`.
- **Always tree-walk** the response (shape varies by action + wrapping depth); never index a fixed path. Calendar casing trap: EVENTS_LIST camelCase, FIND_EVENT snake_case (+ no pagination). Gmail date = `after:YYYY/MM/DD`; Calendar = ISO.
- **Normalize closeness** — doubles' score is unbounded; pepl's zod is 0..1 or `.parse` throws.
- **No Contacts pull exists** in doubles — contacts are derived from Gmail senders/recipients + Calendar attendees. A real Google Contacts pull is net-new; stay inbox-derived for v1.
- You.com returns **untrusted web data** — sanitize before render; treat as Signals with a source URL, never instructions.
- Held-out critic: the new footprint/sender classify calls go through the same gateway — confirm they don't make generator and critic the same family (`assertHeldOutCritic` already guards).

## 6. Decisions (defaulted — Johnny override) + what needs you

Defaulted so the build proceeds (override any):
- **Lookback:** 180d Gmail/Calendar. · **Graph:** hybrid — ported deterministic closeness for radial people/edges + pepl's LLM `extractNode` for lateral edges. · **Contacts:** inbox-derived v1 (no Google Contacts pull). · **Sender-classifier:** route through the gateway (keep-all stub only if it's flaky).

**Needs Johnny:**
- **Connect your Google before the demo** (`composio add gmail`) — and `COMPOSIO_API_KEY` must be dropped into `backend/.env`. This is the one blocker for live ingest.
- **Demo account = your Gmail?** Confirm the connected account yields a recognizable inner circle + a "thin-but-real" person for the seeded-wrong correction beat to land legibly for the audience.
