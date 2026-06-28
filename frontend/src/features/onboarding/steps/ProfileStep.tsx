"use client";

import { useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Eraser, Undo2, Redo2 } from "lucide-react";
import { MeshAvatar } from "../MeshAvatar";
import { SET_PALETTE } from "../palette";
import type { AvatarDesign, Stroke } from "../types";

// Step 2 — "create your profile". The avatar is a 3-point Monet mesh gradient.
// Drag the orbit handles to move each color around the circle; tap a handle to
// recolor it from the set palette; draw a face on top with the cursor.

const CIRCLE = 264;
const GAP = 48; // handles sit ~48px outside the avatar edge
const ORBIT = CIRCLE / 2 + GAP;
const HANDLE = 36;
const FRAME = CIRCLE + 2 * (GAP + HANDLE); // room for the orbiting handles
const CENTER = FRAME / 2;
const PAD = (FRAME - CIRCLE) / 2; // avatar inset within the frame

const cloneStrokes = (ss: Stroke[]) => ss.map((s) => s.map((p) => ({ ...p })));

export function ProfileStep({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: AvatarDesign;
  onChange: (d: AvatarDesign) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLDivElement>(null);
  const dragMoved = useRef(false);
  const drawing = useRef(false);

  // undo/redo history for the drawing (snapshot the strokes before each change)
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  function snapshot() {
    setPast((p) => [...p, cloneStrokes(value.strokes)]);
    setFuture([]);
  }
  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture((f) => [...f, cloneStrokes(value.strokes)]);
    onChange({ ...value, strokes: prev });
  }
  function redo() {
    if (!future.length) return;
    const next = future[future.length - 1];
    setFuture(future.slice(0, -1));
    setPast((p) => [...p, cloneStrokes(value.strokes)]);
    onChange({ ...value, strokes: next });
  }

  // ── orbit handle drag (move a color around) ──────────────────────────────
  function onHandleDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragMoved.current = false;
  }
  function onHandleMove(i: number, e: React.PointerEvent) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = frameRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
    dragMoved.current = true;
    const points = value.points.map((p, idx) => (idx === i ? { ...p, angle } : p));
    onChange({ ...value, points });
  }
  function onHandleUp(i: number, e: React.PointerEvent) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragMoved.current) setActiveIdx((cur) => (cur === i ? null : i)); // tap → recolor
  }

  // ── drawing on the face ──────────────────────────────────────────────────
  function pointFromEvent(e: React.PointerEvent): { x: number; y: number } | null {
    const rect = drawRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // keep strokes inside the circle
    if (Math.hypot(x - 0.5, y - 0.5) > 0.5) return null;
    return { x, y };
  }
  function onDrawDown(e: React.PointerEvent) {
    const pt = pointFromEvent(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    snapshot(); // record the pre-stroke state so undo removes this stroke
    onChange({ ...value, strokes: [...value.strokes, [pt]] });
  }
  function onDrawMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    const pt = pointFromEvent(e);
    if (!pt) return;
    const strokes = value.strokes.slice();
    const last = strokes[strokes.length - 1];
    strokes[strokes.length - 1] = [...last, pt] as Stroke;
    onChange({ ...value, strokes });
  }
  function onDrawUp() {
    drawing.current = false;
  }

  // the swatch picker for the selected handle (idx is guaranteed non-null here)
  function renderPalette(idx: number) {
    return (
      <div className="animate-fade-in flex items-center gap-2 rounded-full border border-charcoal/10 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
        {SET_PALETTE.map((sw) => (
          <button
            key={sw.hex}
            title={sw.name}
            onClick={() =>
              onChange({
                ...value,
                points: value.points.map((p, i) => (i === idx ? { ...p, color: sw.hex } : p)),
              })
            }
            className={`h-6 w-6 rounded-full border transition hover:scale-110 ${
              value.points[idx].color === sw.hex ? "border-charcoal" : "border-black/10"
            }`}
            style={{ backgroundColor: sw.hex }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center">
      <h1 className="text-2xl font-bold tracking-tight text-charcoal">create your profile</h1>
      <p className="mt-2 text-sm text-charcoal/60">
        drag the dots to move each color · tap a dot to recolor · draw a face
      </p>

      {/* centered maker — arrows pinned to the far edges */}
      <div className="relative flex w-full flex-1 items-center justify-center">
        <button
          type="button"
          onClick={onBack}
          aria-label="back"
          className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-charcoal/45 transition hover:bg-charcoal/5 hover:text-charcoal"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <div className="flex flex-col items-center">
          {/* the maker frame */}
          <div ref={frameRef} className="relative" style={{ width: FRAME, height: FRAME }}>
            {/* avatar — mesh gradient + the drawn face */}
            <div className="absolute" style={{ left: PAD, top: PAD, width: CIRCLE, height: CIRCLE }}>
              <MeshAvatar
                points={value.points}
                strokes={value.strokes}
                className="h-full w-full shadow-[0_12px_36px_-12px_rgba(42,42,40,0.45)]"
                strokeWidth={6}
              />
            </div>

            {/* drawing surface (transparent, captures the cursor over the circle) */}
            <div
              ref={drawRef}
              onPointerDown={onDrawDown}
              onPointerMove={onDrawMove}
              onPointerUp={onDrawUp}
              className="absolute cursor-crosshair rounded-full"
              style={{ left: PAD, top: PAD, width: CIRCLE, height: CIRCLE, touchAction: "none" }}
            />

            {/* orbit handles */}
            {value.points.map((p, i) => {
              const x = CENTER + Math.cos(p.angle) * ORBIT - HANDLE / 2;
              const y = CENTER + Math.sin(p.angle) * ORBIT - HANDLE / 2;
              return (
                <button
                  key={i}
                  onPointerDown={onHandleDown}
                  onPointerMove={(e) => onHandleMove(i, e)}
                  onPointerUp={(e) => onHandleUp(i, e)}
                  aria-label={`color ${i + 1}`}
                  className={`absolute touch-none rounded-full border-2 border-white shadow-[0_3px_10px_-2px_rgba(42,42,40,0.4)] transition-transform hover:scale-110 ${
                    activeIdx === i ? "ring-2 ring-charcoal/30 ring-offset-2" : ""
                  }`}
                  style={{
                    left: x,
                    top: y,
                    width: HANDLE,
                    height: HANDLE,
                    backgroundColor: p.color,
                    cursor: "grab",
                  }}
                />
              );
            })}
          </div>

          {/* palette strip — appears when a handle is selected */}
          <div className="mt-5 h-12">{activeIdx !== null && renderPalette(activeIdx)}</div>
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="next"
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-charcoal/70 transition hover:bg-charcoal/5 hover:text-charcoal"
        >
          <ArrowRight className="h-7 w-7" />
        </button>
      </div>

      {/* drawing controls — undo / redo / clear */}
      <div className="mb-2 flex items-center gap-4 text-xs font-medium text-charcoal/55">
        <button
          type="button"
          onClick={undo}
          disabled={!past.length}
          className="inline-flex items-center gap-1.5 transition hover:text-charcoal disabled:cursor-default disabled:opacity-35"
        >
          <Undo2 className="h-3.5 w-3.5" /> undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!future.length}
          className="inline-flex items-center gap-1.5 transition hover:text-charcoal disabled:cursor-default disabled:opacity-35"
        >
          <Redo2 className="h-3.5 w-3.5" /> redo
        </button>
        <button
          type="button"
          onClick={() => {
            snapshot();
            onChange({ ...value, strokes: [] });
          }}
          className="inline-flex items-center gap-1.5 transition hover:text-charcoal"
        >
          <Eraser className="h-3.5 w-3.5" /> clear
        </button>
      </div>
    </div>
  );
}
