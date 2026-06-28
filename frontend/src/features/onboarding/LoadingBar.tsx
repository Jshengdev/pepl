// The shared progress bar pinned to the bottom of every onboarding screen:
// a blue gradient fill that fades to the right, advancing as the flow proceeds.
export function LoadingBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 px-10 pb-6">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-charcoal/[0.07]">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: "linear-gradient(90deg, #2f6bf5 0%, #7fb2e5 65%, rgba(127,178,229,0) 100%)",
          }}
        />
      </div>
      <p className="mt-2 text-center text-[10px] font-medium tracking-[0.08em] text-charcoal/35">
        {label}
      </p>
    </div>
  );
}
