/* The mockups under review (D = the converged direction; A and C kept for comparison) (REVIEW-ONLY: keep the chosen one, delete the rest and the
   switcher). /risk-assessment?c=a|c. Each loads on its own (lazy). l1/ and l3/ are the previous
   round's mockups they were built from — reference only, not routed. */
import { lazy, type ComponentType } from "react";

import { meta as ma } from "./ma/meta";
import { meta as mc } from "./mc/meta";
import { meta as md } from "./md/meta";
import type { ConceptMeta, ConceptProps } from "./types";

export const CONCEPTS: { meta: ConceptMeta; Component: ComponentType<ConceptProps> }[] = [
  { meta: md, Component: lazy(() => import("./md/MockupD").then((m) => ({ default: m.MockupD }))) },
  { meta: ma, Component: lazy(() => import("./ma/MockupA").then((m) => ({ default: m.MockupA }))) },
  { meta: mc, Component: lazy(() => import("./mc/MockupC").then((m) => ({ default: m.MockupC }))) },
];
