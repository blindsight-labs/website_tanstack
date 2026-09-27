import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import type { ReactNode } from "react";

import { DemoModalProvider } from "@/components/DemoModal";
import { Footer } from "@/site/Footer";
import { Nav } from "@/site/Nav";
import { MetalDefs } from "@/site/shared";
import { SitePage } from "@/site/pages/registry";
import { styles as stylesB } from "@/site/pages/b";
import {
  SiteThemeProvider,
  THEME_BODY_CSS,
  THEME_INIT_SCRIPT,
  THEME_WRAPPER_SCRIPT,
  useSiteTheme,
} from "@/site/theme";
import { SITE_VARIANT } from "@/site/variant";

import appCss from "../styles.css?url";
import systemCss from "@/site/system.css?url";
import heroCss from "@/site/hero.css?url";
import topCss from "@/site/top.css?url";
import sequenceCss from "@/site/sequence.css?url";
import midCss from "@/site/mid.css?url";
import bottomCss from "@/site/bottom.css?url";
import deployCss from "@/site/deploy.css?url";
import dotsCss from "@/site/dots.css?url";
import seqShellCss from "@/site/seq/shell.css?url";
import seqLeftCss from "@/site/seq/left.css?url";
import chromeCss from "@/site/chrome.css?url";
import legacyCss from "@/site/legacy.css?url";

/* The site's design system, in cascade order (as the landing was built), then the chrome and
   legacy-page layers, then each page version's own stylesheets. styles.css stays first: the
   legacy pages still use it. */
const SITE_CSS = [
  systemCss,
  heroCss,
  topCss,
  sequenceCss,
  midCss,
  bottomCss,
  deployCss,
  dotsCss,
  seqShellCss,
  seqLeftCss,
  chromeCss,
  legacyCss,
  ...stylesB,
];

/** Design mockups (/mockups, /mockup-*) bring their own nav, footer and design system. */
const isMockupPath = (pathname: string) => pathname.startsWith("/mockup");

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ matches }) => {
    const mockup = matches.some((m) => isMockupPath(m.pathname));
    return {
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
        ...(mockup ? [] : SITE_CSS.map((href) => ({ rel: "stylesheet", href }))),
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
      data-type="plex"
      data-site-variant={SITE_VARIANT}
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
      <Footer theme={theme} />
    </DemoModalProvider>
  );
}

/** A root-level error replaces RootComponent, so it brings its own frame (no nav/footer). */
function RootError({ error, reset }: ErrorComponentProps) {
  return (
    <SiteFrame>
      <SitePage name="error" error={error} reset={reset} />
    </SiteFrame>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (isMockupPath(pathname)) {
    return (
      <QueryClientProvider client={queryClient}>
        <DemoModalProvider>
          <Outlet />
        </DemoModalProvider>
      </QueryClientProvider>
    );
  }
  return (
    <QueryClientProvider client={queryClient}>
      <SiteFrame>
        <SiteChrome />
      </SiteFrame>
    </QueryClientProvider>
  );
}
