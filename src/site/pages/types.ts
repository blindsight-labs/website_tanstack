/* Page contracts. Each route renders <SitePage name="…" /> (src/site/pages/registry.tsx),
   which renders that key's page from ./b with exactly the props below. */
import type { ComponentType } from "react";

/** A page that takes no props (the route owns the head/meta; the page reads its own data:
 *  careersApply reads `?role=` itself, blogIndex its posts via getAllPosts()). */
type NoProps = Record<never, never>;

/** `slug` comes from the route's loader. getPost(slug) can be undefined (the route's
 *  not-found state renders this page with the unknown slug): render a "post not found" state. */
export type BlogPostProps = { slug: string };
/** `slug` comes from the route's loader: getAuthor(slug) from "@/lib/authors". */
export type AuthorProps = { slug: string };
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
  blogIndex: NoProps;
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
