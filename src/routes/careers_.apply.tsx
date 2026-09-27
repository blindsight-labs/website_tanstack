import { createFileRoute } from "@tanstack/react-router";

import { SitePage, preloadPage } from "@/site/pages/registry";

/** `?role=`: a trimmed string of 1–160 characters, else dropped. (Hand-written rather than a
 *  zod schema: route options live in the main chunk, and this keeps zod out of it.) */
function validateSearch(search: Record<string, unknown>): { role?: string } {
  const role = typeof search.role === "string" ? search.role.trim() : "";
  return { role: role.length >= 1 && role.length <= 160 ? role : undefined };
}

export const Route = createFileRoute("/careers_/apply")({
  validateSearch,
  component: () => <SitePage name="careersApply" />,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("careersApply");
    return {
      meta: [
        { title: "Apply · Blindsight Careers" },
        {
          name: "description",
          content: "Apply to join Blindsight. Send us your CV and we'll be in touch.",
        },
      ],
      links: [{ rel: "canonical", href: "/careers/apply" }],
    };
  },
});
