import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import { DemoModalProvider } from "@/components/DemoModal";
import { Footer } from "@/site/Footer";
import { Nav } from "@/site/Nav";
import { MetalDefs } from "@/site/shared";
import { SitePage } from "@/site/pages/registry";
import {
  SiteThemeProvider,
  THEME_BODY_CSS,
  THEME_INIT_SCRIPT,
  THEME_WRAPPER_SCRIPT,
  useSiteTheme,
} from "@/site/theme";
import { consentHeadScripts, loadCookiebot, trackPageView } from "@/lib/consent";
import { watchOverflow } from "@/lib/overflow-watch";

import appCss from "../styles.css?url";
// The site's design system in one stylesheet (see site/site.css for the cascade order).
// styles.css stays first (the design-token layer).
import siteCss from "@/site/site.css?url";

export const Route = createRootRoute({
  head: () => {
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
        { title: "Blindsight · Securing AI" },
        {
          name: "description",
          content:
            "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
        },
        { property: "og:title", content: "Blindsight · Securing AI" },
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
        { property: "og:image:alt", content: "Blindsight · Securing AI" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Blindsight · Securing AI" },
        {
          name: "twitter:description",
          content:
            "Blindsight provides trust to AI Systems, securing its runtime, data and providing visibility - all in one consolidated platform.",
        },
        { name: "twitter:image", content: "https://blindsight.io/og-image.png" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        // .ico first for crawlers and legacy clients; SVG (flips white in dark UIs) wins where supported.
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        // includes the self-hosted fonts: no request to Google Fonts (privacy notice)
        { rel: "stylesheet", href: siteCss },
      ],
      scripts: [
        // Cookiebot + the analytics it gates (GA4 loads only after statistics consent).
        ...consentHeadScripts(),
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
              "Runtime security for AI. Blindsight provides real-time visibility and threat protection for every AI prompt, response, and tool call, for security and compliance teams deploying AI in regulated environments.",
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
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <SitePage name="notFound" />,
  errorComponent: RootError,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    // THEME_INIT_SCRIPT sets data-theme before hydration, so the attribute differs by design.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <style dangerouslySetInnerHTML={{ __html: THEME_BODY_CSS }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** The design-system wrapper every site page renders in. THEME_WRAPPER_SCRIPT copies the
 *  pre-hydration theme onto it before paint (hence suppressHydrationWarning). */
function SiteWrapper({ children }: { children: ReactNode }) {
  const { theme } = useSiteTheme();
  return (
    <div
      className="mD bs-site"
      data-theme={theme}
      data-site-variant="b"
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_WRAPPER_SCRIPT }} />
      <MetalDefs />
      {children}
    </div>
  );
}

function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <SiteThemeProvider>
      <SiteWrapper>{children}</SiteWrapper>
    </SiteThemeProvider>
  );
}

function SiteChrome() {
  const { theme } = useSiteTheme();
  return (
    <DemoModalProvider>
      <Nav theme={theme} />
      <Outlet />
      <Footer />
    </DemoModalProvider>
  );
}

/** Router errors are typed `unknown` (anything can be thrown): the error page needs an Error. */
const toError = (e: unknown): Error => (e instanceof Error ? e : new Error(String(e)));

/** A root-level error replaces RootComponent, so it brings its own frame (no nav/footer). */
function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <SiteFrame>
      <SitePage name="error" error={toError(error)} reset={reset} />
    </SiteFrame>
  );
}

/** GA4 page views for client-side navigations (the initial load is counted by gtag's config). */
function usePageViews(pathname: string) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // after the new route's head() has set the title
    const t = setTimeout(() => trackPageView(pathname), 0);
    return () => clearTimeout(t);
  }, [pathname]);
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  usePageViews(pathname);
  useEffect(loadCookiebot, []);
  useEffect(() => (import.meta.env.DEV ? watchOverflow() : undefined), [pathname]);
  return (
    <SiteFrame>
      <SiteChrome />
    </SiteFrame>
  );
}
