import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import logo from "@/assets/logo.png";

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
      { title: "Blindsight — Securing AI" },
      { name: "description", content: "Blindsight secures the full AI pipeline — runtime, data, and governance — in one consolidated platform built for regulated enterprises." },
      { property: "og:title", content: "Blindsight — Securing AI" },
      { property: "og:description", content: "Blindsight secures the full AI pipeline — runtime, data, and governance — in one consolidated platform built for regulated enterprises." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blindsight — Securing AI" },
      { name: "twitter:description", content: "Blindsight secures the full AI pipeline — runtime, data, and governance — in one consolidated platform built for regulated enterprises." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ac5ca3b-716d-4145-8bec-945f74a30331/id-preview-eb4bdc24--477d3286-0bec-4401-a399-a2b9206aff6e.lovable.app-1779323069910.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/0ac5ca3b-716d-4145-8bec-945f74a30331/id-preview-eb4bdc24--477d3286-0bec-4401-a399-a2b9206aff6e.lovable.app-1779323069910.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Blindsight Technologies AG",
          alternateName: "Blindsight",
          url: "https://ai-trust-test-1337.lovable.app",
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

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <Link to="/" aria-label="Blindsight home">
        <img src={logo} alt="Blindsight" className="nav-logo" />
      </Link>
      <div className="nav-right">
        <ul className="nav-links">
          <li><Link to="/">Solution</Link></li>
          <li><Link to="/in-action">In Action</Link></li>
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
              <span className="nav-caret" aria-hidden="true">▾</span>
            </button>
            <div className={`nav-mega ${resourcesOpen ? "open" : ""}`} role="menu">
              <div className="nav-mega-col">
                <div className="nav-mega-label">Resources</div>
                <Link to="/blog" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                  <svg className="nav-mega-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5h12a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3V5Z"/><path d="M4 5v11a3 3 0 0 0 3 3"/><path d="M9 9h7M9 13h7"/></svg>
                  <span>Blog</span>
                </Link>
                <Link to="/in-action" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                  <svg className="nav-mega-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>
                  <span>Live Demo</span>
                </Link>
                <Link to="/contact" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                  <svg className="nav-mega-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>
                  <span>Contact</span>
                </Link>
              </div>
              <div className="nav-mega-col">
                <div className="nav-mega-label">Developers</div>
                <a href="https://docs.blindsight.io" target="_blank" rel="noopener noreferrer" className="nav-mega-item" onClick={() => setResourcesOpen(false)}>
                  <svg className="nav-mega-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 6 3 12l5 6"/><path d="m16 6 5 6-5 6"/><path d="m14 4-4 16"/></svg>
                  <span>Documentation</span>
                </a>
              </div>
              <div className="nav-mega-col nav-mega-col-wide">
                <div className="nav-mega-label">AI Security Guides</div>
                <Link to="/blog/$slug" params={{ slug: "security-in-ai-introduction" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">Security in AI: An Introduction</div>
                    <div className="nav-mega-card-cta">Read primer <span aria-hidden="true">→</span></div>
                  </div>
                </Link>
                <Link to="/blog/$slug" params={{ slug: "ai-threat-detection" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">AI Threat Detection - Runtime Defense for Enterprise AI</div>
                    <div className="nav-mega-card-cta">Read guide <span aria-hidden="true">→</span></div>
                  </div>
                </Link>
                <Link to="/blog/$slug" params={{ slug: "how-to-secure-llms" }} className="nav-mega-card" onClick={() => setResourcesOpen(false)}>
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">How to Secure LLMs: A Step-by-Step Playbook</div>
                    <div className="nav-mega-card-cta">Read guide <span aria-hidden="true">→</span></div>
                  </div>
                </Link>
              </div>
            </div>
          </li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
        <Link to="/demo" className="btn btn-violet">Request a Demo</Link>
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
      <Nav />
      <Outlet />
      <Footer />
    </QueryClientProvider>
  );
}
