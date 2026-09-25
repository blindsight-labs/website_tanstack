/* Nav — owner "top".
   Sticky, frosted, hairline appears on scroll. Logo left, mono links centred,
   quiet Pricing + the one CTA right. "Platform" opens a single-line menu.
   Below 900px: logo + CTA + a menu button that opens a glass sheet. */
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Menu, X } from "lucide-react";

import logo from "@/assets/LOGO_Blindsight.svg";
import { nav, sequence } from "./content";
import { CtaButton, type SectionProps } from "./shared";

const platform = [
  ...sequence.stages.map((s) => ({ n: s.n, label: s.label, href: "#sequence" })),
  { n: "", label: "Product walkthrough", href: "#walkthrough" },
];

export function Nav({ theme }: SectionProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const menuId = useId();
  const sheetId = useId();
  const ddRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);

  // Over a black inset sheet the frosted nav turns black too (as Octane's does),
  // instead of becoming a flat grey band.
  const [overInverse, setOverInverse] = useState(false);
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      setScrolled(window.scrollY > 6);
      const navBottom = 68;
      let over = false;
      document.querySelectorAll<HTMLElement>(".mD-sheet--inverse").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= navBottom * 0.5 && r.bottom >= navBottom * 0.5) over = true;
      });
      setOverInverse(over);
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
  }, []);

  // close the platform menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen && !sheetOpen) return;
    const onDown = (e: PointerEvent) => {
      if (menuOpen && ddRef.current && !ddRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        btnRef.current?.focus();
      }
      setSheetOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, sheetOpen]);

  // close the mobile sheet when the viewport grows past the breakpoint
  useEffect(() => {
    if (!sheetOpen) return;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => mq.matches && setSheetOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [sheetOpen]);

  const hoverOpen = useCallback((open: boolean) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setMenuOpen(open), open ? 60 : 180);
  }, []);

  const [platformLink, ...rest] = nav.links;

  return (
    <header
      className="mD-nav mT-nav"
      data-scrolled={scrolled || sheetOpen ? "true" : "false"}
      data-over={overInverse && !sheetOpen ? "inverse" : "page"}
      data-sheet={sheetOpen ? "open" : "closed"}
    >
      <div className="mD-container mT-nav__inner">
        <a href="/mockup-4" className="mT-nav__logo" aria-label="Blindsight, home">
          <img src={logo} alt="" width={96} height={20} data-theme={theme} />
        </a>

        <nav className="mT-nav__links" aria-label="Primary">
          <div
            className="mT-dd"
            ref={ddRef}
            onPointerEnter={() => hoverOpen(true)}
            onPointerLeave={() => hoverOpen(false)}
          >
            <button
              ref={btnRef}
              type="button"
              className="mD-nav__link mT-dd__btn"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {platformLink.label}
              <ChevronDown size={13} strokeWidth={1.75} aria-hidden="true" className="mT-dd__chev" />
            </button>
            <div id={menuId} className="mD-menu mT-dd__menu" data-open={menuOpen ? "true" : "false"}>
              <ul role="list">
                {platform.map((p) => (
                  <li key={p.label}>
                    <a
                      href={p.href}
                      className="mD-menu__item mT-dd__item"
                      tabIndex={menuOpen ? 0 : -1}
                      onClick={() => setMenuOpen(false)}
                    >
                      <span className="mT-dd__n" aria-hidden={!p.n}>
                        {p.n}
                      </span>
                      <span className="mT-dd__label">{p.label}</span>
                      <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" className="mT-dd__arrow" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {rest.map((l) => (
            <a key={l.label} href={l.href} className="mD-nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="mT-nav__end">
          <a href={nav.quiet.href} className="mD-nav__link mD-nav__link--quiet mT-nav__quiet">
            {nav.quiet.label}
          </a>
          <CtaButton size="sm" className="mT-nav__cta" />
          <button
            type="button"
            className="mT-nav__burger"
            aria-expanded={sheetOpen}
            aria-controls={sheetId}
            aria-label={sheetOpen ? "Close menu" : "Open menu"}
            onClick={() => setSheetOpen((o) => !o)}
          >
            {sheetOpen ? (
              <X size={18} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={18} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div id={sheetId} className="mT-sheet" data-open={sheetOpen ? "true" : "false"} hidden={!sheetOpen}>
        <div className="mD-container">
          <ul role="list" className="mT-sheet__list">
            {platform.slice(0, 3).map((p) => (
              <li key={p.label}>
                <a href={p.href} className="mT-sheet__item" onClick={() => setSheetOpen(false)}>
                  <span className="mT-sheet__n">{p.n}</span>
                  {p.label}
                </a>
              </li>
            ))}
            {rest.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="mT-sheet__item" onClick={() => setSheetOpen(false)}>
                  <span className="mT-sheet__n" aria-hidden="true" />
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href={nav.quiet.href} className="mT-sheet__item mT-sheet__item--quiet" onClick={() => setSheetOpen(false)}>
                <span className="mT-sheet__n" aria-hidden="true" />
                {nav.quiet.label}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
