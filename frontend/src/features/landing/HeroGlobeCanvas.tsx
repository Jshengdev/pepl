"use client";

import { type MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

type Pin = { lat: number; lng: number };
type Arc = { startLat: number; startLng: number; endLat: number; endLng: number };

// Pearly, slightly iridescent gradient for the connecting lines (~40-45%
// opacity). The gradient slides pink → blue → mint → lilac along each arc, the
// way light moves across a pearl — chromatic enough to read over the teal globe.
const PEARL = [
  "rgba(255,182,212,0.46)",
  "rgba(176,214,250,0.46)",
  "rgba(196,248,222,0.46)",
  "rgba(228,206,250,0.46)",
];

// A few seeded places so the connecting "threads" draw themselves on load —
// the globe demonstrates its own story instead of waiting to be discovered.
// Click adds yours to the path.
const SAMPLE_PINS: Pin[] = [
  { lat: 40, lng: -55 },
  { lat: 50, lng: -8 },
  { lat: 30, lng: 22 },
  { lat: 22, lng: -28 },
];

/**
 * The actual WebGL globe. Only ever rendered on the client (loaded via a
 * dynamic import with `ssr: false` from HeroGlobe.tsx), so touching `window`,
 * `document` and three.js at module scope is safe here.
 *
 * Interaction: hovering stops the (stepped) spin so you can aim; clicking the
 * surface drops a location pin. When the cursor leaves and the globe spins
 * again, consecutive pins connect with self-drawing pearl "pencil" arcs.
 */
export default function HeroGlobeCanvas() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleSeq = useRef(0);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pins, setPins] = useState<Pin[]>(SAMPLE_PINS);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>(
    [],
  );

  // A flat, evenly-lit earth — MeshBasic has no day/night terminator, so the
  // globe carries no shadowed side. Tinted toward the Monet "Water Lily Pond"
  // palette; the painterly color + edge dissolve come from the CSS layers.
  const globeMaterial = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const material = new THREE.MeshBasicMaterial({
      map: loader.load("/earth-blue-marble.jpg"),
    });
    material.color = new THREE.Color("#c6d5bb"); // light sage wash over the continents
    return material;
  }, []);

  // Keep the canvas sized to its container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // react-globe.gl attaches its imperative handle a beat after the canvas
  // gains a non-zero size (onGlobeReady fires before the ref is set), so we
  // poll for the ref and configure controls / renderer once it's available.
  useEffect(() => {
    let raf = 0;
    const init = () => {
      const g = globeRef.current;
      if (!g || !g.controls()) {
        raf = requestAnimationFrame(init);
        return;
      }
      // Cap devicePixelRatio for performance on retina screens.
      g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

      const controls = g.controls();
      // Smooth, continuous auto-rotation (react-globe.gl ticks controls.update()),
      // paused for visitors who prefer reduced motion.
      controls.autoRotate = !window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      controls.autoRotateSpeed = 0.5;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.enableRotate = false;
      controls.minPolarAngle = Math.PI / 3.4;
      controls.maxPolarAngle = Math.PI / 1.7;

      g.pointOfView({ lat: 18, lng: -20, altitude: 2.5 });
    };
    init();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Drop a pin wherever the globe is clicked. We resolve lat/lng ourselves via
  // toGlobeCoords(x, y) on each click rather than react-globe.gl's onGlobeClick,
  // whose hover-raycaster could miss the first single click (hence the old
  // need to double-click).
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const g = globeRef.current;
    const el = containerRef.current;
    if (!g || !el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const coords = g.toGlobeCoords(x, y);
    if (!coords) return; // clicked off the globe — ignore
    setPins((prev) => {
      const next = [...prev, coords];
      console.log(
        `[pepl:globe] pin dropped (lat=${coords.lat.toFixed(1)}, lng=${coords.lng.toFixed(1)}, total=${next.length})`,
      );
      return next;
    });
    // pebble-in-a-pond ripple at the drop point (skip under reduced motion)
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = (rippleSeq.current += 1);
      setRipples((rs) => [...rs, { id, x, y }]);
    }
  };

  // Connect consecutive pins with self-drawing lines — each new arc draws
  // itself (arcsTransitionDuration) as it's added. Needs ≥2 pins to draw.
  const arcs: Arc[] =
    pins.length >= 2
      ? pins.slice(1).map((p, i) => ({
          startLat: pins[i].lat,
          startLng: pins[i].lng,
          endLat: p.lat,
          endLng: p.lng,
        }))
      : [];

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="relative h-full w-full cursor-crosshair"
    >
      {/* globe-soft: blur melts the detail into blobs; the grain layer re-adds
          a painted tooth on top. */}
      <div className="globe-soft absolute inset-0">
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={globeMaterial}
          // dropped location pins
          pointsData={pins}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => "#e7647e"}
          pointAltitude={0.05}
          pointRadius={0.9}
          pointsMerge={false}
          pointResolution={24}
          // pearl "pencil" connections — they draw themselves on appear
          // (arcsTransitionDuration) and the dash gives a sketchy, broken-line
          // texture. pepl: true grain-along-the-stroke would need a custom arc
          // shader; dashed + low-opacity pearl approximates the pencil look.
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={() => PEARL}
          arcStroke={0.8}
          arcAltitudeAutoScale={0.52}
          arcDashLength={0.5}
          arcDashGap={0.12}
          arcDashAnimateTime={4500}
          arcsTransitionDuration={1500}
        />
      </div>

      {/* Colored grain over the planet — decorative, click-through, masked to
          the globe disc. */}
      <div aria-hidden="true" className="globe-grain pointer-events-none absolute inset-0" />

      {/* Pebble-in-a-pond ripple at each drop point. */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pin-ripple"
          style={{ left: r.x, top: r.y }}
          onAnimationEnd={() =>
            setRipples((rs) => rs.filter((p) => p.id !== r.id))
          }
        />
      ))}
    </div>
  );
}
