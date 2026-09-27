/* Mockup 9 — See / Secure / Govern: mockup 8's variant d (editorial left, simplified desktop),
 * with variant a's blind-emboss seal. Single variant; the files live in ./seq/.
 *
 * (History: mockup 8 built four variants a–d on this shell.)
 *
 * This file is the shell: the sticky sheet, the tagline, the step rail, the clock
 * (self-playing, looped; a click on a step plays that step) and the stage the close-up
 * renders into. ./seq/ holds the story data (model.ts), the left column (Left.tsx,
 * left.css), and the close-up (scene.ts). The left changes exactly when the close-up
 * shows its cause: both read the event times in model.ts (EV).
 *
 * Every width plays the same live DOM (SequenceLive): ≥ 901 px it is the sticky two-column
 * sheet; ≤ 900 px ./seq/shell.css restacks it in one column (tagline, rail, the close-up at
 * full width, then the captions). Reduced motion (any width) shows SequenceStills instead:
 * the close-up rendered once at each stage's settled moment, beside that stage's captions.
 *
 * Dev aid for screenshots: #seq-p=0.4 pins the clock and scrolls here.
 */
import { useEffect, useRef, useState, type RefObject } from "react";

import { Label, type SectionProps, type Theme } from "./shared";
import { sequence } from "./content";
import { BOUNDS, CLAUSES, HOLD_MS, SETTLED, STAGES, STAGE_MS, netTime, snapAt, stageLocal, type Snap } from "./seq/model";
import { Left, Still } from "./seq/Left";


type SceneApi = {
  resize(w: number, h: number, mode: "panel"): void;
  render(t: number): void;
  dispose(): void;
};
type SceneModule = {
  createHeroScene(canvas: HTMLCanvasElement, o: { theme: Theme; bg: string; ink: string }): Promise<SceneApi>;
};
const loadScene = () => import("./seq/scene") as Promise<SceneModule>;

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
/* the live sequence plays at every width (CSS restacks it ≤ 900 px); reduced motion: stills */
const LIVE_MQ = "(prefers-reduced-motion: no-preference)";
const STILL_MQ = "(prefers-reduced-motion: reduce)";
/** the stills' frame: 16:10 from 600 px up, 4:3 on a phone (as ./seq/shell.css sizes it) */
const FIG_MQ = "(min-width: 600px)";

/** the canvas's clear colour and ink: the sheet it sits on */
const sceneColors = (el: Element, theme: Theme) => {
  const cs = getComputedStyle(el);
  return { theme, bg: cs.backgroundColor, ink: cs.getPropertyValue("--ink").trim() || (theme === "dark" ? "#f4f4f6" : "#0b0b0d") };
};

/** Release a disposed scene's WebGL context now, instead of whenever the canvas is
 *  garbage-collected (renderer.dispose() alone keeps the context alive). Call only on
 *  a canvas that already holds a context: getContext() on a bare canvas creates one. */
const loseContext = (c: HTMLCanvasElement) => {
  const gl: WebGLRenderingContextBase | null = c.getContext("webgl2") ?? c.getContext("webgl");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
};

/** Opens the section with the system label, as every other section does. */
const SECTION_LABEL = "How it works";


