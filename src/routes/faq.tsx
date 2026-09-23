import { createFileRoute } from "@tanstack/react-router";

import { FaqSection } from "@/components/FaqSection";
import { faqSchemaEntities } from "@/lib/faq-content";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
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
  }),
});

function FaqPage() {
  return (
    <main>
      <FaqSection page />
    </main>
  );
}
