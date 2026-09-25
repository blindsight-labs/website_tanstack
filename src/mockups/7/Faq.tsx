/* 08 · FAQ — long-form answers, Octane rhythm: mono index, hairlines, 20px
   questions. Accessible disclosure pattern (button + region). */
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { faq } from "./content";
import { Label, MetalIcon, useReveal, type SectionProps } from "./shared";

/** Renders copy with every [bracketed placeholder] set as a visible mono chip. */
export function Placeholdered({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <span key={i} className="mDb-ph">
            {p}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** First sentence becomes the lede (darker ink) so long answers scan. */
function splitLede(a: string): [string, string] {
  const m = a.match(/^(.+?[.?!])\s+([\s\S]*)$/);
  return m ? [m[1], m[2]] : [a, ""];
}

// Nav and footer "Pricing" both point at #faq: arriving that way opens the cost answer.
const PRICING_INDEX = faq.findIndex((f) => /cost|pric/i.test(f.q));

export function Faq({ theme }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  const uid = useId();
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#faq" && PRICING_INDEX >= 0)
        setOpen((s) => new Set(s).add(PRICING_INDEX));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const toggle = (i: number) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section id="faq" ref={ref} className="mD-section mDb-faq" aria-labelledby={`${uid}-title`}>
      <div className="mD-container mDb-faq__grid">
        <header className="mDb-faq__head" data-reveal>
          <Label>FAQ</Label>
          <h2 id={`${uid}-title`} className="mD-h1 mDb-faq__title">
            What CISOs ask first.
          </h2>
        </header>

        <div className="mDb-faq__list" data-reveal>
          {faq.map((item, i) => {
            const isOpen = open.has(i);
            const [lede, rest] = splitLede(item.a);
            const btnId = `${uid}-q${i}`;
            const panelId = `${uid}-a${i}`;
            return (
              <div key={item.q} className="mDb-q" data-open={isOpen}>
                <h3 className="mDb-q__h">
                  <button
                    id={btnId}
                    type="button"
                    className="mDb-q__btn"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(i)}
                  >
                    <span className="mDb-q__n">{String(i + 1).padStart(2, "0")}</span>
                    <span className="mDb-q__text">{item.q}</span>
                    <span className="mDb-q__icon">
                      <MetalIcon icon={ChevronDown} size={18} tone={theme === "dark" ? "light" : "ink"} />
                    </span>
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={btnId} className="mDb-q__panel" inert={!isOpen}>
                  <div className="mDb-q__inner">
                    <p className="mDb-q__a">
                      <span className="mDb-q__lede">
                        <Placeholdered text={lede} />
                      </span>{" "}
                      <Placeholdered text={rest} />
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
