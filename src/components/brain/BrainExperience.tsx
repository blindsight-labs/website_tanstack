import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check, ChevronLeft, ChevronRight } from "lucide-react";

import posterSvg from "@/assets/brain-poster.svg?raw";
import type { BrainScene, ScreenPos } from "./brain-scene";
import {
  AUDIT_CHECKS,
  LAYERS,
  MARKED,
  type LayerId,
  type MarkedObject,
  type StepId,
} from "./brain-content";

/* ── Home page brain experience ──
   A sticky full-viewport stage over four 100svh scroll steps (#hero, #see,
   #govern, #prove). Whichever step is half in view is the active layer.
   Scroll, a horizontal swipe on the stage, the edge rails and the nav's
   See/Govern/Prove links all move between layers through native scrolling.
   In See/Govern/Prove the five marked objects are real buttons: hover, focus
   or tap one to open its card, which also halts that object. The three.js
   scene (brain-scene.ts) renders over a static SVG poster, which stays as
   the fallback for reduced motion and no WebGL. */

const ORDER = LAYERS.map((l) => l.id);

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

function objectLabel(layer: StepId, m: MarkedObject) {
  if (layer === "see") return `Threat: ${m.threat.title}`;
  if (layer === "govern") return `Fix: ${m.fix.title}`;
  return `Audit trail: ${m.threat.title}`;
}

export function BrainExperience() {
  const [layer, setLayer] = useState<LayerId>("hero");
  // The open card: which object, and where it was on screen when picked.
  const [picked, setPicked] = useState<{ i: number; x: number; y: number } | null>(null);
  const [live, setLive] = useState(false); // WebGL scene rendering over the poster
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<BrainScene | null>(null);
  const layerRef = useRef<LayerId>("hero");
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
    import("./brain-scene").then(({ createBrainScene }) => {
      if (cancelled) return;
      try {
        sceneRef.current = createBrainScene(canvas, {
          mobile: window.matchMedia("(max-width: 640px)").matches,
          markedCount: MARKED.length,
          styleSource: section,
          onFrame: (pos) => {
            livePos.current = pos;
            // Buttons follow their objects without a React render per frame.
            pos.forEach((p, i) => {
              const b = btnRefs.current[i];
              if (!b) return;
              b.style.left = `${p.x}%`;
              b.style.top = `${p.y}%`;
            });
          },
          onReady: () => setLive(true),
        });
        sceneRef.current.setLayer(layerRef.current);
      } catch {
        /* no WebGL: keep the poster */
      }
    });
    const mo = new MutationObserver(() => sceneRef.current?.setTheme());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      cancelled = true;
      mo.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    layerRef.current = layer;
    sceneRef.current?.setLayer(layer);
  }, [layer]);

  useEffect(() => {
    sceneRef.current?.setHalted(picked?.i ?? null);
  }, [picked]);

  const pick = (i: number) => {
    const p = livePos.current?.[i] ?? MARKED[i];
    setPicked({ i, x: p.x, y: p.y });
  };
  const unpick = (i: number) => setPicked((p) => (p?.i === i ? null : p));

  useEffect(() => {
    const steps = sectionRef.current?.querySelectorAll(".brain-step") ?? [];
    const io = new IntersectionObserver(
      (entries) => {
        // Any step entering or leaving closes the card (incl. scrolling past the section).
        setPicked(null);
        for (const e of entries) if (e.isIntersecting) setLayer(e.target.id as LayerId);
      },
      { threshold: 0.5 },
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // Mirrored onto <html> so the nav can underline the active step.
  useEffect(() => {
    document.documentElement.dataset.layer = layer;
    return () => {
      delete document.documentElement.dataset.layer;
    };
  }, [layer]);

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
  const pickedObj = picked && layer !== "hero" ? MARKED[picked.i] : null;

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
          if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
          go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        <div className={`brain-art ${live ? "is-live" : ""}`}>
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
                aria-expanded={picked?.i === i}
                aria-controls="brain-card"
                data-picked={picked?.i === i || undefined}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") pick(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") unpick(i);
                }}
                onFocus={() => pick(i)}
                onBlur={() => unpick(i)}
                onClick={() => pick(i)}
              />
            ))}
          <div className="brain-card-slot" aria-live="polite">
            {pickedObj && picked && layer !== "hero" && (
              <BrainCard layer={layer} m={pickedObj} x={picked.x} y={picked.y} />
            )}
          </div>
        </div>

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

function BrainCard({ layer, m, x, y }: { layer: StepId; m: MarkedObject; x: number; y: number }) {
  const side = x > 55 ? "is-left" : "is-right";
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
    <>
      <span className={`brain-link ${side}`} style={style} aria-hidden="true" />
      <div id="brain-card" className={`brain-card ${side}`} style={style}>
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
    </>
  );
}
