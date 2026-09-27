/* Section 6 — How discovery works (owner: mid).
   Time is drawn as a real axis, not four equal cards: fourteen days in which
   Blindsight runs quietly and findings accumulate in three lanes (the three
   things the report covers), the report sealing at day 14, protection after.
   Findings are grey; the single most recent one is the live signal. */
import { useRef } from "react";

import { discovery } from "./content";
import { CtaButton, Label, useReveal, type SectionProps } from "./shared";

const DAYS = 14;
const LANES = [
  { k: "Shadow AI", days: [0.6, 1.4, 1.9, 3.2, 4.1, 6.8, 8.3, 9.6, 12.7] },
  { k: "Leak points", days: [1.1, 2.7, 5.2, 7.4, 10.9, 12.2] },
  { k: "Attack attempts", days: [3.8, 8.9, 11.6] },
];
// the one live signal: the latest finding before the report seals
const LATEST = { lane: 0, day: 12.7 };

const pct = (day: number) => `${(day / DAYS) * 100}%`;

export function Discovery(_props: SectionProps) {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  return (
    <section ref={root} id="discovery" className="mD-section mid-ds" aria-labelledby="mid-ds-title">
      <div className="mD-container">
        <header className="mid-ds__head" data-reveal>
          <div>
            <Label>{discovery.label}</Label>
            <h2 id="mid-ds-title" className="mD-h1 mid-ds__title">
              {discovery.headline}
            </h2>
          </div>
          <div className="mid-ds__cta">
            <CtaButton size="lg" />
          </div>
        </header>

        <figure className="mid-ds__chart" data-reveal aria-label="Discovery timeline: fourteen days of quiet observation, then a findings report">
          <figcaption className="mid-ds__cap">
            <span>Discovery · days 0–14</span>
            <span>Illustrative</span>
          </figcaption>

          <div className="mid-ds__plot">
            {/* phase markers across all lanes */}
            <div className="mid-ds__marks" aria-hidden="true">
              <span className="mid-ds__mark" style={{ left: 0 }}>
                <b>01</b> Install
              </span>
              <span className="mid-ds__mark mid-ds__mark--report" style={{ left: "100%" }}>
                <b>03</b> Findings report
              </span>
            </div>

            <div className="mid-ds__lanes">
              {LANES.map((lane, li) => (
                <div key={lane.k} className="mid-ds__lane">
                  <span className="mid-ds__lane-k">{lane.k}</span>
                  <div className="mid-ds__track">
                    {lane.days.map((d) => {
                      const live = li === LATEST.lane && d === LATEST.day;
                      return (
                        <span
                          key={d}
                          className={live ? "mid-ds__hit mid-ds__hit--live" : "mid-ds__hit"}
                          style={{ left: pct(d) }}
                          aria-hidden="true"
                        />
                      );
                    })}
                  </div>
                  <div className="mid-ds__after" aria-hidden="true">
                    <span className="mid-ds__enforced" />
                  </div>
                  <span className="mid-ds__count">
                    <span className="mid-ph">[n]</span> found
                  </span>
                </div>
              ))}
            </div>

            <div className="mid-ds__axis" aria-hidden="true">
              <span className="mid-ds__axis-pad" />
              <div className="mid-ds__ticks">
                {Array.from({ length: DAYS + 1 }, (_, d) => (
                  <span key={d} className={d % 7 === 0 ? "mid-ds__tick mid-ds__tick--major" : "mid-ds__tick"} style={{ left: pct(d) }}>
                    {d === 0 ? "Day 0" : d === 7 ? "Week 1" : d === 14 ? "Week 2" : null}
                  </span>
                ))}
              </div>
              <span className="mid-ds__axis-after">then</span>
              <span className="mid-ds__axis-pad" />
            </div>

            <span className="mid-ds__quiet" aria-hidden="true">
              <b>02</b> Runs quietly: nothing blocked, nothing changes for your people
            </span>
            <span className="mid-ds__on" aria-hidden="true">
              <b>04</b> Protection on
            </span>
          </div>
        </figure>

        <ol className="mid-ds__steps">
          {discovery.steps.map((s) => (
            <li key={s.n} className="mid-ds__step" data-reveal>
              <span className="mid-ds__n">{s.n}</span>
              <h3 className="mid-ds__step-t">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
