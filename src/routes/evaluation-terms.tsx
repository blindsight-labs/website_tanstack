import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/evaluation-terms")({
  component: () => <SitePage name="evaluationTerms" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("evaluationTerms");
    return {
      meta: [
        { title: "Evaluation terms · Blindsight" },
        {
          name: "description",
          content:
            "The terms that apply when you request a demo, a free trial or the Blindsight app.",
        },
        { property: "og:title", content: "Evaluation terms · Blindsight" },
        { property: "og:url", content: "https://blindsight.io/evaluation-terms" },
        { name: "robots", content: "noindex" },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/evaluation-terms" }],
    };
  },
});
