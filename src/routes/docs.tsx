import { createFileRoute, redirect } from "@tanstack/react-router";

const DOCS_URL = "https://docs.blindsight.io";

export const Route = createFileRoute("/docs")({
  beforeLoad: () => {
    throw redirect({ href: DOCS_URL, statusCode: 302 });
  },
  component: () => null,
});
