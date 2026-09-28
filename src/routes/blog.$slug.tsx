import { createFileRoute, notFound, useParams } from "@tanstack/react-router";
import { authorSlugFor } from "@/lib/authors";
import { LegacyFrame, SitePage, preloadPage } from "@/site/pages/registry";
import { BlogPostError } from "@/site/pages/legacy/BlogPost";

const BASE = "https://blindsight.io";

/** The posts (markdown + its YAML parser) load with this route, not in the main chunk. */
const loadPosts = () => import("@/lib/blog-content");

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostRoute,
  loader: async ({ params }) => {
    const [{ getPost }] = await Promise.all([loadPosts(), preloadPage("blogPost")]);
    if (!getPost(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  errorComponent: (props) => (
    <LegacyFrame>
      <BlogPostError
        error={props.error instanceof Error ? props.error : new Error(String(props.error))}
        reset={props.reset}
      />
    </LegacyFrame>
  ),
  // The post page renders its own "post not found" state for an unknown slug.
  notFoundComponent: BlogPostNotFound,
  // (also awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async ({ params, loaderData }) => {
    const [{ getPost }] = await Promise.all([loadPosts(), preloadPage("blogPost")]);
    const post = getPost(loaderData?.slug ?? params.slug);
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
  const { slug } = Route.useLoaderData();
  return <SitePage name="blogPost" slug={slug} />;
}

function BlogPostNotFound() {
  const { slug } = useParams({ strict: false });
  return <SitePage name="blogPost" slug={slug ?? ""} />;
}
