import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/blog/")({
  component: () => <SitePage name="blogIndex" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("blogIndex");
    return {
      meta: [
        { title: "AI Security Research & Insights | Blindsight Blog" },
        {
          name: "description",
          content:
            "Research notes, attack walkthroughs, and field reports on LLM security, AI threat detection, prompt injection, jailbreaks, and back-doors from the Blindsight team.",
        },
        { property: "og:title", content: "AI Security Research & Insights" },
        {
          property: "og:description",
          content: "Research notes and field reports on LLM security and AI threat detection.",
        },
        { property: "og:url", content: "https://blindsight.io/blog" },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/blog" }],
    };
  },
});
