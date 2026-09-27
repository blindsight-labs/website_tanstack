import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/contact")({
  component: () => <SitePage name="contact" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("contact");
    return {
      meta: [
        { title: "Contact · Blindsight" },
        {
          name: "description",
          content:
            "Get in touch with Blindsight. Talk to the team securing production AI for regulated enterprises.",
        },
        { property: "og:title", content: "Contact · Blindsight" },
        { property: "og:description", content: "Get in touch with the Blindsight team." },
        { property: "og:url", content: "/contact" },
      ],
      links: [{ rel: "canonical", href: "/contact" }],
    };
  },
});
