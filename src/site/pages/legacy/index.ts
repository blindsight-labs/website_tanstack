/* The LEGACY (pre-redesign) body for every page key: the fallback when the active page
   version does not register that key. Data these pages define is exported from each file
   for the versions to reuse (FOUNDERS/LEADERSHIP, ROLES, DEMO_FAQS, DEMO_MODAL_COPY, …).
   Loaded on demand, like the versions' pages (see ../registry.tsx). */
import type { PageLoaders } from "../types";

/** A function, not a module-level object, so import cycles (DemoModal ↔ registry) stay safe. */
export function legacyPages(): Required<PageLoaders> {
  return {
    team: () => import("./Team").then((m) => m.TeamPage),
    careers: () => import("./Careers").then((m) => m.CareersPage),
    careersApply: () => import("./CareersApply").then((m) => m.ApplyPage),
    contact: () => import("./Contact").then((m) => m.ContactPage),
    faq: () => import("./Faq").then((m) => m.FaqPage),
    blogIndex: () => import("./BlogIndex").then((m) => m.BlogPage),
    blogPost: () => import("./BlogPost").then((m) => m.BlogPostPage),
    author: () => import("./Author").then((m) => m.AuthorPage),
    imprint: () => import("./Imprint").then((m) => m.Imprint),
    privacy: () => import("./Privacy").then((m) => m.PrivacyNotice),
    demo: () => import("./Demo").then((m) => m.DemoPage),
    shadow: () => import("./Shadow").then((m) => m.ShadowPage),
    notFound: () => import("./NotFound").then((m) => m.NotFoundPage),
    error: () => import("./ErrorPage").then((m) => m.ErrorPage),
    demoModal: () => import("./DemoModalCard").then((m) => m.DemoModalCard),
  };
}
