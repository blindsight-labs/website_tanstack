/* Page version B · "Objects", round 2 hybrid: every page header carries one rendered
   glass/chrome object (the landing's Risks studio, renderOnce stills); bodies use version A's
   editorial structure (sheets, sticky kicker, outline), copied here as .pb-; every page ends
   on the landing's FinalCta. Every page key is provided here. Stylesheets are scoped under
   .mD[data-site-variant="b"], classes prefixed .pb-.

   Pages load on demand (one chunk each, see ../registry.tsx), so no page's code sits in the
   landing's main chunk. Only the 404 and error pages are imported here: the root route
   renders them and is never code-split, and they are small. */
import type { PageLoaders, PageMap } from "../types";
import { ErrorB, NotFoundB } from "./NotFound";

import baseCss from "./b-base.css?url";
import pagesCss from "./b-pages.css?url";
import postCss from "./b-post.css?url";
import moreCss from "./b-more.css?url";
import formsCss from "./b-forms.css?url";
import dformCss from "./b-dform.css?url";
import respCss from "./b-resp.css?url";

export const pages: PageLoaders = {
  team: () => import("./Team").then((m) => m.TeamB),
  careers: () => import("./Careers").then((m) => m.CareersB),
  careersApply: () => import("./CareersApply").then((m) => m.CareersApplyB),
  contact: () => import("./Contact").then((m) => m.ContactB),
  faq: () => import("./Faq").then((m) => m.FaqB),
  blogIndex: () => import("./BlogIndex").then((m) => m.BlogIndexB),
  blogPost: () => import("./BlogPost").then((m) => m.BlogPostB),
  author: () => import("./Author").then((m) => m.AuthorB),
  imprint: () => import("./Imprint").then((m) => m.ImprintB),
  privacy: () => import("./Privacy").then((m) => m.PrivacyB),
  evaluationTerms: () => import("./EvaluationTerms").then((m) => m.EvaluationTermsB),
  notFound: () => Promise.resolve(NotFoundB),
  error: () => Promise.resolve(ErrorB),
  demoModal: () => import("./DemoModal").then((m) => m.DemoModalB),
};

/** Pages rendered without a load (no Suspense round trip): the root's 404 and error pages. */
export const eagerPages: Partial<PageMap> = { notFound: NotFoundB, error: ErrorB };

export const styles: string[] = [baseCss, pagesCss, postCss, moreCss, formsCss, dformCss, respCss];
