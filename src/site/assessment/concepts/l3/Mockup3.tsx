/* Mockup 3 · "Lens · Aperture" — the Blindsight mark opens like an aperture on the berg.

   Octane's rhythm, made literal: above the waterline the page is the white sheet, below it the
   water is the black sheet. The render IS the page: its sky and sea are the sheets' colours, and
   the white/black edge in the render is the waterline. At the top the header's bottom edge is
   that waterline; as you scroll it rises with the header (never ahead of it, so the header's
   copy always sits on white and the copy below always sits on black) and settles high in the
   frame. The berg stands still; the camera pulls straight back; the mark on the tip opens
   (its arcs turn and slide apart) until its clear disc holds the whole berg, lit against the
   black. Outside the aperture, the answers set how far the light reaches below the waterline.
   The least seen risk is the one the aperture flags: the page's one violet, on one node.

   Layout: one sheet; a sticky stage (the render) with the copy scrolling over it. Desktop: copy
   and the quiz on the left, the berg on the right, a depth ruler at the right edge. Phone: the
   headline and quiz, then the tip in a window at the header's foot, then the reveal in glass
   cards on the black. */
import { useEffect, useRef } from "react";
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

/* the ruler: 1 world unit = 12 m (the berg is ~170 m summit to keel) */
const M_PER_UNIT = 12;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200]; // metres
const BAR_STEPS = [2, 5, 10, 20, 50]; // metres
const TICK_POOL = 16;
const fmtM = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");

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

