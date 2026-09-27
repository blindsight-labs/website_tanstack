import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { MetalDefs, type Theme } from "@/mockups/7/shared";
import { Nav } from "@/mockups/7/Nav";
import { Hero } from "@/mockups/7/Hero";
import { ProofStrip } from "@/mockups/7/ProofStrip";
import { Risks } from "@/mockups/7/Risks";
import { Sequence, VARIANTS, type Variant } from "@/mockups/8/Sequence";
import { Walkthrough } from "@/mockups/7/Walkthrough";
import { Deployment } from "@/mockups/7/Deployment";
import { FinalCta } from "@/mockups/7/FinalCta";
import { Footer } from "@/mockups/7/Footer";

import systemCss from "@/mockups/7/system.css?url";
import heroCss from "@/mockups/7/hero.css?url";
import topCss from "@/mockups/7/top.css?url";
import sequenceCss from "@/mockups/7/sequence.css?url";
import midCss from "@/mockups/7/mid.css?url";
import bottomCss from "@/mockups/7/bottom.css?url";
import deployCss from "@/mockups/7/deploy.css?url";
import dotsCss from "@/mockups/7/dots.css?url";
import shellCss from "@/mockups/8/shell.css?url";
import leftACss from "@/mockups/8/a/left.css?url";
import leftBCss from "@/mockups/8/b/left.css?url";
import leftCCss from "@/mockups/8/c/left.css?url";
import leftDCss from "@/mockups/8/d/left.css?url";

type Search = { theme?: Theme; type?: "plex" | "geist"; s?: Variant; left?: Variant; anim?: Variant };
const asVariant = (x: unknown): Variant | undefined => (VARIANTS as unknown[]).includes(x) ? (x as Variant) : undefined;

export const Route = createFileRoute("/mockup-8")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    theme: s.theme === "dark" ? "dark" : undefined,
    type: s.type === "geist" ? "geist" : undefined,
    s: asVariant(s.s),
    left: asVariant(s.left),
    anim: asVariant(s.anim),
  }),
  component: MockupH,
  head: () => ({
    meta: [{ title: "Mockup 8 · Blindsight" }, { name: "robots", content: "noindex, nofollow" }],
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
      { rel: "stylesheet", href: deployCss },
      { rel: "stylesheet", href: dotsCss },
      { rel: "stylesheet", href: shellCss },
      { rel: "stylesheet", href: leftACss },
      { rel: "stylesheet", href: leftBCss },
      { rel: "stylesheet", href: leftCCss },
      { rel: "stylesheet", href: leftDCss },
    ],
  }),
});

function MockupH() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/mockup-8" });
  const theme: Theme = search.theme ?? "light";
  const type = search.type ?? "plex";
  // the section variant: ?s= picks both halves; ?left= / ?anim= override one
  const v = search.s ?? "a";
  const left = search.left ?? v;
  const anim = search.anim ?? v;

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
        <Sequence theme={theme} left={left} anim={anim} />
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
        {VARIANTS.map((x) => (
          <button
            key={x}
            type="button"
            aria-pressed={left === x && anim === x}
            onClick={() => navigate({ search: (s: Search) => ({ ...s, s: x === "a" ? undefined : x, left: undefined, anim: undefined }) })}
          >
            {x}
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
