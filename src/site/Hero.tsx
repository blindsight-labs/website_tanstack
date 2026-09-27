/* Hero — the landing's opening section.
   The wide shot: an office network in glass (three/office.ts). A scan sweeps the
   floor and finds the AI nobody registered; each flagged desk is fenced, then the
   policy reaches it. Chips follow their objects and change with the story; the
   caption rail under the render names the beat. (The close-up of the same story,
   on one machine, plays in the See / Secure / Govern section below.) */
import { useEffect, useRef, type CSSProperties } from "react";

import { CtaButton, Label, type SectionProps } from "./shared";
import { hero } from "./content";
import { markHeroReady } from "./heroReady";
import { loadOffice } from "./three/load";

/** Dev aid for screenshots: /#hero-t=4500 freezes the storyboard at 4.5 s. */
function frozenTime(): number | null {
  const m = /hero-t=(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

/* The poster: pre-rendered stills of the render (src/assets/hero, see its README), shown at
   once and crossfaded to the live canvas on its first frame (hero.css). Chosen in CSS, not
   here: the theme is only known before paint on the client (THEME_INIT_SCRIPT), and wide /
   narrow follows the stage's own width (≥ 880 px, as fit() below). Only when all four exist;
   otherwise the stage fades in as before. */
const POSTER_FILES = import.meta.glob("/src/assets/hero/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const POSTER_KEYS = ["light-wide", "light-narrow", "dark-wide", "dark-narrow"] as const;
const POSTER_STYLE = POSTER_KEYS.every((k) => POSTER_FILES[`/src/assets/hero/poster-${k}.webp`])
  ? (Object.fromEntries(
      POSTER_KEYS.map((k) => [`--hero-poster-${k}`, `url("${POSTER_FILES[`/src/assets/hero/poster-${k}.webp`]}")`]),
    ) as unknown as CSSProperties)
  : null;

export function Hero({ theme }: SectionProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const sheet = sheetRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!sheet || !stage || !canvas) return;
    // Hydration renders "light"; a dark page re-renders with "dark" a moment later
    // (SiteThemeProvider). Now that the module may already be loaded (Home.tsx starts it),
    // don't start a build for the theme that is about to change: wait for that render.
    const pageTheme = document.documentElement.getAttribute("data-theme");
    if ((pageTheme === "light" || pageTheme === "dark") && pageTheme !== theme) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frozen = frozenTime();

    loadOffice().then(async (mod) => {
      if (disposed) return;
      const cs = getComputedStyle(sheet);
      const scene = await mod.createHeroScene(canvas, {
        theme,
        bg: cs.backgroundColor,
        ink: cs.getPropertyValue("--ink").trim() || (theme === "dark" ? "#f4f4f6" : "#0b0b0d"),
      });
      if (disposed) {
        scene.dispose();
        return;
      }

      const still = reduce || frozen !== null;
      const stillT = frozen ?? mod.SETTLED_MS;
      const L = mod.LOOP_MS;

      // the caption rail follows the same clock: 01 See it · 02 Secure it · 03 Govern it
      let lastBeat = "";
      const setBeats = (t: number) => {
        const lt = ((t % L) + L) % L;
        const cur = mod.BEATS.findIndex((b) => lt >= b.t0 && lt < b.t1);
        const key = String(cur + 1);
        if (key !== lastBeat && beatsRef.current) {
          beatsRef.current.dataset.beat = key;
          lastBeat = key;
        }
        mod.BEATS.forEach((b, k) => {
          const el = fillRefs.current[k];
          if (!el) return;
          // finished beats stay full until the loop resets
          const p = lt >= b.t1 && lt < mod.BEATS[mod.BEATS.length - 1].t1 ? 1 : Math.max(0, Math.min(1, (lt - b.t0) / (b.t1 - b.t0)));
          el.style.transform = `scaleX(${p.toFixed(3)})`;
        });
      };

      // chips follow their object; the status word changes as the story moves on
      const setChips = () => {
        scene.labels().forEach((l, i) => {
          const el = chipRefs.current[i];
          if (!el) return;
          // never above the stage's top edge: the chip box sits ~56px above its anchor
          el.style.transform = `translate(${l.x.toFixed(1)}px, ${Math.max(l.y, 60).toFixed(1)}px)`;
          el.style.opacity = l.a.toFixed(3);
          const s = String(l.state);
          if (el.dataset.state !== s) {
            el.dataset.state = s;
            const k = el.querySelector<HTMLElement>(".mD-hero__chipK");
            if (k) k.textContent = hero.chips[i].states[l.state];
          }
        });
      };

      const fit = () => {
        const r = stage.getBoundingClientRect();
        scene.resize(r.width, r.height, r.width >= 880 ? "wide" : "narrow");
      };
      fit();

      // The storyboard clock is the page clock, minus time spent off-screen.
      // the story starts at t = 0 on the first live frame (it matches the poster, and nobody
      // joins it mid-scan however long the page took to load)
      let offset = performance.now();
      let hiddenAt: number | null = null;
      const now = () => performance.now() - offset;

      const draw = () => {
        const t = still ? stillT : now();
        scene.render(t);
        setBeats(t);
        setChips();
        stage.dataset.ready = "true";
        markHeroReady(); // below-the-fold 3D may start now (./heroReady.ts)
      };

      const ro = new ResizeObserver(() => {
        fit();
        if (still) draw();
      });
      ro.observe(stage);

      // the rAF runs only while the stage is on screen and the tab is visible
      const loop = () => {
        raf = requestAnimationFrame(loop);
        draw();
      };
      const pause = () => {
        if (hiddenAt === null) hiddenAt = performance.now();
        cancelAnimationFrame(raf);
        raf = 0;
      };
      const resume = () => {
        if (hiddenAt !== null) {
          offset += performance.now() - hiddenAt;
          hiddenAt = null;
        }
        if (!still && !raf) raf = requestAnimationFrame(loop);
      };
      let onScreen = true;
      const io = new IntersectionObserver(([e]) => {
        onScreen = e.isIntersecting;
        if (onScreen && !document.hidden) resume();
        else pause();
      });
      io.observe(stage);
      const onVis = () => (document.hidden || !onScreen ? pause() : resume());
      document.addEventListener("visibilitychange", onVis);

      if (still) draw();
      else resume();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        scene.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
      delete stage.dataset.ready;
    };
  }, [theme]);

  return (
    <section className="mD-hero" aria-labelledby="mD-hero-title">
      <div className="mD-sheet mD-hero__sheet" ref={sheetRef}>
        <div
          className="mD-hero__stage"
          ref={stageRef}
          aria-hidden="true"
          data-poster={POSTER_STYLE ? "" : undefined}
          style={POSTER_STYLE ?? undefined}
        >
          <canvas ref={canvasRef} className="mD-hero__canvas" />
          {POSTER_STYLE && (
            <div className="mD-hero__poster">
              <span />
            </div>
          )}
          {hero.chips.map((c, i) => (
            <span
              key={c.name}
              className="mD-hero__chip"
              data-k={i}
              data-state="0"
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
            >
              <span className="mD-hero__chipBox">
                <span className="mD-hero__chipK">{c.states[0]}</span>
                <span className="mD-hero__chipV">{c.name}</span>
              </span>
            </span>
          ))}
        </div>

        <div className="mD-hero__content">
          <Label>{hero.label}</Label>
          <h1 id="mD-hero-title" className="mD-display mD-hero__title">
            {hero.headline}
          </h1>
          <p className="mD-lead mD-hero__sub">{hero.subline}</p>
          <div className="mD-hero__actions">
            <CtaButton size="lg" />
          </div>
        </div>

        <div className="mD-hero__beats" ref={beatsRef} data-beat="0" aria-hidden="true">
          {hero.beats.map((b, k) => (
            <span className="mD-hero__beat" data-k={k + 1} key={b}>
              <span className="mD-hero__beatLabel">
                <span className="mD-hero__beatN">{String(k + 1).padStart(2, "0")}</span>
                <span className="mD-hero__beatDot">·</span>
                {b}
              </span>
              <span className="mD-hero__beatResult">{hero.beatResults[k]}</span>
              <span className="mD-hero__beatBar">
                <span
                  className="mD-hero__beatFill"
                  ref={(el) => {
                    fillRefs.current[k] = el;
                  }}
                />
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
