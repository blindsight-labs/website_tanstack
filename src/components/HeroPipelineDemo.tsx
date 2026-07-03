import { useEffect, useState } from "react";
import { ArrowRight, Check, Cpu, Database, LogIn, LogOut } from "lucide-react";

/* Hero "AI Pipeline" tab. Shows the whole pipeline (Data → Input → Model →
 * Output) and the cost of leaving it unprotected:
 *  - Toggle Blindsight off → "Exposed": each stage flags its threat count, the
 *    metrics show the damage (PII leaked, poison undetected, breach dwell time).
 *  - Toggle on → "Protected": a protection wave rolls across the stages, securing
 *    each in turn; the metrics flip to the Blindsight outcome.
 *  - Hover any stage → a succinct line on what it is + the vulnerabilities that
 *    plague it. "Learn more" jumps to the threat-modelling demo (#scenarios).
 * Pure CSS for the visuals; one interval (only while protected). */

const LAYERS = [
  {
    name: "Prompts",
    Icon: LogIn,
    desc: "User messages, API calls and instructions entering the runtime.",
    vulns: ["Prompt injection", "Jailbreak", "Shadow AI", "Credential in prompt"],
  },
  {
    name: "Context",
    Icon: Database,
    desc: "RAG documents, tool outputs and retrieved data fed to the model.",
    vulns: ["RAG poisoning", "Indirect injection", "Sensitive retrieval", "Data leak"],
  },
  {
    name: "Model",
    Icon: Cpu,
    desc: "The LLM processing inputs and producing responses.",
    vulns: ["Policy bypass", "Model misuse", "Biased output", "Hallucination"],
  },
  {
    name: "Responses",
    Icon: LogOut,
    desc: "Completions, tool calls, actions and data the model returns.",
    vulns: ["PII leakage", "Unauthorized action", "Data exfiltration", "Shortcut bias"],
  },
] as const;

const METRICS = [
  { label: "Runtime threats blocked", bad: "0%", good: "99.3%" },
  { label: "PII leakage prevented", bad: "0%", good: "100%" },
  { label: "Time to detection", bad: "296 days", good: "< 50 ms" },
];

/* node x-centres (% of arena width) — even spread with edge padding */
const X = [10, 36.67, 63.33, 90];

export function HeroPipelineDemo({ onInteract }: { onInteract?: () => void }) {
  const [on, setOn] = useState(false); // Blindsight protection — default exposed
  const [step, setStep] = useState(0); // protection wave (only while protected)
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!on) {
      setStep(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(4);
      return;
    }
    const id = setInterval(() => setStep((s) => (s + 1) % 5), 1000);
    return () => clearInterval(id);
  }, [on]);

  const complete = on && step === 4;
  const nodesLit = on ? (complete ? LAYERS.length : step + 1) : 0;
  const segsLit = nodesLit - 1;
  const pulseStep = on && step <= 3 ? step : -1;
  const detail = hover != null ? LAYERS[hover] : null;

  const toggle = () => {
    setOn((v) => !v);
    onInteract?.();
  };
  const learnMore = () =>
    document.getElementById("scenarios")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className={`hpp ${on ? "on" : "off"} ${complete ? "done" : ""}`}>
      <div className="hpp-top">
        <span className="hpp-kick">// Runtime Security · {on ? "monitoring" : "exposed"}</span>
        <div className="hpp-ctrl">
          <span className="hpp-badge">{on ? "Protected" : "Exposed"}</span>
          <button
            type="button"
            className="hpp-sw"
            aria-pressed={on}
            aria-label="Toggle Blindsight protection"
            onClick={toggle}
          >
            <span className="hpp-sw-lbl">Blindsight</span>
            <span className="hpp-sw-track">
              <span className="hpp-sw-knob" />
            </span>
          </button>
        </div>
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
        {LAYERS.map((n, i) => {
          const lit = i < nodesLit;
          const Icon = n.Icon;
          const cls = [
            "hpp-node",
            lit ? "lit" : "",
            on ? "" : "exposed",
            hover === i ? "hot" : "",
            hover != null && hover !== i ? "dim" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={n.name}
              className={cls}
              style={{ left: `${X[i]}%` }}
              aria-label={`${n.name} stage`}
              onMouseEnter={() => {
                setHover(i);
                onInteract?.();
              }}
              onFocus={() => {
                setHover(i);
                onInteract?.();
              }}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              onBlur={() => setHover((h) => (h === i ? null : h))}
            >
              <span className="hpp-chip">
                <Icon size={20} aria-hidden="true" />
                <span className="hpp-check">
                  <Check size={11} strokeWidth={3} aria-hidden="true" />
                </span>
                {!on && <span className="hpp-alert">{i + 1}</span>}
              </span>
              <span className="hpp-nm">{n.name}</span>
            </button>
          );
        })}
      </div>

      <div className="hpp-detail" aria-live="polite">
        {detail ? (
          <>
            <div className="hpp-detail-head">
              <span className="hpp-detail-nm">{detail.name}</span>
              <span className="hpp-detail-desc">{detail.desc}</span>
            </div>
            <div className="hpp-vulns">
              {detail.vulns.map((v) => (
                <span className="hpp-vchip" key={v}>
                  <i aria-hidden="true" />
                  {v}
                </span>
              ))}
            </div>
          </>
        ) : (
          <span className="hpp-detail-hint">
            Hover a stage to see the threats it faces. Blindsight covers all four.
          </span>
        )}
      </div>

      <div className="hpp-metrics">
        {METRICS.map((m) => (
          <div className={`hpp-metric ${on ? "good" : "bad"}`} key={m.label}>
            <span className="hpp-metric-l">{m.label}</span>
            <span className="hpp-metric-v">{on ? m.good : m.bad}</span>
          </div>
        ))}
      </div>

      <div className="hpp-foot">
        <span className="hpp-stage">
          {on ? "Runtime secured, full pipeline protected" : "Without Blindsight, threats pass undetected"}
        </span>
        <button type="button" className="hpp-learn" onClick={learnMore}>
          Learn more
          <ArrowRight size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
