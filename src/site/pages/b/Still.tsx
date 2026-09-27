/* Version B · a rendered object still (the landing's Risks recipe): one renderOnce per object
   → a cached PNG <img>, never a live canvas. Renders are queued one at a time across the page;
   when the queue drains, the shared offscreen WebGL context is released. three.js loads only
   here, inside an effect (client-only). The colours come from the element's own tokens, so a
   still always matches the sheet it sits on, in either theme. */
import { useEffect, useRef, useState } from "react";

import { useSiteTheme } from "@/site/theme";
import type { SceneName } from "./objects";

const urls = new Map<string, string>();
let queue: Promise<void> = Promise.resolve();
let pending = 0;
let releaseTimer = 0;

function fontsReady() {
  const f = document.fonts;
  return Promise.race([
    Promise.all([
      f.load('400 96px "IBM Plex Mono"'),
      f.load('500 96px "IBM Plex Mono"'),
      f.load('600 96px "IBM Plex Mono"'),
      f.load('300 96px "IBM Plex Sans"'),
      f.load('400 96px "IBM Plex Sans"'),
    ]).catch(() => undefined),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
}

function enqueue(job: () => Promise<void>) {
  pending++;
  window.clearTimeout(releaseTimer);
  queue = queue
    .then(job)
    .catch((err: unknown) => console.warn("[pb] still failed", err))
    .finally(() => {
      pending--;
      if (pending > 0) return;
      releaseTimer = window.setTimeout(() => {
        if (pending === 0) void import("./objects").then((m) => pending === 0 && m.releaseOffscreen());
      }, 400);
    });
}

type Props = {
  scene: SceneName;
  /** scene data (a title, a name…), part of the cache key */
  arg?: string;
  /** render size in CSS px (the image is shown object-fit: cover) */
  width: number;
  height: number;
  className?: string;
  /** render in the black room whatever the site theme (the demo card is always dark) */
  dark?: boolean;
};

export function Still({ scene, arg = "", width, height, className = "", dark: forceDark = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useSiteTheme();
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "ready" | "failed">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const css = getComputedStyle(el);
    const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    // the DOM's theme, not React's: before hydration settles the two can differ
    const dark = forceDark || el.closest<HTMLElement>(".mD")?.dataset.theme === "dark";
    const tone = {
      theme: (dark ? "dark" : "light") as "dark" | "light",
      surface: read("--pb-still-bg", read("--surface", dark ? "#0d0d10" : "#ffffff")),
      dot: read("--ink-4", dark ? "#3c3e45" : "#b4b7bf"),
      ink: read("--ink", dark ? "#f4f4f6" : "#0b0b0d"),
    };
    const key = [scene, arg, tone.theme, tone.surface, width, height].join("|");
    const hit = urls.get(key);
    if (hit) {
      setSrc(hit);
      return;
    }
    setSrc(null);
    setState("idle");
    enqueue(async () => {
      if (!alive) return;
      const [mod] = await Promise.all([import("./objects"), fontsReady()]);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!alive) return;
      try {
        const url = await mod.renderScene(scene, arg, tone, width, height);
        urls.set(key, url);
        if (alive) setSrc(url);
      } catch (err) {
        if (alive) setState("failed");
        throw err;
      }
    });
    return () => {
      alive = false;
    };
  }, [scene, arg, width, height, theme, forceDark]);

  return (
    <div ref={ref} className={`pb-still ${className}`} data-state={state} aria-hidden="true">
      {src && <img src={src} alt="" draggable={false} decoding="async" onLoad={() => setState("ready")} />}
    </div>
  );
}
