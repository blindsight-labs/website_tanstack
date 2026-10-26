import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/site/Home";
import { hero } from "@/site/content";
import { HERO_POSTERS } from "@/site/heroPosters";
import { loadOffice } from "@/site/three/load";

const TITLE = `Blindsight · ${hero.headline}`;

// The hero poster the CSS will pick (hero.css: theme + stage ≥ 880 px, the stage being the
// viewport less 2 × 10 px sheet inset and the scrollbar; 915 assumes a 15 px classic scrollbar),
// fetched from the head instead of after the CSS and the stage lay out.
// ponytail: media can't see the stage, so some cases preload the poster the CSS won't use (one
// extra image + an unused-preload warning): a saved theme that differs from the OS one,
// 900-914 px viewports with overlay scrollbars, and notched phones in landscape (safe-area
// padding). Upgrade: cookie-backed theme on SSR.
const POSTER_PRELOADS = Object.entries(HERO_POSTERS ?? {}).map(([key, href]) => {
  const [theme, width] = key.split("-");
  return {
    rel: "preload",
    as: "image",
    type: "image/webp",
    fetchPriority: "high" as const,
    href,
    media: `(${width === "wide" ? "min-width: 915px" : "max-width: 914.98px"}) and (prefers-color-scheme: ${theme})`,
  };
});

export const Route = createFileRoute("/")({
  component: Home,
  head: () => {
    // Client: start the Hero's 3D download (three.js + the office scene) as the router starts
    // hydrating or navigating here, before React renders (Home.tsx starts it too). Vite
    // preloads the scene's chunks in parallel. (A <link rel="modulepreload"> can't be written
    // here: the hashed chunk names aren't known in source.)
    if (typeof window !== "undefined") loadOffice().catch(() => undefined);
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: hero.subline },
        { property: "og:title", content: hero.headline },
        { property: "og:description", content: hero.subline },
        { property: "og:url", content: "https://blindsight.io/" },
        { name: "twitter:title", content: hero.headline },
        { name: "twitter:description", content: hero.subline },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/" }, ...POSTER_PRELOADS],
    };
  },
});