export function Mockup3({ a, theme }: ConceptProps) {
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
  const lineBRef = useRef<SVGPathElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const depthRef = useRef<HTMLSpanElement>(null);
  const scaleRef = useRef<HTMLSpanElement>(null);
  const scaleTextRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barTextRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LensScene | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const visRef = useRef(0.28);

  // what the organization already sees (answers, typical baselines while unanswered)
  const vis = a.see.reduce((sum, x) => sum + x, 0) / a.see.length;
  const pct = Math.round(vis * 100);
  // the risk the aperture flags: the one seen least (ties keep question order)
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

  /* answers → the light (and the flag's label may change width) */
  useEffect(() => {
    visRef.current = vis;
    sceneRef.current?.setLight(vis, reducedMotion());
    kickRef.current();
  }, [vis, flagged]);

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
    const cards = Array.from(deep.querySelectorAll<HTMLElement>(".rl3-card"));
    // hydration renders "light"; a dark page re-renders with "dark" a moment later: wait for it
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    let disposed = false;
    let cleanup = () => {};
    // a fresh canvas each time: a released context's canvas cannot be reused
    const canvas = document.createElement("canvas");
    canvas.className = "rl3-canvas";
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
            sky: getComputedStyle(sheet).backgroundColor || (dark ? "#0d0d10" : "#ffffff"),
            sea: getComputedStyle(sea).backgroundColor || "#060607",
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
          const l: LensLayout = wide
            ? {
                W,
                H,
                r0: { x0: textRight + 48, x1: spine - 40, y0: 36, y1: hbStart },
                spill: 1.5,
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
                spill: 1.5,
                // the close card takes the lower half
                r1: { x0: 10, x1: spine - 8, y0: 12, y1: H * 0.47 },
                top: 12,
              };
          m = { W, H, wide, textRight, hb0, hbStart, spine };
          scene.resize(l);
        };

        /* scroll → the move. q: px scrolled since the move started (the header's edge reached
           hbStart). Until then the waterline is the header's edge and the camera holds (phone:
           the tip rides up with the page). Then the waterline keeps rising, first at exactly the
           header's pace, easing to rest high in the frame (it never passes the header's edge);
           the pull-back and the aperture run on e over the whole track. */
        const view = (sr: DOMRect, tr: DOMRect, hb: number) => {
          const q = m.hbStart - hb;
          if (q <= 0) return { e: 0, y: hb, q };
          const Y1 = scene.endWaterline();
          const A = Math.max(0, m.hbStart - Y1);
          const u = clamp(q / Math.max(1, 2 * A), 0, 1);
          const y = Y1 + A * (1 - u) * (1 - u);
          const total = tr.height - sr.height;
          const q1 = Math.max(1, total - (m.hb0 - m.hbStart) - m.H * 0.1);
          const x = clamp(q / q1, 0, 1);
          // a short ease-in, then a long ease-out: a confident start and a soft landing
          const xe = (x < 0.08 ? (x * x) / 0.16 : x - 0.04) / 0.96;
          const e = 1 - Math.pow(1 - xe, 2.4);
          return { e, y, q };
        };

        const tone = (el: Element | null | undefined, under: boolean) => {
          if (!el) return;
          const h = el as HTMLElement | SVGElement;
          const v = under ? "1" : "0";
          if (h.dataset.u !== v) h.dataset.u = v;
        };

        /* the depth ruler at the stage's right edge, and the scale */
        let lastScale = "";
        let lastBar = "";
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
          const minor = STEPS.find((v) => v * pxPerM >= 7) ?? 200;
          const major = STEPS.find((v) => v >= minor && v % minor === 0 && v * pxPerM >= 40) ?? 200;
          const vTop = (y - top0) / pxPerM; // metres above the waterline at the ruler's top
          const vBot = (y - bot0) / pxPerM;
          let la = y > top0 ? `M${spine} ${top0}V${clamp(y, top0, bot0).toFixed(1)}` : "";
          let lb = y < bot0 ? `M${spine} ${Math.max(top0, y).toFixed(1)}V${bot0}` : "";
          let n = 0;
          for (let k = Math.ceil(vBot / minor); k * minor <= vTop; k++) {
            const v = k * minor;
            const ty = y - v * pxPerM;
            const big = v % major === 0;
            const len = v === 0 ? 14 : big ? 8 : 4;
            const d = `M${spine} ${ty.toFixed(1)}h${-len}`;
            if (ty < y - 0.5) la += d;
            else lb += d;
            if (big && n < TICK_POOL) {
              const el = tickRefs.current[n++];
              if (el) {
                const t = fmtM(v);
                if (el.textContent !== t) el.textContent = t;
                el.style.transform = `translate3d(${spine + 6}px, ${(ty - 6.5).toFixed(1)}px, 0)`;
                el.style.opacity = "1";
                tone(el, ty > y + 0.5);
              }
            }
          }
          for (; n < TICK_POOL; n++) {
            const el = tickRefs.current[n];
            if (el && el.style.opacity !== "0") el.style.opacity = "0";
          }
          lineARef.current?.setAttribute("d", la);
          lineBRef.current?.setAttribute("d", lb);
          tone(depthRef.current, 20 > y);
          tone(scaleRef.current, H - 30 > y);
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
        const labels = (sr: DOMRect, e: number, y: number) => {
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
            // the label sits outside the aperture, off the node: the side facing away from its
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
            flag.style.opacity = f.y > top + 8 && f.y < m.H - 8 ? "1" : "0";
            // solid: black on the sea, white on the sky
            tone(flag, fy + h / 2 > y);
          }
          const gauge = gaugeRef.current;
          if (gauge) {
            const gq = scene.gauge();
            const w = gauge.offsetWidth;
            const h = gauge.offsetHeight;
            const x = Math.max(minX, gq.x - 6 - w);
            gauge.style.transform = `translate3d(${x.toFixed(1)}px, ${(gq.y - h / 2).toFixed(1)}px, 0)`;
            // it fades as the aperture takes over the whole berg
            const on =
              gq.y > Math.max(top, y) + 10 && gq.y < m.H - 10 ? 1 - smooth((e - 0.72) / 0.2) : 0;
            gauge.style.opacity = on.toFixed(3);
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
          const cardTops = cards.map((c) => c.getBoundingClientRect().top - sr.top);
          const v = view(sr, tr, hb);
          scene.setView(v.e, v.y);
          const moving = scene.step(dt);
          scene.render();
          // the page's white/black edge: the sea sheet under the render
          stage.style.setProperty("--rl3-wl", `${v.y.toFixed(2)}px`);
          // the copy on the black fades out whole before its top reaches the white: it is never
          // cut, and no letter of it ever sits on the white
          cards.forEach((c, i) => {
            const o = smooth((cardTops[i] - v.y - 10) / 90).toFixed(3);
            if (c.style.opacity !== o) c.style.opacity = o;
          });
          labels(sr, v.e, v.y);
          ruler(v.y, v.q);
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
      stage.style.removeProperty("--rl3-wl");
      cards.forEach((c) => c.style.removeProperty("opacity"));
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
    <div className="rl3" ref={rootRef}>
      <div className="mD-sheet rl3-sheet" ref={sheetRef}>
        <div className="rl3-track" ref={trackRef}>
          {/* the render: sticky behind the copy (the canvas is added on the client) */}
          <div className="rl3-stage" ref={stageRef} aria-hidden="true">
            {/* the water: the black sheet, from the waterline down (the render paints the same
                black over it; it carries the page when there is no render, and turns the nav
                black when it passes under it) */}
            <div className="mD-sheet--inverse rl3-sea" ref={seaRef} />
            <svg className="rl3-fallback" viewBox="0 0 400 300" focusable="false">
              <line x1="0" y1="232" x2="400" y2="232" className="rl3-fallback__line" />
              <path
                className="rl3-fallback__berg"
                d="M72 232 L118 196 L136 170 L152 176 L186 118 L204 92 L226 58 L238 84 L262 132 L284 150 L304 194 L336 232"
              />
            </svg>
            <div className="rl3-ruler" ref={rulerRef}>
              <svg className="rl3-ruler__svg">
                <path className="rl3-ruler__a" ref={lineARef} />
                <path className="rl3-ruler__b" ref={lineBRef} />
              </svg>
              {Array.from({ length: TICK_POOL }, (_, k) => (
                <span
                  key={k}
                  className="rl3-tick"
                  ref={(el) => {
                    tickRefs.current[k] = el;
                  }}
                />
              ))}
              <span className="rl3-depth" ref={depthRef}>
                Depth · m
              </span>
              <span className="rl3-scale" ref={scaleRef}>
                <span className="rl3-scale__k">Scale</span>
                <span ref={scaleTextRef}>1 : 1.0</span>
                <span className="rl3-scale__bar" ref={barRef} />
                <span ref={barTextRef}>10 m</span>
              </span>
            </div>
            <span className="rl3-gauge" ref={gaugeRef}>
              <span className="rl3-gauge__t">{gaugeText}</span>
              <span className="rl3-gauge__tick" />
            </span>
            <span className="rl3-flag" ref={flagRef}>
              <span className="rl3-flag__k">Flagged</span>
              <span className="rl3-flag__v">{flagRisk.name}</span>
            </span>
          </div>

          <div className="rl3-flow">
            {/* 01 · the header, on the white: its bottom edge is the waterline */}
            <header className="rl3-head" ref={headRef}>
              <div className="mD-container">
                <div className="rl3-col" ref={colRef}>
                  <Label>Free AI exposure assessment</Label>
                  <h1 className="rl3-title">You see the tip. Your AI risk is the rest.</h1>
                  <p className="mD-lead rl3-lead">
                    Eight questions, about two minutes: how much of your AI exposure you can see
                    today, and how much of it you could prevent.
                  </p>
                  <div className="rl3-quiz">
                    <QuizCard a={a} onReveal={toClose} revealLabel="See all of it" />
                  </div>
                </div>
              </div>
              {/* phone: the tip stands here, on the waterline */}
              <div className="rl3-tipwin" ref={tipRef} />
            </header>

            {/* 02–05 · below the waterline, on the black */}
            <div className="rl3-deep" ref={deepRef}>
              <section className="rl3-step" aria-labelledby="rl3-s1">
                <div className="mD-container">
                  <div className="rl3-col rl3-card">
                    <Label n="02">The waterline</Label>
                    <h2 className="mD-h2 rl3-h2" id="rl3-s1">
                      Above the waterline is what you already see.
                    </h2>
                    <p className="rl3-p">
                      Approved tools, vendors under contract, the policy people signed. Your answers
                      set how far the light reaches below it. Past that, the water is black.
                    </p>
                    <p className="rl3-stat">
                      <strong>
                        {a.inView} of {N}
                      </strong>{" "}
                      risks in view
                      {typical ? " for a typical organization" : a.done ? "" : " so far"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rl3-step" aria-labelledby="rl3-s2">
                <div className="mD-container">
                  <div className="rl3-col rl3-card">
                    <Label n="03">Below it</Label>
                    <h2 className="mD-h2 rl3-h2" id="rl3-s2">
                      Below it sits the AI nobody registered.
                    </h2>
                    {hidden.length > 0 ? (
                      <>
                        <p className="rl3-p">
                          {hidden.length} of {N} risks sit below
                          {typical ? " a typical organization's" : " your"} waterline. This is where
                          incidents usually surface.
                        </p>
                        <ul className="rl3-list">
                          {hidden.map(({ r, see }) => (
                            <li key={r.id}>
                              <span>{r.name}</span>
                              <span>Seen · {seenWord(see)}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="rl3-p">
                        By your answers, no risk sits fully below the waterline. The deep is still
                        where new ones show up first: the next plugin, the next agent.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rl3-step" aria-labelledby="rl3-s3">
                <div className="mD-container">
                  <div className="rl3-col rl3-card">
                    <Label n="04">The aperture</Label>
                    <h2 className="mD-h2 rl3-h2" id="rl3-s3">
                      Blindsight opens the view below.
                    </h2>
                    <p className="rl3-p">
                      It sits between your people, your agents and every model, so what it sees it
                      can act on: shadow tools flagged, sensitive fields masked, hidden instructions
                      stripped, unsafe tool calls blocked, every event logged and sealed.
                    </p>
                    <p className="rl3-p">
                      Right now it is flagging <strong>{flagRisk.name}</strong>, the risk
                      {typical ? " a typical organization sees" : " you see"} least:{" "}
                      {lowerFirst(flagRisk.bs.action)}.
                    </p>
                  </div>
                </div>
              </section>

              {/* 05 · the close: the whole berg inside the open aperture, and the numbers */}
              <section className="rl3-close" ref={closeRef} aria-labelledby="rl3-close">
                <div className="mD-container">
                  <div className="rl3-col rl3-card">
                    <Label n="05">All of it</Label>
                    <h2 className="mD-h2 rl3-h2" id="rl3-close">
                      With Blindsight, you see all of it.
                    </h2>
                    <dl className="ra-nums rl3-nums">
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
                    <p className="rl3-p">
                      {a.done
                        ? `${verdict(s)} With runtime controls, about ${s.withPrevented}% of it could be prevented (est.).`
                        : `Answer all eight questions to see your own numbers. ${a.answered} of ${N} answered.`}
                    </p>
                    <div className="rl3-actions">
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
