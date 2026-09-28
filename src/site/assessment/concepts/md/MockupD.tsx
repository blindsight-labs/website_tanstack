/* Mockup D · "Lens · Scale" — the Blindsight mark, whole, rides the summit and grows into a lens
   that holds the whole berg; the camera pulls back exponentially, and the page darkens with
   depth.

   The render IS the page. Above the waterline it is the white sheet the header sits on; below
   it the water starts as the page's light grey and darkens continuously with depth to
   near-black at the keel — so the deeper the frame reaches as the camera pulls back, the darker
   the page. The copy below the header scrolls over that water and reads the grey behind it:
   every line (each label, heading, paragraph, list row) samples the render at its own height
   and sets its ink, dark on the light water near the surface, light in the deep. At the top
   the header's bottom edge is the waterline; as the header leaves, the summit drifts up to rest
   near the top of the frame and stays pinned there while the frame reaches deeper below it.
   The berg stands still; the camera's distance grows by the same factor for every screen of
   scroll (a geometric pull-back on a shallow arc — the parallax: near ice, far ice, the mark in
   front and the light on every facet move at their own rates), so each screen holds about
   twice the ice of the one before, the mass runs off the frame's sides through the middle of
   the page, and the whole berg only fits over the last stretch — the end frame is the reveal.
   The mark never turns or opens: it grows until its clear glass holds all of it, lit against
   the dark in the lens's own light, a faint violet. Outside the glass, the answers set how far
   the light reaches below the waterline; past it the ice sinks into water of its depth's grey.
   Over the last quarter the frame outruns the lens's light (the keel comes into view in the
   murk), and as the close settles the scroll sweeps the light down to the keel — the ice lit in
   the violet, the ruler's live tick moving from the answers' edge to the keel — so the page
   lands lit; "Today" on the toggle takes the light back to the answers' edge, the compare. The
   least seen risk is the one the lens flags: the page's one violet, on one node.

   Layout: one sheet; a sticky stage (the render) with the copy scrolling over it. Desktop: copy
   and the quiz on the left, the berg on the right, a depth ruler at the right edge whose metre
   ticks re-space as the scale changes. Phone: the headline and quiz, then the tip in a window
   at the header's foot, then the reveal in solid cards that take the water's grey behind them. */
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

import { CtaButton, Label } from "@/site/shared";
import { IN_VIEW, N, RISKS, seenWord, verdict } from "../../model";
import { QuizCard } from "../../QuizCard";
import type { ConceptProps } from "../types";
import type { LensLayout, LensScene } from "./lensScene";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* the ruler: 1 world unit = 12 m (the tip stands ~25 m above the water; the berg is ~380 m
   summit to keel). Its ticks follow a 1–2–5 series, so as the scale doubles screen by screen
   the labels re-space: metres at the top, hundreds of metres at the end. */
const M_PER_UNIT = 12;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500]; // metres
const BAR_STEPS = [2, 5, 10, 20, 50, 100, 200]; // metres
const TICK_POOL = 16;
const fmtM = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");
/* the water's grey (sRGB 0..1) below which copy over it turns to the light ink: both inks hold
   ≥ 4:1 against the grey there — the FULL inks. Within INK_MID of it (the water's mid greys) the
   body copy takes the full ink too, not the body's muted one, which would vanish there. */
const INK_FLIP = 0.47;
const INK_MID = 0.22;
/* the payoff, from the scene's measures: the tip 2.1 units above the water, the berg 31.5
   summit to keel, 12 m a unit (lensScene.ts TOP / HB / M_PER_UNIT) */
const TIP_M = 25;
const BERG_M = 378;
const TIP_RATIO = 15;
const greyCss = (v: number) => {
  const g = Math.round(clamp(v, 0, 1) * 255);
  return `rgb(${g}, ${g}, ${g})`;
};

type Metrics = {
  W: number;
  H: number;
  wide: boolean;
  textRight: number;
  /** the header's height: its bottom edge (the waterline) at the top of the page */
  hb0: number;
  /** where the waterline is when the move starts (stage y) */
  hbStart: number;
  /** x of the ruler's spine */
  spine: number;
};

