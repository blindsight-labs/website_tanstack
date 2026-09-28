/* /risk-assessment — the free AI exposure assessment for CISOs and CIOs.
   The shell: the shared assessment state around the page body (concepts/md, "Lens · Scale").
   The body loads on its own chunk. */
import { Suspense, lazy } from "react";

import { useSiteTheme } from "@/site/theme";
import { useAssessment } from "./useAssessment";

const MockupD = lazy(() => import("./concepts/md/MockupD").then((m) => ({ default: m.MockupD })));

export function RiskAssessment() {
  const { theme } = useSiteTheme();
  const a = useAssessment();
  return (
    <main className="ra" data-concept="d">
      <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
        <MockupD a={a} theme={theme} />
      </Suspense>
    </main>
  );
}
