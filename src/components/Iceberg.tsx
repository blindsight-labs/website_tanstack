import { useEffect, useRef, useState } from "react";

import icebergImg from "@/assets/iceberg.webp";

/** The iceberg illustration is painted as a centered background scaled to 165%
 *  of the container width (see `.iceberg-img` in styles.css). To drop markers
 *  *on* the iceberg we express each one as a fraction of the source image and
 *  convert it to container pixels with the same scale/centre transform — so the
 *  markers track the artwork at any viewport width. */
const IMG_RATIO = 922 / 1640; // iceberg.webp natural height / width
const BG_SCALE = 1.65; // matches `background-size: 165% auto`

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
    fx: 0.55,
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
    fx: 0.56,
    fy: 0.51,
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
    fy: 0.7,
    desc: "Legitimate access turned against you — sanctioned credentials used to siphon data or bend outputs. Every request is authorised, so perimeter defences never raise a flag.",
  },
];

/** "Only see the tip" iceberg section. Eyebrow/id are parametrized so different
 *  landing-page versions can re-frame it (e.g. "The Problem" vs "Why Blindsight?"). */
export function Iceberg({ id = "why", eyebrow = "The Problem" }: { id?: string; eyebrow?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const enter = (tid: string) => setActive(tid);
  const leave = (tid: string) => setActive((cur) => (cur === tid ? null : cur));
  const tap = (tid: string) => setActive((cur) => (cur === tid ? null : tid));

  const markerPos = (t: Threat) => {
    const { w, h } = box;
    const bw = BG_SCALE * w;
    const bh = bw * IMG_RATIO;
    const offX = (w - bw) / 2;
    const offY = (h - bh) / 2;
    return { left: `${offX + t.fx * bw}px`, top: `${offY + t.fy * bh}px` };
  };

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

        <div className="iceberg-grid">
          <div className="reveal">
            <div className="threat-list">
              {THREATS.map((t, i) => (
                <button
                  type="button"
                  key={t.id}
                  className={`threat-row ${t.visible ? "" : "hidden-row"} ${active === t.id ? "active" : ""}`}
                  onMouseEnter={() => enter(t.id)}
                  onMouseLeave={() => leave(t.id)}
                  onFocus={() => enter(t.id)}
                  onBlur={() => leave(t.id)}
                  onClick={() => tap(t.id)}
                  aria-expanded={active === t.id}
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
              production, the model is compromised, and you won&apos;t know until the damage has been
              done.
            </p>
          </div>

          <div className="reveal">
            <div
              className="iceberg-img"
              ref={stageRef}
              style={{ backgroundImage: `url(${icebergImg})` }}
            >
              {box.w > 0 &&
                THREATS.map((t, i) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`ib-marker ${t.visible ? "is-visible" : "is-hidden"} ${active === t.id ? "active" : ""}`}
                    style={markerPos(t)}
                    onMouseEnter={() => enter(t.id)}
                    onMouseLeave={() => leave(t.id)}
                    onFocus={() => enter(t.id)}
                    onBlur={() => leave(t.id)}
                    onClick={() => tap(t.id)}
                    aria-label={`${t.name}. ${t.desc}`}
                  >
                    <span aria-hidden="true">{i + 1}</span>
                    <span className="ib-tip" role="tooltip">
                      <span className="ib-tip-meta">{t.visible ? "Visible · caught today" : "Hidden threat"}</span>
                      <span className="ib-tip-name">{t.name}</span>
                      <span className="ib-tip-desc">{t.desc}</span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
