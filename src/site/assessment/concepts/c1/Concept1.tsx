/* Concept 1 — "The Pull-back". The purist studio shot, with a scale.

   Header: a macro shot of the summit only, framed in a window on the right of the white sheet;
   the waterline is a crisp horizon low in the frame. Every answer moves the water (the berg
   never moves): the more your organization can see, the lower the water sits on the berg.
   Scroll: one continuous dolly-back (and a slightly wider lens). The window opens to the whole
   sheet and the berg's underwater mass, far wider than its tip, enters the frame from below and
   from the sides. A hairline depth ruler at the stage edge tells the zoom: its ticks re-space,
   the scale reads 1 : 1 → 1 : n, and the eight risks sit on it at their depths (seen above the
   waterline, the rest below, from a.see).
   Close: the whole berg, the result, and a Today / With Blindsight (est.) switch that moves the
   water to where runtime controls would put it.

   Camera maths: frame.ts (pure, so the ruler works without WebGL). Render: scene.ts (dynamic). */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, RotateCcw } from "lucide-react";

import { CtaButton, Label } from "@/site/shared";
import { N, RISKS, verdict } from "../../model";
import { QuizCard } from "../../QuizCard";
import type { Assessment } from "../../useAssessment";
import type { ConceptProps } from "../types";
import {
  M_PER_UNIT,
  camAt,
  clamp01,
  layoutFor,
  ppu,
  riskY,
  screenY,
  smooth,
  waterY,
  type Cam,
  type Layout,
} from "./frame";
import type { BergScene } from "./scene";

const pad2 = (n: number) => String(n).padStart(2, "0");
const NAV = 68;
const TICK_POOL = 28;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500]; // metres
const BAR_STEPS = [5, 10, 20, 50, 100]; // metres

type Target = { see: number[]; water: number };

function targetFor(see: number[], lens: boolean): Target {
  const s = lens ? see.map((x, i) => Math.max(x, RISKS[i].bs.see)) : see;
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return { see: s, water: waterY(avg) };
}

const fmtM = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0");

