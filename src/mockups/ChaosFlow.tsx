import { useMemo, useRef } from "react";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";

/* Direction A hero: particles drift in loose and unaccounted-for on the left,
   pass through three glass panes (See / Secure / Prove), and leave as even,
   ordered lanes. A few are hostile: they turn violet in the Secure pane and
   are stopped there. The panes are DOM so their glass blurs the canvas. */

type P = { x: number; y: number; vx: number; lane: number; seed: number; size: number; bad: boolean; blocked: number };

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function createSim() {
  let ps: P[] = [];
  let lanes: number[] = [];
  let W = 0;
  let H = 0;

  const spawn = (p: P, x: number) => {
    p.x = x;
    p.y = H * (0.08 + Math.random() * 0.84);
    p.vx = 22 + Math.random() * 70;
    p.lane = Math.floor(Math.random() * lanes.length);
    p.seed = Math.random() * 1000;
    p.size = 1.4 + Math.random() * 3.4;
    p.bad = Math.random() < 0.05;
    p.blocked = 0;
  };

  const setup = (w: number, h: number) => {
    W = w;
    H = h;
    const n = 18;
    lanes = Array.from({ length: n }, (_, i) => h * (0.12 + (0.76 * i) / (n - 1)));
    const count = Math.round(Math.min(480, (w * h) / 1000));
    ps = Array.from({ length: count }, () => {
      const p = {} as P;
      spawn(p, Math.random() * w);
      return p;
    });
  };

  const step = ({ ctx, dt, t }: Frame) => {
    const a = W * 0.36; // chaos ends where the first pane starts
    const b = W * 0.68; // order is complete past the last pane
    const secure = W * 0.52;
    for (const p of ps) {
      if (p.blocked > 0) {
        p.blocked += dt;
        const k = p.blocked / 0.9;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = "#5546E0";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#5546E0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 + k * 14, 0, Math.PI * 2);
        ctx.stroke();
        if (k >= 1) spawn(p, -8);
        continue;
      }

      const order = smooth(a, b, p.x);
      const chaos = 1 - order;
      const laneY = lanes[p.lane];
      const wander = Math.sin(t * 0.9 + p.seed) * 38 + Math.sin(t * 2.3 + p.seed * 1.7) * 14;
      p.y += wander * chaos * dt + (laneY - p.y) * order * Math.min(1, dt * 5);
      const vx = p.vx * chaos + 58 * order;
      p.x += vx * dt;

      if (p.bad && p.x > secure) {
        p.blocked = 0.0001;
        continue;
      }
      if (p.x > W + 8) spawn(p, -8);

      const tint = p.bad && p.x > a ? smooth(a, secure, p.x) : 0;
      const g = Math.round(125 - 97 * order);
      ctx.globalAlpha = 0.25 + 0.55 * order + (0.2 * Math.sin(p.seed) + 0.2) * chaos;
      ctx.fillStyle = tint > 0.05 ? `rgba(85,70,224,${0.4 + tint * 0.6})` : `rgb(${g},${g + 2},${g + 11})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.size * chaos + 2.8 * order) / 2 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  return { setup, step };
}

export function ChaosFlow({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sim = useMemo(createSim, []);
  useCanvasLoop(ref, sim.setup, sim.step);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
