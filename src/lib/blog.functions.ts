import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAllPosts, getPost, toMeta } from "./blog-content";

/* The posts (markdown + its YAML parser) stay on the server: routes load them through these,
   so the client bundle carries neither, only the page data it renders. */

export const getPostList = createServerFn({ method: "GET" }).handler(() => getAllPosts().map(toMeta));

export const getPostPage = createServerFn({ method: "GET" })
  .inputValidator((slug: unknown) => z.string().max(200).parse(slug))
  .handler(({ data: slug }) => {
    const post = getPost(slug);
    if (!post) return null;
    const all = getAllPosts();
    const next = all[all.indexOf(post) + 1] ?? all[0];
    return { post, next: next.slug === post.slug ? null : toMeta(next) };
  });