export function Concept1({ a, theme }: ConceptProps) {
  const [lens, setLens] = useState(false);
  const target = useMemo(() => targetFor(a.see, lens), [a.see, lens]);
  const inView = target.see.filter((s) => s >= 0.5).length;

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const pullRef = useRef<HTMLDivElement>(null);
  const quizRef = useRef<HTMLDivElement>(null);
  const closeInRef = useRef<HTMLElement>(null);
  const closeInnerRef = useRef<HTMLDivElement>(null);
  const closeAfterRef = useRef<HTMLElement>(null);
  const lineARef = useRef<SVGPathElement>(null);
  const lineBRef = useRef<SVGPathElement>(null);
  const dotARef = useRef<SVGPathElement>(null);
  const dotBRef = useRef<SVGPathElement>(null);
  const tickRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const riskRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cornerRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const depthRef = useRef<HTMLSpanElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const scaleTextRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const barTextRef = useRef<HTMLSpanElement>(null);

  // the latest target, for the render loop; and the loop's "draw again"
  const targetRef = useRef<Target>(target);
  const invalidateRef = useRef<() => void>(() => {});
  useEffect(() => {
    targetRef.current = target;
    invalidateRef.current();
  }, [target]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const view = viewRef.current;
    const holder = holderRef.current;
    const pull = pullRef.current;
    if (!root || !stage || !view || !holder || !pull) return;
    // Hydration renders "light"; a dark page re-renders with "dark" a moment later. Don't build
    // a scene for the theme that is about to change.
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let scene: BergScene | null = null;

    // a fresh canvas per theme (a released context's canvas can't be reused)
    const canvas = document.createElement("canvas");
    canvas.className = "rc1-canvas";
    holder.appendChild(canvas);

    /* ---- measurements ---- */
    let L: Layout = layoutFor(1, 1, 0, 0);
    let stickTop = NAV;
    const measure = () => {
      const sr = stage.getBoundingClientRect();
      const W = Math.max(1, sr.width);
      const H = Math.max(1, sr.height);
      const q = quizRef.current?.getBoundingClientRect();
      const c = closeInnerRef.current?.getBoundingClientRect();
      const winLeft = q && q.width > 0 ? q.right - sr.left + 32 : W * 0.46;
      const closeRight = c && c.width > 0 ? c.right - sr.left : W * 0.36;
      L = layoutFor(W, H, winLeft, closeRight);
      stickTop = parseFloat(getComputedStyle(stage).top) || NAV;
      scene?.resize(W, H);
    };

    /* ---- animated state: the water (a spring: buoyancy) and each risk's depth ---- */
    let water = targetRef.current.water;
    let waterV = 0;
    const ys = targetRef.current.see.map((s) => riskY(s, water));
    let first = true;

    const step = (dt: number) => {
      const t = targetRef.current;
      const goals = t.see.map((s) => riskY(s, t.water));
      if (first || reduce) {
        water = t.water;
        waterV = 0;
        goals.forEach((g, i) => (ys[i] = g));
        first = false;
        return false;
      }
      const h = Math.min(0.05, dt / 1000);
      waterV += (-(water - t.water) * 60 - waterV * 10.5) * h;
      water += waterV * h;
      const k = 1 - Math.exp(-h / 0.18);
      let moving = Math.abs(water - t.water) > 0.002 || Math.abs(waterV) > 0.002;
      goals.forEach((g, i) => {
        ys[i] += (g - ys[i]) * k;
        if (Math.abs(g - ys[i]) > 0.003) moving = true;
      });
      if (!moving) {
        water = t.water;
        waterV = 0;
        goals.forEach((g, i) => (ys[i] = g));
      }
      return moving;
    };

    const progress = () => {
      const pr = pull.getBoundingClientRect();
      const S = stage.offsetHeight;
      return clamp01((stickTop + S - pr.top) / Math.max(1, pr.height));
    };

    const tone = (el: Element | null | undefined, under: boolean) => {
      if (!el) return;
      const h = el as HTMLElement | SVGElement;
      const v = under ? "1" : "0";
      if (h.dataset.u !== v) h.dataset.u = v;
    };
    const px = (n: number) => `${n.toFixed(1)}px`;
    let lastScale = "";
    let lastBar = "";

    /* ---- one frame: camera from scroll, water from answers, then the overlay ---- */
    const paint = (cam: Cam, p: number) => {
      const { H, wide } = L;
      const hz = screenY(cam, water);
      const hz1 = screenY(camAt(L, 1), water);
      root.style.setProperty("--rc1-hz", px(hz));
      root.style.setProperty("--rc1-hz1", px(hz1));
      root.style.setProperty("--rc1-p", p.toFixed(4));

      // the header window opens to the whole sheet as the head scrolls away
      const q = wide ? smooth((p - 0.12) / 0.28) : 1;
      const wl = (1 - q) * L.winLeft;
      const wi = (1 - q) * 16;
      const rad = (1 - q) * 6;
      view.style.clipPath = wide
        ? `inset(${px(wi)} ${px(wi)} ${px(wi)} ${px(wl)} round ${px(rad)})`
        : "";
      root.style.setProperty("--rc1-wl", px(wl));
      root.style.setProperty("--rc1-wi", px(wi));
      const top0 = wi + 50;
      const bot0 = H - wi - 60;
      cornerRefs.current.forEach((el, k) => tone(el, (k < 2 ? wi + 14 : H - wi - 14) > hz));
      tone(depthRef.current, wi + 26 > hz);
      tone(scaleRef.current, H - wi - 30 > hz);

      // the ruler: metres from the waterline, ticks re-spaced to the zoom
      const spine = L.spine;
      const pxPerM = ppu(cam) / M_PER_UNIT;
      const minor = STEPS.find((s) => s * pxPerM >= 9) ?? 500;
      const major = STEPS.find((s) => s >= minor && s % minor === 0 && s * pxPerM >= 42) ?? 500;
      const yAt = (sy: number) => cam.camY + ((H / 2 - cam.offY - sy) * cam.Vh) / H;
      const vTop = (yAt(top0) - water) * M_PER_UNIT;
      const vBot = (yAt(bot0) - water) * M_PER_UNIT;
      let la = `M${spine} ${top0}V${Math.max(top0, Math.min(bot0, hz))}`;
      let lb = hz < bot0 ? `M${spine} ${Math.max(top0, hz)}V${bot0}` : "";
      let da = "";
      let db = "";
      let n = 0;
      for (let k = Math.ceil(vBot / minor); k * minor <= vTop; k++) {
        const v = k * minor;
        const y = screenY(cam, water + v / M_PER_UNIT);
        const big = v % major === 0;
        const len = v === 0 ? 16 : big ? 9 : 4;
        const d = `M${spine} ${y.toFixed(1)}h${-len}`;
        if (y < hz - 0.5) la += d;
        else lb += d;
        if (big && n < TICK_POOL) {
          const el = tickRefs.current[n++];
          if (el) {
            const s = fmtM(v);
            if (el.textContent !== s) el.textContent = s;
            el.style.transform = `translate3d(${spine + 6}px, ${(y - 6.5).toFixed(1)}px, 0)`;
            el.style.opacity = "1";
            tone(el, y > hz + 0.5);
          }
        }
      }
      for (; n < TICK_POOL; n++) {
        const el = tickRefs.current[n];
        if (el && el.style.opacity !== "0") el.style.opacity = "0";
      }

      // the eight risks at their depths; labels spread apart, leaders to the true depth
      const gap = wide ? 19 : 17;
      const items = ys.map((y, i) => ({ i, y: screenY(cam, y), above: y > water, ly: 0 }));
      const up = items.filter((it) => it.above).sort((m, o) => o.y - m.y);
      const down = items.filter((it) => !it.above).sort((m, o) => m.y - o.y);
      let prev = hz - 12 + gap;
      up.forEach((it) => {
        it.ly = Math.min(it.y, prev - gap, hz - 12);
        prev = it.ly;
      });
      prev = hz + 12 - gap;
      down.forEach((it) => {
        it.ly = Math.max(it.y, prev + gap, hz + 12);
        prev = it.ly;
      });
      const lx = spine - 22;
      items.forEach((it) => {
        const el = riskRefs.current[it.i];
        const shown = it.ly > top0 - 6 && it.ly < bot0 + 6 && it.y > top0 - 40 && it.y < bot0 + 40;
        if (el) {
          el.style.transform = `translate3d(0, ${(it.ly - 7).toFixed(1)}px, 0)`;
          el.style.opacity = shown ? "1" : "0";
          tone(el, !it.above);
        }
        if (!shown) return;
        const ty = Math.max(top0, Math.min(bot0, it.y));
        const lead = `M${lx} ${it.ly.toFixed(1)}h6L${spine - 5} ${ty.toFixed(1)}h10`;
        const dot = `M${spine - 2.2} ${ty.toFixed(1)}a2.2 2.2 0 1 0 4.4 0a2.2 2.2 0 1 0 -4.4 0`;
        if (it.above) {
          la += lead;
          da += dot;
        } else {
          lb += lead;
          db += dot;
        }
      });
      lineARef.current?.setAttribute("d", la);
      lineBRef.current?.setAttribute("d", lb);
      dotARef.current?.setAttribute("d", da);
      dotBRef.current?.setAttribute("d", db);

      // the scale: 1 : n against the header's macro frame, and a bar in metres
      const scale = `1 : ${cam.zoom < 9.95 ? cam.zoom.toFixed(1) : Math.round(cam.zoom)}`;
      if (scale !== lastScale && scaleTextRef.current) {
        scaleTextRef.current.textContent = scale;
        lastScale = scale;
      }
      const barM = [...BAR_STEPS].reverse().find((m) => m * pxPerM <= 96) ?? BAR_STEPS[0];
      if (barRef.current) barRef.current.style.width = px(barM * pxPerM);
      const bar = `${barM} m`;
      if (bar !== lastBar && barTextRef.current) {
        barTextRef.current.textContent = bar;
        lastBar = bar;
      }
    };

    /* ---- the loop: on demand only ---- */
    let raf = 0;
    let last = 0;
    let onScreen = true;
    let ready = false;
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const moving = step(dt);
      const p = progress();
      const cam = camAt(L, smooth(p));
      paint(cam, p);
      if (scene) {
        scene.render(cam, water);
        if (!ready) {
          ready = true;
          stage.dataset.ready = "true";
        }
      }
      if (moving) invalidate();
      else last = 0;
    };
    const invalidate = () => {
      if (raf || disposed || !onScreen || document.hidden) return;
      raf = requestAnimationFrame(tick);
    };
    invalidateRef.current = invalidate;

    measure();
    invalidate();

    const ro = new ResizeObserver(() => {
      measure();
      invalidate();
    });
    ro.observe(stage);
    if (quizRef.current) ro.observe(quizRef.current);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) invalidate();
      else {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      }
    });
    io.observe(stage);
    const onScroll = () => invalidate();
    const onVis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      } else invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    import("./scene")
      .then(async (mod) => {
        if (disposed) return;
        const cs = getComputedStyle(root);
        const s = await mod.createBergScene(canvas, {
          theme,
          colors: {
            above: cs.getPropertyValue("--surface").trim(),
            below: cs.getPropertyValue("--inverse-bg").trim(),
            ink: cs.getPropertyValue("--ink").trim(),
          },
        });
        if (disposed) {
          s.dispose();
          return;
        }
        scene = s;
        measure();
        invalidate();
      })
      .catch(() => {
        // no WebGL: the CSS water and the ruler still tell the story
        if (!disposed) stage.dataset.fallback = "true";
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      invalidateRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVis);
      scene?.dispose();
      scene = null;
      canvas.remove();
      delete stage.dataset.ready;
      delete stage.dataset.fallback;
    };
  }, [theme]);

  const behavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const revealEnd = () => {
    const wide = window.matchMedia("(min-width: 900px)").matches;
    const el = wide ? closeInRef.current : closeAfterRef.current;
    if (!el) return;
    const top = window.scrollY + el.getBoundingClientRect().top - NAV;
    window.scrollTo({ top, behavior: behavior() });
  };
  const toTop = () => window.scrollTo({ top: 0, behavior: behavior() });
  const start = () => {
    const open = a.answers.findIndex((x) => x == null);
    if (open >= 0) a.setQ(open);
    toTop();
  };
  const retake = () => {
    a.retake();
    setLens(false);
    toTop();
  };

  const close = (
    <Close a={a} lens={lens} setLens={setLens} inView={inView} onStart={start} onRetake={retake} />
  );

  return (
    <div className="rc1" ref={rootRef} style={{ "--rc1-hz": "62%" } as CSSProperties}>
      <div className="mD-sheet rc1-sheet">
        <div className="rc1-track">
          <div className="rc1-stage" ref={stageRef} aria-hidden="true">
            <div className="rc1-view" ref={viewRef}>
              <div className="rc1-deep" />
              <div className="rc1-canvasHold" ref={holderRef} />
              <svg className="rc1-svg">
                <path className="rc1-svg__a" ref={lineARef} />
                <path className="rc1-svg__b" ref={lineBRef} />
                <path className="rc1-svg__da" ref={dotARef} />
                <path className="rc1-svg__db" ref={dotBRef} />
              </svg>
              {Array.from({ length: TICK_POOL }, (_, k) => (
                <span
                  key={k}
                  className="rc1-tick"
                  ref={(el) => {
                    tickRefs.current[k] = el;
                  }}
                />
              ))}
              <div className="rc1-risks">
                {RISKS.map((r, i) => (
                  <span
                    key={r.id}
                    className="rc1-risk"
                    ref={(el) => {
                      riskRefs.current[i] = el;
                    }}
                  >
                    <span className="rc1-risk__n">{pad2(i + 1)}</span>
                    {r.name}
                  </span>
                ))}
              </div>
              <span className="rc1-depth" ref={depthRef}>
                Depth · m
              </span>
              <div className="rc1-scale" ref={scaleRef}>
                <span className="rc1-scale__k">Scale</span>
                <span ref={scaleTextRef}>1 : 1.0</span>
                <span className="rc1-scale__bar" ref={barRef} />
                <span ref={barTextRef}>10 m</span>
              </div>
              <div className="rc1-cap rc1-cap--a">
                <span className="rc1-cap__k">Above the waterline</span>
                <p className="rc1-cap__t">
                  {inView} of {N} risks your team can see today.
                </p>
              </div>
              <div className="rc1-cap rc1-cap--b">
                <span className="rc1-cap__k">Below it</span>
                <p className="rc1-cap__t">
                  {N - inView} of {N} nobody is watching. This is where incidents surface.
                </p>
              </div>
            </div>
            {["tl", "tr", "bl", "br"].map((c, k) => (
              <span
                key={c}
                className={`rc1-corner rc1-corner--${c}`}
                ref={(el) => {
                  cornerRefs.current[k] = el;
                }}
              />
            ))}
          </div>

          <header className="rc1-head">
            <div className="rc1-head__col">
              <Label>Free assessment · 2 minutes</Label>
              <h1 className="rc1-title">How much of your AI risk can you see?</h1>
              <p className="mD-lead rc1-lead">
                Eight questions. Every answer moves the waterline on the berg: above it is what your
                team can see today, below it is what it can't.
              </p>
              <div className="rc1-quiz" ref={quizRef}>
                <QuizCard a={a} onReveal={revealEnd} revealLabel="Pull back to the whole berg" />
              </div>
            </div>
          </header>

          <div className="rc1-pull" ref={pullRef} />

          <section className="rc1-close rc1-close--in" ref={closeInRef} aria-label="Your result">
            <div className="rc1-close__inner" ref={closeInnerRef}>
              {close}
            </div>
          </section>
        </div>

        <section
          className="rc1-close rc1-close--after"
          ref={closeAfterRef}
          aria-label="Your result"
        >
          <div className="rc1-close__inner">{close}</div>
        </section>
      </div>
    </div>
  );
}

