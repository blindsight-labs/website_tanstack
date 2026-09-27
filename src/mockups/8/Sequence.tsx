/* Mockup 8 — See / Secure / Govern, second pass: four variants (a–d).
 *
 * This file is the SHELL, shared by every variant: the sticky sheet, the tagline, the
 * step rail, the clock (self-playing, looped; a click on a step plays that step), and the
 * stage the close-up renders into. Each variant owns:
 *   ./<v>/Left.tsx   Left (the left column, live) and Still (phone / reduced motion)
 *   ./<v>/left.css   its styles, every class prefixed .s8<v>-
 *   ./<v>/scene.ts   its close-up (a copy of mockup 7's three/seq-defender.ts, reworked)
 * `left` and `anim` pick independently (/mockup-8?s=b, or ?left=a&anim=c), which works
 * because every scene keeps the event times in model.ts (EV).
 *
 * Dev aid for screenshots: #seq-p=0.4 pins the clock and scrolls here.
 */
import { useEffect, useRef, useState, type ComponentType } from "react";

import { Label, type SectionProps, type Theme } from "@/mockups/7/shared";
import { sequence } from "@/mockups/7/content";
import {
  BOUNDS,
  CLAUSES,
  HOLD_MS,
  SETTLED,
  STAGES,
  STAGE_MS,
  netTime,
  snapAt,
  stageLocal,
  type LeftProps,
  type Snap,
  type StillProps,
} from "./model";
import * as A from "./a/Left";
import * as B from "./b/Left";
import * as C from "./c/Left";
import * as D from "./d/Left";

export type Variant = "a" | "b" | "c" | "d";
export const VARIANTS: Variant[] = ["a", "b", "c", "d"];

const LEFTS: Record<Variant, { Left: ComponentType<LeftProps>; Still: ComponentType<StillProps> }> = { a: A, b: B, c: C, d: D };

type SceneApi = {
  resize(w: number, h: number, mode: "panel"): void;
  render(t: number): void;
  dispose(): void;
};
type SceneModule = {
  createHeroScene(canvas: HTMLCanvasElement, o: { theme: Theme; bg: string; ink: string }): Promise<SceneApi>;
};
const SCENES: Record<Variant, () => Promise<SceneModule>> = {
  a: () => import("./a/scene") as Promise<SceneModule>,
  b: () => import("./b/scene") as Promise<SceneModule>,
  c: () => import("./c/scene") as Promise<SceneModule>,
  d: () => import("./d/scene") as Promise<SceneModule>,
};

function useMedia(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [query]);
  return on;
}
const LIVE_MQ = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
const STACK_MQ = "(max-width: 900px), (prefers-reduced-motion: reduce)";

type Picks = { left: Variant; anim: Variant };

