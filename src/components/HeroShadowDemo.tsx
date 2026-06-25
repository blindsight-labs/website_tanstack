import { useState } from "react";
import { Ban, Cloud, Lock, TriangleAlert, Users } from "lucide-react";

/* Hero "Shadow AI" tab. A department/person (left) streams sensitive data and
 * attacks toward a third-party AI (right). Off: packets flow all the way out —
 * PII/PHI leaks, injections land. On: the same packets are stopped at the
 * Blindsight proxy (centre) — sensitive fields redacted, attacks blocked. The
 * packet motion is CSS-animated (see .hsd-pkt); the toggle keeps it interactive.
 * Illustrative content, so it keeps the traffic-light palette (indigo/red/purple)
 * rather than the violet UI accent. */

type Lane = { y: number; kind: "sensitive" | "inject" | "export"; off: string; on: string };

const LANES: Lane[] = [
  { y: 16, kind: "sensitive", off: "IBAN", on: "IBAN ████" },
  { y: 39, kind: "sensitive", off: "PHI", on: "PHI ███" },
  { y: 62, kind: "inject", off: "inject", on: "Blocked" },
  { y: 85, kind: "export", off: "export", on: "Blocked" },
];

export function HeroShadowDemo({ onInteract }: { onInteract?: () => void }) {
  const [on, setOn] = useState(false);

  return (
    <div className={`hsd ${on ? "on" : "off"}`}>
      <div className="hsd-top">
        <span className="hsd-kick">// Shadow AI · live traffic</span>
        <div className="hsd-ctrl">
          <span className="hsd-badge">{on ? "Protected" : "Unprotected"}</span>
          <button
            type="button"
            className="hsd-sw"
            aria-pressed={on}
            aria-label="Toggle Blindsight protection"
            onClick={() => {
              setOn((v) => !v);
              onInteract?.();
            }}
          >
            <span className="hsd-sw-lbl">Blindsight</span>
            <span className="hsd-sw-track">
              <span className="hsd-sw-knob" />
            </span>
          </button>
        </div>
      </div>

      <div className="hsd-arena">
        <div className="hsd-src" aria-hidden="true">
          <span className="hsd-src-ic">
            <Users />
          </span>
          <span className="hsd-src-l">Your team</span>
        </div>

        {LANES.map((L, i) => (
          <span className="hsd-wire" style={{ top: `${L.y}%` }} key={`w${i}`} aria-hidden="true" />
        ))}

        <div className="hsd-wall">
          <Cloud aria-hidden="true" />
          <span className="hsd-wall-l">
            3rd-party
            <br />
            AI
          </span>
        </div>

        <div className="hsd-proxy" aria-hidden="true">
          <span className="hsd-orb" />
          <span className="hsd-ptag">{on ? "blindsight · active" : "proxy · offline"}</span>
        </div>

        {LANES.map((L, i) => {
          const sensitive = L.kind === "sensitive";
          const cls = on ? (sensitive ? "redact" : "block") : "leak";
          const Icon = on ? (sensitive ? Lock : Ban) : TriangleAlert;
          return (
            <div
              className="hsd-pkt"
              style={{ top: `${L.y}%`, animationDelay: `${i * 0.55}s` }}
              key={`p${i}`}
            >
              <span className={`hsd-chip ${cls}`}>
                <Icon size={13} aria-hidden="true" />
                {on ? L.on : L.off}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
