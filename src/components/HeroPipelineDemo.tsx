import { useEffect, useState } from "react";
import { Check, Cpu, Database, LogIn, LogOut, ShieldCheck } from "lucide-react";

/* Lightweight end-to-end pipeline animation for the Hero "AI Pipeline" tab. A
 * protection wave rolls left→right across the four stages (Data → Input → Model →
 * Output): a pulse travels stage to stage, lighting each node + connecting segment
 * as it passes, then holds on a "secured end-to-end" beat before looping. Pure CSS
 * for the visuals; a single interval drives the step (only while this tab is
 * mounted). Reduced-motion users get the final secured state, static. */

const NODES = [
  { name: "Data", Icon: Database },
  { name: "Input", Icon: LogIn },
  { name: "Model", Icon: Cpu },
  { name: "Output", Icon: LogOut },
] as const;

/* node x-centres (% of arena width) — even spread with edge padding */
const X = [10, 36.67, 63.33, 90];

export function HeroPipelineDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(4);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % 5), 1000);
    return () => clearInterval(id);
  }, []);

  const complete = step === 4;
  const nodesLit = complete ? NODES.length : step + 1; // nodes 0..nodesLit-1 secured
  const segsLit = nodesLit - 1; // segments 0..segsLit-1 secured
  const pulseStep = step <= 3 ? step : -1; // hidden on the hold beat

  return (
    <div className={`hpp ${complete ? "done" : ""}`}>
      <div className="hpp-top">
        <span className="hpp-kick">// AI Pipeline · end-to-end</span>
        <span className="hpp-badge">
          <ShieldCheck size={13} aria-hidden="true" />
          Protected
        </span>
      </div>

      <div className="hpp-arena">
        <span className="hpp-track" aria-hidden="true" />
        {X.slice(0, 3).map((x, i) => (
          <span
            key={`seg${i}`}
            className={`hpp-seg ${i < segsLit ? "lit" : ""}`}
            style={{ left: `${x}%`, width: `${X[i + 1] - x}%` }}
            aria-hidden="true"
          />
        ))}
        {pulseStep >= 0 && (
          <span className="hpp-pulse" style={{ left: `${X[pulseStep]}%` }} aria-hidden="true" />
        )}
        {NODES.map((n, i) => {
          const lit = i < nodesLit;
          const Icon = n.Icon;
          return (
            <div key={n.name} className={`hpp-node ${lit ? "lit" : ""}`} style={{ left: `${X[i]}%` }}>
              <span className="hpp-chip">
                <Icon size={20} aria-hidden="true" />
                <span className="hpp-check">
                  <Check size={11} strokeWidth={3} aria-hidden="true" />
                </span>
              </span>
              <span className="hpp-nm">{n.name}</span>
            </div>
          );
        })}
      </div>

      <div className="hpp-foot">
        <span className="hpp-stage">DATA → INPUT → MODEL → OUTPUT</span>
        <span className={`hpp-status ${complete ? "on" : ""}`}>
          {complete ? "Secured end-to-end" : "Securing every stage…"}
        </span>
      </div>
    </div>
  );
}
