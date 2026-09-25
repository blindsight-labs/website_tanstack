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

import { Menu, Moon, Sun, X } from "lucide-react";

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
import { Nav } from "@/components/home/Nav";
import { Footer } from "@/components/home/Footer";
import homeSystemCss from "@/components/home/system.css?url";
import homeTopCss from "@/components/home/top.css?url";
import homeBottomCss from "@/components/home/bottom.css?url";

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
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
      },
      // site-wide nav + footer (and the home page) use the home design system
      { rel: "stylesheet", href: homeSystemCss },
      { rel: "stylesheet", href: homeTopCss },
      { rel: "stylesheet", href: homeBottomCss },
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
  return <Nav theme="light" />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Design mockups (/mockups, /mockup-*) bring their own nav and footer.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMockup = pathname.startsWith("/mockup");
  return (
    <QueryClientProvider client={queryClient}>
      <DemoModalProvider>
        {!isMockup && <NavSwitch />}
        <Outlet />
        {!isMockup && <Footer theme="light" />}
      </DemoModalProvider>
    </QueryClientProvider>
  );
}
