import { useEffect, useRef } from "react";

/**
 * Hex Lattice — Center Pulse background.
 * Renders an animated hexagonal grid radiating outward from the center.
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
      canvas.width = r.width * dpr;
      canvas.height = r.height * dpr;
    };
    resize();
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

    const start = performance.now();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const R = 22 * dpr;
      const dx = R * Math.sqrt(3);
      const dy = R * 1.5;
      const cols = Math.ceil(w / dx) + 2;
      const rows = Math.ceil(h / dy) + 2;

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const cx = col * dx + (row % 2 ? dx / 2 : 0);
          const cy = row * dy;
          const dxc = cx - w / 2;
          const dyc = cy - h / 2;
          const dist = Math.sqrt(dxc * dxc + dyc * dyc);
          const wave = Math.sin(dist / (80 * dpr) - t * 1.8);
          const fill = Math.max(0, wave) * 0.5;
          const alpha = 0.18 + fill * 0.55;

          hexPath(cx, cy, R - 1.5 * dpr);
          if (fill > 0.02) {
            ctx.fillStyle = `rgba(124, 58, 237, ${fill * 0.35})`;
            ctx.fill();
          }
          ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
          ctx.lineWidth = 1 * dpr;
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className={className} />;
}
