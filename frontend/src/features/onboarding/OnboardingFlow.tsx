"use client";

import { useState } from "react";
import { LoadingBar } from "./LoadingBar";
import { StoryStep } from "./steps/StoryStep";
import { ProfileStep } from "./steps/ProfileStep";
import { CardsStep } from "./steps/CardsStep";
import { RevealStep } from "./steps/RevealStep";
import { DEFAULT_AVATAR, DEFAULT_CARDS } from "./defaults";
import type { AvatarDesign, CardDesign } from "./types";

// The onboarding state machine: story → profile → cards → reveal. All the
// design state lives here so going back and forth never loses work; the reveal
// reads the finished design. A backend will eventually replace the placeholder
// people in RevealStep with real matches.

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

  return (
    <main className="min-h-dvh w-full p-3">
      <div className="relative flex min-h-[calc(100dvh-24px)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_1px_0_rgba(42,42,40,0.04)] ring-1 ring-black/[0.04]">
        {/* content top-aligned so every step's title sits at the same point */}
        <div className="flex flex-1 flex-col items-center px-6 pb-28 pt-[6vh]">
          {step === "story" && (
            <StoryStep
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
              onNext={() => setStep("cards")}
              onBack={() => setStep("story")}
            />
          )}
          {step === "cards" && (
            <CardsStep
              value={cards}
              colors={avatar.points.map((p) => p.color)}
              onChange={setCards}
              onNext={() => setStep("reveal")}
              onBack={() => setStep("profile")}
            />
          )}
          {step === "reveal" && <RevealStep design={{ story, avatar, cards }} />}
        </div>

        {/* no loading bar on the reveal — the journey is done */}
        {step !== "reveal" && <LoadingBar progress={PROGRESS[step]} label={LABEL[step]} />}
      </div>
    </main>
  );
}
