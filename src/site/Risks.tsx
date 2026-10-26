/* Risks — owner "top". Section 2: "What AI risk actually looks like."
   Four scenario cards, each with its own rendered glass/chrome object (renderOnce
   → <img>, no live canvases). One grid, varied composition: the object bleeds off
   a different card edge each time.

   Glass recipe (the founders' main ask): clear glass reads through its edges, so
   every object is thin or hollow, sits on a floor/wall carrying a faint hairline
   grid it can visibly bend, and is lit by a white cyclorama with narrow black
   flags. Printed text is flat ink, not metal. Violet is one small signal, and only where
   the attack or the AI is: the hidden instruction in 02, the edited passage in 03, the
   unregistered assistant in 04 (01 has none). A few mono words are
   printed on the objects (on-object type, like real print), never floating. */
import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import { risks, type RiskId } from "./content";
import { afterHeroIdle } from "./heroReady";
import type { Ctx, Tone } from "./riskScenes";
import { useReveal, type SectionProps, type Theme } from "./shared";
import { constrainedDevice } from "./three/load";

type Core = typeof import("./three/core");
/** The 3D scenes: fetched with core, only when a card needs WebGL (see needCore). */
type Scenes = typeof import("./riskScenes");

/** `ms`/`ease`: how long a playback runs and how its phase is paced (a scene with
 *  its own beats inside, like 04's login → reach, runs linear and times itself). */
const linear = (x: number) => x;
const SCENES: Record<RiskId, { w: number; h: number; ms?: number; ease?: (x: number) => number }> = {
  "prompt-leak": { w: 520, h: 540 },
  "hidden-instruction": { w: 560, h: 360 },
  "poisoned-source": { w: 560, h: 360 },
  "unregistered-ai": { w: 520, h: 540, ms: 3200, ease: linear },
};

const LAYOUT = ["a", "b", "c", "d"] as const;
const VERSION = "v42";
/** Live playback (motion allowed): the card's scene, built once and kept, animated
 *  on one shared WebGL canvas that moves into the card. Desktop plays on hover; touch
 *  (no hover) loops the card most in view, one at a time, while it is >= 60% visible.
 *  Phones and constrained devices (constrainedDevice) skip it: the stills are the story. */
const PLAYBACK = true;
const PLAY_MS = 1700;
const LOOP_HOLD_MS = 2600; // touch: how long the finished frame (and its callout) holds
const IN_VIEW = 0.6;
const easeIO = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Where each incident is in its render (0..1 of the image), found at render time. */
const anchors: Record<string, { u: number; v: number }> = {};

/** Pre-rendered stills, `{id}-{theme}.webp` (see src/assets/risks/README.md). A card with
 *  one shows it without WebGL; a card without one is rendered at runtime (renderOnce). */
const STILLS = import.meta.glob("/src/assets/risks/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const stillFile = (id: RiskId, theme: Theme): string | undefined => STILLS[`/src/assets/risks/${id}-${theme}.webp`];
/** The anchors of the pre-rendered stills, keyed `${theme}:${id}` (u, v: 0..1 of the image).
 *  A missing entry is computed on idle by anchorOf() (dev logs it, ready to paste here). */
const ANCHORS: Partial<Record<string, { u: number; v: number }>> = {
  "light:prompt-leak": { u: 0.3262, v: 0.6341 },
  "light:hidden-instruction": { u: 0.3851, v: 0.3205 },
  "light:poisoned-source": { u: 0.6981, v: 0.4326 },
  "light:unregistered-ai": { u: 0.4081, v: 0.4417 },
  "dark:prompt-leak": { u: 0.3262, v: 0.6341 },
  "dark:hidden-instruction": { u: 0.3851, v: 0.3205 },
  "dark:poisoned-source": { u: 0.6981, v: 0.4326 },
  "dark:unregistered-ai": { u: 0.4081, v: 0.4417 },
};

/** Resolves in an idle moment (next task where idle callbacks are unsupported). */
const idle = () =>
  new Promise<void>((res) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => res(), { timeout: 1000 });
    else setTimeout(res, 0);
  });
/** Callout direction from the incident, in px: towards the card's open space. */
const CALLOUT: Record<RiskId, { dx: number; dy: number }> = {
  "prompt-leak": { dx: -70, dy: -150 },
  "hidden-instruction": { dx: 170, dy: -40 },
  "poisoned-source": { dx: 130, dy: -120 },
  "unregistered-ai": { dx: 80, dy: -160 },
};

