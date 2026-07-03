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

import { ArrowRight, BookOpen, ChevronDown, Code, Menu, Moon, Sun, X } from "lucide-react";

/* Nav/footer link targeting an on-page section of /shadow. Scrolls in-page
   when already on /shadow; navigates there with a hash from any other route. */
function ShadowSectionNavLink({
  id,
  children,
  onClick,
}: {
  id: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Link
      to="/shadow"
      hash={id}
      onClick={(e) => {
        if (pathname === "/shadow") {
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
import { InActionModalProvider } from "@/components/InActionModal";
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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blindsight - Securing AI" },
      {
        name: "twitter:description",
        content:
          "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
      },
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
    <html lang="en">
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

function Nav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The CTA mirrors the hero's primary button: it stays collapsed while the
  // hero CTA (`#hero-cta`) is on screen and reveals once it scrolls out of
  // view. On pages without a hero CTA it is simply always shown.
  const [ctaShown, setCtaShown] = useState(false);
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
  // Reveal the nav CTA once the hero's primary CTA leaves the viewport. Re-runs
  // on navigation so it re-attaches to the current page's hero (or, when there
  // is none, leaves the CTA permanently shown).
  useEffect(() => {
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;

    const attach = (heroCta: Element) => {
      setCtaShown(false);
      io = new IntersectionObserver(([entry]) => setCtaShown(!entry.isIntersecting), {
        threshold: 0,
      });
      io.observe(heroCta);
    };

    const heroCta = document.getElementById("hero-cta");
    if (heroCta) {
      attach(heroCta);
    } else {
      // The target route's code-split chunk may still be loading, so its hero
      // (and #hero-cta) isn't in the DOM yet even though `pathname` already
      // points there. Default to shown, but keep watching — if the hero mounts
      // a beat later, this effect won't re-run (pathname is unchanged), so
      // without this the CTA would get stuck visible over the hero forever.
      setCtaShown(true);
      mo = new MutationObserver(() => {
        const el = document.getElementById("hero-cta");
        if (el) {
          mo?.disconnect();
          mo = null;
          attach(el);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      io?.disconnect();
      mo?.disconnect();
    };
  }, [pathname]);
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
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
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        {/* Team hidden again until real names/bios/photos replace the card placeholders.
        <Link to="/team" onClick={closeMenu}>Team</Link> */}
        <Link to="/careers" onClick={closeMenu}>
          Careers
        </Link>
        <Link to="/blog" onClick={closeMenu}>
          Blog
        </Link>
        <Link to="/contact" onClick={closeMenu}>
          Contact
        </Link>
        <button
          type="button"
          onClick={() => {
            closeMenu();
            openDemo("demo");
          }}
        >
          Secure your AI
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
          {/* Team hidden again until real names/bios/photos replace the card placeholders.
          <li><Link to="/team">Team</Link></li> */}
          <li>
            <Link to="/careers">Careers</Link>
          </li>
          <li
            className="nav-dropdown"
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              type="button"
              className="nav-dropdown-trigger"
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
              onClick={() => setResourcesOpen((o) => !o)}
            >
              Resources
              <ChevronDown className="nav-caret" size={14} aria-hidden="true" />
            </button>
            <div className={`nav-mega ${resourcesOpen ? "open" : ""}`} role="menu">
              <div className="nav-mega-stack">
                <div className="nav-mega-col">
                  <div className="nav-mega-label">Resources</div>
                  <Link
                    to="/blog"
                    className="nav-mega-item"
                    onClick={() => setResourcesOpen(false)}
                  >
                    <BookOpen className="nav-mega-icon" strokeWidth={1.6} aria-hidden="true" />
                    <span>Blog</span>
                  </Link>
                </div>
                <div className="nav-mega-col">
                  <div className="nav-mega-label">Developers</div>
                  <a
                    href="https://docs.blindsight.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-mega-item"
                    onClick={() => setResourcesOpen(false)}
                  >
                    <Code className="nav-mega-icon" strokeWidth={1.6} aria-hidden="true" />
                    <span>Documentation</span>
                  </a>
                </div>
              </div>
              <div className="nav-mega-col nav-mega-col-wide">
                <div className="nav-mega-label">AI Security Guides</div>
                <Link
                  to="/blog/$slug"
                  params={{ slug: "security-in-ai-introduction" }}
                  className="nav-mega-card"
                  onClick={() => setResourcesOpen(false)}
                >
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">Security in AI: An Introduction</div>
                    <div className="nav-mega-card-cta">
                      Read primer <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
                <Link
                  to="/blog/$slug"
                  params={{ slug: "ai-threat-detection" }}
                  className="nav-mega-card"
                  onClick={() => setResourcesOpen(false)}
                >
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">
                      AI Threat Detection - Runtime Defense for Enterprise AI
                    </div>
                    <div className="nav-mega-card-cta">
                      Read guide <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
                <Link
                  to="/blog/$slug"
                  params={{ slug: "how-to-secure-llms" }}
                  className="nav-mega-card"
                  onClick={() => setResourcesOpen(false)}
                >
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">
                      How to Secure LLMs: A Step-by-Step Playbook
                    </div>
                    <div className="nav-mega-card-cta">
                      Read guide <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </li>
          <li>
            <Link to="/contact">Contact</Link>
          </li>
        </ul>
        <button
          type="button"
          className={`btn btn-primary nav-cta ${ctaShown ? "is-revealed" : ""}`}
          aria-hidden={!ctaShown}
          tabIndex={ctaShown ? undefined : -1}
          onClick={() => openDemo("demo")}
        >
          Secure your AI
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

function ShadowNav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctaShown, setCtaShown] = useState(false);
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
        /* ignore */
      }
      return next;
    });
  };
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 40);
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
  const closeMenu = () => setMenuOpen(false);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" aria-label="Blindsight home" onClick={closeMenu}>
        <img src={logo} alt="Blindsight" className="nav-logo" />
      </Link>
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <ShadowSectionNavLink id="hero" onClick={closeMenu}>
          Top
        </ShadowSectionNavLink>
        <ShadowSectionNavLink id="stack" onClick={closeMenu}>
          How it works
        </ShadowSectionNavLink>
        <ShadowSectionNavLink id="faq" onClick={closeMenu}>
          FAQ
        </ShadowSectionNavLink>
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
            <ShadowSectionNavLink id="hero">Top</ShadowSectionNavLink>
          </li>
          <li>
            <ShadowSectionNavLink id="stack">How it works</ShadowSectionNavLink>
          </li>
          <li>
            <ShadowSectionNavLink id="faq">FAQ</ShadowSectionNavLink>
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

function NavSwitch() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return pathname === "/shadow" ? <ShadowNav /> : <Nav />;
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-copy">© 2026 Blindsight Technologies AG · Zurich, CH</div>
        <div className="footer-links">
          <Link to="/contact">Contact</Link>
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
        <InActionModalProvider>
          <NavSwitch />
          <Outlet />
          <Footer />
        </InActionModalProvider>
      </DemoModalProvider>
    </QueryClientProvider>
  );
}
