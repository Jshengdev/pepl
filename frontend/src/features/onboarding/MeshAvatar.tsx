// The pepl avatar: a 3-point Monet mesh gradient (one bloom per orbit handle)
// with the user's freehand white scribble drawn on top. Pure display — the
// editing (orbit handles, drawing) lives in ProfileStep. Reused on card fronts.
import { meshGradientStyle } from "./palette";
import type { MeshPoint, Stroke } from "./types";

function strokePoints(stroke: Stroke): string {
  return stroke.map((p) => `${(p.x * 100).toFixed(1)},${(p.y * 100).toFixed(1)}`).join(" ");
}

export function MeshAvatar({
  points,
  strokes,
  className = "",
  strokeWidth = 5,
}: {
  points: MeshPoint[];
  strokes: Stroke[];
  className?: string;
  strokeWidth?: number;
}) {
  const { backgroundColor, backgroundImage } = meshGradientStyle(points);
  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ backgroundColor, backgroundImage }}
    >
      {strokes.length > 0 && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          fill="none"
          aria-hidden="true"
        >
          {strokes.map((s, i) =>
            s.length === 1 ? (
              <circle
                key={i}
                cx={s[0].x * 100}
                cy={s[0].y * 100}
                r={strokeWidth / 2}
                fill="white"
              />
            ) : (
              <polyline
                key={i}
                points={strokePoints(s)}
                stroke="white"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ),
          )}
        </svg>
      )}
    </div>
  );
}
