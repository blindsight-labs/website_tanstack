import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () =>
  createRouter({
    routeTree,
    scrollRestoration: true,
    // explicit, so the router's scrollTo doesn't inherit html's CSS smooth scroll on route changes
    scrollRestorationBehavior: "instant",
    defaultPreloadStaleTime: 0,
  });
