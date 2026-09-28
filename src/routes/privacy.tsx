import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/privacy")({
  component: () => <SitePage name="privacy" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("privacy");
    return {
      meta: [
        { title: "Privacy notice · Blindsight" },
        {
          name: "description",
          content: "How Blindsight Technologies AG collects, uses, and protects your personal data.",
        },
        { property: "og:title", content: "Privacy notice · Blindsight" },
        { property: "og:url", content: "https://blindsight.io/privacy" },
        { name: "robots", content: "noindex" },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/privacy" }],
    };
  },
});
