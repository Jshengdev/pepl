"use client";

import dynamic from "next/dynamic";

/**
 * Loads the WebGL globe only on the client. react-globe.gl needs
 * window/WebGL and will throw under SSR, so we import it with { ssr: false }.
 * This wrapper is a client component because ssr:false dynamic imports aren't
 * allowed from server components.
 */
const HeroGlobeCanvas = dynamic(() => import("./HeroGlobeCanvas"), {
  ssr: false,
  loading: () => null,
});

export function HeroGlobe() {
  return <HeroGlobeCanvas />;
}
