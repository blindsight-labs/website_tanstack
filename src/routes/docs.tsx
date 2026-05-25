import { createFileRoute } from "@tanstack/react-router";

const DOCS_URL = "https://docs.blindsight.io";

export const Route = createFileRoute("/docs")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      window.location.replace(DOCS_URL);
    } else {
      throw new Response(null, { status: 302, headers: { Location: DOCS_URL } });
    }
  },
  component: () => null,
});
