import { createFileRoute } from "@tanstack/react-router";

import { MetalDefs } from "@/components/home/shared";
import { Hero } from "@/components/home/Hero";
import { ProofStrip } from "@/components/home/ProofStrip";
import { Risks } from "@/components/home/Risks";
import { Sequence } from "@/components/home/Sequence";
import { Walkthrough } from "@/components/home/Walkthrough";
import { Deployment } from "@/components/home/Deployment";
import { Discovery } from "@/components/home/Discovery";
import { Why } from "@/components/home/Why";
import { Faq } from "@/components/home/Faq";
import { FinalCta } from "@/components/home/FinalCta";

import heroCss from "@/components/home/hero.css?url";
import sequenceCss from "@/components/home/sequence.css?url";
import midCss from "@/components/home/mid.css?url";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Blindsight, Runtime Security for AI" },
      {
        name: "description",
        content:
          "Blindsight inspects every prompt, response and tool call at runtime. See threats like prompt injection and data leaks, govern them with policy, and prove it with an audit trail.",
      },
      { property: "og:title", content: "Blindsight, Runtime Security for AI" },
      {
        property: "og:description",
        content:
          "How can you secure what you can't see? See it. Govern it. Prove it. Runtime visibility, enforcement and a full auditable trail.",
      },
      { property: "og:url", content: "https://blindsight.io/" },
    ],
    links: [
      { rel: "canonical", href: "https://blindsight.io/" },
      { rel: "stylesheet", href: heroCss },
      { rel: "stylesheet", href: sequenceCss },
      { rel: "stylesheet", href: midCss },
    ],
  }),
});

function Home() {
  const theme = "light";
  return (
    <main className="mD mD-home" data-theme={theme} data-type="plex">
      <MetalDefs />
      <Hero theme={theme} />
      <ProofStrip theme={theme} />
      <Risks theme={theme} />
      <Sequence theme={theme} />
      <Walkthrough theme={theme} />
      <Deployment theme={theme} />
      <Discovery theme={theme} />
      <Why theme={theme} />
      <Faq theme={theme} />
      <FinalCta theme={theme} />
    </main>
  );
}
