/* Version B · shared page parts. The hybrid: B's object header (text left, one rendered object
   right) over A's editorial structure (white sheets, a sticky kicker left and content right,
   a sticky outline with scroll-spy for long documents). Every page ends on the landing's
   FinalCta. Copied from pages/a/kit.tsx and re-prefixed .pb-, not imported. */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Label, useReveal } from "@/site/shared";
import { Still } from "./Still";
import type { SceneName } from "./objects";

/** A page: <main> with reveal-on-scroll for everything marked data-reveal. */
export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <main ref={ref} className={`pb ${className}`}>
      {children}
    </main>
  );
}

type HeadProps = {
  /** the micro-label over the title (left out when a back link already heads the copy) */
  label?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** buttons under the lead */
  actions?: ReactNode;
  /** a quiet line under the actions */
  note?: ReactNode;
  /** above the label (a back link) */
  above?: ReactNode;
  scene: SceneName;
  arg?: string;
  /** shorter sheet for reading pages */
  compact?: boolean;
  /** shortest sheet (forms): the work starts above the fold */
  short?: boolean;
  /** a long headline: set a step smaller */
  long?: boolean;
  titleId?: string;
};

/** The object header: a white inset sheet like the landing's hero, the copy on the left and
 *  one rendered glass/chrome object bleeding off the right edge (stacked on phones). */
export function PageHead({ label, title, lead, actions, note, above, scene, arg, compact, short, long, titleId }: HeadProps) {
  const size = short ? " pb-head--short" : compact ? " pb-head--compact" : "";
  // one still (880 × 720, aspect 1.22) serves every width: on phones the stacked box is sized
  // to that same aspect (b-resp.css), so the object is framed whole, plinth included
  return (
    <header className={`pb-head${size}${long ? " pb-head--long" : ""}`}>
      <div className="mD-sheet pb-head__sheet">
        <Still className="pb-head__fig" scene={scene} arg={arg} width={880} height={720} />
        <div className="mD-container pb-head__inner">
          <div className="pb-head__text" data-reveal>
            {above}
            {label && <Label>{label}</Label>}
            <h1 id={titleId} className="mD-h1 pb-head__title">
              {title}
            </h1>
            {lead && <p className="mD-lead pb-head__lead">{lead}</p>}
            {actions && <div className="pb-head__actions">{actions}</div>}
            {note && <div className="pb-head__note">{note}</div>}
          </div>
        </div>
      </div>
    </header>
  );
}

/** A section on the grey page (cards sit on it), or on a white sheet (`sheet`). */
export function Sec({
  id,
  label,
  title,
  lead,
  children,
  sheet = false,
  className = "",
  headAside,
}: {
  id?: string;
  label?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  sheet?: boolean;
  className?: string;
  headAside?: ReactNode;
}) {
  const head =
    label || title ? (
      <div className={`pb-sec__head${headAside ? " pb-sec__head--aside" : ""}`} data-reveal>
        <div className="pb-sec__headText">
          {label && <Label>{label}</Label>}
          {title && <h2 className="mD-h2">{title}</h2>}
          {lead && <p className="pb-sec__lead">{lead}</p>}
        </div>
        {headAside && <div className="pb-sec__aside">{headAside}</div>}
      </div>
    ) : null;
  const inner = (
    <div className="mD-container">
      {head}
      {children}
    </div>
  );
  return (
    <section id={id} className={`pb-sec${sheet ? " pb-sec--sheet" : ""} ${className}`}>
      {sheet ? <div className="mD-sheet pb-sec__sheet">{inner}</div> : inner}
    </section>
  );
}

