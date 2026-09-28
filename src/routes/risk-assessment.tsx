import { createFileRoute } from "@tanstack/react-router";

import assessmentCss from "@/site/assessment/assessment.css?url";
import mdCss from "@/site/assessment/concepts/md/md.css?url";
import { RiskAssessment } from "@/site/assessment/RiskAssessment";

const TITLE = "AI Risk Assessment · Blindsight";
const DESCRIPTION =
  "A free, two-minute AI exposure assessment for CISOs and CIOs: see how much of your AI risk is visible today, and how much you could prevent.";

export const Route = createFileRoute("/risk-assessment")({
  component: RiskAssessment,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: "https://blindsight.io/risk-assessment" },
    ],
    links: [
      { rel: "canonical", href: "https://blindsight.io/risk-assessment" },
      ...[assessmentCss, mdCss].map((href) => ({ rel: "stylesheet", href })),
    ],
  }),
});
