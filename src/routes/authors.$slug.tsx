import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, UserRound } from "lucide-react";

import { getAuthor } from "@/lib/authors";
import { getAllPosts } from "@/lib/blog-content";

const BASE = "https://blindsight.io";

export const Route = createFileRoute("/authors/$slug")({
  component: AuthorPage,
  loader: ({ params }) => {
    if (!getAuthor(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  head: ({ params }) => {
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

function AuthorPage() {
  const { slug } = Route.useLoaderData();
  const author = getAuthor(slug);
  if (!author) return null;

  const posts = getAllPosts().filter((p) => p.author === author.name);

  return (
    <main className="legal-page">
      <div className="author-avatar" aria-hidden="true">
        <UserRound strokeWidth={1.5} />
      </div>
      <span className="tag">{author.role ?? "Author at Blindsight"}</span>
      <h1>{author.name}</h1>
      <p>{author.bio}</p>

      {posts.length > 0 && (
        <>
          <h2>Posts by {author.name}</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 12 }}>
            {posts.map((post) => (
              <li key={post.slug}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="nav-mega-card"
                  style={{ display: "block" }}
                >
                  <div className="nav-mega-card-body">
                    <div className="nav-mega-card-title">{post.title}</div>
                    <div className="nav-mega-card-cta">
                      Read post <ArrowRight size={13} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
