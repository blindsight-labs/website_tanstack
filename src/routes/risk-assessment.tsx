import { createFileRoute } from "@tanstack/react-router";

import assessmentCss from "@/site/assessment/assessment.css?url";
import maCss from "@/site/assessment/concepts/ma/ma.css?url";
import mcCss from "@/site/assessment/concepts/mc/mc.css?url";
import mdCss from "@/site/assessment/concepts/md/md.css?url";
import { RiskAssessment } from "@/site/assessment/RiskAssessment";

const TITLE = "AI risk assessment · Blindsight";
const DESCRIPTION =
  "A free, two-minute AI exposure assessment for CISOs and CIOs: see how much of your AI risk is visible today, and how much you could prevent.";

export const Route = createFileRoute("/risk-assessment")({
  // ?c=d|a|c picks the mockup under review (REVIEW-ONLY)
  validateSearch: (s: Record<string, unknown>): { c?: string } =>
    typeof s.c === "string" || typeof s.c === "number" ? { c: String(s.c) } : {},
  component: RouteComponent,
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
      ...[assessmentCss, maCss, mcCss, mdCss].map((href) => ({
        rel: "stylesheet",
        href,
      })),
    ],
  }),
});

function RouteComponent() {
  const { c } = Route.useSearch();
  return <RiskAssessment concept={c} />;
}
