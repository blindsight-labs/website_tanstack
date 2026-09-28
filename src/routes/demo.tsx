import { createFileRoute, redirect } from "@tanstack/react-router";

// the /demo page was retired: old links and search results land on the homepage
export const Route = createFileRoute("/demo")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true, statusCode: 301 });
  },
  component: () => null,
});
