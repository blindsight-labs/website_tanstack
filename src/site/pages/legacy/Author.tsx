/* LEGACY /authors/$slug page body (the pre-redesign page, unchanged). Rendered when the
   active page version does not provide `author`. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, UserRound } from "lucide-react";

import { getAuthor } from "@/lib/authors";
import { getAllPosts } from "@/lib/blog-content";
import type { AuthorProps } from "../types";

export function AuthorPage({ slug }: AuthorProps) {
  const author = getAuthor(slug);
  if (!author) return null;

  const posts = getAllPosts().filter((p) => p.author === author.name);

  return (
    <main className="legal-page">
      <div className="author-avatar" aria-hidden="true">
        <UserRound strokeWidth={1.6} />
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
