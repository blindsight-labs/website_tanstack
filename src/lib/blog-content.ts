import yaml from "js-yaml";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
function matter(raw: string): { data: any; content: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { data: {}, content: raw };
  const data = (yaml.load(m[1]) as any) ?? {};
  return { data, content: m[2] };
}

export type FAQItem = { q: string; a: string };
export type HowToStep = { n: string; title: string; body: string };
export type Reference = { label: string; href?: string };

export type BlogPost = {
  slug: string;
  title: string;
  category: string;
  date: string; // ISO YYYY-MM-DD
  dateLabel: string; // human friendly
  read: string;
  author: string;
  excerpt: string;
  body: string;
  references?: Reference[];
  seoTitle?: string;
  seoDescription?: string;
  faq?: FAQItem[];
  howToSteps?: HowToStep[];
};

// Eager glob — markdown content is bundled at build time.
const modules = import.meta.glob("/src/content/blog/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function formatDate(iso: string): string {
  // Date-only ISO strings ("YYYY-MM-DD") parse as UTC. Build the
  // formatted label in UTC too so the published day never shifts in
  // negative-offset timezones (e.g. May 20 displaying as May 19).
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
    timeZone: "UTC",
  });
}

function parsePost(path: string, raw: string): BlogPost {
  const { data, content } = matter(raw);
  const fallbackSlug = path.split("/").pop()!.replace(/\.md$/, "");
  const slug = (data.slug as string) ?? fallbackSlug;
  const date = (data.date as string) ?? "1970-01-01";
  return {
    slug,
    title: data.title ?? slug,
    category: data.category ?? "Post",
    date,
    dateLabel: formatDate(date),
    read: data.read ?? "5 min",
    author: data.author ?? "Blindsight",
    excerpt: data.excerpt ?? "",
    body: content.trim(),
    references: data.references,
    seoTitle: data.seoTitle,
    seoDescription: data.seoDescription,
    faq: data.faq,
    howToSteps: data.howToSteps,
  };
}

const ALL_POSTS: BlogPost[] = Object.entries(modules)
  .map(([path, raw]) => parsePost(path, raw))
  .sort((a, b) => (a.date < b.date ? 1 : -1));

export function getAllPosts(): BlogPost[] {
  return ALL_POSTS;
}

export function getPost(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}
