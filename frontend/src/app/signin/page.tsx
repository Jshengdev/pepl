"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { MeshAvatar } from "@/features/onboarding/MeshAvatar";
import { DEFAULT_AVATAR } from "@/features/onboarding/defaults";
import { FlutedBackground } from "@/features/landing/FlutedBackground";

// /signin — a light placeholder gate. Either button drops you into onboarding
// (a real auth provider will hook in here later).

// soft pepl gradient revealed on button hover (no drop shadow)
const HOVER_GRADIENT =
  "hover:bg-[linear-gradient(100deg,#8fb3e8,#c4a9d0,#e8acbe,#f6c19c)]";

export default function SignInPage() {
  const router = useRouter();
  const go = () => router.push("/onboarding");

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center px-6 pt-[12vh]">
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
            onClick={go}
            className={`inline-flex items-center justify-center gap-2.5 rounded-xl bg-white py-3.5 text-[15px] font-medium text-charcoal ring-1 ring-charcoal/[0.1] transition hover:ring-transparent ${HOVER_GRADIENT}`}
          >
            <GoogleG /> continue with Google
          </button>
          <button
            type="button"
            onClick={go}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl bg-charcoal py-3.5 text-[15px] font-medium text-white transition hover:text-charcoal ${HOVER_GRADIENT}`}
          >
            <Mail className="h-4 w-4" /> continue with email
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
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
