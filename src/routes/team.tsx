import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/team")({
  component: () => <SitePage name="team" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("team");
    return {
      meta: [
        { title: "Team · Blindsight" },
        {
          name: "description",
          content:
            "Blindsight's founders attacked AI systems professionally before building the layer that defends them, dozens of CVEs to their name.",
        },
        { property: "og:title", content: "Team · Blindsight" },
        {
          property: "og:description",
          content: "Offensive security, turned to your defense. Meet the founders behind Blindsight.",
        },
        { property: "og:url", content: "/team" },
      ],
      links: [{ rel: "canonical", href: "/team" }],
    };
  },
});