/** One white sheet holding several Split sections, hairlines between them. */
export function SheetGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mD-sheet pb-group ${className}`.trim()}>{children}</div>;
}

/** A's editorial block: a sticky kicker (label, short title, note, extras) on the left,
 *  content on the right. `sheet` gives it its own white sheet; inside a SheetGroup, don't. */
export function Split({
  id,
  kicker,
  title,
  note,
  side,
  children,
  sheet = false,
  className = "",
}: {
  id?: string;
  kicker: string;
  title?: ReactNode;
  note?: ReactNode;
  side?: ReactNode;
  children: ReactNode;
  sheet?: boolean;
  className?: string;
}) {
  const titleId = useId();
  return (
    <section
      id={id}
      className={`pb-split${sheet ? " mD-sheet pb-split--sheet" : ""} ${className}`.trim()}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : kicker}
    >
      <div className="mD-container pb-split__grid">
        <div className="pb-split__side">
          <div className="pb-split__sticky" data-reveal>
            <Label>{kicker}</Label>
            {title && (
              <h2 id={titleId} className="pb-split__title">
                {title}
              </h2>
            )}
            {note && <div className="pb-split__note">{note}</div>}
            {side}
          </div>
        </div>
        <div className="pb-split__body">{children}</div>
      </div>
    </section>
  );
}

/** "Some Heading: with punctuation" → "some-heading-with-punctuation". */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "01", "02", … */
export const pad2 = (i: number) => String(i + 1).padStart(2, "0");

/** The id of the last section whose top has passed just under the nav (scroll is the cause). */
function useActiveSection(ids: string[]) {
  const key = ids.join("|");
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (!list.length) return;
    let raf = 0;
    const check = () => {
      raf = 0;
      let current = list[0];
      for (const id of list) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        const el = document.getElementById(list[list.length - 1]);
        if (el && el.getBoundingClientRect().top < window.innerHeight) current = list[list.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [key]);
  return active;
}

export type OutlineItem = { id: string; label: string; n?: string };

/** A sticky outline for long documents; the section being read is set in ink. */
export function Outline({ items, label = "On this page" }: { items: OutlineItem[]; label?: string }) {
  const active = useActiveSection(items.map((i) => i.id));
  return (
    <nav className="pb-outline" aria-label={label}>
      <p className="pb-outline__k">{label}</p>
      <ol className="pb-outline__list" role="list">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className="pb-outline__link" aria-current={active === i.id ? "location" : undefined}>
              {i.n && <span className="pb-outline__n">{i.n}</span>}
              <span>{i.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** "What happens next": numbered, ruled steps (key + one line). */
export function Steps({ items, label }: { items: { k: string; v: ReactNode }[]; label?: string }) {
  return (
    <ol className="pb-next" role="list" aria-label={label}>
      {items.map((s, i) => (
        <li key={s.k} className="pb-next__item">
          <span className="pb-next__n">{pad2(i)}</span>
          <span className="pb-next__k">{s.k}</span>
          <span className="pb-next__v">{s.v}</span>
        </li>
      ))}
    </ol>
  );
}

export type QaItem = { q: string; a: ReactNode };

/** Questions as a ruled list. Answers stay in the DOM (they back the pages' FAQ schema);
 *  a closed answer is collapsed and hidden from assistive tech until opened. */
export function QaList({ items, idPrefix }: { items: QaItem[]; idPrefix: string }) {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) => setOpen((cur) => (cur.includes(i) ? cur.filter((k) => k !== i) : [...cur, i]));
  return (
    <div className="pb-qa">
      {items.map((it, i) => {
        const isOpen = open.includes(i);
        const id = `${idPrefix}-${i}`;
        return (
          <div className="pb-qa__item" data-open={isOpen ? "true" : undefined} key={id}>
            <h3 className="pb-qa__h">
              <button type="button" className="pb-qa__q" aria-expanded={isOpen} aria-controls={id} onClick={() => toggle(i)}>
                <span>{it.q}</span>
                <span className="pb-qa__icon" aria-hidden="true" />
              </button>
            </h3>
            <div className="pb-qa__a" id={id} role="region" aria-label={it.q}>
              <div className="pb-qa__inner">
                <div className="pb-qa__body">{it.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "a · b · c" in mono, the one metadata line a card gets. */
export function Meta({ items }: { items: ReactNode[] }) {
  return (
    <span className="pb-meta">
      {items.map((x, i) => (
        <span key={i}>
          {i > 0 && (
            <span className="pb-meta__sep" aria-hidden="true">
              ·
            </span>
          )}
          {x}
        </span>
      ))}
    </span>
  );
}
