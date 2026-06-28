"use client";

import { useEffect, useState } from "react";
import { LoadingBar } from "./LoadingBar";
import { StoryStep } from "./steps/StoryStep";
import { ProfileStep } from "./steps/ProfileStep";
import { CardsStep } from "./steps/CardsStep";
import { RevealStep } from "./steps/RevealStep";
import { DEFAULT_AVATAR, DEFAULT_CARDS } from "./defaults";
import { serializeAvatar, serializeCardGradient } from "./serialize";
import { getUserId } from "@/lib/pepl/session";
import { saveCard } from "@/lib/pepl/api";
import { useRun } from "@/lib/pepl/useRun";
import type { AvatarDesign, CardDesign } from "./types";

// The onboarding state machine: story → profile → cards → reveal. All the
// design state lives here so going back and forth never loses work; the reveal
// reads the finished design. Liveness (the background scrape kicked on connect)
// streams through ONE WS hook mounted here and whispers under every step.

type Step = "story" | "profile" | "cards" | "reveal";

const PROGRESS: Record<Step, number> = { story: 0.25, profile: 0.5, cards: 0.75, reveal: 1 };
const LABEL: Record<Step, string> = {
  story: "recording your story",
  profile: "shaping your reflection",
  cards: "painting your cards",
  reveal: "loading…",
};

function cloneAvatar(a: AvatarDesign): AvatarDesign {
  return {
    points: a.points.map((p) => ({ ...p })),
    strokes: a.strokes.map((s) => s.map((pt) => ({ ...pt }))),
  };
}
const cloneCards = (cards: CardDesign[]): CardDesign[] =>
  cards.map((c) => ({ ...c, lifts: [...c.lifts] }));

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("story");
  const [story, setStory] = useState("");
  const [avatar, setAvatar] = useState<AvatarDesign>(() => cloneAvatar(DEFAULT_AVATAR));
  const [cards, setCards] = useState<CardDesign[]>(() => cloneCards(DEFAULT_CARDS));

  // The demo's userId (localStorage), read after mount to avoid an SSR mismatch.
  const [userId, setUserId] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserId(getUserId());
  }, []);

  // ONE liveness socket, connected on mount BEFORE any POST (INTEGRATION law 3).
  const run = useRun();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Persist the node avatar + card style. smiley/colors come from the avatar;
  // the gradient only exists once the cards are designed (sent on the cards advance).
  async function persistCard(withGradient: boolean) {
    if (!userId) {
      setSaveError("no userId yet — connect first");
      return;
    }
    const smileyColors = avatar.points.map((p) => p.color);
    const cardGradient = withGradient
      ? serializeCardGradient(smileyColors, cards[0].offset)
      : undefined;
    try {
      console.log(`[pepl:flow] saveCard (userId=${userId}, gradient=${withGradient})`);
      await saveCard({ userId, smiley: serializeAvatar(avatar), smileyColors, cardGradient });
      setSaveError(null);
    } catch (e) {
      console.error("[pepl:flow] saveCard failed", e);
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

  const reading = run.scrapePct > 0 && run.scrapePct < 100;
  const failure = run.failed
    ? `${run.failed.node}: ${run.failed.error}`
    : saveError;

  return (
    <main className="min-h-dvh w-full p-3">
      <div className="relative flex min-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_1px_0_rgba(42,42,40,0.04)] ring-1 ring-black/[0.04]">
        {/* corner whisper — the live scrape (WS-driven) runs UNDER every step.
            No spinner; honest-empty until scrape_progress arrives. */}
        {failure ? (
          <div
            role="alert"
            className="absolute right-5 top-4 z-10 flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200"
          >
            FAILED · {failure}
          </div>
        ) : reading ? (
          <div className="pointer-events-none absolute right-5 top-4 z-10 flex items-center gap-2 text-[11px] font-medium text-charcoal/45">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2f6bf5]" />
            pebble is reading… {Math.round(run.scrapePct)}%
          </div>
        ) : null}

        {/* content top-aligned so every step's title sits at the same point */}
        <div className="flex flex-1 flex-col items-center px-6 pb-28 pt-[6vh]">
          {step === "story" && (
            <StoryStep
              userId={userId}
              onNext={(s) => {
                setStory(s);
                setStep("profile");
              }}
            />
          )}
          {step === "profile" && (
            <ProfileStep
              value={avatar}
              onChange={setAvatar}
              onNext={() => {
                void persistCard(false);
                setStep("cards");
              }}
              onBack={() => setStep("story")}
            />
          )}
          {step === "cards" && (
            <CardsStep
              value={cards}
              colors={avatar.points.map((p) => p.color)}
              onChange={setCards}
              onNext={() => {
                void persistCard(true);
                setStep("reveal");
              }}
              onBack={() => setStep("profile")}
            />
          )}
          {step === "reveal" && (
            <RevealStep userId={userId} design={{ story, avatar, cards }} />
          )}
        </div>

        {/* no loading bar on the reveal — the journey is done */}
        {step !== "reveal" && <LoadingBar progress={PROGRESS[step]} label={LABEL[step]} />}
      </div>
    </main>
  );
}
