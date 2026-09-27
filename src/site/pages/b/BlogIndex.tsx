/* Version B · /blog. Header object: a glass page with printed lines, leaning in front of a
   paper one. Body (A's editorial index): the latest post as a lead story on its own sheet,
   then every other post as ruled rows, grouped by kind. No card grid, so no holes. */
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { authorSlugFor } from "@/lib/authors";
import { getAllPosts, type BlogPost } from "@/lib/blog-content";
import { FinalCta } from "@/site/FinalCta";
import { Label } from "@/site/shared";
import { useSiteTheme } from "@/site/theme";
import { Page, PageHead, SheetGroup, Split } from "./parts";

const INDEX_PAGE = JSON.stringify({ kicker: "Field notes", title: "Notes from the field.", foot: "BLINDSIGHT · ZÜRICH" });

/** "May 25, 2026" → "May 25" + "2026" for the date column. */
function splitDate(label: string) {
  const m = label.match(/^(.*?),?\s+(\d{4})$/);
  return m ? { day: m[1], year: m[2] } : { day: label, year: "" };
}

export function PostRow({ post }: { post: BlogPost }) {
  const d = splitDate(post.dateLabel);
  return (
    <Link to="/blog/$slug" params={{ slug: post.slug }} className="pb-row">
      <span className="pb-row__n">
        <span>{d.day}</span>
        <span className="pb-post__year">{d.year}</span>
      </span>
      <span className="pb-row__main">
        <span className="pb-row__title">{post.title}</span>
        <span className="pb-row__desc">{post.excerpt}</span>
      </span>
      <span className="pb-row__meta">
        <strong>{post.author}</strong>
        <span>{post.read} read</span>
      </span>
      <ArrowRight className="pb-row__arrow" size={16} strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );
}

const plural = (c: string) => (c.endsWith("s") ? c : `${c}s`);

export function BlogIndexB() {
  const { theme } = useSiteTheme();
  const [featured, ...rest] = getAllPosts();
  const groups = Array.from(new Set(rest.map((p) => p.category))).map((c) => ({
    category: c,
    posts: rest.filter((p) => p.category === c),
  }));
  const featuredAuthor = featured ? authorSlugFor(featured.author) : undefined;

  return (
    <Page className="pb-blog">
      <PageHead
        scene="blog"
        arg={INDEX_PAGE}
        label="Resources · Blog"
        title="Notes from the field."
        lead="Attack walkthroughs, research deep-dives, and lessons from securing AI in production."
      />

      {featured && (
        <article className="mD-sheet pb-group" aria-labelledby="pb-lead-title">
          <div className="mD-container pb-lead" data-reveal>
            <div className="pb-lead__side">
              <Label>Latest · {featured.category}</Label>
              <p className="pb-lead__meta">
                {featured.dateLabel}
                <br />
                {featured.read} read
              </p>
            </div>
            <div>
              <h2 id="pb-lead-title" className="pb-lead__title">
                <Link to="/blog/$slug" params={{ slug: featured.slug }}>
                  {featured.title}
                </Link>
              </h2>
              <p className="mD-lead pb-lead__excerpt">{featured.excerpt}</p>
              <div className="pb-lead__foot">
                <span>
                  By{" "}
                  {featuredAuthor ? (
                    <Link to="/authors/$slug" params={{ slug: featuredAuthor }} className="pb-link">
                      {featured.author}
                    </Link>
                  ) : (
                    featured.author
                  )}
                </span>
                <Link to="/blog/$slug" params={{ slug: featured.slug }} className="mD-btn mD-btn--primary">
                  Read the post
                  <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </article>
      )}

      {groups.length > 0 && (
        <SheetGroup>
          {groups.map((g) => (
            <Split
              key={g.category}
              kicker={plural(g.category)}
              note={
                <p>
                  {g.posts.length} {g.posts.length === 1 ? "post" : "posts"}
                </p>
              }
            >
              <ul className="pb-rows" role="list" data-reveal>
                {g.posts.map((p) => (
                  <li key={p.slug}>
                    <PostRow post={p} />
                  </li>
                ))}
              </ul>
            </Split>
          ))}
        </SheetGroup>
      )}

      <FinalCta theme={theme} />
    </Page>
  );
}
