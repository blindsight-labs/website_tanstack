import { forwardRef, useEffect, useRef, useState } from "react";
import { ArrowDown, Check, ChevronLeft, ChevronRight } from "lucide-react";

import posterSvg from "@/assets/brain-poster.svg?raw";
import type { BrainScene, ScreenPos } from "./brain-scene";
import {
  AUDIT_CHECKS,
  DEFAULT_PICK,
  LAYERS,
  MARKED,
  TRANSITION,
  type LayerId,
  type MarkedObject,
  type StepId,
} from "./brain-content";

/* ── Home page brain experience ──
   A sticky full-viewport stage over four 100svh scroll steps (#hero, #see,
   #govern, #prove). Whichever step is half in view is the active layer.
   Scroll, a horizontal swipe on the stage, the edge rails and the nav's
   See/Govern/Prove links all move between layers through native scrolling.
   A layer change sweeps a scan line across the stage; each threat orb takes
   its new colour a beat after the line passes it.
   In See/Govern/Prove the nine glass orbs are real buttons: hover, focus or
   tap one to select it, which halts it and shows its card; tapping or clicking
   anywhere else (or Esc) releases it. Shadow AI is selected when See it opens,
   and the selection carries across layers until the visitor picks another or
   releases it. The three.js scene (brain-scene.ts) renders over
   a static SVG poster, which stays as the fallback for reduced motion and no
   WebGL. */

const ORDER = LAYERS.map((l) => l.id);

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function objectLabel(layer: StepId, m: MarkedObject) {
  if (layer === "see") return `Threat: ${m.threat.title}`;
  if (layer === "govern") return `Fix: ${m.fix.title}`;
  return `Audit trail: ${m.threat.title}`;
}

const cardSide = (x: number) => (x > 55 ? "left" : "right");

