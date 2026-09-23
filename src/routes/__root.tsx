import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ChevronDown, Menu, Moon, Sun, X } from "lucide-react";

/* Nav/footer link targeting an on-page section of a landing page (the home
   page's See/Govern/Prove steps, /shadow, /demo). Scrolls in-page when
   already on that route; navigates there with a hash from any other route. */
function LandingSectionNavLink({
  to,
  id,
  children,
  onClick,
  className,
}: {
  to: "/" | "/shadow" | "/demo";
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Link
      to={to}
      hash={id}
      className={className}
      onClick={(e) => {
        if (pathname === to) {
          e.preventDefault();
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        onClick?.();
      }}
    >
      {children}
    </Link>
  );
}

import { DemoModalProvider, useDemoModal } from "@/components/DemoModal";
import appCss from "../styles.css?url";
import logo from "@/assets/LOGO_Blindsight.svg";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-4 text-muted">This page doesn't exist.</p>
        <Link to="/" className="btn btn-primary mt-6 inline-flex">
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="btn btn-primary mt-6"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Blindsight - Securing AI" },
      {
        name: "description",
        content:
          "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
      },
      { property: "og:title", content: "Blindsight - Securing AI" },
      {
        property: "og:description",
        content:
          "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://blindsight.io/og-image.png" },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Blindsight - Securing AI" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blindsight - Securing AI" },
      {
        name: "twitter:description",
        content:
          "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
      },
      { name: "twitter:image", content: "https://blindsight.io/og-image.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
    scripts: [
      // Google Analytics (gtag.js) — GA4 property G-06PKBPMVBJ
      { src: "https://www.googletagmanager.com/gtag/js?id=G-06PKBPMVBJ", async: true },
      {
        children:
          "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-06PKBPMVBJ');",
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Blindsight",
          legalName: "Blindsight Technologies AG",
          url: "https://blindsight.io",
          logo: "https://blindsight.io/favicon.png",
          description:
            "Runtime security for AI. Blindsight provides real-time visibility and threat protection for every AI prompt, response, and tool call, plus Shadow AI discovery for security and compliance teams deploying AI in regulated environments.",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Rennweg 57",
            postalCode: "8001",
            addressLocality: "Zürich",
            addressCountry: "CH",
          },
          email: "info@blindsight.io",
          sameAs: ["https://www.linkedin.com/showcase/blndsght/"],
          knowsAbout: [
            "AI runtime security",
            "prompt injection",
            "shadow AI",
            "data poisoning",
            "model poisoning",
            "LLM security",
            "EU AI Act compliance",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "info@blindsight.io",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Set the theme on <html> before paint to avoid a flash of the wrong theme.
// Reads a saved choice, falling back to the OS preference on first visit.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    // themeInitScript sets data-theme before hydration, so the attribute differs by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Shared chrome for all nav variants: scroll shadow, hamburger menu state,
// and theme toggle. The main nav always shows its CTA; ShadowNav and DemoNav
// keep their own CTA-reveal logic (IntersectionObserver on #hero-cta vs. a
// scroll check against #hero) and forcing those to converge isn't worth it.
function useNavChrome() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Theme is applied to <html> before paint by themeInitScript; mirror it into
  // state on mount so the toggle shows the right icon.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") setTheme(t);
  }, []);
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* ignore unavailable storage */
      }
      return next;
    });
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return {
    scrolled,
    menuOpen,
    setMenuOpen,
    closeMenu: () => setMenuOpen(false),
    theme,
    toggleTheme,
  };
}

// The home page's three layers; BrainExperience sets <html data-layer> to the
// active id, which underlines the matching link (see `.nav-step` in styles.css).
const STEP_LINKS = [
  { id: "see", label: "See it" },
  { id: "govern", label: "Govern it" },
  { id: "prove", label: "Prove it" },
] as const;

