/* Mockup 1 · "Lens · Pull-back" — the Blindsight mark as the lens that reveals, shot with one
   straight pull-back.

   Header: a tight shot of the summit, framed in a window on the right of the white sheet (the
   quiz on the left). As the header scrolls away the window opens to the whole sheet.
   Scroll: the camera only dollies back (and widens its lens a touch); a lens shift does the
   framing, so the horizon stays straight and the berg never moves: the tip holds its place while
   the mass under it rises into view, in height and width. The mark, rebuilt as a glass-and-chrome
   lens, travels from the tip's flank and grows with the move until its clear glass holds the
   whole berg. Through the lens the hidden mass is sharp and lit; outside it, below the reach of
   the light, it fades into the page.
   The answers set how far that light reaches (what the organization already sees) and where
   each of the eight risks sits on the depth ruler at the stage edge; the least seen risk is the
   one the lens flags: the page's one violet, an inlay on one node.

   Layout: one white sheet; a sticky stage (the render and the ruler) with the copy scrolling
   over it. Desktop: copy and the quiz on the left, the berg on the right. Phone: headline and
   quiz first (they cover the stage), then the tip shows under the form, then the reveal. */
import { useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";

import { CtaButton, Label } from "@/site/shared";
import { IN_VIEW, N, RISKS, seenWord, verdict } from "../../model";
import { QuizCard } from "../../QuizCard";
import type { ConceptProps } from "../types";
import { KEEL, M_PER_UNIT, TOP, riskYs } from "./depth";
import type { LensLayout, LensScene } from "./lensScene";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtM = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");

/** the ruler's short names (the copy uses the full ones) */
const SHORT: Record<string, string> = {
  shadow: "Shadow AI",
  data: "Data in prompts",
  injection: "Prompt injection",
  agents: "Agent actions",
  saas: "AI in SaaS",
  supply: "Models and data",
  inventory: "AI inventory",
  audit: "Reconstruction",
};
const STEPS = [1, 2, 5, 10, 20, 50, 100]; // metres
const BAR_STEPS = [5, 10, 20, 50, 100]; // metres
const TICK_POOL = 12;

/** Stacks labels (sorted by their true y) at least `gap` apart: labels that would touch join a
 *  group, and each group is centred on the mean of its members' depths, so a cluster fans out
 *  above and below its dots (with leaders) instead of piling up on one side; then kept in
 *  [lo, hi]. */
function spread(items: { y: number; ly: number }[], gap: number, lo: number, hi: number) {
  type Group = { from: number; to: number; c: number };
  let groups: Group[] = items.map((it, k) => ({ from: k, to: k, c: it.y }));
  const top = (g: Group) => g.c - ((g.to - g.from) * gap) / 2;
  const bottom = (g: Group) => g.c + ((g.to - g.from) * gap) / 2;
  for (let merged = true; merged; ) {
    merged = false;
    const next: Group[] = [];
    for (const g of groups) {
      const prev = next[next.length - 1];
      if (prev && top(g) < bottom(prev) + gap) {
        const from = prev.from;
        const to = g.to;
        let sum = 0;
        for (let k = from; k <= to; k++) sum += items[k].y;
        next[next.length - 1] = { from, to, c: sum / (to - from + 1) };
        merged = true;
      } else next.push(g);
    }
    groups = next;
  }
  for (const g of groups)
    for (let k = g.from; k <= g.to; k++) items[k].ly = top(g) + (k - g.from) * gap;
  let prev = lo - gap;
  for (const it of items) {
    it.ly = Math.max(it.ly, prev + gap);
    prev = it.ly;
  }
  let nxt = hi + gap;
  for (let k = items.length - 1; k >= 0; k--) {
    items[k].ly = Math.min(items[k].ly, nxt - gap);
    nxt = items[k].ly;
  }
}

type Metrics = {
  W: number;
  H: number;
  wide: boolean;
  /** narrow desktop: the ruler shows the risks' numbers only */
  compact: boolean;
  textRight: number;
  /** the close's copy column's right edge (desktop), stage px */
  closeRight: number;
  /** the header window's left edge (desktop), stage px */
  winLeft: number;
  /** x of the ruler's spine, stage px */
  spine: number;
  /** the stage's right-hand strip the ruler and its labels keep */
  rulerW: number;
};

export function Mockup1({ a, theme }: ConceptProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const closeColRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLElement>(null);
  const flagRef = useRef<HTMLSpanElement>(null);
  const gaugeRef = useRef<HTMLSpanElement>(null);
  const spineRef = useRef<SVGPathElement>(null);
  const litRef = useRef<SVGPathElement>(null);
  const ticksRef = useRef<SVGPathElement>(null);
  const leadRef = useRef<SVGPathElement>(null);
  const seenRef = useRef<SVGPathElement>(null);
  const hidRef = useRef<SVGPathElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const riskRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const scaleTextRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barTextRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LensScene | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const visRef = useRef(0.28);
  const seeRef = useRef<number[]>(a.see);

  // what the organization already sees (answers, typical baselines while unanswered)
  const vis = a.see.reduce((sum, x) => sum + x, 0) / a.see.length;
  const pct = Math.round(vis * 100);
  // the risk the lens flags: the one seen least (ties keep question order)
  const flagged = a.see.reduce((best, x, i) => (x < a.see[best] ? i : best), 0);
  const flagRisk = RISKS[flagged];
  const typical = a.answered === 0;
  const gaugeText = typical
    ? `Typical · ${pct}% seen`
    : a.done
      ? `Seen today · ${a.score.seen}%`
      : `Seen so far · ${pct}%`;
  const hidden = RISKS.map((r, i) => ({ r, i, see: a.see[i] })).filter((x) => x.see < IN_VIEW);
  const s = a.score;
  const dash = "–";

  /* answers → the light and the risks' depths (and the flag's label may change width) */
  useEffect(() => {
    visRef.current = vis;
    seeRef.current = a.see;
    sceneRef.current?.setLight(vis, reducedMotion());
    kickRef.current();
  }, [vis, flagged, a.see]);

  /* the scene: built per theme, rendered on demand, paused off-screen */
  useEffect(() => {
    const sheet = sheetRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    const view = viewRef.current;
    if (!sheet || !track || !stage || !view) return;
    // hydration renders "light"; a dark page re-renders with "dark" a moment later: wait for it
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    const reduce = reducedMotion();
    let disposed = false;
    let cleanup = () => {};
    // a fresh canvas each time: a released context's canvas cannot be reused
    const canvas = document.createElement("canvas");
    canvas.className = "rl1-canvas";
    view.prepend(canvas);
    const fail = () => {
      if (disposed) return;
      stage.dataset.fallback = "true";
      canvas.remove();
    };

    import("./lensScene")
      .then(async (mod) => {
        if (disposed) return;
        const cs = getComputedStyle(sheet);
        const dark = theme === "dark";
        // no WebGL (or a failed build): the quiet fallback, the page stays usable
        const scene = await mod
          .createLensScene(canvas, {
            theme,
            surface: cs.backgroundColor || (dark ? "#0d0d10" : "#ffffff"),
            ink: cs.getPropertyValue("--ink").trim() || (dark ? "#f4f4f6" : "#0b0b0d"),
            signal: cs.getPropertyValue("--signal").trim() || (dark ? "#a08cff" : "#6e4bff"),
          })
          .catch(() => null);
        if (!scene) {
          fail();
          return;
        }
        if (disposed) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        scene.setLight(visRef.current, true);

        let m: Metrics = {
          W: 1,
          H: 1,
          wide: true,
          compact: false,
          textRight: 0,
          winLeft: 0,
          spine: 0,
          rulerW: 0,
          closeRight: 0,
        };
        let lastClip = "#";
        const measure = () => {
          const sr = stage.getBoundingClientRect();
          const W = sr.width;
          const H = sr.height;
          const wide = W >= 900;
          const compact = wide && W < 1180;
          const col = colRef.current;
          const cc = closeColRef.current;
          const textRight = wide && col ? col.getBoundingClientRect().right - sr.left : 0;
          const closeRight = wide && cc ? cc.getBoundingClientRect().right - sr.left : textRight;
          const spine = wide ? W - 62 : W - 20;
          const rulerW = wide ? (compact ? 120 : 224) : 34;
          const winLeft = wide ? clamp(textRight + 32, W * 0.4, W * 0.62) : 0;
          const l: LensLayout = wide
            ? {
                W,
                H,
                // the header window, less the ruler's strip
                r0: { x0: winLeft + 36, x1: W - rulerW - 12, y0: 60, y1: H - 60 },
                // between the close's copy and the ruler
                r1: { x0: closeRight + 44, x1: W - rulerW - 4, y0: 24, y1: H - 24 },
              }
            : {
                W,
                H,
                // the berg keeps to the upper band the whole way (the cards hold the lower
                // one): the tip shows there as the form scrolls away, and the zoom about a
                // point inside that band keeps every frame of the pull-back in it
                r0: { x0: 16, x1: W - rulerW - 4, y0: H * 0.07, y1: H * 0.5 },
                r1: { x0: 12, x1: W - rulerW, y0: 12, y1: H * 0.5 },
              };
          m = { W, H, wide, compact, textRight, closeRight, winLeft, spine, rulerW };
          stage.dataset.compact = compact ? "true" : "false";
          stage.style.setProperty("--rl1-spine", `${spine.toFixed(1)}px`);
          lastClip = "#";
          scene.resize(l);
        };

        const scrolled = () =>
          stage.getBoundingClientRect().top - track.getBoundingClientRect().top;

        /* scroll → progress: 0 while the tip is framed, 1 when the close is in view */
        const progress = () => {
          const total = track.offsetHeight - stage.offsetHeight;
          const head = headRef.current;
          const start = m.wide ? m.H * 0.04 : Math.max(0, (head?.offsetHeight ?? 0) - m.H * 0.12);
          const end = Math.max(start + 1, total - m.H * 0.05);
          return clamp((scrolled() - start) / (end - start), 0, 1);
        };

        /* the header window opens to the whole sheet as the header scrolls away (desktop) */
        const openWindow = () => {
          const q = m.wide ? smooth((scrolled() - m.H * 0.03) / (m.H * 0.5)) : 1;
          const wl = (1 - q) * m.winLeft;
          const wi = m.wide ? (1 - q) * 16 : 0;
          const clip =
            m.wide && q < 0.999
              ? `inset(${wi.toFixed(1)}px ${wi.toFixed(1)}px ${wi.toFixed(1)}px ${wl.toFixed(1)}px round ${((1 - q) * 6).toFixed(1)}px)`
              : "";
          if (clip !== lastClip) {
            lastClip = clip;
            view.style.clipPath = clip;
            stage.style.setProperty("--rl1-wl", `${wl.toFixed(1)}px`);
            stage.style.setProperty("--rl1-wi", `${wi.toFixed(1)}px`);
            stage.style.setProperty("--rl1-q", q.toFixed(3));
          }
          return { wl, wi };
        };

        /* the risks' depths ease to where the answers put them */
        let ys: number[] | null = null;
        const stepRisks = (dt: number) => {
          const goal = riskYs(seeRef.current);
          if (!ys || reduce) {
            ys = goal;
            return false;
          }
          const k = 1 - Math.exp(-Math.min(64, dt) / 200);
          let moving = false;
          for (let i = 0; i < goal.length; i++) {
            const d = goal[i] - ys[i];
            if (Math.abs(d) < 0.004) ys[i] = goal[i];
            else {
              ys[i] += d * k;
              moving = true;
            }
          }
          return moving;
        };

        /* the depth ruler: metres from the waterline, re-spaced to the zoom; the spine is dark as
           far as the light reaches; the eight risks sit on it at their depths, each named only
           once its depth is in frame, the names stacked so they never collide */
        let lastScale = "";
        let lastBar = "";
        const ruler = (wi: number, cover: number) => {
          const v = scene.view();
          const { H, wide, spine } = m;
          const top0 = wide ? wi + 60 : cover + 44;
          const bot0 = wide ? H - wi - 64 : H - 18;
          const yPx = (y: number) => v.oy - y * v.s;
          const pxPerM = v.s / M_PER_UNIT;
          const minor = STEPS.find((st) => st * pxPerM >= 22) ?? 100;
          const major = STEPS.find((st) => st % minor === 0 && st * pxPerM >= 88) ?? 100;
          const f = (n: number) => n.toFixed(1);

          const yTop = clamp(yPx(TOP), top0, bot0);
          const yKeel = clamp(yPx(KEEL), top0, bot0);
          const yLit = clamp(yPx(v.lit), top0, bot0);
          spineRef.current?.setAttribute(
            "d",
            yKeel > yTop + 1 ? `M${spine} ${f(yTop)}V${f(yKeel)}` : "",
          );
          litRef.current?.setAttribute(
            "d",
            yLit > yTop + 1 ? `M${spine} ${f(yTop)}V${f(yLit)}` : "",
          );

          let d = "";
          let n = 0;
          const kTop = Math.floor((TOP * M_PER_UNIT) / minor);
          const kBot = Math.ceil((KEEL * M_PER_UNIT) / minor);
          for (let k = kBot; k <= kTop; k++) {
            const mtr = k * minor;
            const y = yPx(mtr / M_PER_UNIT);
            if (y < top0 - 0.5 || y > bot0 + 0.5) continue;
            const big = mtr % major === 0;
            d += `M${spine} ${f(y)}h${mtr === 0 ? 12 : big ? 7 : 3}`;
            if (big && wide && n < TICK_POOL) {
              const el = tickRefs.current[n++];
              if (el) {
                const t = fmtM(mtr);
                if (el.textContent !== t) el.textContent = t;
                el.style.transform = `translate3d(${spine + 16}px, ${f(y - 6.5)}px, 0)`;
                el.style.opacity = "1";
              }
            }
          }
          for (; n < TICK_POOL; n++) {
            const el = tickRefs.current[n];
            if (el && el.style.opacity !== "0") el.style.opacity = "0";
          }
          ticksRef.current?.setAttribute("d", d);

          const see = seeRef.current;
          const items = (ys ?? []).map((y, i) => {
            const py = yPx(y);
            const alpha = clamp((py - top0) / 24, 0, 1) * clamp((bot0 - py) / 24, 0, 1);
            return { i, y: py, ly: py, alpha };
          });
          const shown = items
            .filter((it) => it.alpha > 0.01)
            .sort((p, q) => p.y - q.y || p.i - q.i);
          // the tip's risks fan out upward above the waterline, the rest downward below it, each
          // on its leader: never a pile at 0
          const wlPx = yPx(0);
          const upper = shown.filter((it) => it.y < wlPx);
          const lower = shown.filter((it) => it.y >= wlPx);
          spread(upper, 22, top0, Math.min(bot0, wlPx - 14));
          spread(lower, 22, Math.max(top0, wlPx + 14), bot0);
          let lead = "";
          let dotSeen = "";
          let dotHid = "";
          const lx = spine - 22;
          for (const it of shown) {
            const dot = `M${spine - 2.4} ${f(it.y)}a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0 -4.8 0`;
            if (see[it.i] >= IN_VIEW) dotSeen += dot;
            else dotHid += dot;
            if (wide) lead += `M${lx} ${f(it.ly)}H${lx + 6}L${spine - 7} ${f(it.y)}H${spine - 3}`;
          }
          leadRef.current?.setAttribute("d", lead);
          seenRef.current?.setAttribute("d", dotSeen);
          hidRef.current?.setAttribute("d", dotHid);
          items.forEach((it) => {
            const el = riskRefs.current[it.i];
            if (!el) return;
            const on = wide ? shown.find((x) => x.i === it.i) : undefined;
            if (on) {
              el.style.transform = `translate3d(0, ${f(on.ly - 6.5)}px, 0)`;
              el.style.opacity = on.alpha.toFixed(3);
            } else if (el.style.opacity !== "0") el.style.opacity = "0";
          });

          // the scale: 1 : n against the header's frame, and a bar in metres
          const scale = `1 : ${v.zoom < 9.95 ? v.zoom.toFixed(1) : Math.round(v.zoom)}`;
          if (scale !== lastScale && scaleTextRef.current) {
            scaleTextRef.current.textContent = scale;
            lastScale = scale;
          }
          const barM = [...BAR_STEPS].reverse().find((b) => b * pxPerM <= 84) ?? BAR_STEPS[0];
          if (barRef.current) barRef.current.style.width = `${f(barM * pxPerM)}px`;
          const bar = `${barM} m`;
          if (bar !== lastBar && barTextRef.current) {
            barTextRef.current.textContent = bar;
            lastBar = bar;
          }
        };

        /* the labels that ride on the scene */
        const overlays = (p: number, wl: number, wi: number, cover: number) => {
          const top = m.wide ? wi : cover; // phone: the head still covers the stage above this
          const bottom = m.H - wi;
          const minX = m.wide ? Math.max(m.textRight + 16, wl + 16) : 12;
          const maxX = m.W - m.rulerW;
          const flag = flagRef.current;
          if (flag) {
            const fl = scene.flag();
            const w = flag.offsetWidth;
            const h = flag.offsetHeight;
            const g = fl.r + 10;
            // the label sits outside the lens, off the node: the side facing away from the
            // lens's centre first (a side-by-side label is preferred to one above or below)
            const ox = fl.x - fl.cx;
            const oy = fl.y - fl.cy;
            const ol = Math.hypot(ox, oy) || 1;
            const spots = [
              { d: [1, 0], at: [fl.x + g, fl.y - h / 2] },
              { d: [-1, 0], at: [fl.x - g - w, fl.y - h / 2] },
              { d: [0, -1], at: [fl.x - w / 2, fl.y - g - h] },
              { d: [0, 1], at: [fl.x - w / 2, fl.y + g] },
            ]
              .map((c) => ({
                at: c.at,
                score: (c.d[0] * ox + c.d[1] * oy) / ol + (c.d[0] !== 0 ? 0.6 : 0),
              }))
              .sort((p1, p2) => p2.score - p1.score)
              .map((c) => c.at);
            const fits = ([x, y]: number[]) =>
              x >= minX && x + w <= maxX && y >= top + 8 && y + h <= bottom - 8;
            const [x, y] = spots.find(fits) ?? [
              clamp(spots[0][0], minX, maxX - w),
              clamp(spots[0][1], top + 8, bottom - 8 - h),
            ];
            flag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            flag.style.opacity = fl.y > top + 8 && fl.x > wl + 8 ? "1" : "0";
          }
          const gauge = gaugeRef.current;
          if (gauge) {
            const q = scene.gauge();
            const w = gauge.offsetWidth;
            const h = gauge.offsetHeight;
            const x = Math.max(minX, q.x - 6 - w);
            gauge.style.transform = `translate3d(${x.toFixed(1)}px, ${(q.y - h / 2).toFixed(1)}px, 0)`;
            // it fades as the lens takes over the whole berg
            const on = q.y > top + 8 && q.y < bottom - 8 ? 1 - smooth((p - 0.55) / 0.25) : 0;
            gauge.style.opacity = on.toFixed(3);
          }
        };

        /* phone: each card rests at the foot of the screen (sticky, CSS) and fades as it leaves
           upward, so it never lies over the berg's band */
        const cards = Array.from(sheet.querySelectorAll<HTMLElement>(".rl1-step .rl1-card"));
        const fadeCards = () => {
          // fully legible while its top is below 30% of the stage; gone by the time it reaches 8%
          const st = stage.getBoundingClientRect().top;
          for (const c of cards) {
            const o = m.wide
              ? ""
              : smooth((c.getBoundingClientRect().top - st - m.H * 0.08) / (m.H * 0.22)).toFixed(3);
            if (c.style.opacity !== o) c.style.opacity = o;
          }
        };

        let raf = 0;
        let last = 0;
        let onScreen = true;
        const frame = (now: number) => {
          raf = 0;
          const dt = last ? now - last : 16;
          last = now;
          const p = progress();
          scene.setProgress(p);
          // the water and the waterline stay off the copy column (desktop)
          scene.setMask(
            m.wide ? m.textRight + 24 + (m.closeRight - m.textRight - 4) * smooth(p) : null,
          );
          fadeCards();
          let moving = scene.step(dt);
          if (stepRisks(dt)) moving = true;
          scene.render();
          const { wl, wi } = openWindow();
          const sr = stage.getBoundingClientRect();
          const hb = headRef.current?.getBoundingClientRect().bottom ?? sr.top;
          const cover = m.wide ? 0 : Math.max(0, hb - sr.top);
          ruler(wi, cover);
          overlays(p, wl, wi, cover);
          stage.dataset.ready = "true";
          if (moving) request();
          else last = 0;
        };
        const request = () => {
          if (!raf && onScreen && !document.hidden) raf = requestAnimationFrame(frame);
        };
        kickRef.current = request;

        measure();
        request();

        const ro = new ResizeObserver(() => {
          measure();
          request();
        });
        ro.observe(stage);
        if (headRef.current) ro.observe(headRef.current); // phone: the head's height sets the start
        if (colRef.current) ro.observe(colRef.current); // desktop: the quiz sets the window's edge
        const io = new IntersectionObserver(([e]) => {
          onScreen = e.isIntersecting;
          if (onScreen) request();
          else {
            cancelAnimationFrame(raf);
            raf = 0;
            last = 0;
          }
        });
        io.observe(track);
        const onVis = () => {
          if (!document.hidden) request();
        };
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("scroll", request, { passive: true });

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          io.disconnect();
          document.removeEventListener("visibilitychange", onVis);
          window.removeEventListener("scroll", request);
          kickRef.current = () => {};
          sceneRef.current = null;
          scene.dispose();
        };
      })
      .catch(fail);

    return () => {
      disposed = true;
      cleanup();
      canvas.remove();
      view.style.clipPath = "";
      delete stage.dataset.ready;
      delete stage.dataset.fallback;
    };
  }, [theme]);

  const toClose = () =>
    closeRef.current?.scrollIntoView({
      behavior: reducedMotion() ? "auto" : "smooth",
      block: "end",
    });
  const toStart = () => {
    const open = a.answers.findIndex((x) => x == null);
    a.setQ(open < 0 ? 0 : open);
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  };
  const retake = () => {
    a.retake();
    window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="rl1">
      <div className="mD-sheet rl1-sheet" ref={sheetRef}>
        <div className="rl1-track" ref={trackRef}>
          {/* the render and its ruler: sticky behind the copy (the canvas is added on the client) */}
          <div className="rl1-stage" ref={stageRef} aria-hidden="true">
            <div className="rl1-view" ref={viewRef}>
              <svg className="rl1-fallback" viewBox="0 0 400 480" focusable="false">
                <line x1="0" y1="100" x2="400" y2="100" className="rl1-fallback__line" />
                <path
                  className="rl1-fallback__berg"
                  d="M213.5 28 L224.6 57.4 L249.5 76.3 L296 100 L336.8 114.4 L367.7 141.4 L371.6 170.8 L345.8 212.8 L336.5 259 L322.7 288.4 L315.5 322 L286 364 L257.6 410 L239 448 L190.7 393.4 L137.3 343 L107.9 296.8 L77.3 271.6 L60.5 238 L39.5 196 L48.8 154 L72.8 116.2 L116 100 L144.8 74.2 L153.8 66.7 L183.2 61.6 L197 49 Z"
                />
              </svg>

              <svg className="rl1-ruler" focusable="false">
                <path className="rl1-ruler__spine" ref={spineRef} />
                <path className="rl1-ruler__lit" ref={litRef} />
                <path className="rl1-ruler__ticks" ref={ticksRef} />
                <path className="rl1-ruler__lead" ref={leadRef} />
                <path className="rl1-ruler__seen" ref={seenRef} />
                <path className="rl1-ruler__hid" ref={hidRef} />
              </svg>
              {Array.from({ length: TICK_POOL }, (_, k) => (
                <span
                  key={k}
                  className="rl1-tick"
                  ref={(el) => {
                    tickRefs.current[k] = el;
                  }}
                />
              ))}
              <div className="rl1-risks">
                {RISKS.map((r, i) => (
                  <span
                    key={r.id}
                    className="rl1-risk"
                    data-seen={a.see[i] >= IN_VIEW ? "true" : "false"}
                    ref={(el) => {
                      riskRefs.current[i] = el;
                    }}
                  >
                    <span className="rl1-risk__n">{pad2(i + 1)}</span>
                    <span className="rl1-risk__t">{SHORT[r.id] ?? r.name}</span>
                  </span>
                ))}
              </div>
              <span className="rl1-depth">Depth · m</span>
              <div className="rl1-scale">
                <span className="rl1-scale__k">Scale</span>
                <span ref={scaleTextRef}>1 : 1.0</span>
                <span className="rl1-scale__bar" ref={barRef} />
                <span ref={barTextRef}>10 m</span>
              </div>

              <span className="rl1-gauge" ref={gaugeRef}>
                <span className="rl1-gauge__t">{gaugeText}</span>
                <span className="rl1-gauge__tick" />
              </span>
              <span className="rl1-flag" ref={flagRef}>
                <span className="rl1-flag__k">Flagged</span>
                <span className="rl1-flag__v">{flagRisk.name}</span>
              </span>
            </div>

            {/* the header window: a hairline frame and viewfinder corners */}
            <span className="rl1-frame" />
            <span className="rl1-finder">
              {["tl", "tr", "bl", "br"].map((c) => (
                <span key={c} className={`rl1-corner rl1-corner--${c}`} />
              ))}
            </span>
          </div>

          <div className="rl1-flow">
            {/* 01 · the header: the question on the left, the tip in its window on the right */}
            <header className="rl1-head" ref={headRef}>
              <div className="mD-container">
                <div className="rl1-col" ref={colRef}>
                  <Label>Free AI exposure assessment</Label>
                  <h1 className="rl1-title">You see the tip. Your AI risk is the rest.</h1>
                  <p className="mD-lead rl1-lead">
                    Eight questions, about two minutes. Find out how much of your AI exposure you
                    can see today, and how much of it you could prevent.
                  </p>
                  <QuizCard a={a} onReveal={toClose} revealLabel="See all of it" />
                </div>
              </div>
            </header>

            <section className="rl1-step" aria-labelledby="rl1-s1">
              <div className="mD-container">
                <div className="rl1-col rl1-card">
                  <Label n="02">The waterline</Label>
                  <h2 className="mD-h2 rl1-h2" id="rl1-s1">
                    Above the waterline is what you already see.
                  </h2>
                  <p className="rl1-p">
                    Approved tools, vendors under contract, the policy people signed. Your answers
                    set how far the light reaches below it, and how deep each risk sits. Past the
                    light, the water is murky.
                  </p>
                  <p className="rl1-stat">
                    <strong>
                      {a.inView} of {N}
                    </strong>{" "}
                    risks in view
                    {typical ? " for a typical organization" : a.done ? "" : " so far"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rl1-step" aria-labelledby="rl1-s2">
              <div className="mD-container">
                <div className="rl1-col rl1-card">
                  <Label n="03">Below it</Label>
                  <h2 className="mD-h2 rl1-h2" id="rl1-s2">
                    Below it sits the AI nobody registered.
                  </h2>
                  {hidden.length > 0 ? (
                    <>
                      <p className="rl1-p">
                        {hidden.length} of {N} risks sit below
                        {typical ? " a typical organization's" : " your"} waterline. This is where
                        incidents usually surface.
                      </p>
                      <ul className="rl1-list">
                        {hidden.map(({ r, i, see }) => (
                          <li key={r.id}>
                            <span>
                              <span className="rl1-list__n">{pad2(i + 1)}</span>
                              {r.name}
                            </span>
                            <span>Seen · {seenWord(see)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="rl1-p">
                      By your answers, no risk sits fully below the waterline. The deep is still
                      where new ones show up first: the next plugin, the next agent.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rl1-step" aria-labelledby="rl1-s3">
              <div className="mD-container">
                <div className="rl1-col rl1-card">
                  <Label n="04">The lens</Label>
                  <h2 className="mD-h2 rl1-h2" id="rl1-s3">
                    Blindsight is the lens.
                  </h2>
                  <p className="rl1-p">
                    It sits between your people, your agents and every model, so what it sees it can
                    act on: shadow tools flagged, sensitive fields masked, hidden instructions
                    stripped, unsafe tool calls blocked, every event logged and sealed.
                  </p>
                  <p className="rl1-p rl1-p--flag">
                    Right now it is flagging <strong>{flagRisk.name}</strong>, the risk
                    {typical ? " a typical organization sees" : " you see"} least:{" "}
                    {lowerFirst(flagRisk.bs.action)}.
                  </p>
                </div>
              </div>
            </section>

            {/* 05 · the close: the whole berg inside the lens, and the numbers */}
            <section className="rl1-close" ref={closeRef} aria-labelledby="rl1-close">
              <div className="mD-container">
                <div className="rl1-col rl1-col--close rl1-card" ref={closeColRef}>
                  <Label n="05">All of it</Label>
                  <h2 className="mD-h2 rl1-h2" id="rl1-close">
                    With Blindsight, you see all of it.
                  </h2>
                  <dl className="ra-nums rl1-nums">
                    <div>
                      <dt>Seen today</dt>
                      <dd>{a.done ? `${s.seen}%` : dash}</dd>
                    </div>
                    <div>
                      <dt>Prevented today</dt>
                      <dd>{a.done ? `${s.prevented}%` : dash}</dd>
                    </div>
                    <div>
                      <dt>With Blindsight</dt>
                      <dd>
                        {a.done ? `${s.withPrevented}%` : dash}
                        <span className="ra-est">est.</span>
                      </dd>
                    </div>
                  </dl>
                  <p className="rl1-p">
                    {a.done
                      ? `${verdict(s)} With runtime controls, about ${s.withPrevented}% of it could be prevented (est.).`
                      : `Answer all eight questions to see your own numbers. ${a.answered} of ${N} answered.`}
                  </p>
                  <div className="rl1-actions">
                    {a.done ? (
                      <>
                        <CtaButton label="Walk through your results" size="lg" />
                        <button type="button" className="ra-link" onClick={retake}>
                          <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
                          Retake
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="mD-btn mD-btn--primary mD-btn--lg"
                        onClick={toStart}
                      >
                        Start the assessment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
