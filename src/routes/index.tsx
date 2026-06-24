import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Scale, ScanEye, ShieldCheck } from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { FaqSection } from "@/components/FaqSection";
import { Iceberg } from "@/components/Iceberg";
import { InfoPill, type PillInfo } from "@/components/InfoPill";
import { faqSchemaEntities } from "@/lib/faq-content";
import { TopologyGraphDemo } from "@/routes/in-action";
import iconBlindsight from "@/assets/ICON_Blindsight.svg";
import logoAES from "@/assets/LOGO_AES.svg";
import logoClinicBarcelona from "@/assets/LOGO_ClinicBarcelona.svg";
import logoGCRAI from "@/assets/LOGO_GCRAI.png";
import logoJFloor from "@/assets/LOGO_JFloor.svg";
import logoNoeda from "@/assets/LOGO_Noéda.svg";
import logoNvidiaInception from "@/assets/LOGO_nvidiainception.svg";
import logoRebels from "@/assets/LOGO_Rebels.svg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Blindsight — Shadow AI Security" },
      {
        name: "description",
        content:
          "Your team is already using AI tools you never approved. Blindsight surfaces every Shadow AI interaction — and secures it before sensitive data leaks.",
      },
      { property: "og:title", content: "Blindsight — Shadow AI Security" },
      {
        property: "og:description",
        content: "Surface and secure every Shadow AI interaction across your organization.",
      },
      { property: "og:url", content: "https://blindsight.io/" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqSchemaEntities(),
        }),
      },
    ],
  }),
});

/* ── Section progress rail ──
   Each rail label is read LIVE from its section's eyebrow heading (the
   `.s-head .tag` element) at runtime — so renaming a section's eyebrow
   automatically renames its rail label, with no second place to edit.
   The `label` below is only a FALLBACK: used for the hero (which has no
   eyebrow) and as the server-rendered placeholder before hydration.
   (The rail's appearance is styled in styles.css under ".section-rail".) */
const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Shadow AI" },
  { id: "why", label: "Why Blindsight?" },
  { id: "scenarios", label: "Beyond Shadow AI" },
  { id: "stack", label: "Adopt in stages" },
  { id: "faq", label: "FAQ" },
];

function SectionRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  // Labels stay in sync with the section titles automatically: we pull each
  // one from the section's eyebrow (`.s-head .tag`) and only fall back to the
  // configured `label` when a section has no eyebrow (e.g. the hero).
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.label])),
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    const derived: Record<string, string> = {};
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
      const eyebrow = el?.querySelector(".s-head .tag")?.textContent?.trim();
      derived[s.id] = eyebrow || s.label;
    }
    setLabels(derived);
    return () => observer.disconnect();
  }, [sections]);
  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav className="section-rail" aria-label="Page progress">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`section-rail-item ${active === s.id ? "active" : ""}`}
          onClick={() => go(s.id)}
          aria-current={active === s.id ? "true" : undefined}
        >
          <span className="section-rail-label">{labels[s.id] ?? s.label}</span>
          <span className="section-rail-dot" />
        </button>
      ))}
    </nav>
  );
}

/* ── Client / partner logo strip (marquee) ──
   Logos are flattened to a single ink (see .logostrip-logo) so mixed-polarity
   brand art stays legible on both themes. Per-logo `h` optically balances visual
   weight: dense / multi-line marks get more height, tall wordmarks get less. */
const CLIENT_LOGOS: { src: string; name: string; h: number }[] = [
  { src: logoAES, name: "Agent Economy Association", h: 42 },
  { src: logoClinicBarcelona, name: "Clínic Barcelona · Universitat de Barcelona", h: 34 },
  { src: logoGCRAI, name: "Global Council for Responsible AI", h: 40 },
  { src: logoJFloor, name: "JFloor", h: 24 },
  { src: logoNoeda, name: "Noéda", h: 30 },
  { src: logoNvidiaInception, name: "NVIDIA Inception Program", h: 40 },
  { src: logoRebels, name: "Rebels", h: 24 },
];

