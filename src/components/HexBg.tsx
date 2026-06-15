import { useEffect, useRef } from "react";

/**
 * Hex Lattice — Pointer Ripple background.
 * Renders a faint hexagonal lattice; moving the pointer over it sends ripples
 * (expanding rings) outward from the cursor, lighting up hexes as they pass.
 * Position the parent with `position: relative; overflow: hidden;`.
 */
export function HexBg({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    // Re-measure whenever the canvas's own box changes (e.g. the hero grows
    // taller when content is added) so the lattice never gets CSS-stretched.
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("resize", resize);

    const hexPath = (cx: number, cy: number, r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const R = 22 * dpr;
    const dx = R * Math.sqrt(3);
    const dy = R * 1.5;

    const drawGrid = (intensityAt: (cx: number, cy: number) => number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cols = Math.ceil(w / dx) + 2;
      const rows = Math.ceil(h / dy) + 2;
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const cx = col * dx + (row % 2 ? dx / 2 : 0);
          const cy = row * dy;
          const intensity = intensityAt(cx, cy);
          hexPath(cx, cy, R - 1.5 * dpr);
          if (intensity > 0.04) {
            ctx.fillStyle = `rgba(85, 70, 224, ${intensity * 0.32})`;
            ctx.fill();
          }
          ctx.strokeStyle = `rgba(123, 110, 236, ${0.1 + intensity * 0.6})`;
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
        }
      }
    };

    // Reduced motion: draw a single static faint lattice and stop.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawGrid(() => 0);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", resize);
      };
    }

    // A ripple originates from the hexagon under the pointer and spreads to its
    // neighbours. Origin is snapped to the hex centre; one ripple per hex passed.
    type Ripple = { x: number; y: number; t0: number; strength: number };
    const ripples: Ripple[] = [];
    const MAX_RIPPLES = 24;
    let lastCol = NaN;
    let lastRow = NaN;
    // Track pointer speed so faster movement produces stronger (brighter) ripples.
    let lastCX = 0;
    let lastCY = 0;
    let lastT = 0;
    let vel = 0; // smoothed pointer speed, CSS px/ms

    const onMove = (e: PointerEvent) => {
      const t = performance.now();
      if (lastT) {
        const dt = Math.max(1, t - lastT);
        const inst = Math.hypot(e.clientX - lastCX, e.clientY - lastCY) / dt;
        vel = vel * 0.6 + inst * 0.4; // smooth out jitter
      }
      lastCX = e.clientX;
      lastCY = e.clientY;
      lastT = t;

      const r = canvas.getBoundingClientRect();
      const px = (e.clientX - r.left) * dpr;
      const py = (e.clientY - r.top) * dpr;
      if (px < 0 || py < 0 || px > canvas.width || py > canvas.height) return;
      // Snap to the nearest hexagon (matches the grid's pointy-top layout).
      const row = Math.round(py / dy);
      const offset = row % 2 ? dx / 2 : 0;
      const col = Math.round((px - offset) / dx);
      if (col === lastCol && row === lastRow) return; // still the same hex
      lastCol = col;
      lastRow = row;
      const strength = Math.min(1, Math.max(0.3, vel / 1.5));
      ripples.push({ x: col * dx + offset, y: row * dy, t0: t, strength });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    // Ripple spreads ~3 hexes out then vanishes — a short, snappy burst.
    const REACH = 3 * dx; // distance (in hex steps) the ripple reaches
    const LIFE = 430; // ms — quick burst
    const SPEED = REACH / (LIFE / 1000); // wavefront reaches the edge at LIFE
    const RINGW = dx * 1.0; // soft band, ~one hex wide
    const denom = 2 * RINGW * RINGW;
    const cutoff = 2.5 * RINGW; // ignore hexes this far from the wavefront

    type Active = { x: number; y: number; radius: number; strength: number; fade: number };
    let drewIdle = false;

    const tick = () => {
      const now = performance.now();

      // Precompute live rings once per frame; prune dead ones.
      const active: Active[] = [];
      for (let i = ripples.length - 1; i >= 0; i--) {
        const age = now - ripples[i].t0;
        if (age > LIFE) {
          ripples.splice(i, 1);
          continue;
        }
        active.push({
          x: ripples[i].x,
          y: ripples[i].y,
          radius: (age / 1000) * SPEED,
          strength: ripples[i].strength,
          fade: 1 - age / LIFE, // gently fade the whole ripple out over its life
        });
      }

      if (active.length === 0) {
        // Idle: draw the faint lattice once, then skip redraws until a ripple.
        if (!drewIdle) {
          drawGrid(() => 0);
          drewIdle = true;
        }
      } else {
        drewIdle = false;
        drawGrid((cx, cy) => {
          let intensity = 0;
          for (let i = 0; i < active.length; i++) {
            const a = active[i];
            const d = Math.hypot(cx - a.x, cy - a.y);
            const diff = d - a.radius;
            if (diff < cutoff && diff > -cutoff) {
              // Opacity falls off with distance from the origin hex, so the
              // ripple dies out over ~4-5 hexes.
              const distFade = 1 - d / REACH;
              if (distFade > 0) intensity += Math.exp(-(diff * diff) / denom) * distFade * a.strength * a.fade;
            }
          }
          return intensity > 1 ? 1 : intensity;
        });
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={className} />;
}
