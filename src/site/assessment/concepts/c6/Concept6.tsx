/* Concept 6 · "The Lens" — the Blindsight mark as the lens that reveals.

   The berg stands still. Scroll pulls the camera back (more of it enters, in height and width)
   while the mark, rebuilt as a glass-and-chrome lens, travels from the tip's flank and grows
   until its clear glass holds the whole berg. Through the lens the hidden mass is sharp and lit;
   outside it, below the reach of the light, it fades into the page.
   The answers set how far that light reaches (what the organization already sees); the least
   seen risk is the one the lens flags: the page's one violet, an inlay on one node.

   Layout: one white sheet; a sticky stage (the render) with the copy scrolling over it. Desktop:
   copy and the quiz on the left, the berg on the right. Phone: headline and quiz first (they
   cover the stage), then the tip shows under the form, then the reveal. */
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

type Metrics = { W: number; H: number; wide: boolean; textRight: number };

export function Concept6({ a, theme }: ConceptProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLElement>(null);
  const flagRef = useRef<HTMLSpanElement>(null);
  const gaugeRef = useRef<HTMLSpanElement>(null);
  const sceneRef = useRef<LensScene | null>(null);
  const kickRef = useRef<() => void>(() => {});
  const visRef = useRef(0.28);

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

  /* answers → the light (and the flag's label may change width) */
  useEffect(() => {
    visRef.current = vis;
    sceneRef.current?.setLight(vis, reducedMotion());
    kickRef.current();
  }, [vis, flagged]);

  /* the scene: built per theme, rendered on demand, paused off-screen */
  useEffect(() => {
    const sheet = sheetRef.current;
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!sheet || !track || !stage) return;
    // hydration renders "light"; a dark page re-renders with "dark" a moment later: wait for it
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    let disposed = false;
    let cleanup = () => {};
    // a fresh canvas each time: a released context's canvas cannot be reused
    const canvas = document.createElement("canvas");
    canvas.className = "rc6-canvas";
    stage.prepend(canvas);
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

        let m: Metrics = { W: 1, H: 1, wide: true, textRight: 0 };
        const measure = () => {
          const sr = stage.getBoundingClientRect();
          const W = sr.width;
          const H = sr.height;
          const wide = W >= 900;
          const col = colRef.current;
          const textRight = wide && col ? col.getBoundingClientRect().right - sr.left : 0;
          const l: LensLayout = wide
            ? {
                W,
                H,
                r0: { x0: textRight + 40, x1: W - 32, y0: 32, y1: H - 32 },
                r1: { x0: textRight + 40, x1: W - 28, y0: 28, y1: H - 28 },
              }
            : {
                W,
                H,
                // the tip shows under the form (the head covers the stage's top half at p = 0)
                r0: { x0: 16, x1: W - 16, y0: H * 0.5 + 8, y1: H - 16 },
                // the close card takes the lower half
                r1: { x0: 12, x1: W - 12, y0: 16, y1: H * 0.47 },
              };
          m = { W, H, wide, textRight };
          scene.resize(l);
        };

        /* scroll → progress: 0 while the tip is framed, 1 when the close is in view */
        const progress = () => {
          const tr = track.getBoundingClientRect();
          const sr = stage.getBoundingClientRect();
          const scrolled = sr.top - tr.top;
          const total = tr.height - sr.height;
          const head = headRef.current;
          const start = m.wide ? m.H * 0.06 : Math.max(0, (head?.offsetHeight ?? 0) - m.H * 0.5);
          const end = Math.max(start + 1, total - m.H * 0.05);
          return clamp((scrolled - start) / (end - start), 0, 1);
        };

        /* the labels that ride on the scene */
        const overlays = (p: number) => {
          const sr = stage.getBoundingClientRect();
          const hb = headRef.current?.getBoundingClientRect().bottom ?? sr.top;
          const top = m.wide ? 0 : Math.max(0, hb - sr.top); // phone: the head still covers this
          const minX = m.wide ? m.textRight + 16 : 12;
          const maxX = m.W - 12;
          const flag = flagRef.current;
          if (flag) {
            const f = scene.flag();
            const w = flag.offsetWidth;
            const h = flag.offsetHeight;
            const g = f.r + 10;
            // the label sits outside the lens, off the node: the side facing away from the
            // lens's centre first (a side-by-side label is preferred to one above or below)
            const ox = f.x - f.cx;
            const oy = f.y - f.cy;
            const ol = Math.hypot(ox, oy) || 1;
            const spots = [
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
            const fits = ([x, y]: number[]) =>
              x >= minX && x + w <= maxX && y >= top + 8 && y + h <= m.H - 8;
            const [x, y] = spots.find(fits) ?? [
              clamp(spots[0][0], minX, maxX - w),
              clamp(spots[0][1], top + 8, m.H - 8 - h),
            ];
            flag.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            flag.style.opacity = f.y > top + 8 ? "1" : "0";
          }
          const gauge = gaugeRef.current;
          if (gauge) {
            const q = scene.gauge();
            const w = gauge.offsetWidth;
            const h = gauge.offsetHeight;
            const x = Math.max(minX, q.x - 6 - w);
            gauge.style.transform = `translate3d(${x.toFixed(1)}px, ${(q.y - h / 2).toFixed(1)}px, 0)`;
            // it fades as the lens takes over the whole berg
            const on = q.y > top + 8 && q.y < m.H - 8 ? 1 - smooth((p - 0.55) / 0.25) : 0;
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
          const p = progress();
          scene.setProgress(p);
          const moving = scene.step(dt);
          scene.render();
          overlays(p);
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
      delete stage.dataset.ready;
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
    <div className="rc6">
      <div className="mD-sheet rc6-sheet" ref={sheetRef}>
        <div className="rc6-track" ref={trackRef}>
          {/* the render: sticky behind the copy (the canvas is added on the client) */}
          <div className="rc6-stage" ref={stageRef} aria-hidden="true">
            <svg className="rc6-fallback" viewBox="0 0 400 480" focusable="false">
              <line x1="0" y1="118" x2="400" y2="118" className="rc6-fallback__line" />
              <path
                className="rc6-fallback__berg"
                d="M196 52 L214 80 L226 76 L246 118 L318 176 L346 262 L322 352 L258 424 L172 432 L98 372 L64 272 L84 182 L150 118 L170 92 Z"
              />
            </svg>
            <span className="rc6-gauge" ref={gaugeRef}>
              <span className="rc6-gauge__t">{gaugeText}</span>
              <span className="rc6-gauge__tick" />
            </span>
            <span className="rc6-flag" ref={flagRef}>
              <span className="rc6-flag__k">Flagged</span>
              <span className="rc6-flag__v">{flagRisk.name}</span>
            </span>
          </div>

          <div className="rc6-flow">
            {/* 01 · the header: the question on the left, the tip on the right */}
            <header className="rc6-head" ref={headRef}>
              <div className="mD-container">
                <div className="rc6-col" ref={colRef}>
                  <Label>Free AI exposure assessment</Label>
                  <h1 className="rc6-title">You see the tip. Your AI risk is the rest.</h1>
                  <p className="mD-lead rc6-lead">
                    Eight questions, about two minutes. Find out how much of your AI exposure you
                    can see today, and how much of it you could prevent.
                  </p>
                  <QuizCard a={a} onReveal={toClose} revealLabel="See all of it" />
                </div>
              </div>
            </header>

            <section className="rc6-step" aria-labelledby="rc6-s1">
              <div className="mD-container">
                <div className="rc6-col rc6-card">
                  <Label n="02">The waterline</Label>
                  <h2 className="mD-h2 rc6-h2" id="rc6-s1">
                    Above the waterline is what you already see.
                  </h2>
                  <p className="rc6-p">
                    Approved tools, vendors under contract, the policy people signed. Your answers
                    set how far the light reaches below it. Past that, the water is murky.
                  </p>
                  <p className="rc6-stat">
                    <strong>
                      {a.inView} of {N}
                    </strong>{" "}
                    risks in view
                    {typical ? " for a typical organization" : a.done ? "" : " so far"}
                  </p>
                </div>
              </div>
            </section>

            <section className="rc6-step" aria-labelledby="rc6-s2">
              <div className="mD-container">
                <div className="rc6-col rc6-card">
                  <Label n="03">Below it</Label>
                  <h2 className="mD-h2 rc6-h2" id="rc6-s2">
                    Below it sits the AI nobody registered.
                  </h2>
                  {hidden.length > 0 ? (
                    <>
                      <p className="rc6-p">
                        {hidden.length} of {N} risks sit below
                        {typical ? " a typical organization's" : " your"} waterline. This is where
                        incidents usually surface.
                      </p>
                      <ul className="rc6-list">
                        {hidden.map(({ r, see }) => (
                          <li key={r.id}>
                            <span>{r.name}</span>
                            <span>Seen · {seenWord(see)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="rc6-p">
                      By your answers, no risk sits fully below the waterline. The deep is still
                      where new ones show up first: the next plugin, the next agent.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rc6-step" aria-labelledby="rc6-s3">
              <div className="mD-container">
                <div className="rc6-col rc6-card">
                  <Label n="04">The lens</Label>
                  <h2 className="mD-h2 rc6-h2" id="rc6-s3">
                    Blindsight is the lens.
                  </h2>
                  <p className="rc6-p">
                    It sits between your people, your agents and every model, so what it sees it can
                    act on: shadow tools flagged, sensitive fields masked, hidden instructions
                    stripped, unsafe tool calls blocked, every event logged and sealed.
                  </p>
                  <p className="rc6-p rc6-p--flag">
                    Right now it is flagging <strong>{flagRisk.name}</strong>, the risk
                    {typical ? " a typical organization sees" : " you see"} least:{" "}
                    {lowerFirst(flagRisk.bs.action)}.
                  </p>
                </div>
              </div>
            </section>

            {/* 05 · the close: the whole berg inside the lens, and the numbers */}
            <section className="rc6-close" ref={closeRef} aria-labelledby="rc6-close">
              <div className="mD-container">
                <div className="rc6-col rc6-card">
                  <Label n="05">All of it</Label>
                  <h2 className="mD-h2 rc6-h2" id="rc6-close">
                    With Blindsight, you see all of it.
                  </h2>
                  <dl className="ra-nums rc6-nums">
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
                  <p className="rc6-p">
                    {a.done
                      ? `${verdict(s)} With runtime controls, about ${s.withPrevented}% of it could be prevented (est.).`
                      : `Answer all eight questions to see your own numbers. ${a.answered} of ${N} answered.`}
                  </p>
                  <div className="rc6-actions">
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
