/* Nav — the site header on every page (mounted once in src/routes/__root.tsx).
   Sticky, frosted, hairline appears on scroll; over a black inset sheet it turns black.
   Logo left; the Platform link (to the landing) and the Company / Resources menus centred
   (mono, single-line items); the theme toggle and the one CTA right. Below 900px: logo +
   CTA + a menu button that opens a glass sheet (Platform, the menus as labelled groups,
   then the theme). */
import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";

import mark from "@/assets/ICON_Blindsight.svg";
import logo from "@/assets/LOGO_Blindsight.svg";
import { nav, type NavItem } from "./content";
import { CtaButton, Label, type SectionProps } from "./shared";
import { useSiteTheme } from "./theme";

const menus: { label: string; items: NavItem[] }[] = nav.menus;

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Internal links go through the router; a hash link to the page you are on scrolls there. */
function NavLink({
  item,
  className,
  tabIndex,
  onNavigate,
  children,
}: {
  item: NavItem;
  className: string;
  tabIndex?: number;
  onNavigate?: () => void;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (item.to === undefined) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        tabIndex={tabIndex}
        onClick={onNavigate}
      >
        {children}
      </a>
    );
  }
  const { to, hash } = item;
  return (
    <Link
      to={to}
      hash={hash}
      className={className}
      tabIndex={tabIndex}
      onClick={(e) => {
        if (hash && pathname === to) {
          e.preventDefault();
          document.getElementById(hash)?.scrollIntoView({ behavior: smooth(), block: "start" });
        }
        onNavigate?.();
      }}
    >
      {children}
    </Link>
  );
}

/** One header menu: opens on hover (pointer devices) or click; outside click / Escape close it. */
function NavMenu({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const ddRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const numbered = items.some((i) => i.n);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const hoverOpen = useCallback((next: boolean) => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpen(next), next ? 60 : 180);
  }, []);

  return (
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
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown size={13} strokeWidth={1.75} aria-hidden="true" className="mT-dd__chev" />
      </button>
      <div
        id={menuId}
        className={`mD-menu mT-dd__menu${numbered ? "" : " mT-dd__menu--narrow"}`}
        data-open={open ? "true" : "false"}
      >
        <ul role="list">
          {items.map((p) => (
            <li key={p.label} data-sep={p.sep ? "" : undefined}>
              <NavLink
                item={p}
                className="mD-menu__item mT-dd__item"
                tabIndex={open ? 0 : -1}
                onNavigate={() => setOpen(false)}
              >
                {numbered && (
                  <span className="mT-dd__n" aria-hidden={!p.n}>
                    {p.n}
                  </span>
                )}
                <span className="mT-dd__label">{p.label}</span>
                {p.href ? (
                  <ArrowUpRight size={13} strokeWidth={1.5} aria-hidden="true" className="mT-dd__arrow" />
                ) : (
                  <ArrowRight size={13} strokeWidth={1.5} aria-hidden="true" className="mT-dd__arrow" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Nav({ theme }: SectionProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { toggleTheme } = useSiteTheme();
  const [scrolled, setScrolled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Over a black inset sheet the frosted nav turns black too (as Octane's does),
  // instead of becoming a flat grey band. Re-checked per page.
  const [overInverse, setOverInverse] = useState(false);
  // While the hero's own CTA is on screen the nav's copy of it steps back: one CTA at a time.
  const [heroCta, setHeroCta] = useState(false);
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
      const cta = document.querySelector<HTMLElement>(".mD-hero__actions")?.getBoundingClientRect();
      setHeroCta(!!cta && cta.height > 0 && cta.bottom > navBottom && cta.top < window.innerHeight);
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
  }, [pathname]);

  // the sheet closes on navigation, on Escape, and when the viewport grows past the breakpoint
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSheetOpen(false);
      burgerRef.current?.focus();
    };
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => mq.matches && setSheetOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onChange);
    // the sheet is modal: everything outside the header goes inert (Tab stays in the header and
    // sheet, screen readers skip the page behind it) and the page stops scrolling under it
    const inerted: HTMLElement[] = [];
    for (let el = headerRef.current; el && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement?.children ?? []) {
        if (sib !== el && sib instanceof HTMLElement && !sib.inert) {
          sib.inert = true;
          inerted.push(sib);
        }
      }
    }
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onChange);
      inerted.forEach((el) => (el.inert = false));
      root.style.overflow = prevOverflow;
    };
  }, [sheetOpen]);

  const closeSheet = () => setSheetOpen(false);
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <header
      ref={headerRef}
      className="mD-nav mT-nav"
      data-scrolled={scrolled || sheetOpen ? "true" : "false"}
      data-over={overInverse && !sheetOpen ? "inverse" : "page"}
      data-sheet={sheetOpen ? "open" : "closed"}
      data-hero-cta={heroCta ? "true" : undefined}
    >
      <div className="mD-container mT-nav__inner">
        <Link
          to="/"
          className="mT-nav__logo"
          aria-label="Blindsight, home"
          onClick={(e) => {
            // already home → back to the top instead of a no-op navigation
            if (pathname === "/") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: smooth() });
            }
            closeSheet();
          }}
        >
          {/* below 410px the wordmark can't fit at a legible size: the mark alone stands in
              (foundations §7, logo minimum size) */}
          <picture>
            <source media="(max-width: 409px)" srcSet={mark} width={30} height={30} />
            <img src={logo} alt="" width={145} height={30} data-theme={theme} />
          </picture>
        </Link>

        <nav className="mT-nav__links" aria-label="Primary">
          <NavLink
            item={nav.platform}
            className="mD-nav__link mT-dd__btn"
            onNavigate={() => {
              if (pathname === "/") window.scrollTo({ top: 0, behavior: smooth() });
            }}
          >
            {nav.platform.label}
          </NavLink>
          {menus.map((m) => (
            <NavMenu key={m.label} label={m.label} items={m.items} />
          ))}
        </nav>

        <div className="mT-nav__end">
          <CtaButton size="sm" className="mT-nav__cta" />
          <button type="button" className="bs-theme-toggle" aria-label={themeLabel} onClick={toggleTheme}>
            {theme === "dark" ? (
              <Sun size={16} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Moon size={16} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <button
            ref={burgerRef}
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
            <li>
              <NavLink item={nav.platform} className="mT-sheet__item" onNavigate={closeSheet}>
                <span className="mT-sheet__n" aria-hidden="true" />
                {nav.platform.label}
              </NavLink>
            </li>
            {menus.map((m) => (
              <Fragment key={m.label}>
                <li className="bs-sheet__group">
                  <Label>{m.label}</Label>
                </li>
                {m.items
                  .filter((p) => !p.desktopOnly)
                  .map((p) => (
                    <li key={p.label}>
                      <NavLink item={p} className="mT-sheet__item" onNavigate={closeSheet}>
                        <span className="mT-sheet__n" aria-hidden="true">
                          {p.n}
                        </span>
                        {p.label}
                      </NavLink>
                    </li>
                  ))}
              </Fragment>
            ))}
            <li className="bs-sheet__gap" aria-hidden="true" />
            <li>
              <button
                type="button"
                className="mT-sheet__item mT-sheet__item--quiet bs-sheet__theme"
                onClick={toggleTheme}
              >
                <span className="mT-sheet__n" aria-hidden="true">
                  {theme === "dark" ? (
                    <Sun size={14} strokeWidth={1.5} />
                  ) : (
                    <Moon size={14} strokeWidth={1.5} />
                  )}
                </span>
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
