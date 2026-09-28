/* Version B · /blog/$slug. Header object: the post itself as a glass page (its category, title
   and date printed on it). Body (A's reading layout): a reading sheet with a sticky outline and
   scroll-spy in the left gutter and one ~68ch column; references as a numbered list; the next
   post on its own sheet. Markdown renders through react-markdown + remark-gfm, as the legacy
   page does; h2/h3 get ids for the outline. */
import { Children, isValidElement, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { authorSlugFor } from "@/lib/authors";
import { getAllPosts, getPost } from "@/lib/blog-content";
import { FinalCta } from "@/site/FinalCta";
import { Label } from "@/site/shared";
import { useSiteTheme } from "@/site/theme";
import { FOUNDERS, LEADERSHIP } from "../data";
import type { BlogPostProps } from "../types";
import { Outline, Page, PageHead, slugify, type OutlineItem } from "./parts";

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return Children.toArray(node).map(textOf).join("");
}

/** "## A heading" lines outside code fences, stripped of inline markdown. */
function headingsOf(md: string) {
  const out: { level: 2 | 3; text: string }[] = [];
  let fenced = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const text = m[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~]/g, "")
      .trim();
    out.push({ level: m[1].length as 2 | 3, text });
  }
  return out;
}

const heading = (Tag: "h2" | "h3") =>
  function Heading({ children }: { children?: ReactNode }) {
    return <Tag id={slugify(textOf(children))}>{children}</Tag>;
  };

const MD: Components = {
  h2: heading("h2"),
  h3: heading("h3"),
  a: ({ href, children }) => {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />,
  table: ({ children }) => (
    <div className="pb-prose__table" tabIndex={0} role="region" aria-label="Table">
      <table>{children}</table>
    </div>
  ),
};

const PHOTOS = new Map([...FOUNDERS, ...LEADERSHIP].map((p) => [p.name, p]));

const back = (
  <Link to="/blog" className="pb-back">
    <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
    All posts
  </Link>
);

function PostMissing() {
  return (
    <Page className="pb-post-page">
      <PageHead
        compact
        scene="lost"
        above={back}
        label="404 · Blog"
        title="Post not found."
        lead="That entry doesn't exist, yet."
        actions={
          <Link to="/blog" className="mD-btn mD-btn--primary">
            Back to the blog
            <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />
          </Link>
        }
      />
    </Page>
  );
}

export function BlogPostB({ slug }: BlogPostProps) {
  const { theme } = useSiteTheme();
  const post = getPost(slug);
  if (!post) return <PostMissing />;
  const all = getAllPosts();
  const idx = all.findIndex((p) => p.slug === post.slug);
  const next = all[idx + 1] ?? all[0];
  const authorSlug = authorSlugFor(post.author);
  const person = PHOTOS.get(post.author);
  const printed = JSON.stringify({ kicker: post.category, title: post.title, foot: post.dateLabel.toUpperCase() });

  const hs = headingsOf(post.body);
  const level = hs.some((h) => h.level === 2) ? 2 : 3;
  const outline: OutlineItem[] = hs.filter((h) => h.level === level).map((h) => ({ id: slugify(h.text), label: h.text }));
  if (post.references?.length) outline.push({ id: "references", label: "References" });

  const byline = authorSlug ? (
    <Link to="/authors/$slug" params={{ slug: authorSlug }} className="pb-link">
      {post.author}
    </Link>
  ) : (
    <span>{post.author}</span>
  );

  return (
    <Page key={post.slug} className="pb-post-page">
      <PageHead
        compact
        long={post.title.length > 48}
        scene="blog"
        arg={printed}
        above={back}
        label={post.category}
        title={post.title}
        lead={post.excerpt}
        note={
          <span className="pb-byline">
            {person ? (
              <img className="pb-byline__photo" src={person.photo} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className="pb-byline__mono" aria-hidden="true">
                {post.author.slice(0, 1)}
              </span>
            )}
            <span className="pb-byline__who">
              {byline}
              <span className="pb-byline__meta">
                <time dateTime={post.date}>{post.dateLabel}</time> · {post.read} read
              </span>
            </span>
          </span>
        }
      />

      <div className="mD-sheet pb-read">
        <div className="mD-container pb-read__grid">
          <aside className="pb-read__side">
            {outline.length > 1 && (
              <div className="pb-read__sticky">
                <Outline items={outline} />
              </div>
            )}
          </aside>
          <article className="pb-read__main">
            {outline.length > 1 && (
              // ≤ 899 px the side column is gone: the same outline, folded, above the text
              <details className="pb-read__toc">
                <summary>
                  <Label>On this page · {outline.length}</Label>
                  <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
                </summary>
                <Outline items={outline} />
              </details>
            )}
            <div className="pb-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD}>
                {post.body}
              </ReactMarkdown>
            </div>

            {post.references && post.references.length > 0 && (
              <section id="references" className="pb-refs" aria-labelledby="pb-refs-title">
                <h2 id="pb-refs-title" className="pb-refs__title">
                  References
                </h2>
                <ol className="pb-refs__list">
                  {post.references.map((r) => (
                    <li key={r.label}>
                      {r.href ? (
                        <a className="pb-link" href={r.href} target="_blank" rel="noreferrer noopener">
                          {r.label}
                        </a>
                      ) : (
                        r.label
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <p className="pb-read__end">
              <span>Filed under {post.category}</span>
              <span>By {byline}</span>
            </p>
          </article>
        </div>
      </div>

      {next && next.slug !== post.slug && (
        <nav className="mD-sheet pb-nextpost" aria-label="Next post">
          <Link to="/blog/$slug" params={{ slug: next.slug }} className="mD-container pb-nextpost__link">
            <Label>Next up · {next.category}</Label>
            <span className="pb-nextpost__title">{next.title}</span>
            <span className="pb-nextpost__excerpt">{next.excerpt}</span>
            <span className="pb-go pb-nextpost__go">
              Read the post <ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          </Link>
        </nav>
      )}

      <FinalCta theme={theme} />
    </Page>
  );
}
