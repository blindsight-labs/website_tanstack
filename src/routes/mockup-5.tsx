import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MetalDefs, type Theme } from "@/components/home/shared";
import { Nav } from "@/components/home/Nav";
import { Hero } from "@/components/home/Hero";
import { ProofStrip } from "@/components/home/ProofStrip";
import { Risks } from "@/components/home/Risks";
import { Sequence } from "@/components/home/Sequence";
import { Walkthrough } from "@/components/home/Walkthrough";
import { Deployment } from "@/components/home/Deployment";
import { Discovery } from "@/components/home/Discovery";
import { Why } from "@/components/home/Why";
import { Faq } from "@/components/home/Faq";
import { FinalCta } from "@/components/home/FinalCta";
import { Footer } from "@/components/home/Footer";

import systemCss from "@/components/home/system.css?url";
import heroCss from "@/components/home/hero.css?url";
import topCss from "@/components/home/top.css?url";
import sequenceCss from "@/components/home/sequence.css?url";
import midCss from "@/components/home/mid.css?url";
import bottomCss from "@/components/home/bottom.css?url";

type Search = { theme?: Theme; type?: "plex" | "geist" };

export const Route = createFileRoute("/mockup-5")({
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
  const navigate = useNavigate({ from: "/mockup-5" });
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
