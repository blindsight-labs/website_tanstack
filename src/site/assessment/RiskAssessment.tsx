/* /risk-assessment — the free AI exposure assessment for CISOs and CIOs.
   The shell: the shared assessment state and, while the direction is open, two mockups (?c=a|c) with a REVIEW-ONLY switcher. Each mockup renders the whole page body. */
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";

import { useSiteTheme } from "@/site/theme";
import { CONCEPTS } from "./concepts";
import { useAssessment } from "./useAssessment";

export function RiskAssessment({ concept = "d" }: { concept?: string }) {
  const { theme } = useSiteTheme();
  const a = useAssessment();
  const current = CONCEPTS.find((c) => c.meta.id === concept) ?? CONCEPTS[0];
  const { Component } = current;
  return (
    <main className="ra" data-concept={current.meta.id}>
      {/* key: a concept switch mounts a fresh scene (and releases the old WebGL context) */}
      <Suspense fallback={<div style={{ minHeight: "100vh" }} />}>
        <Component key={current.meta.id} a={a} theme={theme} />
      </Suspense>
      <nav className="ra-switch" aria-label="Concepts (review only)">
        {CONCEPTS.map(({ meta }) => (
          <Link
            key={meta.id}
            to="/risk-assessment"
            search={{ c: meta.id }}
            aria-current={meta.id === current.meta.id ? "page" : undefined}
          >
            <span>{meta.id}</span>
            <span className="ra-switch__name">{meta.name}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
