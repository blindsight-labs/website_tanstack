/* Page contracts. Each route renders <SitePage name="…" /> (src/site/pages/registry.tsx),
   which renders that key's page from ./b with exactly the props below. */
import type { ComponentType } from "react";
import type { BlogPost, PostMeta } from "@/lib/blog-content";

/** A page that takes no props (the route owns the head/meta; the page reads its own data:
 *  careersApply reads `?role=` itself). */
type NoProps = Record<never, never>;

/** From the route's loader (getPostList(), newest first). */
export type BlogIndexProps = { posts: PostMeta[] };
/** From the route's loader (getPostPage). `post` is undefined in the route's not-found state:
 *  render a "post not found" state. `next` is null when there is no other post. */
export type BlogPostProps = { post?: BlogPost; next?: PostMeta | null };
/** From the route's loader: getAuthor(slug) from "@/lib/authors", and that author's posts. */
export type AuthorProps = { slug: string; posts: PostMeta[] };
/** Call router.invalidate() then reset() for "Try again". */
export type ErrorProps = { error: Error; reset: () => void };
/** The demo-request modal's CARD contents. The provider (src/components/DemoModal.tsx) keeps
 *  the backdrop, the dialog element (focus on open, Escape, scroll lock, click-outside) and
 *  wraps this in <div class="bs-modal" role="dialog" aria-labelledby="demo-modal-title">.
 *  So: include an element with id="demo-modal-title", a close button calling onClose, and
 *  <DemoForm /> (src/components/DemoForm.tsx) for the submission logic. */
export type DemoModalProps = { onClose: () => void };

export type PageProps = {
  team: NoProps;
  careers: NoProps;
  careersApply: NoProps;
  contact: NoProps;
  faq: NoProps;
  blogIndex: BlogIndexProps;
  blogPost: BlogPostProps;
  author: AuthorProps;
  imprint: NoProps;
  privacy: NoProps;
  evaluationTerms: NoProps;
  notFound: NoProps;
  error: ErrorProps;
  demoModal: DemoModalProps;
};

export type PageKey = keyof PageProps;

export type PageMap = { [K in PageKey]: ComponentType<PageProps[K]> };

/** A loader per key, so each page is its own chunk and loads only on its route (./registry.tsx). */
export type PageLoaders = { [K in PageKey]: () => Promise<PageMap[K]> };
