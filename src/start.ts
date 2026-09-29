import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Pages render the same for every visitor (theme and consent are applied client-side), so let
// Netlify's CDN serve them instead of running the SSR function on every view. Browsers always
// revalidate; the CDN keeps a copy for 5 min and serves stale while refreshing. Deploys purge it.
const cacheMiddleware = createMiddleware().server(async ({ request, handlerType, next }) => {
  const result = await next();
  const { response } = result;
  if (
    handlerType !== "router" ||
    request.method !== "GET" ||
    response.status !== 200 ||
    response.headers.has("cache-control") ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return result;
  }
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  headers.set(
    "Netlify-CDN-Cache-Control",
    "public, durable, s-maxage=300, stale-while-revalidate=86400",
  );
  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, cacheMiddleware],
}));
