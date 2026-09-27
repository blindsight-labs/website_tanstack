/* Version B · the header objects, by name. Each renders ONCE (core.renderOnce → PNG data URL,
   cached by key); ../Still.tsx queues the renders and gives the offscreen WebGL context back
   when the queue drains. Images a scene prints are loaded and decoded first (renderOnce is
   synchronous). Client-only: imported dynamically. */
import { releaseOffscreen, renderOnce } from "@/site/three/core";
import { preload } from "./images";
import type { Ctx, Tone } from "./kit";
import { sceneApply, sceneAuthor, sceneBlog, sceneCareers, sceneTeam, type AuthorArg, type PageArg } from "./scenes-company";
import { sceneColumns, sceneContact, sceneFaq, sceneLegal, sceneLost, sceneRegister } from "./scenes-site";

export type { Tone };

/** Bump when any scene changes, so cached stills are not reused. */
const VERSION = "b12";

function json<T>(a: string, fallback: T): T {
  try {
    return { ...fallback, ...(JSON.parse(a) as Partial<T>) };
  } catch {
    return fallback;
  }
}
const pageArg = (a: string) => json<PageArg>(a, { kicker: "", title: a, foot: "" });
const authorArg = (a: string) => json<AuthorArg>(a, { name: a, photo: "", pos: "" });

const SCENES = {
  team: (c: Ctx, t: Tone) => sceneTeam(c, t),
  careers: (c: Ctx, t: Tone) => sceneCareers(c, t),
  apply: (c: Ctx, t: Tone, a: string) => sceneApply(c, t, a),
  blog: (c: Ctx, t: Tone, a: string) => sceneBlog(c, t, pageArg(a)),
  author: (c: Ctx, t: Tone, a: string) => sceneAuthor(c, t, authorArg(a)),
  faq: (c: Ctx, t: Tone) => sceneFaq(c, t),
  contact: (c: Ctx, t: Tone) => sceneContact(c, t),
  legal: (c: Ctx, t: Tone, a: string) => sceneLegal(c, t, a.split("|")),
  columns: (c: Ctx, t: Tone) => sceneColumns(c, t),
  register: (c: Ctx, t: Tone) => sceneRegister(c, t),
  lost: (c: Ctx, t: Tone) => sceneLost(c, t),
} satisfies Record<string, (c: Ctx, t: Tone, a: string) => void>;

export type SceneName = keyof typeof SCENES;

export async function renderScene(name: SceneName, arg: string, tone: Tone, width: number, height: number) {
  if (name === "author") await preload(authorArg(arg).photo);
  const build: (c: Ctx, t: Tone, a: string) => void = SCENES[name];
  return renderOnce(`pb-${name}-${VERSION}-${tone.surface}-${arg}`, (ctx) => build(ctx, tone, arg), {
    width,
    height,
    theme: tone.theme,
  });
}

export { releaseOffscreen };
