import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/faq")({
  component: () => <SitePage name="faq" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry;
  // the FAQ copy is imported here too, so it stays out of the main chunk)
  head: async () => {
    const [{ faqSchemaEntities }] = await Promise.all([import("@/lib/faq-content"), preloadPage("faq")]);
    return {
      meta: [
        { title: "FAQ · Blindsight" },
        {
          name: "description",
          content:
            "Answers on AI security: shadow AI, prompt injection, data poisoning, data leaks, adversarial ML, agentic security, governance and compliance.",
        },
        { property: "og:title", content: "FAQ · Blindsight" },
        { property: "og:description", content: "Questions about securing AI, answered." },
        { property: "og:url", content: "https://blindsight.io/faq" },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/faq" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqSchemaEntities(),
          }),
        },
      ],
    };
  },
});