/* ---------------- desktop: the self-playing sequence ---------------- */
function SequenceLive({ theme, left, anim }: { theme: Theme } & Picks) {
  const on = useMedia(LIVE_MQ);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [snap, setSnap] = useState<Snap>(() => snapAt(0));
  const [ready, setReady] = useState(false);
  const goRef = useRef<(k: number) => void>(() => {});
  const { Left } = LEFTS[left];

  useEffect(() => {
    if (!on) return;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    if (!scroller || !sheet || !stageEl || !canvas) return;
    let dead = false;
    let raf = 0;
    let net: SceneApi | null = null;
    let lastKey = "";
    let visible = true;

    /* the clock: each stage plays over its own duration; autoplay loops with a
       hold at the end, a click on a step plays that step and stops there */
    let p = 0;
    let target = 1;
    let auto = true;
    let started = false;
    let hold = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (p < target) {
        const k = p < BOUNDS[1] ? 0 : p < BOUNDS[2] ? 1 : 2;
        p = Math.min(target, p + ((BOUNDS[k + 1] - BOUNDS[k]) / STAGE_MS[k]) * dt);
      } else if (auto) {
        hold += dt;
        if (hold > HOLD_MS) {
          hold = 0;
          p = 0;
        }
      }
      frame();
      if (visible && started && (p < target || auto)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (!raf && visible && started) raf = requestAnimationFrame(tick);
    };
    const pin = /seq-p=([\d.]+)/.exec(window.location.hash);
    if (pin) {
      p = target = Math.min(1, Number(pin[1]));
      auto = false;
      started = true;
      requestAnimationFrame(() => window.scrollTo(0, scroller.getBoundingClientRect().top + window.scrollY - 72));
    }
    goRef.current = (k: number) => {
      auto = false;
      hold = 0;
      p = k === 0 ? 0 : BOUNDS[k] + 0.0005;
      target = SETTLED[k];
      started = true;
      kick();
    };

    const frame = () => {
      fillRefs.current.forEach((el, k) => {
        if (el) el.style.transform = `scaleX(${stageLocal(p, k)})`;
      });
      const s = snapAt(p);
      const key = JSON.stringify(s);
      if (key !== lastKey) {
        lastKey = key;
        setSnap(s);
      }
      if (net && visible) net.render(netTime(p));
    };
    const request = () => {
      if (raf) return;
      if (visible && started && (p < target || auto)) kick();
      else frame();
    };
    const measure = () => {
      if (!net) return;
      const st = stageEl.getBoundingClientRect();
      net.resize(st.width, st.height, "panel");
      request();
    };

    SCENES[anim]()
      .then(async (mod) => {
        if (dead) return;
        const cs = getComputedStyle(sheet);
        const scene = await mod.createHeroScene(canvas, {
          theme,
          bg: cs.backgroundColor,
          ink: cs.getPropertyValue("--ink").trim() || (theme === "dark" ? "#f4f4f6" : "#0b0b0d"),
        });
        if (dead) {
          scene.dispose();
          return;
        }
        net = scene;
        // compile shaders before measure(), so the frame the clock asks for is the one left on screen
        net.render(netTime(0));
        measure();
        setReady(true);
      })
      .catch((err) => console.warn("[sequence] 3D unavailable", err));

    const ro = new ResizeObserver(measure);
    ro.observe(stageEl);
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && e.intersectionRatio >= 0.3) started = true;
        if (visible) request();
      },
      { threshold: [0, 0.3] },
    );
    io.observe(scroller);
    frame();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      goRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      net?.dispose();
      setReady(false);
    };
  }, [on, theme, anim]);

  return (
    <div className="mD-seq__live" data-stage={snap.stage} data-ready={ready}>
      <div className="mD-seq__scroller" ref={scrollerRef}>
        <div className="mD-seq__sticky">
          <div className="mD-sheet mD-seq__sheet" ref={sheetRef}>
            <header className="mD-seq__head">
              <h2 className="mD-seq__tagline">
                {CLAUSES.map((c, k) => (
                  <span key={c} data-on={k <= snap.stage}>
                    {c}
                    {k < CLAUSES.length - 1 ? " " : ""}
                  </span>
                ))}
              </h2>
            </header>

            <ol className="mD-seq__rail">
              {STAGES.map((st, k) => (
                <li key={st.n} data-on={k === snap.stage} data-done={k < snap.stage}>
                  <button type="button" className="mD-seq__step" aria-pressed={k === snap.stage} onClick={() => goRef.current(k)}>
                    <Label n={st.n}>{st.label}</Label>
                    <span className="mD-seq__track">
                      <span
                        className="mD-seq__fill"
                        ref={(el) => {
                          fillRefs.current[k] = el;
                        }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className={`mD-seq__left s8${left}`}>
              <Left snap={snap} theme={theme} />
            </div>

            <div className="mD-seq__stage mD-seq__stage--net" ref={stageRef} aria-hidden="true">
              <canvas className="mD-seq__net" ref={canvasRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- phone / reduced motion: stacked, one block per stage ---------------- */
function SequenceStacked({ theme, left }: { theme: Theme } & Picks) {
  const on = useMedia(STACK_MQ);
  const { Still } = LEFTS[left];
  if (!on) return null;
  return (
    <div className="mD-seq__stacked mD-container">
      <header className="mD-seq__intro">
        <h2 className="mD-seq__tagline mD-seq__tagline--static">{sequence.tagline}</h2>
      </header>
      {STAGES.map((st, k) => (
        <article key={st.n} className={`mD-seq__block s8${left}`}>
          <div className="mD-seq__blockcopy">
            <Label n={st.n}>{st.label}</Label>
            <h3 className="mD-h3">{st.title}</h3>
            <p>{st.body}</p>
          </div>
          <Still snap={snapAt(SETTLED[k])} stage={k as 0 | 1 | 2} theme={theme} />
        </article>
      ))}
    </div>
  );
}

export function Sequence({ theme, left = "a", anim = "a" }: SectionProps & Partial<Picks>) {
  return (
    <section id="sequence" className="mD-seq" aria-label={sequence.tagline}>
      <SequenceLive theme={theme} left={left} anim={anim} />
      <SequenceStacked theme={theme} left={left} anim={anim} />
    </section>
  );
}
