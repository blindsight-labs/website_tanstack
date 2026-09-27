/* Why Blindsight — headline, then the body under it, then one panel: the
   benchmark chart and the slot for a CISO quote. Flat bars: Blindsight in ink,
   the tools it is compared with in light grey. No colour, no 3D chart. */
import { useRef } from "react";
import { Quote } from "lucide-react";

import { hero, why } from "./content";
import { Label, MetalIcon, useReveal, type SectionProps } from "./shared";
import { Placeholdered } from "./Faq";

const TICKS = [0, 25, 50, 75, 100];

export function Why({ theme }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  const metric = hero.proof[0].label; // "attacks caught, public benchmarks"

  return (
    <section id="why" ref={ref} className="mD-section mDb-why" aria-labelledby="mDb-why-title">
      <div className="mD-container">
        <div className="mDb-why__head" data-reveal>
          <Label>{why.label}</Label>
          <h2 id="mDb-why-title" className="mD-h1 mDb-why__title">
            {why.headline}
          </h2>
          <p className="mD-lead mDb-why__body">{why.body}</p>
        </div>

        <div className="mD-card mDb-panel mDb-bench" data-reveal>
          <figure className="mD-log mDb-bench__fig">
            <div className="mD-log__head">
              <span>Benchmark · {metric}</span>
              <span>Illustrative</span>
            </div>

            <div
              className="mDb-bench__plot"
              role="img"
              aria-label={`Illustrative benchmark of ${metric}: Blindsight against four competitors. Figures to come.`}
            >
              <div className="mDb-bench__grid" aria-hidden="true">
                {TICKS.map((t) => (
                  <span key={t} style={{ left: `${t}%` }} />
                ))}
              </div>

              {why.benchmark.map((b, i) => (
                <div key={b.name} className="mDb-bench__row">
                  <div className={`mDb-bench__name${b.us ? " mDb-bench__name--us" : ""}`}>
                    <Placeholdered text={b.name} />
                  </div>
                  <div className="mDb-bench__track" style={{ ["--v" as string]: String(b.value) }}>
                    <div
                      className={`mDb-bench__bar${b.us ? " mDb-bench__bar--us" : ""}`}
                      style={{ transitionDelay: `${120 + i * 90}ms` }}
                    />
                  </div>
                </div>
              ))}

              <div className="mDb-bench__row" aria-hidden="true">
                <span />
                <div className="mDb-bench__axis">
                  {TICKS.map((t) => (
                    <span key={t} style={{ left: `${t}%` }}>
                      {t}%
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <figcaption className="mDb-bench__note">
              <span>{why.benchmarkNote}</span>
              <span>
                Test set <span className="mDb-ph">[benchmark set]</span>
              </span>
            </figcaption>
          </figure>

          <figure className="mDb-quote">
            <blockquote>
              <MetalIcon
                icon={Quote}
                size={24}
                strokeWidth={1.25}
                tone={theme === "dark" ? "light" : "ink"}
                className="mDb-quote__mark"
              />
              <p className="mDb-quote__text">
                <Placeholdered text="[CISO quote — one or two sentences, about 25 words]" />
              </p>
            </blockquote>
            <figcaption className="mDb-quote__who">
              <Placeholdered text="[Name]" />
              <Placeholdered text="[Role, company]" />
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
