/* Hero — mockup 9.
   The Blindsight hub-and-orbit mark as the product diagram. Three versions of the
   scene (three/hero-a|b|c.ts, picked with ?v=) share one contract: the clock, the
   caption rail, the audit row, and three clickable node labels (01 · SEE IT …)
   all live here; each scene only draws and animates the mark. */
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

/** Dev aid for screenshots: /mockup-5#hero-t=4500 freezes the storyboard at 4.5 s. */
function frozenTime(): number | null {
  const m = /hero-t=(\d+)/.exec(window.location.hash);
  return m ? Number(m[1]) : null;
}

/* Three takes on the assembling mark, switchable with ?v= (a, b, c). */
export const HERO_VARIANTS = ["a", "b", "c"] as const;
export type HeroVariant = (typeof HERO_VARIANTS)[number];
/** What the page needs from a scene module (each exports its own literal timings). */
type HeroModule = {
  LOOP_MS: number;
  SETTLED_MS: number;
  LOG_T: { in: number; seal: number; out: number };
  BEATS: readonly { t0: number; t1: number }[];
  createHeroScene: (typeof import("./three/hero-a"))["createHeroScene"];
};
const SCENES: Record<HeroVariant, () => Promise<HeroModule>> = {
  a: () => import("./three/hero-a"),
  b: () => import("./three/hero-b"),
  c: () => import("./three/hero-c"),
};

export function Hero({ theme, variant = "a" }: SectionProps & { variant?: HeroVariant }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const jumpRef = useRef<(beat: number) => void>(() => {});
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

    SCENES[variant]().then(async (mod) => {
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

      // the node labels follow their nodes; the node of the current beat is "on"
      const placeNodes = () => {
        const ns = scene.nodes();
        // a scene that labels its own beats (or whose nodes are spinning) returns no
        // nodes: the page's labels step aside
        nodeRefs.current.forEach((el) => el && (el.hidden = ns.length < 3));
        if (ns.length < 3) return;
        const r = stage.getBoundingClientRect();
        const c = { x: ns.reduce((s, n) => s + n.x, 0) / 3, y: ns.reduce((s, n) => s + n.y, 0) / 3 };
        ns.forEach((n) => {
          const el = nodeRefs.current[n.beat];
          if (!el) return;
          // pushed out from the mark's centre, so the label sits beside its node
          const dx = n.x - c.x;
          const dy = n.y - c.y;
          const d = Math.hypot(dx, dy) || 1;
          // clear of the node itself (≈ 70px out along the spoke), and fully on screen;
          // near the sheet's edge the label stacks ("01" over "SEE IT") to stay beside
          // its node, out in the orbit's gap, instead of sliding back over the glass
          const room = dx >= 0 ? r.width - 12 - (n.x + (dx / d) * 74) : n.x + (dx / d) * 74 - 12;
          el.dataset.stack = "false";
          if (el.offsetWidth > room) el.dataset.stack = "true";
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          let x = n.x + (dx / d) * 74 - (dx >= 0 ? 0 : w);
          let y = n.y + (dy / d) * 74 - h / 2;
          x = Math.min(r.width - w - 12, Math.max(12, x));
          y = Math.min(r.height - h - 12, Math.max(12, y));
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          el.dataset.on = n.on > 0.5 ? "true" : "false";
        });
      };

      const draw = () => {
        const t = still ? stillT : now();
        scene.render(t);
        setLog(still && frozen === null ? "sealed" : logAt(t));
        setBeats(t);
        placeNodes();
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

      // a click on the mark turns it straight to the next beat (See → Secure →
      // Govern → back round): the clock jumps to where that beat's turn begins
      const L = mod.LOOP_MS;
      const onMark = (e: MouseEvent) => {
        if ((e.target as Element | null)?.closest("a, button, input, textarea")) return false;
        const r = stage.getBoundingClientRect();
        return scene.hit(e.clientX - r.left, e.clientY - r.top);
      };
      const nextBeat = () => {
        const lt = ((now() % L) + L) % L;
        const B = mod.BEATS;
        const cur = B.findIndex((b) => lt >= b.t0 && lt < b.t1);
        const target =
          cur === -1 ? (lt < B[0].t0 ? B[0].t0 : L + B[0].t0) : cur < B.length - 1 ? B[cur + 1].t0 : B[cur].t1;
        offset -= target - lt;
      };
      /** straight to a given beat: the clock moves forward to where it starts */
      const jumpTo = (beat: number) => {
        const lt = ((now() % L) + L) % L;
        const B = mod.BEATS;
        if (lt >= B[beat].t0 && lt < B[beat].t1) return;
        const target = B[beat].t0 > lt ? B[beat].t0 : L + B[beat].t0;
        offset -= target - lt;
      };
      jumpRef.current = (beat) => {
        if (!still) jumpTo(beat);
      };
      const onClick = (e: MouseEvent) => {
        if (still || !onMark(e)) return;
        const r = stage.getBoundingClientRect();
        const node = scene.nodeAt(e.clientX - r.left, e.clientY - r.top);
        if (node >= 0) jumpTo(node);
        else nextBeat();
      };
      const onHover = (e: MouseEvent) => {
        sheet.style.cursor = !still && onMark(e) ? "pointer" : "";
      };
      sheet.addEventListener("click", onClick);
      sheet.addEventListener("mousemove", onHover);

      if (still) draw();
      else loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        sheet.removeEventListener("click", onClick);
        sheet.removeEventListener("mousemove", onHover);
        sheet.style.cursor = "";
        jumpRef.current = () => {};
        scene.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
      delete stage.dataset.ready;
    };
  }, [theme, variant]);

  return (
    <section className="mD-hero" aria-labelledby="mD-hero-title">
      <div className="mD-sheet mD-hero__sheet" ref={sheetRef}>
        <div className="mD-hero__stage" ref={stageRef} aria-hidden="true">
          <canvas ref={canvasRef} className="mD-hero__canvas" />
          {/* each outer node names its beat; click one to go straight there */}
          {hero.beats.map((b, k) => (
            <button
              key={b}
              type="button"
              className="mD-hero__node"
              data-on="false"
              tabIndex={-1}
              onClick={() => jumpRef.current(k)}
              ref={(el) => {
                nodeRefs.current[k] = el;
              }}
            >
              <span className="mD-hero__nodeN">{String(k + 1).padStart(2, "0")}</span>
              <span className="mD-hero__beatDot">·</span>
              {b}
            </button>
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
