/* Hero — owner "hero".
   The render is the hero: a company floor seen at a 3/4 angle, scanned and
   secured (three/heroScene.ts). Text sits in the clear area on the left of an
   Octane-style inset sheet; one audit-trail row seals along the bottom. */
import { useEffect, useRef } from "react";
import { Lock } from "lucide-react";

import { CtaButton, Label, MetalIcon, type SectionProps } from "./shared";
import { hero } from "./content";

type LogState = "idle" | "typing" | "sealed";

const isPlaceholder = (s: string) => /\[[^\]]*\]/.test(s);

/** "14:32:07  invoice_0412.pdf → agent:finance  hidden instruction stripped  ·  detected · corrected · logged" */
function parseLogLine(line: string) {
  const parts = line.split(/\s{2,}/).filter((p) => p !== "·");
  const [time = "", subject = "", decision = "", seal = ""] = parts;
  return { time, subject, decision, seal: seal.split(/\s*·\s*/).filter(Boolean) };
}

/** Dev aid for screenshots: /mockup-4#hero-t=4500 freezes the storyboard at 4.5 s. */
function frozenTime(): number | null {
  const m = /hero-t=(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

export function Hero({ theme }: SectionProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
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
          <dl className="mD-hero__proof">
            {hero.proof.map((p) => (
              <div className="mD-hero__fact" key={p.label}>
                <dt className="mD-hero__factLabel">{p.label}</dt>
                <dd className={`mD-hero__factValue${isPlaceholder(p.value) ? " is-placeholder" : ""}`}>{p.value}</dd>
              </div>
            ))}
          </dl>
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
            observing · people, apps, agents
          </div>
        </div>
      </div>
    </section>
  );
}
