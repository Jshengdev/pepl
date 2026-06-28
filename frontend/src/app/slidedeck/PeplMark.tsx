// The pepl logo mark — 3-point mesh gradient (terracotta / amber / coral) with
// the white scribble "eyes" on top. Lifted verbatim from the landing lockup so
// the deck stays self-contained; size it via className (e.g. h-[8cqw] w-[8cqw]).
export function PeplMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex overflow-hidden rounded-full ${className}`}
      style={{
        backgroundColor: "#df8253",
        backgroundImage: [
          "radial-gradient(circle at 18% 16%, #c95b3e 0%, transparent 62%)",
          "radial-gradient(circle at 84% 22%, #f3caa0 0%, transparent 62%)",
          "radial-gradient(circle at 50% 92%, #ef9866 0%, transparent 64%)",
        ].join(", "),
      }}
    >
      <svg viewBox="0 0 48 48" fill="none" className="h-full w-full">
        <path
          d="M30.1658 18.8018C30.1658 18.8219 30.4441 18.8644 30.9179 18.77C31.1134 18.6435 31.2176 18.3572 31.1449 18.1338C31.0723 17.9105 30.8195 17.7589 30 17.9027M16 21.3983C16 21.4187 16 21.4391 16.1257 21.4934C16.2513 21.5477 16.5027 21.6353 16.5987 21.5461C16.6948 21.4569 16.628 21.1883 16.364 20.8464M9.83984 26.0121C11.2785 26.8044 16.4017 29.2476 20.5223 30.1278C22.8368 30.2371 25.1147 30.0237 28.4304 29.0103C30.7138 28.2229 34.2171 26.8809 38.1601 25.2596"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
