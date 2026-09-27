import { createFileRoute, notFound } from "@tanstack/react-router";

import { getAuthor } from "@/lib/authors";
import { SitePage, preloadPage } from "@/site/pages/registry";

const BASE = "https://blindsight.io";

export const Route = createFileRoute("/authors/$slug")({
  component: AuthorRoute,
  loader: ({ params }) => {
    if (!getAuthor(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async ({ params }) => {
    await preloadPage("author");
    const author = getAuthor(params.slug);
    if (!author) return {};
    const url = `${BASE}/authors/${author.slug}`;
    const title = `${author.name} · Blindsight`;

    return {
      meta: [
        { title },
        { name: "description", content: author.bio },
        { property: "og:title", content: title },
        { property: "og:description", content: author.bio },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: author.name,
            url,
            ...(author.role ? { jobTitle: author.role } : {}),
            description: author.bio,
            worksFor: { "@type": "Organization", name: "Blindsight" },
            ...(author.sameAs ? { sameAs: author.sameAs } : {}),
          }),
        },
      ],
    };
  },
});

function AuthorRoute() {
  const { slug } = Route.useLoaderData();
  return <SitePage name="author" slug={slug} />;
}
