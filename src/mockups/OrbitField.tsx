import { useMemo, useRef } from "react";
import { useCanvasLoop, type Frame } from "./useCanvasLoop";

/* Direction B hero: the "chaos demystified" idea. Particles circle the model
   clockwise. On the left (no visibility) they swarm with no pattern; crossing
   the Blindsight line at the top they slow and settle onto three orbits
   (See / Secure / Prove). Hostile particles are stopped on the line. */

type P = { th: number; r: number; w: number; r0: number; ring: number; seed: number; size: number; bad: boolean; blocked: number; bx: number; by: number };

const RINGS = [0.5, 0.75, 1];
const LABELS = ["SEE", "SECURE", "PROVE"];

function createSim() {
  let ps: P[] = [];
  let cx = 0;
  let cy = 0;
  let R = 0;

  const spawn = (p: P, th: number) => {
    p.th = th;
    p.r0 = R * (0.38 + Math.random() * 0.82);
    p.r = p.r0;
    p.w = 0.25 + Math.random() * 0.7;
    p.ring = Math.floor(Math.random() * 3);
    p.seed = Math.random() * 1000;
    p.size = 1.2 + Math.random() * 3.2;
    p.bad = Math.random() < 0.06;
    p.blocked = 0;
  };

  const setup = (w: number, h: number) => {
    cx = w / 2;
    cy = h / 2;
    R = Math.min(h * 0.46, w * 0.4);
    const count = Math.round(Math.min(360, R * 1.2));
    ps = Array.from({ length: count }, () => {
      const p = {} as P;
      spawn(p, Math.random() * Math.PI * 2);
      return p;
    });
  };

  const step = ({ ctx, dt, t, h }: Frame) => {
    // guides: orbits on the right, the Blindsight line, the model core
    ctx.lineWidth = 1;
    RINGS.forEach((k, i) => {
      ctx.strokeStyle = `rgba(255,255,255,${0.13 - i * 0.03})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * k, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(142,131,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const p of ps) {
      if (p.blocked > 0) {
        p.blocked += dt;
        const k = p.blocked / 0.9;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = "#8E83FF";
        ctx.beginPath();
        ctx.arc(p.bx, p.by, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#8E83FF";
        ctx.beginPath();
        ctx.arc(p.bx, p.by, 4 + k * 16, 0, Math.PI * 2);
        ctx.stroke();
        if (k >= 1) spawn(p, Math.PI * (0.55 + Math.random() * 0.3));
        continue;
      }

      const prevRight = Math.cos(p.th) > 0;
      const right = prevRight;
      const ringR = R * RINGS[p.ring];
      // clockwise travel; ordered particles share one linear speed per ring
      const wTarget = right ? 46 / ringR : p.w + Math.sin(t * 1.3 + p.seed) * 0.35;
      p.w += (wTarget - p.w) * Math.min(1, dt * (right ? 3 : 1));
      p.th += p.w * dt;
      if (p.th > Math.PI * 2) p.th -= Math.PI * 2;

      const rTarget = right ? ringR : p.r0 + Math.sin(t * 0.8 + p.seed) * R * 0.14;
      p.r += (rTarget - p.r) * Math.min(1, dt * (right ? 4 : 1.2));

      const nowRight = Math.cos(p.th) > 0;
      const x0 = cx + Math.cos(p.th) * p.r;
      const y0 = cy + Math.sin(p.th) * p.r;

      if (!prevRight && nowRight) {
        // crossing the Blindsight line at the top
        if (p.bad) {
          p.blocked = 0.0001;
          p.bx = cx;
          p.by = y0;
          continue;
        }
      }
      if (prevRight && !nowRight) {
        // back into the dark: loose again
        p.r0 = R * (0.38 + Math.random() * 0.82);
        p.w = 0.25 + Math.random() * 0.7;
      }

      const jitter = nowRight ? 0 : 1;
      const x = x0 + Math.sin(t * 3.1 + p.seed) * 7 * jitter;
      const y = y0 + Math.cos(t * 2.7 + p.seed * 1.3) * 7 * jitter;
      if (!nowRight && x > cx - 2) continue;

      ctx.globalAlpha = nowRight ? 0.85 : 0.12 + (Math.sin(p.seed) * 0.5 + 0.5) * 0.5;
      ctx.fillStyle = nowRight ? "#D9D9E0" : "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x, y, nowRight ? 1.6 : p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ring labels, on a patch of background so particles pass under them
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    RINGS.forEach((k, i) => {
      const a = -Math.PI * 0.2;
      const x = cx + Math.cos(a) * R * k + 10;
      const y = cy + Math.sin(a) * R * k;
      const label = LABELS[i];
      const tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = "#08080A";
      ctx.fillRect(x - 6, y - 9, tw, 18);
      ctx.fillStyle = "#D9D9E0";
      ctx.fillText(label, x, y + 3.5);
    });
  };

  return { setup, step };
}

export function OrbitField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sim = useMemo(createSim, []);
  useCanvasLoop(ref, sim.setup, sim.step);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
