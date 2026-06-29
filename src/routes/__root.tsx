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
        <Link to="/" className="btn btn-primary mt-6 inline-flex">Go home</Link>
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
        <button onClick={() => { router.invalidate(); reset(); }} className="btn btn-primary mt-6">Try again</button>
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
      { name: "description", content: "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform." },
      { property: "og:title", content: "Blindsight - Securing AI" },
      { property: "og:description", content: "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blindsight - Securing AI" },
      { name: "twitter:description", content: "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Blindsight Technologies AG",
          alternateName: "Blindsight",
          url: "https://blindsight.io",
          description: "LLM security and AI threat detection for regulated enterprises.",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Rennweg 57",
            postalCode: "8001",
            addressLocality: "Zürich",
            addressCountry: "CH",
          },
          email: "info@blindsight.io",
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
      <body>{children}<Scripts /></body>
    </html>
  );
}

function Nav() {
  const { open: openDemo } = useDemoModal();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
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
        {/* Team hidden for now — route still exists, just not surfaced in nav yet.
        <Link to="/team" onClick={closeMenu}>Team</Link> */}
        <Link to="/careers" onClick={closeMenu}>Careers</Link>
        <Link to="/blog" onClick={closeMenu}>Blog</Link>
        <Link to="/contact" onClick={closeMenu}>Contact</Link>
        <button type="button" onClick={() => { closeMenu(); openDemo(); }}>Book a Discovery Call</button>
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
          {/* Team hidden for now — route still exists, just not surfaced in nav yet.
          <li><Link to="/team">Team</Link></li> */}
          <li><Link to="/careers">Careers</Link></li>
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
                  <Link to="/blog" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                    <BookOpen className="nav-mega-icon" strokeWidth={1.6} aria-hidden="true" />
                    <span>Blog</span>
                  </Link>
                </div>
                <div className="nav-mega-col">
                  <div className="nav-mega-label">Developers</div>
                  <a href="https://docs.blindsight.io" target="_blank" rel="noopener noreferrer" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                    <Code className="nav-mega-icon" strokeWidth={1.6} aria-hidden="true" />
                    <span>Documentation</span>
                  </a>
                </div>
              </div>
              <div className="nav-mega-col nav-mega-col-wide">
                <div className="nav-mega-label">AI Security Guides</div>
                <Link to="/blog/$slug" params={{ slug: "security-in-ai-introduction" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">Security in AI: An Introduction</div>
                    <div className="nav-mega-card-cta">Read primer <ArrowRight size={13} aria-hidden="true" /></div>
                  </div>
                </Link>
                <Link to="/blog/$slug" params={{ slug: "ai-threat-detection" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">AI Threat Detection - Runtime Defense for Enterprise AI</div>
                    <div className="nav-mega-card-cta">Read guide <ArrowRight size={13} aria-hidden="true" /></div>
                  </div>
                </Link>
                <Link to="/blog/$slug" params={{ slug: "how-to-secure-llms" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">How to Secure LLMs: A Step-by-Step Playbook</div>
                    <div className="nav-mega-card-cta">Read guide <ArrowRight size={13} aria-hidden="true" /></div>
                  </div>
                </Link>
              </div>
            </div>
          </li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
        <button type="button" className="btn btn-primary nav-cta" onClick={openDemo}>Book a Discovery Call</button>
        <button className={`nav-hamburger ${menuOpen ? "open" : ""}`} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(o => !o)}>
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-copy">© 2026 Blindsight AG · Zurich, CH</div>
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
          <Nav />
          <Outlet />
          <Footer />
        </InActionModalProvider>
      </DemoModalProvider>
    </QueryClientProvider>
  );
}
