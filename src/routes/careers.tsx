import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/careers")({
  component: () => <SitePage name="careers" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("careers");
    return {
      meta: [
        { title: "Careers · Blindsight" },
        {
          name: "description",
          content:
            "Join Blindsight. We're hiring engineers, researchers, and operators to secure the next generation of AI systems.",
        },
        { property: "og:title", content: "Careers · Blindsight" },
        { property: "og:description", content: "Help us secure the next generation of AI systems." },
        { property: "og:url", content: "/careers" },
      ],
      links: [{ rel: "canonical", href: "/careers" }],
    };
  },
});
