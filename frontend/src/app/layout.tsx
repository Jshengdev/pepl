import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "pepl — See the reflection of your story",
  description:
    "pepl maps the quiet threads between people — the friends, mentors, and strangers whose paths cross yours.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        {/* painterly canvas texture, then film grain — above everything */}
        <div className="paper-texture" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        {/* SVG filter defs referenced by CSS (e.g. .paint-text on the headline):
            fine turbulence + a small displacement gives letterforms a
            hand-painted, slightly rough edge. */}
        <svg aria-hidden="true" className="absolute h-0 w-0">
          <filter id="paintTexture" x="-4%" y="-4%" width="108%" height="108%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
      </body>
    </html>
  );
}
