import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import icebergImg from "@/assets/iceberg.webp";

/** The iceberg illustration is painted as a centered background scaled above the
 *  container (see `.iceberg-img` in styles.css). To drop markers *on* the iceberg
 *  we express each one as a fraction of the source image and convert it to
 *  container pixels using the live background-size / position — so the markers
 *  track the artwork at any viewport width or breakpoint. */
const IMG_RATIO = 922 / 1640; // iceberg.webp natural height / width

type Threat = {
  id: string;
  name: string;
  meta: string;
  /** Above the waterline (caught today) vs below it (hidden). */
  visible: boolean;
  desc: string;
  /** Anchor on the source image, 0–1 of width / height. */
  fx: number;
  fy: number;
};

const THREATS: Threat[] = [
  {
    id: "prompt-injection",
    name: "Obvious prompt injections",
    meta: "Visible · Caught today",
    visible: true,
    fx: 0.49,
    fy: 0.2,
    desc: 'Direct attempts to talk the model out of its rules — "ignore your instructions and…". They’re the loudest, easiest attacks to catch, which is exactly why a serious adversary never stops here.',
  },
  {
    id: "jailbreak-strings",
    name: "Known jailbreak strings",
    meta: "Visible · Caught today",
    visible: true,
    fx: 0.45,
    fy: 0.3,
    desc: "Catalogued tricks — DAN-style personas, role-play wrappers — that coax a model past its guardrails. Signature filters block the known ones; the trouble is new variants appear faster than any blocklist can grow.",
  },
  {
    id: "poisoned-training",
    name: "Poisoned training samples",
    meta: "Hidden",
    visible: false,
    fx: 0.45,
    fy: 0.41,
    desc: "Tainted examples slipped into training or fine-tuning data. The model learns the attacker’s intent as ground truth, so the flaw is baked into the weights — invisible to anything inspecting the prompt.",
  },
  {
    id: "adversarial-rag",
    name: "Adversarial RAG ingestion",
    meta: "Hidden",
    visible: false,
    fx: 0.56,
    fy: 0.42,
    desc: "Malicious instructions hidden inside the documents your model retrieves at run time. The prompt looks clean; the payload rides in on a source the model has been told to trust.",
  },
  {
    id: "demographic-shortcut",
    name: "Demographic shortcut learning",
    meta: "Hidden",
    visible: false,
    fx: 0.44,
    fy: 0.51,
    desc: "The model quietly keys off a proxy — a name, a postcode, a turn of phrase — instead of the real signal. Aggregate accuracy looks healthy while specific groups are judged on the wrong evidence.",
  },
  {
    id: "back-doors",
    name: "Back-doors",
    meta: "Hidden",
    visible: false,
    fx: 0.57,
    fy: 0.52,
    desc: "A hidden trigger sewn into the model: it behaves perfectly until it meets the secret key — a rare token, a watermark — then switches to the attacker’s behaviour on cue.",
  },
  {
    id: "adversarial-patching",
    name: "Adversarial patching",
    meta: "Hidden",
    visible: false,
    fx: 0.49,
    fy: 0.61,
    desc: "Small, deliberately crafted perturbations — a sticker on a sign, a few stray characters — that mean nothing to a human yet reliably steer the model to the wrong answer.",
  },
  {
    id: "insider-misuse",
    name: "Misuse by privileged insiders",
    meta: "Hidden",
    visible: false,
    fx: 0.5,
    fy: 0.71,
    desc: "Legitimate access turned against you — sanctioned credentials used to siphon data or bend outputs. Every request is authorised, so perimeter defences never raise a flag.",
  },
];

/** "Only see the tip" iceberg section. Eyebrow/id are parametrized so different
 *  landing-page versions can re-frame it (e.g. "The Problem" vs "Why Blindsight?"). */
