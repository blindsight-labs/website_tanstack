/* Hero — mockup 6.
   The render is the hero: the Blindsight hub-and-orbit mark in glass and chrome
   (three/heroScene.ts), turning like a dial through the three beats named on the
   caption rail. Text sits in the clear area on the left of an Octane-style inset
   sheet; one audit-trail row seals along the bottom. */
import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";

import { CtaButton, Label, MetalIcon, type SectionProps } from "./shared";
import { hero } from "./content";

type LogState = "idle" | "typing" | "sealed";

/** "14:32:07  invoice_0412.pdf → agent:finance  hidden instruction stripped  ·  detected · corrected · logged" */
function parseLogLine(line: string) {
  const parts = line.split(/\s{2,}/).filter((p) => p !== "·");
  const [time = "", subject = "", decision = "", seal = ""] = parts;
  return { time, subject, decision, seal: seal.split(/\s*·\s*/).filter(Boolean) };
}

/** Dev aid for screenshots: /mockup-7#hero-t=4500 freezes the storyboard at 4.5 s. */
function frozenTime(): number | null {
  const m = /hero-t=(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

export function Hero({ theme }: SectionProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const log = parseLogLine(hero.logLine);

  useEffect(() => {
    const sheet = sheetRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const logEl = logRef.current;
    if (!sheet || !stage || !canvas || !logEl) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frozen = frozenTime();

    const setLog = (s: LogState) => {
      if (logEl.dataset.state !== s) logEl.dataset.state = s;
    };

    import("./three/heroScene").then(async (mod) => {
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

      const logAt = (t: number): LogState => {
        const lt = ((t % mod.LOOP_MS) + mod.LOOP_MS) % mod.LOOP_MS;
        if (lt >= mod.LOG_T.in && lt < mod.LOG_T.seal) return "typing";
        if (lt >= mod.LOG_T.seal && lt < mod.LOG_T.out) return "sealed";
        return "idle";
      };

      const still = reduce || frozen !== null;
      const stillT = frozen ?? mod.SETTLED_MS;

      // the caption rail follows the same clock: 01 See it · 02 Secure it · 03 Govern it
      let lastBeat = "";
      const setBeats = (t: number) => {
        const lt = ((t % mod.LOOP_MS) + mod.LOOP_MS) % mod.LOOP_MS;
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

      const fit = () => {
        const r = stage.getBoundingClientRect();
        scene.resize(r.width, r.height, r.width >= 880 ? "wide" : "narrow");
      };
      fit();

      // The storyboard clock is the page clock, minus time spent off-screen.
      let offset = 0;
      let hiddenAt: number | null = null;
      const now = () => performance.now() - offset;

      const draw = () => {
        const t = still ? stillT : now();
        scene.render(t);
        setLog(still && frozen === null ? "sealed" : logAt(t));
        setBeats(t);
        stage.dataset.ready = "true";
      };

      const ro = new ResizeObserver(() => {
        fit();
        if (still) draw();
      });
      ro.observe(stage);

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (hiddenAt === null) draw();
      };
      const pause = () => {
        if (hiddenAt === null) hiddenAt = performance.now();
      };
      const resume = () => {
        if (hiddenAt !== null) {
          offset += performance.now() - hiddenAt;
          hiddenAt = null;
        }
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
      else loop();

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
        <div className="mD-hero__stage" ref={stageRef} aria-hidden="true">
          <canvas ref={canvasRef} className="mD-hero__canvas" />
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

        <div className="mD-hero__log mD-log" ref={logRef} data-state="idle">
          <div className="mD-hero__logHead">
            <span>Audit trail</span>
            <span className="mD-hero__logIllus">Illustrative</span>
          </div>
          <div className="mD-hero__logRow">
            <span className="mD-log__time">{log.time}</span>
            <span className="mD-hero__logSubject">
              <span className="mD-hero__type">{log.subject}</span>
            </span>
            <span className="mD-hero__logDecision">
              <span className="mD-hero__type mD-hero__type--2">{log.decision}</span>
            </span>
            <span className="mD-log__verdict mD-hero__logSeal">
              <span className="mD-live" aria-hidden="true" />
              {log.seal.map((s, i) => (
                <span key={s} className="mD-hero__sealStep" style={{ ["--i" as string]: i }}>
                  {i > 0 && <span className="mD-hero__sealDot" aria-hidden="true">·</span>}
                  {s}
                </span>
              ))}
              <span className="mD-hero__sealIcon">
                <MetalIcon icon={Lock} size={13} strokeWidth={1.75} tone={theme === "dark" ? "light" : "ink"} />
              </span>
            </span>
          </div>
          <div className="mD-hero__logIdle" aria-hidden="true">
            <span className="mD-hero__idleDot" />
            {hero.idle}
          </div>
        </div>
      </div>
    </section>
  );
}
