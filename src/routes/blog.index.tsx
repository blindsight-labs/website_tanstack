import { createFileRoute } from "@tanstack/react-router";

import { getPostList } from "@/lib/blog.functions";
import { SitePage, preloadPage } from "@/site/pages/registry";

export const Route = createFileRoute("/blog/")({
  component: BlogIndexRoute,
  loader: async () => ({ posts: await getPostList() }),
  staleTime: Infinity,
  // (awaits the page's chunk: the router renders and hydrates only after head(), see registry)
  head: async () => {
    await preloadPage("blogIndex");
    return {
      meta: [
        { title: "AI security research and insights · Blindsight" },
        {
          name: "description",
          content:
            "Research notes, attack walkthroughs, and field reports on LLM security, AI threat detection, prompt injection, jailbreaks, and back-doors from the Blindsight team.",
        },
        { property: "og:title", content: "AI Security Research & Insights" },
        {
          property: "og:description",
          content: "Research notes and field reports on LLM security and AI threat detection.",
        },
        { property: "og:url", content: "https://blindsight.io/blog" },
      ],
      links: [{ rel: "canonical", href: "https://blindsight.io/blog" }],
    };
  },
});

function BlogIndexRoute() {
  const { posts } = Route.useLoaderData();
  return <SitePage name="blogIndex" posts={posts} />;
}
