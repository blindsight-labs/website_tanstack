/* Page contracts for the site's page versions (a | b | c) and the legacy pages.
   Each route renders <SitePage name="…" /> (src/site/pages/registry.tsx), which picks
   the active version's component for that key, or the LEGACY one when the version
   does not provide it. A version component receives exactly the props below. */
import type { ComponentType } from "react";

import type { DemoVariant } from "@/components/DemoModal";

/** A page that takes no props (the route owns the head/meta; the page reads its own data). */
export type NoProps = Record<never, never>;

export type TeamProps = NoProps;
export type CareersProps = NoProps;
/** Reads `?role=` itself: getRouteApi("/careers_/apply").useSearch(). */
export type CareersApplyProps = NoProps;
export type ContactProps = NoProps;
export type FaqProps = NoProps;
/** Reads its posts itself: getAllPosts() from "@/lib/blog-content" (the route has no loader). */
export type BlogIndexProps = NoProps;
/** `slug` comes from the route's loader. getPost(slug) can be undefined (the route's
 *  not-found state renders this page with the unknown slug): render a "post not found" state. */
export type BlogPostProps = { slug: string };
/** `slug` comes from the route's loader: getAuthor(slug) from "@/lib/authors". */
export type AuthorProps = { slug: string };
export type ImprintProps = NoProps;
export type PrivacyProps = NoProps;
/** Free-trial campaign page. FAQ copy: DEMO_FAQS in ./legacy/Demo.tsx (also feeds the route's JSON-LD). */
export type DemoProps = NoProps;
/** Shadow AI campaign page (ShadowAiDemo). */
export type ShadowProps = NoProps;
export type NotFoundProps = NoProps;
/** Call router.invalidate() then reset() for "Try again" (see ./legacy/ErrorPage.tsx). */
export type ErrorProps = { error: Error; reset: () => void };
/** The demo-request modal's CARD contents. The provider (src/components/DemoModal.tsx) keeps
 *  the backdrop, the dialog element (focus on open, Escape, scroll lock, click-outside) and
 *  wraps this in <div class="bs-modal" role="dialog" aria-labelledby="demo-modal-title">.
 *  So: include an element with id="demo-modal-title", a close button calling onClose, and
 *  <DemoForm variant={kind} /> (src/components/DemoForm.tsx) for the submission logic. */
export type DemoModalProps = { kind: DemoVariant; onClose: () => void };

export type PageProps = {
  team: TeamProps;
  careers: CareersProps;
  careersApply: CareersApplyProps;
  contact: ContactProps;
  faq: FaqProps;
  blogIndex: BlogIndexProps;
  blogPost: BlogPostProps;
  author: AuthorProps;
  imprint: ImprintProps;
  privacy: PrivacyProps;
  demo: DemoProps;
  shadow: ShadowProps;
  notFound: NotFoundProps;
  error: ErrorProps;
  demoModal: DemoModalProps;
};

export type PageKey = keyof PageProps;

export type PageMap = { [K in PageKey]: ComponentType<PageProps[K]> };

/** How a version registers its pages: a loader per key, so each page is its own chunk and
 *  loads only on its route (see ./registry.tsx). */
export type PageLoaders = { [K in PageKey]?: () => Promise<PageMap[K]> };