/* ---------------- the self-playing sequence (desktop: sticky sheet; ≤ 900 px: one column) ---------------- */
function SequenceLive({ theme }: { theme: Theme }) {
  const on = useMedia(LIVE_MQ);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [snap, setSnap] = useState<Snap>(() => snapAt(0));
  const [ready, setReady] = useState(false);
  const goRef = useRef<(k: number) => void>(() => {});

  useEffect(() => {
    if (!on) return;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    const stageEl = stageRef.current;
    if (!scroller || !sheet || !stageEl) return;
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

    /* The WebGL context lives only while the section is near: the scene is created
       ~1000 px before the section scrolls in, and released (context and all) once it
       is more than two screens away; it is re-created on the way back. Each scene
       gets a fresh canvas, since a canvas whose context was lost can't host another. */
    let canvas: HTMLCanvasElement | null = null;
    let gen = 0;
    const ensure = () => {
      if (dead || canvas) return;
      const c = document.createElement("canvas");
      c.className = "mD-seq__net";
      stageEl.appendChild(c);
      canvas = c;
      const my = ++gen;
      loadScene()
        .then(async (mod) => {
          if (dead || my !== gen) return;
          const scene = await mod.createHeroScene(c, sceneColors(sheet, theme));
          if (dead || my !== gen) {
            scene.dispose();
            loseContext(c);
            return;
          }
          net = scene;
          // compile shaders before measure(), so the frame the clock asks for is the one left on screen
          net.render(netTime(0));
          measure();
          setReady(true);
        })
        .catch((err) => console.warn("[sequence] 3D unavailable", err));
    };
    const release = () => {
      gen++; // a scene still being built disposes itself when it lands
      if (net && canvas) {
        net.dispose();
        loseContext(canvas);
      }
      net = null;
      canvas?.remove();
      canvas = null;
      setReady(false);
    };

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
    const near = new IntersectionObserver(([e]) => e.isIntersecting && ensure(), { rootMargin: "1000px 0px" });
    near.observe(scroller);
    const far = new IntersectionObserver(([e]) => !e.isIntersecting && release(), { rootMargin: "200% 0px" });
    far.observe(scroller);
    frame();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      goRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      near.disconnect();
      far.disconnect();
      release();
    };
  }, [on, theme]);

  return (
    <div className="mD-seq__live" data-stage={snap.stage} data-ready={ready}>
      <div className="mD-seq__scroller" ref={scrollerRef}>
        <div className="mD-seq__sticky">
          <div className="mD-sheet mD-seq__sheet" ref={sheetRef}>
            <header className="mD-seq__head">
              <Label>{SECTION_LABEL}</Label>
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

            <div className="mD-seq__left s8d">
              <Left snap={snap} theme={theme} />
            </div>

            {/* the canvas is created (and released) by the effect, only while the section is near */}
            <div className="mD-seq__stage mD-seq__stage--net" ref={stageRef} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- reduced motion (any width): three stills, one per stage ---------------- */
/** The close-up rendered ONCE at each stage's settled moment (netTime(SETTLED[k])) into an
 *  image, on an offscreen canvas sized to the frame; then the scene is disposed. (Each render
 *  is a jump of the story clock, so the scene draws that exact moment, un-eased.) */
function useStills(on: boolean, theme: Theme, sheetRef: RefObject<HTMLDivElement | null>, wideFig: boolean) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const sheet = sheetRef.current;
    const fig = sheet?.querySelector<HTMLElement>(".mD-seq__still");
    if (!on || !sheet || !fig) return;
    let dead = false;
    const canvas = document.createElement("canvas");
    loadScene()
      .then(async (mod) => {
        if (dead) return;
        const scene = await mod.createHeroScene(canvas, sceneColors(sheet, theme));
        if (dead) {
          scene.dispose();
          loseContext(canvas);
          return;
        }
        const w =Math.max(280, Math.round(fig.clientWidth));
        const h = Math.max(180, Math.round(fig.clientHeight || (w * 3) / 4));
        scene.resize(w, h, "panel");
        const out = SETTLED.map((p) => {
          scene.render(netTime(p));
          return canvas.toDataURL("image/webp", 0.92); // (PNG where WebP isn't encodable)
        });
        scene.dispose();
        loseContext(canvas);
        if (!dead) setUrls(out);
      })
      .catch((err) => console.warn("[sequence] 3D unavailable", err));
    return () => {
      dead = true;
      setUrls([]);
    };
  }, [on, theme, sheetRef, wideFig]);
  return urls;
}

function SequenceStills({ theme }: { theme: Theme }) {
  const on = useMedia(STILL_MQ);
  const wideFig = useMedia(FIG_MQ);
  const sheetRef = useRef<HTMLDivElement>(null);
  const urls = useStills(on, theme, sheetRef, wideFig);
  if (!on) return null;
  return (
    <div className="mD-seq__stacked">
      <div className="mD-sheet mD-seq__rm" ref={sheetRef}>
        <header className="mD-seq__intro">
          <Label>{SECTION_LABEL}</Label>
          <h2 className="mD-seq__tagline mD-seq__tagline--static">{sequence.tagline}</h2>
        </header>
        {STAGES.map((st, k) => (
          <article key={st.n} className="mD-seq__block s8d">
            <div className="mD-seq__blockcopy">
              <Label n={st.n}>{st.label}</Label>
              <h3 className="mD-h3">{st.title}</h3>
              <p>{st.body}</p>
            </div>
            <figure className="mD-seq__still" aria-hidden="true">
              {urls[k] ? <img src={urls[k]} alt="" /> : null}
            </figure>
            <Still snap={snapAt(SETTLED[k])} stage={k as 0 | 1 | 2} theme={theme} />
          </article>
        ))}
      </div>
    </div>
  );
}

export function Sequence({ theme }: SectionProps) {
  return (
    <section id="sequence" className="mD-seq" aria-label={sequence.tagline}>
      <SequenceLive theme={theme} />
      <SequenceStills theme={theme} />
    </section>
  );
}
