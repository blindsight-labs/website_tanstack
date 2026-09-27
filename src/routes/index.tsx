import { createFileRoute } from "@tanstack/react-router";

import { Home } from "@/site/Home";
import { hero } from "@/site/content";
import { loadOffice } from "@/site/three/load";

const TITLE = `Blindsight · ${hero.headline}`;

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
      links: [{ rel: "canonical", href: "https://blindsight.io/" }],
    };
  },
});
