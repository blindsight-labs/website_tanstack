import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronDown, Clock, EyeOff, Play, ScanEye } from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { InfoPill } from "@/components/InfoPill";
import { LogoStrip } from "@/components/LogoStrip";
import demoPageCss from "@/components/demo-page.css?url";
import logoBlindsight from "@/assets/LOGO_Blindsight.svg";

const TOKEN_LABEL = "10,000";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Why publish a second column at all?",
    a: "Because the first one alone means nothing. Two of the eight systems we measured catch 97% of attacks — and flag 79 to 85% of legitimate traffic with them. That's roughly sixteen real requests refused for every extra attack caught. A detection rate you can't price in false positives isn't a result, it's a number.",
  },
  {
    q: "Why is indirect injection still unsolved?",
    a: "The API contract, not the model. A scanner that takes one string and returns one verdict has thrown away the deciding information before it starts — the same sentence is work from your user and an attack from a fetched page. Declare the origin of each span and detection moves from 0.617 to 0.967 on InjecAgent, with zero movement on the clean controls. Same classifier, same rows.",
  },
  {
    q: "Where do you lose?",
    a: "Harmful-content classification: 0.7925, and we say so. We're also slower on short inputs — 57ms to 388ms as input grows, because every window gets classified rather than the first N tokens. A flat latency curve across a hundredfold change in input length isn't speed, it's a scanner that stopped reading. We publish the losses with the mechanism behind each one.",
  },
  {
    q: `What exactly does "free" cover?`,
    a: `${TOKEN_LABEL} tokens of inspection per organization, across both engines, for the length of the trial. No card, no invoice, no automatic conversion to a paid plan. Cross the cap and we talk about what's next — we don't bill you for it.`,
  },
  {
    q: `Why ${TOKEN_LABEL} tokens, and can that change?`,
    a: "It's the volume we've found is enough to surface something real in a working environment. The cap is per organization and may be revised as the program runs. If it changes, participants hear it from us first, in writing.",
  },
  {
    q: "Is it really both engines, or a stripped-down version?",
    a: "Both, combined, with the same detection rules and the same audit trail as a paid deployment. The trial limits volume, not capability.",
  },
  {
    q: "How much work is it to get running?",
    a: "Install and go. Shadow AI is an agent on the machine; the Runtime proxy sits in front of the endpoint you already call. No model changes, no application rewrite, nothing to re-architect.",
  },
  {
    q: "Where does our data go?",
    a: "The trial is cloud-only: your own tenant or VPC, or a public-cloud instance managed by Blindsight. Shadow AI redacts on the device, so sensitive values never reach a model or reach us. On-prem and air-gapped deployments exist, but not inside this program.",
  },
  {
    q: "What happens when the trial ends?",
    a: "Nothing automatic. You keep your audit trail export, you get the full benchmark report, and if you want to continue we scope it then. Walking away costs nothing and needs no notice.",
  },
];

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Blindsight - Free Trial" },
      {
        name: "description",
        content:
          "Run Blindsight's Runtime Security and Shadow AI engines on your own traffic. 10,000 free tokens, no card, no procurement.",
      },
      { property: "og:title", content: "Blindsight - Free Trial" },
      {
        property: "og:description",
        content:
          "Measure Blindsight on your own traffic. 10,000 free tokens, two minutes to start.",
      },
      { property: "og:url", content: "https://blindsight.io/demo" },
    ],
    links: [
      { rel: "canonical", href: "https://blindsight.io/demo" },
      { rel: "stylesheet", href: demoPageCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://blindsight.io/" },
            {
              "@type": "ListItem",
              position: 2,
              name: "Free Trial",
              item: "https://blindsight.io/demo",
            },
          ],
        }),
      },
    ],
  }),
});

const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Free trial" },
  { id: "walkthrough", label: "See the console" },
  { id: "included", label: "What's included" },
  { id: "how", label: "How it works" },
  { id: "faq", label: "FAQ" },
];

function SectionRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCollapsed(true), 3200);
    return () => clearTimeout(t);
  }, []);
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
    <nav className={`section-rail ${collapsed ? "is-collapsed" : ""}`} aria-label="Page progress">
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

const BENCHMARKS: { value: string; unit?: string; label: string; method: string }[] = [
  { value: "0.9008", label: "Attacks blocked", method: "Across all 77 datasets" },
  { value: "0.9185", label: "Legitimate work delivered", method: "The column nobody prints" },
  {
    value: "+35",
    unit: "pts",
    label: "Detection gain from origin",
    method: "0.617 → 0.967, InjecAgent",
  },
  {
    value: "57–388",
    unit: "ms",
    label: "Scan time scales with input",
    method: "Every window classified",
  },
];

