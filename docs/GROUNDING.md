# pepl — Grounding verbatim (speak this first)

Every `/goal` story (in [goals/](./goals/)) and the build loop ([GOAL.md](./GOAL.md)) is grounded in this. It's the truth every build decision traces back to — *your* intent in *your* words, not a generic build. The held-out judge holds the work to it.

## THE WHY — in the real words (from `gx`)
- *"AI does the steps only AI can do, and you do the steps only you can do — so you're not working with AI."*
- *"Organization is the real problem — and exactly what AI can do in five seconds."*
- *"Claude could never replicate her story because it doesn't have her context — but working together heightens her ability to tell it."*
- *"The value is reflecting a perspective about themselves they haven't thought of before — the thing that makes people go 'oh whoa.'"*
- *"I spent a lot of time blind to myself… my solution was in seeing my life better."*
- *"Machines prove; you mean."*

## THE WHAT — the demo path in one breath
*"Sign in with Google (live) → a little talking face asks how you spend your day, 30s back-and-forth → draw your smiley, design your card → the scrape finishes, the back blurs, your card fills with YOUR info and becomes your node → click it, all your cards open (a lunchbox of 5 cards × ~5 grounded bits) → you land on the map; Knot connects you to friends through a real, two-sided story."*

## THE HOW — the non-negotiables (verbatim rules)
- *"Everything is live for the demo user. The ONLY cached things are Dot's first voice line and the friend nodes — labeled `// DEMO_CACHE:`, and the same live pipeline produces them."*
- *"No fallbacks. Throw, or render a red FAILED badge. Never a canned value, never an empty array to hide an error."*
- *"Every claim traces to a real signal or it gets cut. Held-out critic, different model family — for the reveal AND for Knot."*
- *"No hardcoded names — identity comes from the connected Gmail. It must work on an account that isn't Johnny's."*
- *"Verbose logs by default: `[pepl:stage] did X (n=.., ms)`; WARN with inputs on any zero-result; print the active mode + envReadiness at boot."*
- *"Done = a run command + observed output. Never 'should work.'"*

## THE GATE — the one test for every piece
*"Is this real? Could you flip one flag / swap one input and watch the live pipeline produce it? Yes → ship. No → stop."*
