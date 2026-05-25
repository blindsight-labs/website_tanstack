import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/how-to-secure-llms")({
  beforeLoad: () => {
    throw redirect({ to: "/blog/$slug", params: { slug: "how-to-secure-llms" }, replace: true });
  },
  component: () => null,
});
