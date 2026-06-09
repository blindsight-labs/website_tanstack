import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllPosts, getPost } from "@/lib/blog-content";

const BASE = "https://blindsight.io";

function PostNotFound() {
  return (
    <main>
      <section className="section">
        <div className="section-inner reveal" style={{ maxWidth: 720 }}>
          <span className="tag">404</span>
          <h1>Post not found.</h1>
          <p className="lede">That entry doesn't exist — yet.</p>
          <Link to="/blog" className="btn btn-secondary"><ArrowLeft size={16} aria-hidden="true" />Back to blog</Link>
        </div>
      </section>
    </main>
  );
}

function BlogPostError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <main>
      <section className="section">
        <div className="section-inner reveal" style={{ maxWidth: 720 }}>
          <span className="tag">Error</span>
          <h1>Couldn't load this post.</h1>
          <p className="lede">{error.message}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => { router.invalidate(); reset(); }}>
              Try again
            </button>
            <Link to="/blog" className="btn btn-secondary"><ArrowLeft size={16} aria-hidden="true" />Back to blog</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostPage,
  loader: ({ params }) => {
    if (!getPost(params.slug)) throw notFound();
    return { slug: params.slug };
  },
  errorComponent: BlogPostError,
  notFoundComponent: PostNotFound,
  head: ({ params, loaderData }) => {
    const post = getPost(loaderData?.slug ?? params.slug);
    const title = post ? (post.seoTitle ?? `${post.title} | Blindsight Blog`) : "Blog | Blindsight";
    const description = post ? (post.seoDescription ?? post.excerpt) : "Notes from the Blindsight team on LLM security and AI threat detection.";
    const url = `${BASE}/blog/${params.slug}`;

    const ldScripts: { type: string; children: string }[] = [];
    if (post) {
      ldScripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: { "@type": "Organization", name: post.author },
          publisher: { "@type": "Organization", name: "Blindsight Technologies" },
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

function BlogPostPage() {
  const { slug } = Route.useLoaderData();
  const post = getPost(slug);
  if (!post) return <PostNotFound />;

  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === post.slug);
  const next = all[idx + 1] ?? all[0];

  return (
    <main>
      <article className="post-article">
        <header className="post-article-head reveal">
          <Link to="/blog" className="post-back"><ArrowLeft size={14} aria-hidden="true" />All posts</Link>
          <span className="post-cat">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="lede">{post.excerpt}</p>
          <div className="post-meta">
            <span>{post.dateLabel}</span>
            <span>{post.read}</span>
            <span>{post.author}</span>
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
                    <a href={r.href} target="_blank" rel="noreferrer noopener">{r.label}</a>
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