/** The <img>'s object-position as fractions (CSS may shift a crop per breakpoint). */
function objectPos(fig: HTMLElement) {
  const img = fig.querySelector<HTMLElement>(".mT-risk__img");
  const [x = "50%", y = "50%"] = (img ? getComputedStyle(img).objectPosition : "").split(" ");
  const f = (v: string) => (v.endsWith("%") ? parseFloat(v) / 100 : 0.5);
  return { x: f(x), y: f(y), css: img ? getComputedStyle(img).objectPosition : "50% 50%" };
}

/** Map a point in the render to card pixels (the <img> is object-fit: cover). */
function toCard(li: HTMLElement, id: RiskId, u: number, v: number) {
  const fig = li.querySelector<HTMLElement>(".mT-risk__fig");
  if (!fig) return null;
  const s = SCENES[id];
  const lr = li.getBoundingClientRect();
  const fr = fig.getBoundingClientRect();
  const k = Math.max(fr.width / s.w, fr.height / s.h);
  const op = objectPos(fig);
  return {
    x: fr.left - lr.left + (fr.width - s.w * k) * op.x + u * s.w * k,
    y: fr.top - lr.top + (fr.height - s.h * k) * op.y + v * s.h * k,
    w: lr.width,
    h: lr.height,
  };
}

