import { createFileRoute, redirect } from "@tanstack/react-router";

// the /shadow page was retired: old links and search results land on the homepage
export const Route = createFileRoute("/shadow")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true, statusCode: 301 });
  },
  component: () => null,
});