function Close({
  a,
  lens,
  setLens,
  inView,
  onStart,
  onRetake,
}: {
  a: Assessment;
  lens: boolean;
  setLens: (v: boolean) => void;
  inView: number;
  onStart: () => void;
  onRetake: () => void;
}) {
  const s = a.score;
  const done = a.done;
  const pct = (x: number) => (done ? `${x}%` : "–");
  return (
    <>
      <Label>{done ? "Your result · the whole berg" : "The whole berg"}</Label>
      <h2 className="rc1-close__title">
        {done ? (
          lens ? (
            <>
              With runtime controls, an estimated <strong>{inView} of 8</strong> would sit above the
              waterline.
            </>
          ) : (
            <>
              You can see <strong>{s.inView} of 8</strong> AI risks. The rest is below the
              waterline.
            </>
          )
        ) : (
          <>Answer all eight to set your own waterline.</>
        )}
      </h2>
      <dl className="rc1-nums">
        <div>
          <dt>Seen today</dt>
          <dd>{pct(s.seen)}</dd>
        </div>
        <div>
          <dt>Prevented today</dt>
          <dd>{pct(s.prevented)}</dd>
        </div>
        <div>
          <dt>Could prevent</dt>
          <dd>
            {pct(s.withPrevented)}
            {done && <span className="rc1-est">est.</span>}
          </dd>
          <dd className="rc1-nums__sub">With Blindsight</dd>
        </div>
      </dl>
      <div className="ra-toggle rc1-lens" role="group" aria-label="Where the waterline sits">
        <button type="button" aria-pressed={!lens} onClick={() => setLens(false)}>
          Today
        </button>
        <button type="button" aria-pressed={lens} onClick={() => setLens(true)}>
          {lens && <span className="mD-live" aria-hidden="true" />}
          With Blindsight · est.
        </button>
      </div>
      <p className="rc1-close__note">
        {done
          ? verdict(s)
          : "Until then the waterline sits where it does for a typical organization, and the numbers stay blank."}
      </p>
      <div className="rc1-close__actions">
        {done ? (
          <>
            <CtaButton label="Walk through your results" size="lg" />
            <button type="button" className="ra-link" onClick={onRetake}>
              <RotateCcw size={13} strokeWidth={1.75} aria-hidden="true" />
              Retake
            </button>
          </>
        ) : (
          <button type="button" className="mD-btn mD-btn--primary mD-btn--lg" onClick={onStart}>
            Start the assessment
            <ArrowUp size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
}
