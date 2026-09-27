/* LEGACY /blog/$slug page body (the pre-redesign page, unchanged). Rendered when the active
   page version does not provide `blogPost`. An unknown slug renders PostNotFound (the route's
   not-found state renders this page with the unknown slug). BlogPostError stays the route's
   errorComponent. */
import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authorSlugFor } from "@/lib/authors";
import { getAllPosts, getPost } from "@/lib/blog-content";
import type { BlogPostProps } from "../types";

export function PostNotFound() {
  return (
    <main>
      <section className="section">
        <div className="section-inner reveal" style={{ maxWidth: 720 }}>
          <span className="tag">404</span>
          <h1>Post not found.</h1>
          <p className="lede">That entry doesn't exist — yet.</p>
          <Link to="/blog" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to blog
          </Link>
        </div>
      </section>
    </main>
  );
}

export function BlogPostError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main>
      <section className="section">
        <div className="section-inner reveal" style={{ maxWidth: 720 }}>
          <span className="tag">Error</span>
          <h1>Couldn't load this post.</h1>
          <p className="lede">{error.message}</p>
          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                router.invalidate();
                reset();
              }}
            >
              Try again
            </button>
            <Link to="/blog" className="btn btn-secondary">
              <ArrowLeft size={16} aria-hidden="true" />
              Back to blog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export function BlogPostPage({ slug }: BlogPostProps) {
  const post = getPost(slug);
  if (!post) return <PostNotFound />;

  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === post.slug);
  const next = all[idx + 1] ?? all[0];

  return (
    <main>
      <article className="post-article">
        <header className="post-article-head reveal">
          <Link to="/blog" className="post-back">
            <ArrowLeft size={14} aria-hidden="true" />
            All posts
          </Link>
          <span className="post-cat">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="lede">{post.excerpt}</p>
          <div className="post-meta">
            <span>{post.dateLabel}</span>
            <span>{post.read}</span>
            {authorSlugFor(post.author) ? (
              <Link to="/authors/$slug" params={{ slug: authorSlugFor(post.author)! }}>
                {post.author}
              </Link>
            ) : (
              <span>{post.author}</span>
            )}
          </div>
        </header>

        <div className="post-body reveal">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
        </div>

        {post.references && post.references.length > 0 && (
          <section className="post-refs reveal">
            <h2>References</h2>
            <ul>
              {post.references.map((r) => (
                <li key={r.label}>
                  {r.href ? (
                    <a href={r.href} target="_blank" rel="noreferrer noopener">
                      {r.label}
                    </a>
                  ) : (
                    r.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {next && next.slug !== post.slug && (
          <nav className="post-next reveal">
            <Link to="/blog/$slug" params={{ slug: next.slug }} className="post-card">
              <div className="post-cat">Next up</div>
              <h3 className="post-title">{next.title}</h3>
              <p className="post-excerpt">{next.excerpt}</p>
            </Link>
          </nav>
        )}
      </article>
    </main>
  );
}
