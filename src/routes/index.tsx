import { createFileRoute } from "@tanstack/react-router";

import { BrainExperience } from "@/components/brain/BrainExperience";
import brainCss from "@/components/brain/brain.css?url";
import { DemoCta } from "@/components/DemoCta";

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
      { rel: "stylesheet", href: brainCss },
    ],
  }),
});

function Home() {
  return (
    <main className="page-home">
      <BrainExperience />
      <DemoCta />
    </main>
  );
}
