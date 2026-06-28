"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { MeshAvatar } from "@/features/onboarding/MeshAvatar";
import { DEFAULT_AVATAR } from "@/features/onboarding/defaults";
import { FlutedBackground } from "@/features/landing/FlutedBackground";
import { connectInitiate, connectStatus } from "@/lib/pepl/api";
import { setUserId, DEMO_USER_ID } from "@/lib/pepl/session";

// /signin — the live connect gate (INTEGRATION.md page 1). "continue with Google"
// runs the real Composio OAuth; "use demo account" skips it (SCOPE-LOCK cut on-stage
// OAuth) and enters as a pre-seeded node so the demo always works. No spinner — a
// breathing glow while connecting; a red FAILED badge on failure.

// soft pepl gradient revealed (fading in) on button hover — no drop shadow
const GRADIENT = "linear-gradient(100deg,#8fb3e8,#c4a9d0,#e8acbe,#f6c19c)";

const POLL_MS = 1800;
const POLL_DEADLINE_MS = 120_000; // OAuth can take a while; fail loud after 2 min

type Status = "idle" | "connecting" | "error";

export default function SignInPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  // Polling is fire-and-forget from a click handler; cancel it if we navigate away.
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Demo path: skip OAuth, enter as the pre-seeded demo node. Always works.
  const enterDemo = () => {
    setUserId(DEMO_USER_ID);
    console.log(`[pepl:ui] connect:demo userId=${DEMO_USER_ID}`);
    router.push("/onboarding");
  };

  // Live path: fresh userId → initiate → open consent popup → poll status until
  // {connected}. On connect the backend background-kicks the scrape (→ WS); we
  // persist this userId as the node and advance. Errors throw → red badge.
  const connectGoogle = async () => {
    setError(null);
    setStatus("connecting");
    const userId = crypto.randomUUID();
    console.log(`[pepl:ui] connect:initiate userId=${userId}`);
    try {
      const { redirectUrl } = await connectInitiate(userId);
      const popup = window.open(redirectUrl, "pepl-google", "width=520,height=680");
      if (!popup) throw new Error("popup blocked — allow popups and retry");

      const deadline = Date.now() + POLL_DEADLINE_MS;
      while (!cancelled.current) {
        if (Date.now() > deadline) throw new Error("sign-in timed out");
        await new Promise((r) => setTimeout(r, POLL_MS));
        const { connected, email } = await connectStatus(userId);
        if (connected) {
          console.log(
            `[pepl:ui] connect:connected userId=${userId} email=${email ?? "?"}`,
          );
          setUserId(userId);
          router.push("/onboarding");
          return;
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[pepl:ui] connect:failed ${msg}`);
      setStatus("error");
      setError(msg);
    }
  };

  const connecting = status === "connecting";

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center px-6">
      {/* fluted gradient backdrop — flipped to hang from the top (vs. the
          landing page, where it grows from the bottom) */}
      <div className="fixed inset-0 -z-10 [transform:scaleY(-1)]" aria-hidden="true">
        <FlutedBackground lifted />
      </div>

      <div className="animate-fade-up flex w-full max-w-sm flex-col items-center text-center">
        <MeshAvatar
          points={DEFAULT_AVATAR.points}
          strokes={DEFAULT_AVATAR.strokes}
          strokeWidth={6}
          className="h-16 w-16"
        />
        <span className="font-britti mt-1.5 select-none text-2xl lowercase tracking-tight text-charcoal">
          pepl
        </span>
        <h1 className="mt-6 text-balance text-2xl font-semibold tracking-tight text-charcoal">
          see the reflection of your story
        </h1>
        <p className="mt-2 text-sm text-charcoal/60">sign in to begin</p>

        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={connectGoogle}
            disabled={connecting}
            aria-busy={connecting}
            className="group relative overflow-hidden rounded-xl bg-white py-3.5 text-[15px] font-medium text-charcoal ring-1 ring-charcoal/[0.1] transition hover:ring-transparent disabled:cursor-default"
          >
            {/* gradient overlay: fades in on hover; while connecting it's lit and
                breathing (animate-pulse) — the no-spinner liveness signal */}
            <span
              aria-hidden="true"
              className={`absolute inset-0 transition-opacity duration-300 ${
                connecting
                  ? "animate-pulse opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              style={{ backgroundImage: GRADIENT }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2.5">
              <GoogleG /> {connecting ? "connecting…" : "continue with Google"}
            </span>
          </button>
          <button
            type="button"
            onClick={enterDemo}
            disabled={connecting}
            className="group relative overflow-hidden rounded-xl bg-charcoal py-3.5 text-[15px] font-medium text-white disabled:opacity-50"
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ backgroundImage: GRADIENT }}
            />
            <span className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 group-hover:text-charcoal">
              use demo account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        {status === "error" && error && (
          <p
            role="alert"
            className="mt-4 w-full rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 ring-1 ring-red-200"
          >
            sign-in failed: {error}
          </p>
        )}
      </div>
    </main>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
