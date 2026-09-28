/* The quiz card every concept places in its header: one question at a time (keys 1–4 answer),
   then the result (seen today · prevented today · with Blindsight, est.). The concept decides
   what the result's primary button does (usually: scroll into the reveal). */
import { ArrowDown, ArrowLeft, RotateCcw } from "lucide-react";

import { Label } from "@/site/shared";
import { N, RISKS, verdict } from "./model";
import type { Assessment } from "./useAssessment";

const pad2 = (n: number) => String(n).padStart(2, "0");
const LETTERS = ["A", "B", "C", "D"];

export function QuizCard({
  a,
  onReveal,
  revealLabel = "See what's below the waterline",
  className = "",
}: {
  a: Assessment;
  onReveal?: () => void;
  revealLabel?: string;
  className?: string;
}) {
  const { answers, q, result, done, score: s } = a;
  const risk = RISKS[q];
  return (
    <div
      className={`mD-glass ra-quiz ${className}`.trim()}
      aria-live="polite"
      onKeyDown={(e) => {
        if (result) return;
        const k = Number(e.key);
        if (k >= 1 && k <= 4) a.pick(k - 1);
      }}
    >
      {!result ? (
        <div className="ra-q" key={q}>
          <div className="ra-q__top">
            <span className="ra-q__n">
              Question {pad2(q + 1)} / {pad2(N)}
            </span>
            <span className="ra-q__risk">{risk.name}</span>
          </div>
          <ol className="ra-prog" role="list" aria-label="Progress">
            {RISKS.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="ra-prog__seg"
                  data-state={i === q ? "current" : answers[i] != null ? "done" : undefined}
                  aria-label={`Question ${i + 1}: ${r.name}${answers[i] != null ? " (answered)" : ""}`}
                  aria-current={i === q ? "step" : undefined}
                  onClick={() => a.setQ(i)}
                />
              </li>
            ))}
          </ol>
          <h2 className="ra-q__text" id={`ra-q-${q}`}>
            {risk.question}
          </h2>
          <div className="ra-opts" role="radiogroup" aria-labelledby={`ra-q-${q}`}>
            {risk.options.map((o, i) => (
              <button
                type="button"
                role="radio"
                aria-checked={answers[q] === i}
                className="ra-opt"
                key={o.label}
                onClick={() => a.pick(i)}
              >
                <span className="ra-opt__k">{LETTERS[i]}</span>
                <span className="ra-opt__t">{o.label}</span>
              </button>
            ))}
          </div>
          <div className="ra-q__foot">
            <button
              type="button"
              className="ra-link"
              onClick={() => a.setQ(q - 1)}
              disabled={q === 0}
            >
              <ArrowLeft size={13} strokeWidth={1.75} aria-hidden="true" />
              Back
            </button>
            {done ? (
              <button type="button" className="ra-link" onClick={a.showResult}>
                See your result
              </button>
            ) : (
              <span className="ra-q__private">Nothing you enter leaves this page</span>
            )}
          </div>
        </div>
      ) : (
        <div className="ra-res">
          <Label>Your result</Label>
          <p className="ra-res__head">
            You can see <strong>{s.inView} of 8</strong> AI risks.
          </p>
          <dl className="ra-nums">
            <div>
              <dt>Seen today</dt>
              <dd>{s.seen}%</dd>
            </div>
            <div>
              <dt>Prevented today</dt>
              <dd>{s.prevented}%</dd>
            </div>
            <div>
              <dt>With Blindsight</dt>
              <dd>
                {s.withPrevented}%<span className="ra-est">est.</span>
              </dd>
            </div>
          </dl>
          <p className="ra-res__verdict">{verdict(s)}</p>
          <div className="ra-res__actions">
            {onReveal && (
              <button type="button" className="mD-btn mD-btn--primary" onClick={onReveal}>
                {revealLabel}
                <ArrowDown size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            )}
            <button type="button" className="ra-link" onClick={a.retake}>
              <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
              Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
