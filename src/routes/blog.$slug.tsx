import { createFileRoute, notFound } from "@tanstack/react-router";
import { authorSlugFor } from "@/lib/authors";
import { getPostPage } from "@/lib/blog.functions";
import { SitePage, preloadPage } from "@/site/pages/registry";

const BASE = "https://blindsight.io";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostRoute,
  loader: async ({ params }) => {
    const [page] = await Promise.all([getPostPage({ data: params.slug }), preloadPage("blogPost")]);
    if (!page) throw notFound();
    return page;
  },
  staleTime: Infinity,
  errorComponent: (props) => (
    <SitePage
      name="error"
      error={props.error instanceof Error ? props.error : new Error(String(props.error))}
      reset={props.reset}
    />
  ),
  // The post page renders its own "post not found" state for an unknown slug.
  notFoundComponent: BlogPostNotFound,
  // (also awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async ({ params, loaderData }) => {
    await preloadPage("blogPost");
    const post = loaderData?.post;
    const title = post ? (post.seoTitle ?? `${post.title} · Blindsight blog`) : "Blog · Blindsight";
    const description = post
      ? (post.seoDescription ?? post.excerpt)
      : "Notes from the Blindsight team on LLM security and AI threat detection.";
    const url = `${BASE}/blog/${params.slug}`;

    const ldScripts: { type: string; children: string }[] = [];
    if (post) {
      const authorSlug = authorSlugFor(post.author);
      const author = authorSlug
        ? { "@type": "Person", name: post.author, url: `${BASE}/authors/${authorSlug}` }
        : { "@type": "Organization", name: "Blindsight" };

      ldScripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author,
          publisher: {
            "@type": "Organization",
            name: "Blindsight",
            logo: { "@type": "ImageObject", url: "https://blindsight.io/favicon.png" },
          },
          mainEntityOfPage: url,
        }),
      });
      ldScripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
            { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog` },
            { "@type": "ListItem", position: 3, name: post.title, item: url },
          ],
        }),
      });
      if (post.faq && post.faq.length > 0) {
        ldScripts.push({
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        });
      }
      if (post.howToSteps && post.howToSteps.length > 0) {
        ldScripts.push({
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: post.title,
            step: post.howToSteps.map((s) => ({
              "@type": "HowToStep",
              position: parseInt(s.n, 10),
              name: s.title,
              text: s.body,
            })),
          }),
        });
      }
    }

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: ldScripts,
    };
  },
});

function BlogPostRoute() {
  const { post, next } = Route.useLoaderData();
  return <SitePage name="blogPost" post={post} next={next} />;
}

function BlogPostNotFound() {
  return <SitePage name="blogPost" />;
}