function Hero() {
  const { open } = useDemoModal();
  return (
    <header className="va-hero" id="hero" style={{ paddingTop: 96, paddingBottom: 4 }}>
      <div className="va-hero-inner" style={{ gridTemplateColumns: "1fr", placeItems: "center" }}>
        <div
          className="va-hero-copy reveal"
          style={{ alignItems: "center", textAlign: "center", maxWidth: 880, gap: 10 }}
        >
          <span className="tag">Runtime + Shadow AI · Free trial</span>
          <h1 style={{ fontSize: "clamp(34px, 5vw, 68px)" }}>
            A detection rate on its own
            <br />
            is <span className="accent">worthless</span>.
          </h1>
          <p className="lede" style={{ maxWidth: 680 }}>
            Anything scores a perfect 1.000 by blocking everything. So we measured 8 systems across
            77 datasets and published the second column — what each one costs on legitimate traffic.
            Here is ours. Run it on your own stack with {TOKEN_LABEL} free tokens.
          </p>

          <div className="proof-strip">
            <div className="proof-strip-head">
              <Clock aria-hidden="true" />
              <span>Benchmark for Runtime Security · 8 systems · 77 datasets</span>
            </div>
            <div className="proof-strip-grid">
              {BENCHMARKS.map((b) => (
                <div className="proof-stat" key={b.label}>
                  <div className="proof-stat-value">
                    <span>{b.value}</span>
                    {b.unit && <span className="proof-stat-unit">{b.unit}</span>}
                  </div>
                  <div className="proof-stat-label">{b.label}</div>
                  <div className="proof-stat-method">{b.method}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <button
              type="button"
              id="hero-cta"
              className="btn btn-primary"
              onClick={() => open("trial")}
            >
              Start your free trial
            </button>
          </div>
          <p className="hero-trust" style={{ maxWidth: 640 }}>
            Every figure carries its method and raw runs, including the four where we come second. *
            {TOKEN_LABEL} tokens per organization — no card, no procurement, no commitment.
          </p>
        </div>
      </div>
      <LogoStrip />
    </header>
  );
}

const DEMOS: { label: string; title: string; desc: string; footer: string }[] = [
  {
    label: "Overview",
    title: "Live traffic, one verdict column",
    desc: "Allow, flag, redact and block as they land — with the span that triggered each one.",
    footer: "Where a CISO starts: what happened in the last hour.",
  },
  {
    label: "Scan detail",
    title: "Why this was blocked",
    desc: "The origin of every span, the rule that fired, and the model's own reply inspected alongside it.",
    footer: "The origin-aware contract, made visible.",
  },
  {
    label: "Audit trail",
    title: "Export-ready record",
    desc: "Every allow, flag and block, tamper-evident and exportable for your auditor.",
    footer: "Proof, not screenshots.",
  },
];

function Walkthrough() {
  const [active, setActive] = useState(0);
  const activeDemo = DEMOS[active];
  return (
    <section className="section section-alt" id="walkthrough" style={{ paddingTop: 24 }}>
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">See the console</span>
          <h2>The evidence, where you&apos;ll actually read it.</h2>
          <p>
            Verdicts, spans and the audit trail as they appear in the Runtime Security Console.
            Click through it yourself — no signup to watch.
          </p>
        </div>

        <div className="reveal" style={{ margin: "36px auto 0", maxWidth: 1000 }}>
          <div className="faq-tabs" style={{ justifyContent: "center", margin: "0 0 20px" }}>
            {DEMOS.map((d, i) => (
              <button
                type="button"
                key={d.label}
                className={`faq-tab ${active === i ? "active" : ""}`}
                aria-pressed={active === i}
                onClick={() => setActive(i)}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Swap this block for the Supademo <iframe> when the recording is ready.
              Keep the demo-stage wrapper; give the iframe width/height 100% and no border. */}
          <div className="demo-stage">
            <div className="demo-stage-body">
              <span className="demo-stage-icon">
                <Play aria-hidden="true" />
              </span>
              <div className="demo-stage-title">{activeDemo.title}</div>
              <p className="demo-stage-desc">{activeDemo.desc}</p>
              <div className="demo-stage-meta">
                <Clock aria-hidden="true" />
                <span>Interactive walkthrough · dropping in</span>
              </div>
            </div>
          </div>

          <div className="walkthrough-foot">
            <span className="walkthrough-foot-caption">{activeDemo.footer}</span>
            <span className="walkthrough-foot-counter">
              Recording {active + 1} of {DEMOS.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

const ENGINES: {
  key: string;
  Icon: typeof EyeOff;
  name: string;
  kicker: string;
  body: string;
  points: string[];
}[] = [
  {
    key: "shadow",
    Icon: EyeOff,
    name: "Shadow AI",
    kicker: "Client-side · discover & redact",
    body: "Your team is already using AI tools you never approved. Shadow AI runs on the machine, names every one of them, and masks sensitive values before a model ever sees them.",
    points: [
      "Watches the reply, not just the prompt — the leak happens on the way out",
      "Machine credentials, not only personal data: API keys and tokens in model output",
      "Redaction happens on-device. The data never reaches a model, or us",
    ],
  },
  {
    key: "runtime",
    Icon: ScanEye,
    name: "Runtime Security Proxy",
    kicker: "Server-side · inspect & enforce",
    body: `Indirect injection isn't a model problem, it's a contract problem. "Summarize the 2020 climate report" is work when your user types it and an attack when it arrives inside a fetched page. Declare where each span came from and the same classifier goes from 0.617 to 0.967 — with no new false positives.`,
    points: [
      "Origin-aware inspection: user turn, document and tool output are not the same input",
      "Classifies every window of a long input — an instruction in paragraph nine still gets caught",
      "Every allow, flag and block written to a tamper-evident audit trail",
    ],
  },
];

function Included() {
  return (
    <section className="section" id="included">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">What&apos;s included</span>
          <h2>Both engines. One runtime.</h2>
          <p>
            Shadow AI covers what leaves the laptop. Runtime covers what reaches the model, and what
            it sends back.
            <br />
            Together they answer the question your board is already asking: what is our AI actually
            doing?
          </p>
        </div>

        <div className="reveal" style={{ margin: "44px auto 0", maxWidth: 1080 }}>
          <div className="included-grid">
            {ENGINES.map(({ key, Icon, name, kicker, body, points }) => (
              <div className="engine-card" key={key}>
                <div className="engine-card-head">
                  <span className="engine-icon">
                    <Icon strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="engine-name">{name}</span>
                    <span className="tag engine-kicker">{kicker}</span>
                  </span>
                </div>
                <p className="engine-body">{body}</p>
                <ul className="engine-points">
                  {points.map((p) => (
                    <li className="engine-point" key={p}>
                      <Check strokeWidth={2.6} aria-hidden="true" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="included-banner">
            <span className="included-banner-copy">
              One platform, one policy set, one tamper-evident audit trail — yours to export.
              <br />
              Model claims decay in six months. An architecture claim doesn&apos;t.
            </span>
            <span className="included-banner-tag">Included in the trial</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS: { n: number; label: string; note: string }[] = [
  { n: 1, label: "Apply", note: "two minutes" },
  { n: 2, label: "Install", note: "same day, no re-architecture" },
  { n: 3, label: "Start protecting your AI", note: "your own numbers, day one" },
];

function HowItWorks() {
  return (
    <section className="section section-alt" id="how">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">How it works</span>
          <h2>Three steps. No procurement cycle.</h2>
          <p>
            Nothing to re-architect, no committee to convene. Point your traffic at the proxy and
            read your own second column by the end of the day.
          </p>
        </div>

        <aside className="engage reveal">
          <div className="engage-steps-outer">
            <svg
              className="engage-snake"
              viewBox="0 0 440 52"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="engage-snake-path"
                d="M73,0 C146,0 146,52 220,52 C294,52 294,0 367,0"
              />
            </svg>
            <ol className="engage-steps">
              {STEPS.map(({ n, label, note }) => (
                <li className="engage-step" key={n}>
                  <div className="engage-rail" aria-hidden="true">
                    <span className="engage-num">{n}</span>
                    {n < STEPS.length && <span className="engage-spine" />}
                  </div>
                  <div className="engage-body">
                    <span className="engage-step-label">{label}</span>
                    <span className="engage-step-note">{note}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <div className="cstack-deploy reveal" style={{ marginTop: 52 }}>
          <span className="cstack-deploy-label">Deploy in your cloud</span>
          <InfoPill
            name="Private cloud"
            meta="Deployment"
            desc="Deployed inside your own cloud tenant or VPC, isolated to your organization."
          />
          <InfoPill
            name="Public cloud"
            meta="Deployment"
            desc="Managed by Blindsight — the fastest way to stand up and evaluate."
          />
        </div>
        <p
          style={{
            margin: "16px auto 0",
            maxWidth: 660,
            textAlign: "center",
            fontSize: 14,
            color: "var(--muted)",
          }}
        >
          The trial runs in the cloud — your tenant or ours. On-prem and air-gapped deployments
          exist outside this program; ask on the call.
        </p>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) => (cur.includes(i) ? cur.filter((k) => k !== i) : [...cur, i]));
  return (
    <section className="section" id="faq">
      <div className="section-inner faq-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">FAQ</span>
          <h2>The method, and the terms.</h2>
        </div>
        <div className="faq-list reveal">
          {FAQS.map((f, i) => {
            const isOpen = open.includes(i);
            return (
              <div className={`faq-item ${isOpen ? "open" : ""}`} key={f.q}>
                <button
                  type="button"
                  className="faq-q"
                  aria-expanded={isOpen}
                  onClick={() => toggle(i)}
                >
                  <span>{f.q}</span>
                  <ChevronDown className="faq-chevron" size={18} aria-hidden="true" />
                </button>
                <div className="faq-a">
                  <div>
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  const { open } = useDemoModal();
  return (
    <section className="section section-alt" id="contact">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">Get started</span>
          <h2>See it. Stop it. Prove it.</h2>
          <p>
            Take the numbers into every other vendor call — then measure ours on your own traffic.
            Tell us what you&apos;re building and a founder replies within one business day.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => open("trial")}>
            Start your free trial
          </button>
          <img src={logoBlindsight} alt="Blindsight" className="final-cta-logo" />
        </div>
      </div>
    </section>
  );
}

function DemoPage() {
  return (
    <main className="page-home">
      <SectionRail sections={SECTIONS} />
      <Hero />
      <Walkthrough />
      <Included />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </main>
  );
}
