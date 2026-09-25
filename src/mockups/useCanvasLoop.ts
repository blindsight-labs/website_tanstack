import { useEffect, type RefObject } from "react";

export type Frame = {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since the previous frame, clamped so a background tab doesn't jump */
  dt: number;
  t: number;
};

/* Runs `step` on a canvas every animation frame, sized to its CSS box at device
   pixel ratio. Pauses off-screen. Under prefers-reduced-motion it advances the
   simulation silently and paints a single settled frame instead of animating. */
export function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  setup: (w: number, h: number) => void,
  step: (f: Frame) => void,
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let visible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const frame = (dt: number, draw = true) => {
      t += dt;
      if (draw) ctx.clearRect(0, 0, w, h);
      step({ ctx, w, h, dt, t });
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setup(w, h);
      if (reduced) {
        for (let i = 0; i < 600; i++) frame(1 / 60, false);
        ctx.clearRect(0, 0, w, h);
        frame(0);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      if (visible) frame(dt);
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      last = performance.now();
    });
    io.observe(canvas);
    resize();
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [ref, setup, step]);
}