function LogoStrip() {
  // One group repeats the set enough to exceed the viewport width; two identical
  // groups side-by-side make translateX(-50%) loop seamlessly with no visible seam.
  const group = [...CLIENT_LOGOS, ...CLIENT_LOGOS];
  return (
    <section className="logostrip-section section-alt" id="clients" aria-label="Trusted by">
      <div className="logostrip-eyebrow">
        <span className="tag">Trusted by teams securing AI</span>
      </div>
      <div className="logostrip">
        <div className="logostrip-track">
          {[0, 1].map((g) => (
            <div className="logostrip-group" key={g} aria-hidden={g === 1}>
              {group.map(({ src, name, h }, i) => (
                <span className="logostrip-item" key={i}>
                  <img
                    src={src}
                    alt={name}
                    className="logostrip-logo"
                    style={{ height: h }}
                    loading="lazy"
                  />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Hero — split: Shadow AI heading | scenario demo ── */
function Hero() {
  const { open: openDemo } = useDemoModal();
  return (
    <header className="va-hero" id="hero">
      <div className="va-hero-inner">
        <div className="va-hero-copy reveal">
          <h1>
            If you can&apos;t even <span className="accent">see</span> Shadow AI, how can you secure
            or govern it?
          </h1>
          <p className="lede">
            Your team is already using AI tools you never approved. Blindsight gives you visibility
            into every Shadow AI interaction across your organization — the first step to securing
            it before sensitive data walks out the door.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={openDemo}>
              Reveal your team&apos;s Shadow AI
            </button>
          </div>
        </div>

        <div className="va-hero-demo reveal">
          {/* Shadow AI animation parked for later — the component lives in
              src/components/ShadowAiDemo.tsx (+ .css). To restore: re-add the
              `ShadowAiDemo` import and the ShadowAiDemo.css head link, then swap
              this placeholder back for <ShadowAiDemo />. */}
          <div className="hero-placeholder">
            <img src={iconBlindsight} alt="Blindsight" className="hero-placeholder-icon" />
          </div>
        </div>
      </div>

      <LogoStrip />

      <button
        type="button"
        className="hero-scroll-cue"
        aria-label="Scroll to see more"
        onClick={() =>
          document.getElementById("why")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        <ChevronDown className="hero-scroll-chevron" strokeWidth={2} aria-hidden="true" />
      </button>
    </header>
  );
}

/* ── Scenarios — Shadow AI is the entry point; the old threat demo lives here ── */
function Scenarios() {
  return (
    <section className="section" id="scenarios">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">Beyond Shadow AI</span>
          <h2>Shadow AI is only the beginning.</h2>
          <p>
            It&apos;s the easiest exposure to see — and the first of many. The same pipeline hides
            prompt injection, data leakage, poisoning and model misuse. Pick a scenario and watch
            each one play out, with Blindsight off and on.
          </p>
        </div>
        <div className="scenarios-demo reveal">
          <TopologyGraphDemo embedded />
        </div>
      </div>
    </section>
  );
}

/* ── Coverage stack — Detect → Protect → Govern (each builds on the last) ── */
const STAGES: {
  id: "detect" | "protect" | "govern";
  num: string;
  name: string;
  Icon: typeof ScanEye;
  tagline: string;
  requires: string;
  items: PillInfo[];
}[] = [
  {
    id: "detect",
    num: "01",
    name: "Detect",
    Icon: ScanEye,
    tagline:
      "See every AI interaction — and the exposure hiding inside it. Visibility is the proof of value, before you spend a franc on defense.",
    requires: "Foundation · start here",
    items: [
      {
        name: "Shadow AI visibility",
        meta: "Detect",
        desc: "Surfaces every AI tool and interaction in use across your org — including the ones nobody approved.",
      },
      {
        name: "Prompt injection",
        meta: "Detect",
        desc: "Flags attempts to talk the model out of its instructions, from the obvious to the subtly disguised.",
      },
      {
        name: "PII",
        meta: "Detect",
        desc: "Spots personally identifiable information moving into or out of AI prompts and responses.",
      },
      {
        name: "PHI",
        meta: "Detect",
        desc: "Identifies protected health information in AI traffic, so regulated data doesn't leak unnoticed.",
      },
      {
        name: "Data leak prevention",
        meta: "Detect",
        desc: "Catches sensitive data leaving the organization through AI channels before it becomes an incident.",
      },
    ],
  },
  {
    id: "protect",
    num: "02",
    name: "Protect",
    Icon: ShieldCheck,
    tagline:
      "Top-of-the-line security that stops what Detect surfaces — at the prompt, in the data, and across retrieval.",
    requires: "Requires Detect",
    items: [
      {
        name: "Prompt injection",
        meta: "Protect",
        desc: "Blocks injection attempts at the prompt boundary before they reach the model.",
      },
      {
        name: "Data poisoning",
        meta: "Protect",
        desc: "Defends training and fine-tuning pipelines against tainted samples that corrupt model behavior.",
      },
      {
        name: "Adversarial patching",
        meta: "Protect",
        desc: "Neutralizes crafted perturbations designed to steer the model toward the wrong answer.",
      },
    ],
  },
  {
    id: "govern",
    num: "03",
    name: "Govern",
    Icon: Scale,
    tagline:
      "Turn enforcement into an audit trail you can prove — mapped to the regulations you answer to.",
    requires: "Requires Protect",
    items: [
      {
        name: "Compliance",
        meta: "Govern",
        desc: "Maps enforcement to the regulations you answer to and produces an audit trail you can hand to an auditor.",
      },
    ],
  },
];

/* ── Engagement flow shown beside the coverage stack ── */
const ENGAGEMENT: { label: string; note?: string; optional?: boolean }[] = [
  { label: "Fill out the form" },
  { label: "Discovery call" },
  { label: "Documents sent" },
  { label: "Further call", note: "if needed", optional: true },
  { label: "Demo" },
];

function Stages() {
  return (
    <section className="section cstack-section" id="stack">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">Adopt in stages</span>
          <h2>See it. Stop it. Prove it.</h2>
          <p>
            The three layers stack in order — protection builds on what Detect can see, governance
            on what Protect enforces. What you turn on inside each layer is scoped to you.
          </p>
        </div>

        <div className="cstack-deploy reveal">
          <span className="cstack-deploy-label">Deploy anywhere</span>
          <InfoPill
            name="On-prem"
            meta="Deployment"
            desc="Runs entirely on your own hardware, air-gapped if required — nothing leaves your perimeter."
          />
          <InfoPill
            name="Private cloud"
            meta="Deployment"
            desc="Deployed inside your own cloud tenant or VPC, isolated to your organization."
          />
          <InfoPill
            name="Public cloud"
            meta="Deployment"
            desc="Managed by Blindsight in the cloud — the fastest way to stand up and evaluate."
          />
        </div>

        <div className="cstack-grid reveal">
          <ol className="cstack">
            {STAGES.map(({ id, num, name, Icon, tagline, requires, items }, i) => (
              <li className={`cstack-tier cstack-${id}`} key={id}>
                <div className="cstack-rail" aria-hidden="true">
                  <span className="cstack-num">{num}</span>
                  {i < STAGES.length - 1 && <span className="cstack-spine" />}
                </div>
                <div className="cstack-card">
                  <div className="cstack-head">
                    <span className="cstack-icon">
                      <Icon strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <div className="cstack-headtext">
                      <h3 className="cstack-name">{name}</h3>
                      <span className="cstack-requires">{requires}</span>
                    </div>
                  </div>
                  <p className="cstack-tagline">{tagline}</p>
                  <ul className="cstack-items">
                    {items.map((it) => (
                      <li key={it.name}>
                        <InfoPill name={it.name} meta={it.meta} desc={it.desc} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <aside className="engage">
            <span className="engage-eyebrow">How engagement works</span>
            <ol className="engage-steps">
              {ENGAGEMENT.map((s, i) => (
                <li
                  className={`engage-step ${s.optional ? "is-optional" : ""}`}
                  key={s.label}
                >
                  <div className="engage-rail" aria-hidden="true">
                    <span className="engage-num">{i + 1}</span>
                    {i < ENGAGEMENT.length - 1 && <span className="engage-spine" />}
                  </div>
                  <div className="engage-body">
                    <span className="engage-step-label">{s.label}</span>
                    {s.note && <span className="engage-step-note">{s.note}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <p className="cstack-note reveal">
          Modular by design — begin with Detect to prove the value, then layer in Protect and Govern
          as you need them.
        </p>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main className="page-home">
      <SectionRail sections={SECTIONS} />
      <Hero />
      <Iceberg
        id="why"
        eyebrow="Why Blindsight?"
        segue="Now you've seen what hides beneath the surface. Want to go deeper? Watch each threat play out — and Blindsight shut it down — in the live demo below."
      />
      <Scenarios />
      <Stages />
      <FaqSection />
    </main>
  );
}