export function Iceberg({
  id = "why",
  eyebrow = "The Problem",
}: {
  id?: string;
  eyebrow?: string;
}) {
  // `hovered` is the transient desktop hover; `pinned` is the click-to-keep-open
  // popup that drives the mobile modal.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState({ w: 0, h: 0, scale: 1.65, px: 0.5, py: 0.5 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const sizeTok = cs.backgroundSize.split(" ")[0].trim();
      const scale = sizeTok.endsWith("%") ? parseFloat(sizeTok) / 100 : 1.65;
      const pos = cs.backgroundPosition.split(" ");
      const px = pos[0]?.endsWith("%") ? parseFloat(pos[0]) / 100 : 0.5;
      const py = pos[1]?.endsWith("%") ? parseFloat(pos[1]) / 100 : 0.5;
      setGeom({ w: el.clientWidth, h: el.clientHeight, scale, px, py });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Persistent popup closes on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  const markerPos = (t: Threat) => {
    const { w, h, scale, px, py } = geom;
    const bw = scale * w;
    const bh = bw * IMG_RATIO;
    const offX = px * (w - bw);
    const offY = py * (h - bh);
    return { left: `${offX + t.fx * bw}px`, top: `${offY + t.fy * bh}px` };
  };

  const isMobile = () =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  // Desktop: click pins/un-pins the side tooltip. Mobile: click opens/closes the modal.
  const tap = (tid: string) =>
    isMobile()
      ? setPinned((cur) => (cur === tid ? null : tid))
      : setHovered((cur) => (cur === tid ? null : tid));
  const enter = (tid: string) => setHovered(tid);
  const leave = (tid: string) => setHovered((cur) => (cur === tid ? null : cur));

  const pinnedThreat = THREATS.find((t) => t.id === pinned) ?? null;

  return (
    <section className="section" id={id}>
      <div className="section-inner">
        <div className="s-head reveal">
          <span className="tag">{eyebrow}</span>
          <h2>Existing tools only see the tip.</h2>
          <p>
            Most AI security platforms catch the surface threats, the prompts that look obviously
            wrong. Hackers adapt and evolve. The most dangerous attacks are the ones others least
            expect, and the ones that look legitimate all the way through.
          </p>
        </div>

        <p className="iceberg-hint">Tap any threat to read more.</p>

        <div className="iceberg-grid">
          <div className="reveal iceberg-col-list">
            <div className="threat-list">
              {THREATS.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  className={`threat-row ${t.visible ? "" : "hidden-row"} ${hovered === t.id ? "active" : ""}`}
                  onMouseEnter={() => enter(t.id)}
                  onMouseLeave={() => leave(t.id)}
                  onFocus={() => enter(t.id)}
                  onBlur={() => leave(t.id)}
                  onClick={() => tap(t.id)}
                  aria-expanded={hovered === t.id}
                >
                  <span className="threat-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="name">{t.name}</span>
                  <span className="meta">{t.meta}</span>
                  <span className="threat-row-desc">{t.desc}</span>
                </button>
              ))}
            </div>
            <p className="iceberg-footnote">
              If even <span className="iceberg-footnote-accent">1</span> of these threats reach
              production, the model is compromised, and you won&apos;t know until the damage has
              been done.
            </p>
          </div>

          <div className="reveal iceberg-col-art">
            <div
              className="iceberg-img"
              ref={stageRef}
              style={{ backgroundImage: `url(${icebergImg})` }}
            >
              {geom.w > 0 &&
                THREATS.map((t, i) => {
                  const active = hovered === t.id || pinned === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      className={`ib-marker ${t.visible ? "is-visible" : "is-hidden"} ${active ? "active" : ""} ${t.fx < 0.5 ? "label-left" : "label-right"}`}
                      style={markerPos(t)}
                      onMouseEnter={() => enter(t.id)}
                      onMouseLeave={() => leave(t.id)}
                      onFocus={() => enter(t.id)}
                      onBlur={() => leave(t.id)}
                      onClick={() => tap(t.id)}
                      aria-label={`${t.name}. ${t.desc}`}
                    >
                      <span className="ib-marker-num" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span className="ib-marker-label" aria-hidden="true">
                        {t.name}
                      </span>
                      <span className="ib-tip" role="tooltip">
                        <span className="ib-tip-meta">
                          {t.visible ? "Visible · caught today" : "Hidden threat"}
                        </span>
                        <span className="ib-tip-name">{t.name}</span>
                        <span className="ib-tip-desc">{t.desc}</span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {pinnedThreat && (
        <div
          className="ib-modal"
          role="dialog"
          aria-modal="true"
          aria-label={pinnedThreat.name}
          onClick={() => setPinned(null)}
        >
          <div className="ib-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ib-modal-close"
              onClick={() => setPinned(null)}
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <span className="ib-tip-meta">
              {pinnedThreat.visible ? "Visible · caught today" : "Hidden threat"}
            </span>
            <span className="ib-tip-name">{pinnedThreat.name}</span>
            <p className="ib-tip-desc">{pinnedThreat.desc}</p>
          </div>
        </div>
      )}
    </section>
  );
}
