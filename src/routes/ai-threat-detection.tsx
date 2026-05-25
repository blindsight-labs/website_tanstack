import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/ai-threat-detection")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/$slug", params: { slug: "ai-threat-detection" }, replace: true });
  },
  component: () => null,
});
