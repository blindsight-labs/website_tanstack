import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MetalDefs, type Theme } from "@/mockups/4/shared";
import { Nav } from "@/mockups/4/Nav";
import { Hero } from "@/mockups/4/Hero";
import { ProofStrip } from "@/mockups/4/ProofStrip";
import { Risks } from "@/mockups/4/Risks";
import { Sequence } from "@/mockups/4/Sequence";
import { Walkthrough } from "@/mockups/4/Walkthrough";
import { Deployment } from "@/mockups/4/Deployment";
import { Discovery } from "@/mockups/4/Discovery";
import { Why } from "@/mockups/4/Why";
import { Faq } from "@/mockups/4/Faq";
import { FinalCta } from "@/mockups/4/FinalCta";
import { Footer } from "@/mockups/4/Footer";

import systemCss from "@/mockups/4/system.css?url";
import heroCss from "@/mockups/4/hero.css?url";
import topCss from "@/mockups/4/top.css?url";
import sequenceCss from "@/mockups/4/sequence.css?url";
import midCss from "@/mockups/4/mid.css?url";
import bottomCss from "@/mockups/4/bottom.css?url";

type Search = { theme?: Theme; type?: "plex" | "geist" };

export const Route = createFileRoute("/mockup-4")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    theme: s.theme === "dark" ? "dark" : undefined,
    type: s.type === "geist" ? "geist" : undefined,
  }),
  component: MockupD,
  head: () => ({
    meta: [{ title: "Mockup D · Blindsight" }, { name: "robots", content: "noindex, nofollow" }],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap",
      },
      { rel: "stylesheet", href: systemCss },
      { rel: "stylesheet", href: heroCss },
      { rel: "stylesheet", href: topCss },
      { rel: "stylesheet", href: sequenceCss },
      { rel: "stylesheet", href: midCss },
      { rel: "stylesheet", href: bottomCss },
    ],
  }),
});

function MockupD() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/mockup-4" });
  const theme: Theme = search.theme ?? "light";
  const type = search.type ?? "plex";

  // The live site's root stylesheet paints <body>; match it to the mockup theme.
  const [bodyBg] = useState(() => (theme === "dark" ? "#060607" : "#F3F4F6"));
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = theme === "dark" ? "#060607" : bodyBg;
    return () => {
      document.body.style.background = prev;
    };
  }, [theme, bodyBg]);

  return (
    <div className="mD" data-theme={theme} data-type={type}>
      <MetalDefs />
      <Nav theme={theme} />
      <main>
        <Hero theme={theme} />
        <ProofStrip theme={theme} />
        <Risks theme={theme} />
        <Sequence theme={theme} />
        <Walkthrough theme={theme} />
        <Deployment theme={theme} />
        <Discovery theme={theme} />
        <Why theme={theme} />
        <Faq theme={theme} />
        <FinalCta theme={theme} />
      </main>
      <Footer theme={theme} />

      {/* mockup-only switches, not part of the design */}
      <div className="mD-controls" role="group" aria-label="Mockup controls">
        {(["light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={theme === t}
            onClick={() => navigate({ search: (s: Search) => ({ ...s, theme: t === "dark" ? "dark" : undefined }) })}
          >
            {t}
          </button>
        ))}
        {(["plex", "geist"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={type === f}
            onClick={() => navigate({ search: (s: Search) => ({ ...s, type: f === "geist" ? "geist" : undefined }) })}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
}