const COMPANY_LINKS = [
  { to: "/team", label: "Team" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

const DOCS_URL = "https://docs.blindsight.io";

// Hover- or click-opened dropdown; Escape closes it.
function NavMenu({
  label,
  children,
}: {
  label: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <li
      className="nav-dropdown"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={close}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <button
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <ChevronDown className="nav-caret" size={14} aria-hidden="true" />
      </button>
      <div className={`nav-dropdown-menu ${open ? "open" : ""}`}>{children(close)}</div>
    </li>
  );
}

function Nav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scrolled, menuOpen, setMenuOpen, closeMenu, theme, toggleTheme } = useNavChrome();
  return (
    <nav className={`nav nav-main ${scrolled ? "scrolled" : ""}`}>
      <Link
        to="/"
        aria-label="Blindsight home"
        onClick={(e) => {
          // Already home → scroll back to the top instead of a no-op navigation.
          if (pathname === "/") {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          closeMenu();
        }}
      >
        <img src={logo} alt="Blindsight" className="nav-logo" />
      </Link>
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`} inert={!menuOpen}>
        {STEP_LINKS.map((s) => (
          <LandingSectionNavLink
            key={s.id}
            to="/"
            id={s.id}
            className="nav-step"
            onClick={closeMenu}
          >
            {s.label}
          </LandingSectionNavLink>
        ))}
        <span className="nav-mobile-label">Company</span>
        {COMPANY_LINKS.map((l) => (
          <Link key={l.to} to={l.to} onClick={closeMenu}>
            {l.label}
          </Link>
        ))}
        <span className="nav-mobile-label">Resources</span>
        <Link to="/blog" onClick={closeMenu}>
          Blog
        </Link>
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
          Documentation
        </a>
        <Link to="/faq" onClick={closeMenu}>
          FAQ
        </Link>
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openDemo("demo");
          }}
        >
          Book a demo
        </button>
      </div>
      <ul className="nav-links">
        {STEP_LINKS.map((s) => (
          <li key={s.id}>
            <LandingSectionNavLink to="/" id={s.id} className="nav-step">
              {s.label}
            </LandingSectionNavLink>
          </li>
        ))}
        <li className="nav-sep" aria-hidden="true" />
        <NavMenu label="Company">
          {(close) =>
            COMPANY_LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={close}>
                {l.label}
              </Link>
            ))
          }
        </NavMenu>
        <NavMenu label="Resources">
          {(close) => (
            <>
              <Link to="/blog" onClick={close}>
                Blog
              </Link>
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" onClick={close}>
                Documentation
              </a>
              <Link to="/faq" onClick={close}>
                FAQ
              </Link>
            </>
          )}
        </NavMenu>
      </ul>
      <div className="nav-right">
        <button type="button" className="btn btn-primary nav-demo" onClick={() => openDemo("demo")}>
          Book a demo
        </button>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}

function ShadowNav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scrolled, menuOpen, setMenuOpen, closeMenu, theme, toggleTheme } = useNavChrome();
  const [ctaShown, setCtaShown] = useState(false);
  useEffect(() => {
    const update = () => {
      const hero = document.getElementById("hero");
      setCtaShown(!!hero && hero.getBoundingClientRect().top < -window.innerHeight * 0.55);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" aria-label="Blindsight home" onClick={closeMenu}>
        <img src={logo} alt="Blindsight" className="nav-logo" />
      </Link>
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <LandingSectionNavLink to="/shadow" id="hero" onClick={closeMenu}>
          Top
        </LandingSectionNavLink>
        <LandingSectionNavLink to="/shadow" id="stack" onClick={closeMenu}>
          How it works
        </LandingSectionNavLink>
        <LandingSectionNavLink to="/shadow" id="faq" onClick={closeMenu}>
          FAQ
        </LandingSectionNavLink>
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openDemo("download");
          }}
        >
          See my Shadow AI
        </button>
      </div>
      <div className="nav-right">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <ul className="nav-links">
          <li>
            <LandingSectionNavLink to="/shadow" id="hero">
              Top
            </LandingSectionNavLink>
          </li>
          <li>
            <LandingSectionNavLink to="/shadow" id="stack">
              How it works
            </LandingSectionNavLink>
          </li>
          <li>
            <LandingSectionNavLink to="/shadow" id="faq">
              FAQ
            </LandingSectionNavLink>
          </li>
        </ul>
        <button
          type="button"
          className={`btn btn-primary nav-cta ${ctaShown ? "is-revealed" : ""}`}
          aria-hidden={!ctaShown}
          tabIndex={ctaShown ? undefined : -1}
          onClick={() => openDemo("download")}
        >
          See my Shadow AI
        </button>
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}

function DemoNav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { scrolled, menuOpen, setMenuOpen, closeMenu, theme, toggleTheme } = useNavChrome();
  const [ctaShown, setCtaShown] = useState(false);
  useEffect(() => {
    const update = () => {
      const hero = document.getElementById("hero");
      setCtaShown(!!hero && hero.getBoundingClientRect().top < -window.innerHeight * 0.55);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" aria-label="Blindsight home" onClick={closeMenu}>
        <img src={logo} alt="Blindsight" className="nav-logo" />
      </Link>
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <LandingSectionNavLink to="/demo" id="hero" onClick={closeMenu}>
          Free trial
        </LandingSectionNavLink>
        <LandingSectionNavLink to="/demo" id="how" onClick={closeMenu}>
          How it works
        </LandingSectionNavLink>
        <LandingSectionNavLink to="/demo" id="faq" onClick={closeMenu}>
          FAQ
        </LandingSectionNavLink>
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openDemo("trial");
          }}
        >
          Start your free trial
        </button>
      </div>
      <div className="nav-right">
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </button>
        <ul className="nav-links">
          <li>
            <LandingSectionNavLink to="/demo" id="hero">
              Free trial
            </LandingSectionNavLink>
          </li>
          <li>
            <LandingSectionNavLink to="/demo" id="how">
              How it works
            </LandingSectionNavLink>
          </li>
          <li>
            <LandingSectionNavLink to="/demo" id="faq">
              FAQ
            </LandingSectionNavLink>
          </li>
        </ul>
        <button
          type="button"
          className={`btn btn-primary nav-cta ${ctaShown ? "is-revealed" : ""}`}
          aria-hidden={!ctaShown}
          tabIndex={ctaShown ? undefined : -1}
          onClick={() => openDemo("trial")}
        >
          Start your free trial
        </button>
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}

function NavSwitch() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/shadow") return <ShadowNav />;
  if (pathname === "/demo") return <DemoNav />;
  return <Nav />;
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-copy">© 2026 Blindsight Technologies AG · Zurich, CH</div>
        <div className="footer-links">
          <Link to="/contact">Contact</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/imprint">Imprint</Link>
          <Link to="/privacy">Privacy Notice</Link>
          <a href="mailto:info@blindsight.io">info@blindsight.io</a>
        </div>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <DemoModalProvider>
        <NavSwitch />
        <Outlet />
        <Footer />
      </DemoModalProvider>
    </QueryClientProvider>
  );
}