function placeCallout(li: HTMLElement, id: RiskId, theme: Theme) {
  const a = anchors[`${theme}:${id}`];
  const call = li.querySelector<HTMLElement>(".mT-call");
  const label = li.querySelector<HTMLElement>(".mT-call__label");
  const line = li.querySelector<SVGPolylineElement>(".mT-call__line polyline");
  const svg = li.querySelector<SVGSVGElement>(".mT-call__line");
  const dot = li.querySelector<HTMLElement>(".mT-call__dot");
  if (!a || !call || !label || !line || !svg || !dot) return;
  const pt = toCard(li, id, a.u, a.v);
  if (!pt) return;
  const { dx, dy } = CALLOUT[id];
  const lw = label.offsetWidth;
  const lh = label.offsetHeight;
  const M = 18;
  let lx = dx < 0 ? pt.x + dx - lw : pt.x + dx;
  let ly = pt.y + dy - lh;
  lx = Math.min(pt.w - lw - M, Math.max(M, lx));
  ly = Math.min(pt.h - lh - M, Math.max(M, ly));
  const shelf = ly + lh + 5;
  const near = dx < 0 ? lx + lw : lx;
  const far = dx < 0 ? lx : lx + lw;
  svg.setAttribute("viewBox", `0 0 ${pt.w} ${pt.h}`);
  line.setAttribute("points", `${pt.x},${pt.y} ${near},${shelf} ${far},${shelf}`);
  // its real length, so the draw-in (stroke-dashoffset) runs exactly from the dot to the label
  const len = Math.hypot(near - pt.x, shelf - pt.y) + Math.abs(far - near);
  line.style.setProperty("--len", `${Math.ceil(len) + 2}`);
  label.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px)`;
  dot.style.transform = `translate(${Math.round(pt.x)}px, ${Math.round(pt.y)}px)`;
  call.dataset.ready = "true";
}

type Live = { scene: T.Scene; camera: T.PerspectiveCamera; update: (p: number) => void };
type Player = {
  core: Core;
  scenes: Scenes;
  tone: Tone;
  renderer: T.WebGLRenderer;
  canvas: HTMLCanvasElement;
  env: T.Texture;
  live: (Live | null)[];
  raf: number;
  /** the fade-in delay, or (touch) the hold before the next loop */
  timer: number;
  card: number;
  /** "hover": desktop plays the hovered card; "touch": loops the card most in view */
  mode: "hover" | "touch";
  /** touch: the card being looped (-1: none) */
  auto: number;
};

export function Risks({ theme }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [imgs, setImgs] = useState<Record<string, string>>({});
  // live playback: one renderer + canvas, each card's scene built once and kept
  const player = useRef<Player | null>(null);
  const pending = useRef<number>(-1);
  useReveal(ref);

  const layout = () => {
    const el = ref.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".mT-risk").forEach((li, i) => placeCallout(li, risks[i].id, theme));
  };

  /** Build (once) the live scene for card i. */
  const liveFor = (i: number) => {
    const pl = player.current;
    if (!pl) return null;
    if (pl.live[i]) return pl.live[i];
    const { core, scenes, tone } = pl;
    const { THREE } = core;
    const id = risks[i].id;
    const s = SCENES[id];
    const scene = new THREE.Scene();
    scene.environment = pl.env;
    const camera = new THREE.PerspectiveCamera(30, s.w / s.h, 0.1, 100);
    camera.position.set(0, 0, 10);
    const built = scenes.BUILD[id](core, { scene, camera, env: pl.env, theme: tone.theme } as Ctx, tone, 1);
    pl.renderer.compile(scene, camera); // shaders ready before the first play
    pl.live[i] = { scene, camera, update: built.update };
    return pl.live[i];
  };

  /** Play card i's incident once on the shared canvas. `fade` eases its first frame
   *  in over the still instead of cutting to it (touch loops); `done` runs at the end. */
  const play = (i: number, o: { fade?: boolean; done?: () => void } = {}) => {
    const pl = player.current;
    const el = ref.current;
    if (!pl || !el) {
      pending.current = i; // not ready yet: play as soon as it is, if still hovered
      return;
    }
    const li = el.querySelectorAll<HTMLElement>(".mT-risk")[i];
    const fig = li?.querySelector<HTMLElement>(".mT-risk__fig");
    let lv: Live | null = null;
    try {
      lv = liveFor(i);
    } catch (err) {
      console.warn("[risks] live scene failed", risks[i].id, err);
    }
    if (!li || !fig || !lv) return;
    const live = lv;
    if (pl.raf && pl.card === i) return; // already playing here
    cancelAnimationFrame(pl.raf);
    pl.raf = 0;
    window.clearTimeout(pl.timer);
    pl.timer = 0;
    // the shared canvas moves into this card, framed exactly like its still
    const s = SCENES[risks[i].id];
    pl.renderer.setSize(s.w, s.h, false);
    if (pl.canvas.parentElement !== fig) fig.appendChild(pl.canvas);
    pl.canvas.style.objectPosition = objectPos(fig).css;
    live.update(0);
    pl.renderer.render(live.scene, live.camera);
    pl.canvas.style.transition = o.fade ? "opacity 320ms ease" : "none";
    pl.canvas.style.opacity = "1";
    pl.card = i;
    el.querySelectorAll<HTMLElement>(".mT-risk").forEach((x) => delete x.dataset.playing);
    li.dataset.playing = "true";
    delete li.dataset.played; // a replay hides the callout and draws it again at the end
    const ms = s.ms ?? PLAY_MS;
    const ease = s.ease ?? easeIO;
    const start = () => {
      pl.timer = 0;
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        live.update(ease(t));
        pl.renderer.render(live.scene, live.camera);
        if (t < 1) {
          pl.raf = requestAnimationFrame(step);
          return;
        }
        pl.raf = 0;
        delete li.dataset.playing;
        // the incident has happened: now the detection is called out; the still
        // underneath is the same frame, so the canvas can quietly step aside
        li.dataset.played = "true";
        pl.canvas.style.transition = "opacity 300ms ease";
        pl.canvas.style.opacity = "0";
        o.done?.();
      };
      pl.raf = requestAnimationFrame(step);
    };
    if (o.fade) pl.timer = window.setTimeout(start, 340);
    else start();
  };

  /** Touch: stop whatever runs (off-screen, or another card took over); the still,
   *  which is the incident's last frame, shows with its callout. */
  const stop = () => {
    const pl = player.current;
    if (!pl) return;
    cancelAnimationFrame(pl.raf);
    pl.raf = 0;
    window.clearTimeout(pl.timer);
    pl.timer = 0;
    const li = pl.card >= 0 ? ref.current?.querySelectorAll<HTMLElement>(".mT-risk")[pl.card] : undefined;
    if (li?.dataset.playing) {
      delete li.dataset.playing;
      li.dataset.played = "true";
    }
    pl.canvas.style.transition = "opacity 300ms ease";
    pl.canvas.style.opacity = "0";
  };

  /** Touch: loop card i (play, hold the finished frame, play again); -1 stops. */
  const loop = (i: number) => {
    const pl = player.current;
    if (!pl || pl.auto === i) return;
    stop();
    pl.auto = i;
    if (i < 0) return;
    const cycle = () =>
      play(i, {
        fade: true,
        done: () => {
          const q = player.current;
          if (q && q.auto === i) q.timer = window.setTimeout(cycle, LOOP_HOLD_MS);
        },
      });
    cycle();
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let started = false;
    let cardIo: IntersectionObserver | null = null;

    const run = async () => {
      if (started) return;
      started = true;
      // pre-rendered stills show at once, no WebGL; their anchors come from ANCHORS
      const statics: Record<string, string> = {};
      for (const r of risks) {
        const url = stillFile(r.id, theme);
        if (!url) continue;
        const key = `${theme}:${r.id}`;
        statics[key] = url;
        const known = ANCHORS[key];
        if (known && !anchors[key]) anchors[key] = known;
      }
      if (Object.keys(statics).length) {
        setImgs((p) => ({ ...p, ...statics }));
        requestAnimationFrame(layout);
      }
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const live = PLAYBACK && !reduce && !constrainedDevice();
      // WebGL is needed only for a card with no still or no anchor yet, or for live playback
      const needCore = risks.some((r) => !statics[`${theme}:${r.id}`] || !anchors[`${theme}:${r.id}`]) || live;
      if (!needCore) return;
      const [core, scenes] = await Promise.all([import("./three/core"), import("./riskScenes")]);
      if (cancelled) return;
      await Promise.race([
        Promise.all([
          document.fonts.load('500 96px "IBM Plex Mono"'),
          document.fonts.load('700 96px "IBM Plex Mono"'),
          document.fonts.load('400 96px "IBM Plex Mono"'),
          document.fonts.load('400 40px "IBM Plex Sans"'),
          document.fonts.load('500 40px "IBM Plex Sans"'),
        ]).catch(() => undefined),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      const css = getComputedStyle(el);
      const tone: Tone = {
        theme,
        surface: css.getPropertyValue("--surface").trim() || (theme === "dark" ? "#181821" : "#ffffff"),
        dot: css.getPropertyValue("--ink-4").trim() || (theme === "dark" ? "#3a3a47" : "#afaeaa"),
        ink: css.getPropertyValue("--ink").trim() || (theme === "dark" ? "#ececf1" : "#111118"),
      };
      for (const r of risks) {
        if (cancelled) return;
        const key = `${theme}:${r.id}`;
        if (statics[key]) {
          if (anchors[key]) continue;
          // a still without its anchor in ANCHORS: find it by building the scene, unrendered
          await idle();
          if (cancelled) return;
          try {
            anchors[key] = scenes.anchorOf(core, r.id, tone, SCENES[r.id].w, SCENES[r.id].h);
            if (import.meta.env.DEV) console.info("[risks] anchor", JSON.stringify({ [key]: anchors[key] }));
            requestAnimationFrame(layout);
          } catch (err) {
            console.warn("[risks] anchor failed", r.id, err);
          }
          continue;
        }
        await new Promise((res) => requestAnimationFrame(() => res(null)));
        if (cancelled) return;
        const s = SCENES[r.id];
        try {
          const url = core.renderOnce(
            `risk-${r.id}-${VERSION}-${theme}`,
            (ctx) => {
              const { at } = scenes.BUILD[r.id](core, ctx, tone, 1);
              ctx.camera.updateMatrixWorld(true);
              const v = at.clone().project(ctx.camera);
              anchors[`${theme}:${r.id}`] = { u: (v.x + 1) / 2, v: (1 - v.y) / 2 };
            },
            { width: s.w, height: s.h, theme },
          );
          setImgs((p) => ({ ...p, [`${theme}:${r.id}`]: url }));
        } catch (err) {
          console.warn("[risks] render failed", r.id, err);
        }
      }
      // the stills are cached as images: give the offscreen WebGL context back
      core.releaseOffscreen();
      requestAnimationFrame(layout);

      // reduced motion, phones and constrained devices: the stills are the whole story
      if (!live || cancelled) return;
      // the live renderer and its studio environment: in their own idle moment
      await idle();
      if (cancelled) return;
      const mode = window.matchMedia("(hover: hover) and (pointer: fine)").matches ? "hover" : "touch";
      // one live renderer for the whole section; its canvas is moved into the
      // playing card and scaled like the still (object-fit: cover)
      const canvas = document.createElement("canvas");
      canvas.className = "mT-risk__play";
      let renderer: T.WebGLRenderer;
      const dpr = core.pixelRatio(1.5);
      try {
        renderer = core.createRenderer(canvas, { antialias: dpr < 1.5 });
      } catch (err) {
        console.warn("[risks] no live renderer", err);
        return;
      }
      renderer.setPixelRatio(dpr);
      el.dataset.callouts = "hover"; // each callout draws in once its card has played
      player.current = {
        core,
        scenes,
        tone,
        renderer,
        canvas,
        env: core.studioEnvironment(renderer),
        live: risks.map(() => null),
        raf: 0,
        timer: 0,
        card: -1,
        mode,
        auto: -1,
      };

      if (mode === "touch") {
        // no hover: the card most in view loops, one at a time, only while it is at
        // least 60% visible; scenes build on demand, so an unseen card costs nothing
        const items = Array.from(el.querySelectorAll<HTMLElement>(".mT-risk"));
        const seen = items.map(() => 0);
        cardIo = new IntersectionObserver(
          (es) => {
            for (const e of es) {
              const k = items.indexOf(e.target as HTMLElement);
              if (k < 0) continue;
              // a card taller than the screen counts as in view once it fills 60% of it
              const fill = e.intersectionRect.height / (e.rootBounds?.height || window.innerHeight);
              seen[k] = e.isIntersecting ? Math.max(e.intersectionRatio, fill) : 0;
            }
            const cur = player.current?.auto ?? -1;
            let best = cur >= 0 && seen[cur] >= IN_VIEW ? cur : -1;
            seen.forEach((r, k) => {
              if (r >= IN_VIEW && (best < 0 || r > seen[best] + 0.1)) best = k;
            });
            loop(best);
          },
          { threshold: [0, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
        );
        items.forEach((li) => cardIo?.observe(li));
        return;
      }

      if (pending.current >= 0) play(pending.current);
      // build the other scenes in quiet moments, one per frame, so a hover never waits
      for (let i = 0; i < risks.length; i++) {
        await new Promise((res) => requestAnimationFrame(() => res(null)));
        if (cancelled) return;
        try {
          liveFor(i);
        } catch (err) {
          console.warn("[risks] live scene failed", risks[i].id, err);
        }
      }
    };

    // start once the section is near, and then only once the hero has drawn its first
    // frame, in an idle moment (the hero is building and animating above it)
    let cancelKick = () => {};
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          cancelKick = afterHeroIdle(() => void run(), { timeout: 1200 });
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    const ro = new ResizeObserver(() => layout());
    ro.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
      ro.disconnect();
      cardIo?.disconnect();
      cancelKick();
      const pl = player.current;
      if (pl) {
        cancelAnimationFrame(pl.raf);
        window.clearTimeout(pl.timer);
        pl.live.forEach((lv) =>
          lv?.scene.traverse((o) => {
            const m = o as T.Mesh;
            m.geometry?.dispose?.();
            const mat = m.material as T.Material | T.Material[] | undefined;
            (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
          }),
        );
        pl.renderer.dispose();
        pl.canvas.remove();
        player.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  return (
    <section ref={ref} id="risks" className="mD-section mT-risks" aria-labelledby="mT-risks-h">
      <div className="mD-container">
        <header className="mT-risks__head" data-reveal>
          <h2 id="mT-risks-h" className="mD-h1">
            What AI risk actually looks like.
          </h2>
        </header>

        <ul role="list" className="mT-risks__grid">
          {risks.map((r, i) => {
            const src = imgs[`${theme}:${r.id}`];
            return (
              <li
                key={r.id}
                className={`mT-risk mT-risk--${LAYOUT[i]}`}
                data-reveal
                {...(PLAYBACK
                  ? {
                      tabIndex: 0,
                      // focusable for the playback: it announces as its risk's title
                      "aria-labelledby": `mT-risk-${r.id}`,
                      "aria-describedby": `mT-risk-${r.id}-k mT-risk-${r.id}-v`,
                      // touch devices loop by scroll position instead (a tap's
                      // emulated mouseenter must not fight it)
                      onMouseEnter: () => player.current?.mode !== "touch" && play(i),
                      onFocus: () => player.current?.mode !== "touch" && play(i),
                      onMouseLeave: () => {
                        if (pending.current === i) pending.current = -1;
                      },
                    }
                  : {})}
              >
                <div className="mT-risk__fig" aria-hidden="true">
                  {src && <img src={src} alt="" className="mT-risk__img" draggable={false} onLoad={layout} />}
                </div>
                <div className="mT-risk__text">
                  <h3 id={`mT-risk-${r.id}`} className="mD-h3">
                    {r.title}
                  </h3>
                  <p>{r.scenario}</p>
                </div>
                {/* the detection, pointed at the incident with a leader line (after the text, so
                    screen readers read the evidence after the scenario; it is positioned absolutely) */}
                <div className="mT-call">
                  <svg className="mT-call__line" preserveAspectRatio="none" aria-hidden="true">
                    <polyline points="" />
                  </svg>
                  <span className="mT-call__dot" aria-hidden="true" />
                  <span className="mT-call__label">
                    <span id={`mT-risk-${r.id}-k`} className="mT-call__k">
                      Detected
                    </span>
                    <span id={`mT-risk-${r.id}-v`} className="mT-call__v">
                      {r.evidence}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
