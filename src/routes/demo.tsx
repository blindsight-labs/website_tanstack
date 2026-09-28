import { createFileRoute } from "@tanstack/react-router";

import demoPageCss from "@/components/demo-page.css?url";
import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/demo")({
  component: () => <SitePage name="demo" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry;
  // the FAQ copy is imported here too, so the legacy Demo module stays out of the main chunk)
  head: async () => {
    const [{ DEMO_FAQS }] = await Promise.all([import("@/site/pages/legacy/Demo"), preloadPage("demo")]);
    return {
      meta: [
        { title: "Free trial · Blindsight" },
        {
          name: "description",
          content:
            "Run Blindsight's Runtime Security and Shadow AI engines on your own traffic. 10,000 free tokens, no card, no procurement.",
        },
        { property: "og:title", content: "Free trial · Blindsight" },
        {
          property: "og:description",
          content:
            "Measure Blindsight on your own traffic. 10,000 free tokens, two minutes to start.",
        },
        { property: "og:url", content: "https://blindsight.io/demo" },
      ],
      links: [
        { rel: "canonical", href: "https://blindsight.io/demo" },
        { rel: "stylesheet", href: demoPageCss },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: DEMO_FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://blindsight.io/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Free trial",
                item: "https://blindsight.io/demo",
              },
            ],
          }),
        },
      ],
    };
  },
});
