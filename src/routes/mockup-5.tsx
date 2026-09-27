import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MetalDefs, type Theme } from "@/mockups/5/shared";
import { Nav } from "@/mockups/5/Nav";
import { HERO_VARIANTS, Hero, type HeroVariant } from "@/mockups/5/Hero";
import { ProofStrip } from "@/mockups/5/ProofStrip";
import { Risks } from "@/mockups/5/Risks";
import { SEQ_VARIANTS, Sequence, type SeqVariant } from "@/mockups/5/Sequence";
import { Walkthrough } from "@/mockups/5/Walkthrough";
import { Deployment } from "@/mockups/5/Deployment";
// Discovery, Why and Faq stay in src/mockups/8 for their own pages later; off the front page
import { FinalCta } from "@/mockups/5/FinalCta";
import { Footer } from "@/mockups/5/Footer";

import systemCss from "@/mockups/5/system.css?url";
import heroCss from "@/mockups/5/hero.css?url";
import topCss from "@/mockups/5/top.css?url";
import sequenceCss from "@/mockups/5/sequence.css?url";
import midCss from "@/mockups/5/mid.css?url";
import bottomCss from "@/mockups/5/bottom.css?url";

type Search = { theme?: Theme; type?: "plex" | "geist"; v?: HeroVariant; s?: SeqVariant };

export const Route = createFileRoute("/mockup-5")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    theme: s.theme === "dark" ? "dark" : undefined,
    type: s.type === "geist" ? "geist" : undefined,
    v: HERO_VARIANTS.find((v) => v === s.v && v !== "a"),
    s: SEQ_VARIANTS.find((v) => v === s.s && v !== "a"),
  }),
  component: MockupD,
  head: () => ({
    meta: [{ title: "Mockup 5 · Blindsight" }, { name: "robots", content: "noindex, nofollow" }],
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
  const variant: HeroVariant = search.v ?? "a";

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
        <Hero theme={theme} variant={variant} />
        <ProofStrip theme={theme} />
        <Risks theme={theme} />
        <Sequence theme={theme} scan={search.s ?? "a"} />
        <Walkthrough theme={theme} />
        <Deployment theme={theme} />
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
        {HERO_VARIANTS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={variant === v}
            onClick={() => navigate({ search: (s: Search) => ({ ...s, v: v === "a" ? undefined : v }) })}
          >
            {v}
          </button>
        ))}
        {SEQ_VARIANTS.map((v) => (
          <button
            key={`s${v}`}
            type="button"
            title="See / Secure / Govern section version"
            aria-pressed={(search.s ?? "a") === v}
            onClick={() => navigate({ search: (s: Search) => ({ ...s, s: v === "a" ? undefined : v }) })}
          >
            {`s·${v}`}
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