export function MockupD({ a, theme }: ConceptProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const seaRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLElement>(null);
  const flagRef = useRef<HTMLSpanElement>(null);
  const gaugeRef = useRef<HTMLSpanElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const lineARef = useRef<SVGPathElement>(null);
  const lineMRef = useRef<SVGPathElement>(null);
  const lineBRef = useRef<SVGPathElement>(null);
  const lineLRef = useRef<SVGPathElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const litTickRef = useRef<HTMLSpanElement>(null);
  const depthRef = useRef<HTMLSpanElement>(null);
  const scaleRef = useRef<HTMLSpanElement>(null);
  const scaleTextRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barTextRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LensScene | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const visRef = useRef(0.28);
  // the close's toggle: the lens's light on (With Blindsight, where the scroll lands it) or
  // back at the answers' edge (Today, the compare)
  const [withBs, setWithBs] = useState(true);
  const withBsRef = useRef(true);

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
  const hidden = RISKS.map((r, i) => ({ r, see: a.see[i] })).filter((x) => x.see < IN_VIEW);
  const s = a.score;
  const dash = "–";
  const whose = typical ? "a typical organization's" : "your";

  /* answers → the light (and the flag's label may change width) */
  useEffect(() => {
    visRef.current = vis;
    sceneRef.current?.setLight(vis, reducedMotion());
    kickRef.current();
  }, [vis, flagged]);

  /* the toggle → the lens's light */
  useEffect(() => {
    withBsRef.current = withBs;
    sceneRef.current?.setReveal(withBs, reducedMotion());
    kickRef.current();
  }, [withBs]);

  /* the scene: built per theme, rendered on demand, paused off-screen */
  useEffect(() => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    const sea = seaRef.current;
    const head = headRef.current;
    const deep = deepRef.current;
    if (!root || !sheet || !track || !stage || !sea || !head || !deep) return;
    const cards = Array.from(deep.querySelectorAll<HTMLElement>(".rmd-card"));
    // the atoms of the copy: each sets its own ink from the water behind it (a list or the
    // numbers row by row, so no atom is taller than the water's mid greys)
    const atoms = cards.flatMap((c) =>
      Array.from(c.children).flatMap((ch) =>
        ch.matches("ul, dl") ? Array.from(ch.children) : [ch],
      ),
    ) as HTMLElement[];
    // hydration renders "light"; a dark page re-renders with "dark" a moment later: wait for it
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    let disposed = false;
    let cleanup = () => {};
    // a fresh canvas each time: a released context's canvas cannot be reused
    const canvas = document.createElement("canvas");
    canvas.className = "rmd-canvas";
    sea.after(canvas);
    const fail = () => {
      if (disposed) return;
      stage.dataset.fallback = "true";
      canvas.remove();
    };

    import("./lensScene")
      .then(async (mod) => {
        if (disposed) return;
        const cs = getComputedStyle(root);
        const dark = theme === "dark";
        // no WebGL (or a failed build): the quiet fallback, the page stays usable
        const scene = await mod
          .createLensScene(canvas, {
            theme,
            sky: getComputedStyle(sheet).backgroundColor || (dark ? "#0d0d10" : "#f4f4f5"),
            surf: cs.getPropertyValue("--rmd-surf").trim() || (dark ? "#1b1b20" : "#e6e8ec"),
            deep: cs.getPropertyValue("--rmd-deep").trim() || (dark ? "#020203" : "#050506"),
            ink: cs.getPropertyValue("--ink").trim() || (dark ? "#f4f4f6" : "#0b0b0d"),
            signal: cs.getPropertyValue("--signal").trim() || (dark ? "#a08cff" : "#6e4bff"),
            lensLight: cs.getPropertyValue("--rmd-v1").trim() || (dark ? "#a08cff" : "#c9bfff"),
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
        scene.setReveal(withBsRef.current, true);
        const closeCard = closeRef.current?.querySelector<HTMLElement>(".rmd-card") ?? null;

        let m: Metrics = { W: 1, H: 1, wide: true, textRight: 0, hb0: 1, hbStart: 1, spine: 1 };
        const measure = () => {
          const sr = stage.getBoundingClientRect();
          const W = sr.width;
          const H = sr.height;
          const wide = W >= 880; // the stage is the viewport less the sheet's inset (CSS: 900px)
          const col = colRef.current;
          const textRight = wide && col ? col.getBoundingClientRect().right - sr.left : 0;
          // the flow starts at the stage's top, so the header's height is its bottom edge's
          // stage y when the page is at the top
          const hb0 = head.getBoundingClientRect().height;
          const hbStart = Math.min(hb0, H * (wide ? 0.86 : 0.7));
          const tipWin = tipRef.current?.getBoundingClientRect().height ?? 0;
          const spine = W - (wide ? 46 : 34);
          // phone: the close card stands at the foot of the screen; the whole lens must sit
          // above it (and under the nav), so the end frame is what the card leaves free
          const closeH = closeCard?.getBoundingClientRect().height ?? H * 0.5;
          const l: LensLayout = wide
            ? {
                W,
                H,
                r0: { x0: textRight + 48, x1: spine - 40, y0: 36, y1: hbStart },
                r1: { x0: textRight + 56, x1: spine - 36, y0: 26, y1: H - 26 },
                top: 30,
              }
            : {
                W,
                H,
                // the tip stands in the window at the header's foot
                r0: {
                  x0: 14,
                  x1: spine - 10,
                  y0: hbStart - Math.max(120, tipWin) + 14,
                  y1: hbStart,
                },
                r1: {
                  x0: 10,
                  x1: spine - 8,
                  y0: 20,
                  y1: Math.max(H * 0.3, Math.min(H * 0.52, H - closeH - 40)),
                },
                top: 16,
              };
          m = { W, H, wide, textRight, hb0, hbStart, spine };
          scene.resize(l);
        };

        /* scroll → the move. q: px scrolled since the move started (the header's edge reached
           hbStart). Until then the camera holds (phone: the tip rides up with the page). Then e
           runs LINEARLY with the scroll over the whole track (the last tenth of a screen holds
           the end frame): the scene turns e into a geometric pull-back, so every screen of
           scroll pulls back by the same factor and the whole berg only fits at the very end. */
        const view = (sr: DOMRect, tr: DOMRect, hb: number) => {
          const q = m.hbStart - hb;
          if (q <= 0) return { e: 0, q };
          const total = tr.height - sr.height;
          const q1 = Math.max(1, total - (m.hb0 - m.hbStart) - m.H * 0.1);
          const x = clamp(q / q1, 0, 1);
          // a short ease-in so the move starts without a jolt, then straight
          const A = 0.06;
          const e = (x < A ? (x * x) / (2 * A) : x - A / 2) / (1 - A / 2);
          return { e, q };
        };

        const tone = (el: Element | null | undefined, under: boolean) => {
          if (!el) return;
          const h = el as HTMLElement | SVGElement;
          const v = under ? "1" : "0";
          if (h.dataset.u !== v) h.dataset.u = v;
        };
        // copy over the water: its side (data-u), and whether the water behind it is one of the
        // mid greys, where the body copy takes the full ink (data-m)
        const inkFor = (el: HTMLElement, v: number) => {
          tone(el, v < INK_FLIP);
          const mid = Math.abs(v - INK_FLIP) < INK_MID ? "1" : "0";
          if (el.dataset.m !== mid) el.dataset.m = mid;
        };

        /* the depth ruler at the stage's right edge, and the scale */
        let lastScale = "";
        let lastBar = "";
        let lastLit = "";
        const ruler = (y: number, q: number) => {
          const box = rulerRef.current;
          if (!box) return;
          // phone: the header's copy runs the full width, so the ruler waits for the move
          box.style.opacity = m.wide ? "1" : smooth(q / 80).toFixed(3);
          const { H, spine } = m;
          const sc = scene.scale();
          const pxPerM = sc.now / M_PER_UNIT;
          const top0 = 34;
          const bot0 = H - 54;
          // the ticks re-space with the scale (the 1–2–5 series): metres at the header's
          // scale, hundreds of metres at the end — the ruler tells the scale story
          const minor = STEPS.find((v) => v * pxPerM >= 7) ?? 500;
          const major = STEPS.find((v) => v >= minor && v % minor === 0 && v * pxPerM >= 40) ?? 500;
          const vTop = (y - top0) / pxPerM; // metres above the waterline at the ruler's top
          const vBot = (y - bot0) / pxPerM;
          // the spine in three inks: on the sky, on the light water, on the dark water (the
          // stage y where the water passes mid grey moves with the depth the frame reaches)
          const yMid = clamp(scene.waterY(INK_FLIP), top0, bot0);
          const yc = clamp(y, top0, bot0);
          let la = y > top0 ? `M${spine} ${top0}V${yc.toFixed(1)}` : "";
          let lm = yMid > yc ? `M${spine} ${yc.toFixed(1)}V${yMid.toFixed(1)}` : "";
          let lb = yMid < bot0 ? `M${spine} ${Math.max(yc, yMid).toFixed(1)}V${bot0}` : "";
          // the edge of the light shown (the answers set it; the lens's light at the close
          // takes it to the keel): the ruler's live tick, in the violet
          const gq = scene.reach();
          const litOn = gq.y > y + 6 && gq.y > top0 + 8 && gq.y < bot0 - 8;
          const litTick = litTickRef.current;
          if (litTick) {
            const t = litOn ? `−${Math.round(gq.d * M_PER_UNIT)}` : "";
            if (t !== lastLit) {
              litTick.textContent = t;
              lastLit = t;
            }
            litTick.style.opacity = litOn ? "1" : "0";
            if (litOn) {
              litTick.style.transform = `translate3d(${spine + 6}px, ${(gq.y - 6.5).toFixed(1)}px, 0)`;
              tone(litTick, scene.water(gq.y) < INK_FLIP);
            }
          }
          const ll = litOn ? `M${spine} ${gq.y.toFixed(1)}h-18` : "";
          lineLRef.current?.setAttribute("d", ll);
          if (lineLRef.current) tone(lineLRef.current, scene.water(gq.y) < INK_FLIP);
          let n = 0;
          for (let k = Math.ceil(vBot / minor); k * minor <= vTop; k++) {
            const v = k * minor;
            const ty = y - v * pxPerM;
            const big = v % major === 0;
            const len = v === 0 ? 14 : big ? 8 : 4;
            const d = `M${spine} ${ty.toFixed(1)}h${-len}`;
            if (ty < y - 0.5) la += d;
            else if (ty < yMid) lm += d;
            else lb += d;
            // (a label gives way to the live tick's)
            if (big && n < TICK_POOL && !(litOn && Math.abs(ty - gq.y) < 15)) {
              const el = tickRefs.current[n++];
              if (el) {
                const t = fmtM(v);
                if (el.textContent !== t) el.textContent = t;
                el.style.transform = `translate3d(${spine + 6}px, ${(ty - 6.5).toFixed(1)}px, 0)`;
                el.style.opacity = "1";
                tone(el, scene.water(ty) < INK_FLIP);
              }
            }
          }
          for (; n < TICK_POOL; n++) {
            const el = tickRefs.current[n];
            if (el && el.style.opacity !== "0") el.style.opacity = "0";
          }
          lineARef.current?.setAttribute("d", la);
          lineMRef.current?.setAttribute("d", lm);
          lineBRef.current?.setAttribute("d", lb);
          tone(depthRef.current, scene.water(20) < INK_FLIP);
          tone(scaleRef.current, scene.water(H - 30) < INK_FLIP);
          // the scale: 1 : n against the header's frame, and a bar in metres
          const zoom = sc.start / sc.now;
          const txt = `1 : ${zoom < 9.95 ? zoom.toFixed(1) : Math.round(zoom)}`;
          if (txt !== lastScale && scaleTextRef.current) {
            scaleTextRef.current.textContent = txt;
            lastScale = txt;
          }
          const barM = [...BAR_STEPS].reverse().find((v) => v * pxPerM <= 88) ?? BAR_STEPS[0];
          if (barRef.current) barRef.current.style.width = `${(barM * pxPerM).toFixed(1)}px`;
          const bar = `${barM} m`;
          if (bar !== lastBar && barTextRef.current) {
            barTextRef.current.textContent = bar;
            lastBar = bar;
          }
        };

        /* the labels that ride on the scene */
        const labels = (sr: DOMRect, e: number, y: number, cardRects: DOMRect[]) => {
          // phone: keep clear of the quiz card above the tip's window
          const cb = colRef.current?.getBoundingClientRect().bottom ?? sr.top;
          const top = m.wide ? 0 : Math.max(0, cb - sr.top);
          const minX = m.wide ? m.textRight + 16 : 12;
          const maxX = m.spine - 12;
          const flag = flagRef.current;
          if (flag) {
            const f = scene.flag();
            const w = flag.offsetWidth;
            const h = flag.offsetHeight;
            const g = f.r + 10;
            // the label sits outside the lens, off the node: the side facing away from its
            // centre first (a side-by-side label is preferred to one above or below)
            const ox = f.x - f.cx;
            const oy = f.y - f.cy;
            const ol = Math.hypot(ox, oy) || 1;
            // best: straight out from the node, clear of the whole ring
            const ux = ox / ol;
            const uy = oy / ol;
            const reach = f.ring + 10 + Math.abs(ux) * (w / 2) + Math.abs(uy) * (h / 2);
            const out = [f.cx + ux * reach - w / 2, f.cy + uy * reach - h / 2];
            const spots = [
              { d: [ux * 3, uy * 3], at: out },
              { d: [1, 0], at: [f.x + g, f.y - h / 2] },
              { d: [-1, 0], at: [f.x - g - w, f.y - h / 2] },
              { d: [0, -1], at: [f.x - w / 2, f.y - g - h] },
              { d: [0, 1], at: [f.x - w / 2, f.y + g] },
            ]
              .map((c) => ({
                at: c.at,
                score: (c.d[0] * ox + c.d[1] * oy) / ol + (c.d[0] !== 0 ? 0.6 : 0),
              }))
              .sort((p1, p2) => p2.score - p1.score)
              .map((c) => c.at);
            const inFrame = ([x, fy]: number[]) =>
              x >= minX && x + w <= maxX && fy >= top + 8 && fy + h <= m.H - 8;
            // outside the ring: the nearest point of the chip is past the ring's reach
            const clear = ([x, fy]: number[]) => {
              const nx = clamp(f.cx, x, x + w) - f.cx;
              const ny = clamp(f.cy, fy, fy + h) - f.cy;
              return Math.hypot(nx, ny) >= f.ring + 4;
            };
            const [x, fy] = spots.find((p) => inFrame(p) && clear(p)) ??
              spots.find(inFrame) ?? [
                clamp(spots[0][0], minX, maxX - w),
                clamp(spots[0][1], top + 8, m.H - 8 - h),
              ];
            flag.style.transform = `translate3d(${x.toFixed(1)}px, ${fy.toFixed(1)}px, 0)`;
            // and never over a card (phone: a card leaving the frame passes under it)
            const onCard = cardRects.some(
              (r) =>
                r.right - sr.left > x &&
                r.left - sr.left < x + w &&
                r.bottom - sr.top > fy &&
                r.top - sr.top < fy + h,
            );
            flag.style.opacity = f.y > top + 8 && f.y < m.H - 8 && !onCard ? "1" : "0";
            // solid, in the water's own grey behind it; its ink follows
            const wv = scene.water(fy + h / 2);
            flag.style.setProperty("--rmd-w", greyCss(wv));
            tone(flag, wv < INK_FLIP);
          }
          const gauge = gaugeRef.current;
          if (gauge) {
            const gq = scene.gauge();
            const f = scene.flag();
            const w = gauge.offsetWidth;
            const h = gauge.offsetHeight;
            const x = Math.max(minX, gq.x - 6 - w);
            gauge.style.transform = `translate3d(${x.toFixed(1)}px, ${(gq.y - h / 2).toFixed(1)}px, 0)`;
            // it fades as the lens takes over the whole berg (unless the lens's light is off:
            // then the edge of the light shows inside the glass too), and whenever the orbit
            // (its nodes included) would pass through it (phone: the ring runs close to the
            // flank)
            const nx = clamp(f.cx, x, x + w) - f.cx;
            const ny = clamp(f.cy, gq.y - h / 2, gq.y + h / 2) - f.cy;
            const far = Math.hypot(
              Math.max(Math.abs(x - f.cx), Math.abs(x + w - f.cx)),
              Math.max(Math.abs(gq.y - h / 2 - f.cy), Math.abs(gq.y + h / 2 - f.cy)),
            );
            const onRing = Math.hypot(nx, ny) < f.ring + 6 && far > f.ring - 2 * f.r - 6;
            // and never under a card (phone: a card would clip it to a stray letter)
            const gy0 = gq.y - h / 2;
            const onCard = cardRects.some(
              (r) =>
                r.right - sr.left > x &&
                r.left - sr.left < x + w &&
                r.bottom - sr.top > gy0 &&
                r.top - sr.top < gy0 + h,
            );
            const on =
              gq.y > Math.max(top, y) + 10 && gq.y < m.H - 10 && !onRing && !onCard
                ? Math.max(1 - smooth((e - 0.72) / 0.2), 1 - scene.reveal())
                : 0;
            gauge.style.opacity = on.toFixed(3);
            tone(gauge, scene.water(gq.y) < INK_FLIP);
          }
        };

        let raf = 0;
        let last = 0;
        let onScreen = true;
        const frame = (now: number) => {
          raf = 0;
          const dt = last ? now - last : 16;
          last = now;
          // read the layout first, then write
          const sr = stage.getBoundingClientRect();
          const tr = track.getBoundingClientRect();
          const hb = head.getBoundingClientRect().bottom - sr.top;
          const cardRects = cards.map((c) => c.getBoundingClientRect());
          const atomRects = m.wide ? atoms.map((el) => el.getBoundingClientRect()) : [];
          const v = view(sr, tr, hb);
          const y = scene.setView(v.e, hb);
          const moving = scene.step(dt);
          scene.render();
          // the page's edge: the water sheet under the render starts at the waterline
          stage.style.setProperty("--rmd-wl", `${y.toFixed(2)}px`);
          // the copy crosses the waterline as it scrolls (each step holds, then leaves through
          // the sky band); its ink follows the grey behind it, never a fade
          cards.forEach((c, i) => {
            if (!m.wide) {
              // phone: the card is solid, in the water's grey behind its middle; its copy follows
              const wv = scene.water((cardRects[i].top + cardRects[i].bottom) / 2 - sr.top);
              c.style.setProperty("--rmd-w", greyCss(wv));
              inkFor(c, wv);
            } else if (c.dataset.u) {
              delete c.dataset.u;
              delete c.dataset.m;
              c.style.removeProperty("--rmd-w");
            }
          });
          // the copy reads the water behind it, line by line: dark ink on the light water near
          // the surface, light ink in the deep — the page darkens with depth and the ink follows
          if (m.wide) {
            atoms.forEach((el, i) => {
              const r = atomRects[i];
              if (r.height > 0) inkFor(el, scene.water((r.top + r.bottom) / 2 - sr.top));
            });
          } else {
            atoms.forEach((el) => {
              if (el.dataset.u) delete el.dataset.u;
              if (el.dataset.m) delete el.dataset.m;
            });
          }
          labels(sr, v.e, y, cardRects);
          ruler(y, v.q);
          if (root.dataset.live !== "true") root.dataset.live = "true";
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
        ro.observe(head); // the quiz card's height moves the header's edge
        if (closeCard) ro.observe(closeCard); // phone: the close card sets the end frame
        const io = new IntersectionObserver(([en]) => {
          onScreen = en.isIntersecting;
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
      delete root.dataset.live;
      stage.style.removeProperty("--rmd-wl");
      cards.forEach((c) => {
        c.style.removeProperty("--rmd-w");
        delete c.dataset.u;
        delete c.dataset.m;
      });
      atoms.forEach((el) => {
        delete el.dataset.u;
        delete el.dataset.m;
      });
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
    <div className="rmd" ref={rootRef}>
      <div className="mD-sheet rmd-sheet" ref={sheetRef}>
        <div className="rmd-track" ref={trackRef}>
          {/* the render: sticky behind the copy (the canvas is added on the client) */}
          <div className="rmd-stage" ref={stageRef} aria-hidden="true">
            {/* the water: the sheet from the waterline down, light grey at the surface to
                near-black in the deep (the render paints the same greys over it; it carries the
                page when there is no render) */}
            <div className="mD-sheet--inverse rmd-sea" ref={seaRef} />
            <svg className="rmd-fallback" viewBox="0 0 400 300" focusable="false">
              <line x1="0" y1="232" x2="400" y2="232" className="rmd-fallback__line" />
              <path
                className="rmd-fallback__berg"
                d="M72 232 L118 196 L136 170 L152 176 L186 118 L204 92 L226 58 L238 84 L262 132 L284 150 L304 194 L336 232"
              />
            </svg>
            <div className="rmd-ruler" ref={rulerRef}>
              <svg className="rmd-ruler__svg">
                <path className="rmd-ruler__a" ref={lineARef} />
                <path className="rmd-ruler__m" ref={lineMRef} />
                <path className="rmd-ruler__b" ref={lineBRef} />
                <path className="rmd-ruler__lit" ref={lineLRef} />
              </svg>
              {Array.from({ length: TICK_POOL }, (_, k) => (
                <span
                  key={k}
                  className="rmd-tick"
                  ref={(el) => {
                    tickRefs.current[k] = el;
                  }}
                />
              ))}
              <span className="rmd-tick rmd-tick--lit" ref={litTickRef} />
              <span className="rmd-depth" ref={depthRef}>
                Depth · m
              </span>
              <span className="rmd-scale" ref={scaleRef}>
                <span className="rmd-scale__k">Scale</span>
                <span ref={scaleTextRef}>1 : 1.0</span>
                <span className="rmd-scale__bar" ref={barRef} />
                <span ref={barTextRef}>10 m</span>
              </span>
            </div>
            <span className="rmd-gauge" ref={gaugeRef}>
              <span className="rmd-gauge__t">{gaugeText}</span>
              <span className="rmd-gauge__tick" />
            </span>
            <span className="rmd-flag" ref={flagRef}>
              <span className="rmd-flag__k">
                <span className="rmd-flag__dot" aria-hidden="true" />
                Flagged
              </span>
              <span className="rmd-flag__v">{flagRisk.name}</span>
            </span>
          </div>

          <div className="rmd-flow">
            {/* 01 · the header, on the white: its bottom edge is the waterline */}
            <header className="rmd-head" ref={headRef}>
              <div className="mD-container">
                <div className="rmd-col" ref={colRef}>
                  <Label>Free AI exposure assessment</Label>
                  <h1 className="rmd-title">You see the tip. Your AI risk is the rest.</h1>
                  <p className="mD-lead rmd-lead">
                    Eight questions, about two minutes: how much of your AI exposure you can see
                    today, and how much of it you could prevent.
                  </p>
                  <div className="rmd-quiz">
                    <QuizCard a={a} onReveal={toClose} revealLabel="See all of it" />
                  </div>
                </div>
              </div>
              {/* phone: the tip stands here, on the waterline */}
              <div className="rmd-tipwin" ref={tipRef} />
            </header>

            {/* 02–06 · below the waterline, on the water */}
            <div className="rmd-deep" ref={deepRef}>
              {/* each step holds its card in frame for a stretch of the scroll (a sticky hold
                  of a fixed height, so the ranges do not depend on the card's height) */}
              <section className="rmd-step rmd-step--2" aria-labelledby="rmd-s1">
                <div className="rmd-hold">
                  <div className="mD-container">
                    <div className="rmd-col rmd-card">
                      <Label n="02">The waterline</Label>
                      <h2 className="mD-h2 rmd-h2" id="rmd-s1">
                        Above the waterline is what you already see.
                      </h2>
                      <p className="rmd-p">
                        Approved tools, vendors under contract, the policy people signed. Your
                        answers set how far the light reaches below it. Past that, the water goes
                        dark.
                      </p>
                      <p className="rmd-stat">
                        <strong>
                          {a.inView} of {N}
                        </strong>{" "}
                        risks in view
                        {typical ? " for a typical organization" : a.done ? "" : " so far"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rmd-step rmd-step--3" aria-labelledby="rmd-s2">
                <div className="rmd-hold">
                  <div className="mD-container">
                    <div className="rmd-col rmd-card">
                      <Label n="03">Below it</Label>
                      <h2 className="mD-h2 rmd-h2" id="rmd-s2">
                        Below it sits the AI nobody registered.
                      </h2>
                      {hidden.length > 0 ? (
                        <>
                          <p className="rmd-p">
                            {hidden.length} of {N} risks sit below {whose} waterline. This is where
                            incidents usually surface.
                          </p>
                          <ul className="rmd-list">
                            {hidden.map(({ r, see }) => (
                              <li key={r.id}>
                                <span>{r.name}</span>
                                <span>Seen · {seenWord(see)}</span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="rmd-p">
                          By your answers, no risk sits fully below the waterline. The deep is still
                          where new ones show up first: the next plugin, the next agent.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* 04 · the scale: the frame doubles screen by screen and the mass keeps going */}
              <section className="rmd-step rmd-step--4" aria-labelledby="rmd-s3">
                <div className="rmd-hold">
                  <div className="mD-container">
                    <div className="rmd-col rmd-card">
                      <Label n="04">The mass</Label>
                      <h2 className="mD-h2 rmd-h2" id="rmd-s3">
                        And it keeps going.
                      </h2>
                      <p className="rmd-p">
                        Every screen down, the frame holds twice as much ice. Most of an
                        organization&rsquo;s AI exposure sits here: the agents and plugins nobody
                        registered, the prompts nobody logged, the fields nobody masked.
                      </p>
                      <p className="rmd-stat">
                        <strong>{100 - pct}%</strong> of {whose} exposure below the light
                        {typical || a.done ? "" : " so far"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rmd-step rmd-step--5" aria-labelledby="rmd-s4">
                <div className="rmd-hold">
                  <div className="mD-container">
                    <div className="rmd-col rmd-card">
                      <Label n="05">The lens</Label>
                      <h2 className="mD-h2 rmd-h2" id="rmd-s4">
                        Blindsight opens the view below.
                      </h2>
                      <p className="rmd-p">
                        It sits between your people, your agents and every model, so what it sees it
                        can act on: shadow tools flagged, sensitive fields masked, hidden
                        instructions stripped, unsafe tool calls blocked, every event logged and
                        sealed.
                      </p>
                      <p className="rmd-p">
                        Right now it is flagging <strong>{flagRisk.name}</strong>, the risk
                        {typical ? " a typical organization sees" : " you see"} least:{" "}
                        {lowerFirst(flagRisk.bs.action)}.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* 06 · the close: the whole berg inside the lens, and the numbers */}
              <section className="rmd-close" ref={closeRef} aria-labelledby="rmd-close">
                <div className="mD-container">
                  <div className="rmd-col rmd-card">
                    <Label n="06">All of it</Label>
                    <h2 className="mD-h2 rmd-h2" id="rmd-close">
                      With Blindsight, you see all of it.
                    </h2>
                    {/* the payoff: the scale the page just crossed */}
                    <p className="rmd-stat rmd-payoff">
                      Tip {TIP_M} m · Berg {BERG_M} m · {TIP_RATIO}× the tip
                    </p>
                    {/* the lens's light, off and on: the glass shows the murk as outside, or the
                        ice to the keel */}
                    <div className="rmd-mode" role="group" aria-label="Show the berg">
                      <button
                        type="button"
                        className="rmd-mode__b"
                        aria-pressed={!withBs}
                        onClick={() => setWithBs(false)}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        className="rmd-mode__b"
                        aria-pressed={withBs}
                        onClick={() => setWithBs(true)}
                      >
                        <span className="rmd-mode__dot" aria-hidden="true" />
                        With Blindsight
                      </button>
                    </div>
                    <dl className="ra-nums rmd-nums" data-mode={withBs ? "bs" : "today"}>
                      <div>
                        <dt>Seen today</dt>
                        <dd>{a.done ? `${s.seen}%` : dash}</dd>
                      </div>
                      <div>
                        <dt>Prevented today</dt>
                        <dd>{a.done ? `${s.prevented}%` : dash}</dd>
                      </div>
                      <div className="rmd-nums__bs">
                        <dt>With Blindsight</dt>
                        <dd>
                          {a.done ? `${s.withPrevented}%` : dash}
                          <span className="ra-est">est.</span>
                        </dd>
                      </div>
                    </dl>
                    <p className="rmd-p">
                      {a.done
                        ? `${verdict(s)} With runtime controls, about ${s.withPrevented}% of it could be prevented (est.).`
                        : `Answer all eight questions to see your own numbers. ${a.answered} of ${N} answered.`}
                    </p>
                    <div className="rmd-actions">
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
    </div>
  );
}
