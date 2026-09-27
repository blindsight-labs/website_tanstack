import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/imprint")({
  component: () => <SitePage name="imprint" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("imprint");
    return {
      meta: [
        { title: "Imprint · Blindsight" },
        {
          name: "description",
          content:
            "Legal information for Blindsight Technologies AG, registered in Zurich, Switzerland.",
        },
        { property: "og:title", content: "Imprint · Blindsight" },
        { property: "og:url", content: "/imprint" },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: "/imprint" }],
    };
  },
});
