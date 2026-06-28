import type { Metadata } from "next";
import { SlideDeck } from "./SlideDeck";

export const metadata: Metadata = {
  title: "pepl — deck",
};

// `/slidedeck` — a coded 16:9 slide deck. Arrow keys move between slides; the
// `f` key (or the corner button) goes fullscreen, held at 16:9.
export default function SlideDeckPage() {
  return <SlideDeck />;
}
