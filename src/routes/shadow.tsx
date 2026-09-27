import { createFileRoute } from "@tanstack/react-router";

import shadowDemoCss from "@/components/ShadowAiDemo.css?url";
import shadowPageCss from "@/components/shadow-page.css?url";
import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/shadow")({
  component: () => <SitePage name="shadow" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry;
  // the FAQ copy is imported here too, so it stays out of the main chunk)
  head: async () => {
    const [{ faqSchemaEntities }] = await Promise.all([import("@/lib/faq-content"), preloadPage("shadow")]);
    return {
      meta: [
        { title: "Blindsight - Shadow AI Security" },
        {
          name: "description",
          content:
            "Your team is already using AI tools you never approved. Blindsight surfaces every Shadow AI interaction and secures it before sensitive data leaks.",
        },
        { property: "og:title", content: "Blindsight - Shadow AI Security" },
        {
          property: "og:description",
          content: "Surface and secure every Shadow AI interaction across your organization.",
        },
        { property: "og:url", content: "https://blindsight.io/shadow" },
      ],
      links: [
        { rel: "canonical", href: "https://blindsight.io/shadow" },
        { rel: "stylesheet", href: shadowDemoCss },
        { rel: "stylesheet", href: shadowPageCss },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqSchemaEntities("shadow-ai"),
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
                name: "Shadow AI",
                item: "https://blindsight.io/shadow",
              },
            ],
          }),
        },
      ],
    };
  },
});
