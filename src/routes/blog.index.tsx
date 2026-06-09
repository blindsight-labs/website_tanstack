import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useDemoModal } from "@/components/DemoModal";
import { getAllPosts } from "@/lib/blog-content";

export const Route = createFileRoute("/blog/")({
  component: BlogPage,
  head: () => ({
    meta: [
      { title: "AI Security Research & Insights | Blindsight Blog" },
      { name: "description", content: "Research notes, attack walkthroughs, and field reports on LLM security, AI threat detection, prompt injection, jailbreaks, and back-doors from the Blindsight team." },
      { property: "og:title", content: "AI Security Research & Insights" },
      { property: "og:description", content: "Research notes and field reports on LLM security and AI threat detection." },
      { property: "og:url", content: "https://blindsight.io/blog" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/blog" }],
  }),
});

function BlogPage() {
  const { open: openDemo } = useDemoModal();
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  return (
    <main>
      <header className="hero careers-hero">
        <div className="reveal" style={{ maxWidth: 760 }}>
          <span className="tag">Blog</span>
          <h1>
            Notes from the
            <br />
            <span className="accent">field.</span>
          </h1>
          <p className="lede">
            Attack walkthroughs, research deep-dives, and lessons from securing AI in
            production.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={openDemo}>Request a Demo</button>
            <Link to="/in-action" className="btn btn-secondary">See attacks in action <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>

        </div>
      </header>

      {featured && (
        <section className="section">
          <div className="section-inner">
            <div className="s-head reveal">
              <span className="tag">Featured</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
            </div>
            <article className="post-featured reveal">
              <div className="post-meta">
                <span>{featured.category}</span>
                <span>{featured.dateLabel}</span>
                <span>{featured.read}</span>
                <span>{featured.author}</span>
              </div>
              <Link to="/blog/$slug" params={{ slug: featured.slug }} className="btn btn-secondary">
                Read the post <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>
      )}

      <section className="section section-alt">
        <div className="section-inner">
          <div className="s-head reveal">
            <span className="tag">All posts</span>
            <h2>What we've been writing.</h2>
          </div>

          <div className="posts-grid reveal">
            {rest.map((p) => (
              <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="post-card">
                <div className="post-cat">{p.category}</div>
                <h3 className="post-title">{p.title}</h3>
                <p className="post-excerpt">{p.excerpt}</p>
                <div className="post-foot">
                  <span>{p.dateLabel}</span>
                  <span>{p.read}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
