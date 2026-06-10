import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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
  const posts = getAllPosts();
  const [featured, ...rest] = posts;

  // Drag-to-scroll the article row with a left-click hold (mouse only; touch
  // keeps native scrolling). A small move threshold distinguishes a drag from a
  // click so card links still navigate on a plain click.
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startLeft: 0 });

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = rowRef.current;
    if (!el) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!drag.current.down || !el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current.down = false;
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    el.classList.remove("is-dragging");
  };
  const onClickCapture = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  // Let the vertical wheel nudge the row horizontally, except at the ends where
  // the page should keep scrolling. Needs a non-passive listener to preventDefault.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <main>
      <section className="section blog-section">
        <div className="section-inner">
          <div className="blog-intro reveal">
            <span className="tag">Blog</span>
            <h1>
              Notes from the <span className="accent">field.</span>
            </h1>
            <p className="lede">
              Attack walkthroughs, research deep-dives, and lessons from securing AI in
              production.
            </p>
          </div>

          {featured && (
            <Link
              to="/blog/$slug"
              params={{ slug: featured.slug }}
              className="featured-card reveal"
            >
              <div className="featured-card-main">
                <span className="tag">Featured</span>
                <h2>{featured.title}</h2>
                <p className="featured-card-excerpt">{featured.excerpt}</p>
                <div className="post-meta">
                  <span>{featured.category}</span>
                  <span>{featured.dateLabel}</span>
                  <span>{featured.read}</span>
                  <span>{featured.author}</span>
                </div>
              </div>
              <span className="featured-card-cta">
                Read the post <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          )}

          <div className="s-head reveal" style={{ marginTop: 64 }}>
            <span className="tag">All posts</span>
            <h2>What we've been writing.</h2>
          </div>
          <div
            ref={rowRef}
            className="posts-row reveal"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClickCapture={onClickCapture}
            onDragStart={(e) => e.preventDefault()}
          >
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