export function BrainExperience() {
  const [layer, setLayer] = useState<LayerId>("hero");
  const [picked, setPicked] = useState<number | null>(null);
  const [inView, setInView] = useState(true);
  const [scan, setScan] = useState<{ key: number; dir: 1 | -1 } | null>(null);
  const [live, setLive] = useState(false); // WebGL scene rendering over the poster
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const layerRef = useRef<LayerId>("hero");
  const pickedRef = useRef<number | null>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const livePos = useRef<ScreenPos[] | null>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // three.js loads on demand in its own chunk. Reduced motion or no WebGL:
  // the static poster and fixed buttons stay.
  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    import("./brain-scene").then(
      ({ createBrainScene }) => {
        if (cancelled) return;
        try {
          const scene = createBrainScene(canvas, {
            mobile: window.matchMedia("(max-width: 640px)").matches,
            markedCount: MARKED.length,
            styleSource: section,
            scanFrac: (xPct) => {
              const a = artRef.current!.getBoundingClientRect();
              const s = stageRef.current!.getBoundingClientRect();
              return (a.left - s.left + (xPct / 100) * a.width) / s.width;
            },
            onFrame: (pos) => {
              livePos.current = pos;
              // Buttons and the open card follow their objects without a React render per frame.
              pos.forEach((p, i) => {
                const b = btnRefs.current[i];
                if (!b) return;
                b.style.left = `${p.x}%`;
                b.style.top = `${p.y}%`;
              });
              const i = pickedRef.current;
              const a = anchorRef.current;
              if (i !== null && a) {
                a.style.setProperty("--x", `${pos[i].x}%`);
                a.style.setProperty("--y", `${pos[i].y}%`);
                a.dataset.side = cardSide(pos[i].x);
              }
            },
            onReady: () => setLive(true),
          });
          if (layerRef.current !== "hero") scene.setLayer(layerRef.current, 1);
          scene.setHalted(pickedRef.current);
          sceneRef.current = scene;
        } catch {
          /* no WebGL: keep the poster */
        }
      },
      () => {
        /* chunk failed to load: keep the poster */
      },
    );
    const mo = new MutationObserver(() => sceneRef.current?.setTheme());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      mo.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Active layer = the step at least half in view. (isIntersecting is true for
  // any overlap, even an edge touching the viewport, so check the ratio.)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const steps = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.intersectionRatio >= 0.5) setLayer(e.target.id as LayerId);
        }
      },
      { threshold: 0.5 },
    );
    section.querySelectorAll(".brain-step").forEach((s) => steps.observe(s));
    // The card hides once the section scrolls away (it is fixed on phones).
    const whole = new IntersectionObserver(([e]) => setInView(e.isIntersecting));
    whole.observe(section);
    return () => {
      steps.disconnect();
      whole.disconnect();
    };
  }, []);

  // Layer change: scan line, scene transition, and the default selection.
  useEffect(() => {
    const prev = layerRef.current;
    layerRef.current = layer;
    document.documentElement.dataset.layer = layer;
    if (prev === layer) return;
    const dir = ORDER.indexOf(layer) > ORDER.indexOf(prev) ? 1 : -1;
    sceneRef.current?.setLayer(layer, dir);
    setScan((s) => ({ key: (s?.key ?? 0) + 1, dir }));
    // Entering See it selects Shadow AI; later layers keep whatever is selected (or not).
    setPicked((p) => (layer === "hero" ? null : prev === "hero" ? (p ?? DEFAULT_PICK) : p));
  }, [layer]);

  useEffect(
    () => () => {
      delete document.documentElement.dataset.layer;
    },
    [],
  );

  useEffect(() => {
    pickedRef.current = picked;
    sceneRef.current?.setHalted(picked);
  }, [picked]);

  const go = (delta: 1 | -1) => {
    const next = ORDER[ORDER.indexOf(layer) + delta];
    const target = next
      ? document.getElementById(next)
      : delta > 0
        ? sectionRef.current?.nextElementSibling
        : null;
    target?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  };

  const idx = ORDER.indexOf(layer);
  const nextName = LAYERS[idx + 1]?.name ?? "Book a demo";
  const cardPos = picked === null ? null : (livePos.current?.[picked] ?? MARKED[picked]);

  return (
    <section
      ref={sectionRef}
      className="brain"
      data-layer={layer}
      aria-label="How Blindsight works"
      onKeyDown={(e) => {
        if (e.key === "Escape") setPicked(null);
      }}
    >
      <div
        ref={stageRef}
        className="brain-stage"
        onPointerDown={(e) => {
          swipeStart.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const s = swipeStart.current;
          swipeStart.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          // A tap or click away from the orbs and card releases the orb and closes its card.
          if (Math.hypot(dx, dy) < 8) {
            if (!(e.target as Element).closest("button, a, .brain-card")) setPicked(null);
            return;
          }
          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
          go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <div ref={artRef} className={`brain-art ${live ? "is-live" : ""}`}>
          <div className="brain-poster-wrap" dangerouslySetInnerHTML={{ __html: posterSvg }} />
          <canvas ref={canvasRef} className="brain-canvas" aria-hidden="true" />
          {layer !== "hero" &&
            MARKED.map((m, i) => (
              <button
                key={m.id}
                ref={(el) => {
                  btnRefs.current[i] = el;
                  const p = livePos.current?.[i];
                  if (el && live && p) {
                    el.style.left = `${p.x}%`;
                    el.style.top = `${p.y}%`;
                  }
                }}
                type="button"
                className="brain-obj"
                style={live ? undefined : { left: `${m.x}%`, top: `${m.y}%` }}
                aria-label={objectLabel(layer, m)}
                aria-pressed={picked === i}
                aria-controls="brain-card"
                data-picked={picked === i || undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") setPicked(i);
                }}
                onFocus={() => setPicked(i)}
                onClick={() => setPicked(i)}
              />
            ))}
          <div className="brain-card-slot" aria-live="polite">
            {layer !== "hero" && picked !== null && cardPos && inView && (
              <BrainCard
                ref={anchorRef}
                layer={layer}
                m={MARKED[picked]}
                x={cardPos.x}
                y={cardPos.y}
              />
            )}
          </div>
        </div>

        {scan && (
          <span
            key={scan.key}
            className="brain-scan"
            data-dir={scan.dir}
            style={{ animationDuration: `${TRANSITION.scanMs}ms` }}
            aria-hidden="true"
          />
        )}

        {LAYERS.map((l, i) => {
          const active = l.id === layer;
          return (
            <div
              key={l.id}
              className={`brain-copy ${active ? "is-active" : ""}`}
              aria-hidden={!active}
            >
              <div className="brain-copy-head">
                <span className="brain-kicker">{l.num ? `${l.num} · ${l.name}` : l.name}</span>
                {l.id === "hero" ? <h1>{l.heading}</h1> : <h2>{l.heading}</h2>}
                {l.id !== "hero" && <p>{l.sub}</p>}
              </div>
              {l.id === "hero" ? (
                <div className="brain-copy-foot is-hero">
                  <p>{l.sub}</p>
                  <span className="brain-hint">
                    <ArrowDown aria-hidden="true" size={16} />
                    Scroll · Swipe
                  </span>
                </div>
              ) : (
                <div className="brain-copy-foot">
                  <span className="brain-count">{l.num} / 03</span>
                  <span className="brain-rule" aria-hidden="true" />
                  <span className="brain-hint">
                    Scroll to {(LAYERS[i + 1]?.name ?? "Book a demo").toLowerCase()} ↓
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {idx > 0 && (
          <div className="brain-rail is-left">
            <button type="button" aria-label="Back" onClick={() => go(-1)}>
              <ChevronRight aria-hidden="true" />
            </button>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`brain-tick ${n <= idx ? "is-done" : ""}`}
                aria-hidden="true"
              />
            ))}
          </div>
        )}
        <div className="brain-rail is-right">
          <button type="button" aria-label={`Next: ${nextName}`} onClick={() => go(1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="brain-rail-label" aria-hidden="true">
            Pull / swipe
          </span>
        </div>
      </div>

      <div className="brain-steps">
        {ORDER.map((id) => (
          <div key={id} id={id} className="brain-step" />
        ))}
      </div>
    </section>
  );
}

/* The card and its connector hang off an anchor at the object's position; the
   scene's frame callback moves the anchor so the card tracks the object. */
const BrainCard = forwardRef<
  HTMLDivElement,
  { layer: StepId; m: MarkedObject; x: number; y: number }
>(function BrainCard({ layer, m, x, y }, ref) {
  const style = { "--x": `${x}%`, "--y": `${y}%` } as React.CSSProperties;
  const head = (tag: string) => (
    <div className="brain-card-head">
      <span className="brain-tag">{tag}</span>
      <span className="brain-card-src">{m.source}</span>
    </div>
  );
  const row = (k: string, v: string) => (
    <div>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );

  return (
    <div ref={ref} className="brain-anchor" data-side={cardSide(x)} style={style}>
      <span className="brain-link" aria-hidden="true" />
      <span className="brain-link-v" aria-hidden="true" />
      <div id="brain-card" className="brain-card">
        {layer === "see" && (
          <>
            {head("Threat")}
            <h3>{m.threat.title}</h3>
            <p>{m.threat.body}</p>
            <dl>
              {row("Target", m.threat.target)}
              {row("Severity", m.threat.severity)}
            </dl>
          </>
        )}
        {layer === "govern" && (
          <>
            {head("Fixed")}
            <h3>{m.fix.title}</h3>
            <p>{m.fix.body}</p>
            <dl>
              {row("Policy", m.fix.policy)}
              {row("Action", m.fix.action)}
              {row("Outcome", m.fix.outcome)}
            </dl>
          </>
        )}
        {layer === "prove" && (
          <>
            {head("Audit trail")}
            <ol className="brain-trail">
              <li data-step="detected">
                <span>[hh:mm:ss] · Detected</span>
                {m.detected}
              </li>
              <li data-step="corrected">
                <span>[hh:mm:ss] · Corrected</span>
                {m.fix.title}
              </li>
              <li data-step="logged">
                <span>[hh:mm:ss] · Logged</span>
                Evidence sealed · [evidence hash]
              </li>
            </ol>
            <ul className="brain-checks">
              {AUDIT_CHECKS.map((c) => (
                <li key={c}>
                  <Check aria-hidden="true" size={16} />
                  {c}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
});
