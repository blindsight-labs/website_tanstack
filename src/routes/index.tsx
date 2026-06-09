import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  Cpu,
  Database,
  Globe,
  Landmark,
  MonitorPlay,
  Network,
  ShieldCheck,
} from "lucide-react";

import emblem from "@/assets/emblem.png";
import { useDemoModal } from "@/components/DemoModal";
import { HexBg } from "@/components/HexBg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "AI Security - Blindsight" },
      { name: "description", content: "Blindsight delivers LLM security and AI threat detection for regulated enterprises — runtime, data, and governance in one platform. Defend against prompt injection, jailbreaks, and back-doors." },
      { property: "og:title", content: "AI Security - Blindsight" },
      { property: "og:description", content: "LLM security and AI threat detection for regulated enterprises. Runtime, data, and governance in one platform." },
      { property: "og:url", content: "https://blindsight.io/" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/" }],
  }),
});

function Hero() {
  const { open: openDemo } = useDemoModal();
  return (
    <header className="hero-hex" id="hero">
      <HexBg className="hero-hex-canvas" />
      <div className="hero-hex-inner reveal">
        <span className="tag">Securing AI · Built in Zurich</span>
        <h1>
          <span className="hero-line">Gain sight over</span>
          <br />
          <span className="accent-grad">Shadow AI.</span>
        </h1>
        <p className="lede">
          Deploy AI without blind spots. AI systems face threats from bad actors, misuse, and
          human error at every layer. Blindsight is the only platform securing all of them.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={openDemo}>Request a Demo</button>
        </div>
      </div>
    </header>
  );
}

type ModuleKey = "interceptor" | "warden" | "antidote";

const MODULE_INFO: Record<ModuleKey, { tag: string; desc: string }> = {
  interceptor: {
    tag: "Blindsight Interceptor",
    desc: "Sits between users, tools, and your AI, inspecting every prompt and response in real time. Blocks injection, exfiltration, and misuse before harmful output reaches the user.",
  },
  warden: {
    tag: "Blindsight Warden",
    desc: "Deploys alongside your RAG and data lake, continuously monitoring for poisoning, shortcut learning, and adversarial samples across training, fine-tuning, and retrieval.",
  },
  antidote: {
    tag: "Blindsight Platform",
    desc: "Deployed on cloud, private cloud, or on-prem. Unifies signals from Interceptor and Warden into a full audit trail, mapped to EU AI Act, GDPR, and sector regulators.",
  },
};

function ArchitectureDiagram({
  active,
  onSelect,
  children,
}: {
  active: ModuleKey | null;
  onSelect: (key: ModuleKey, hover?: boolean) => void;
  children?: React.ReactNode;
}) {
  const isActive = (k: ModuleKey) => active === k;
  return (
    <div className="arch-wrap arch-wrap-horizontal reveal">
      {children}
      <svg viewBox="0 0 1240 600" className="arch-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Blindsight architecture diagram">

        {/* ───── Pipes: straight horizontals + straight verticals only ───── */}
        {/* Users → Interceptor (y=120) */}
        <Pipe d="M210,120 L300,120" color="gray" />
        {/* Tools → Interceptor (y=260) */}
        <Pipe d="M210,260 L300,260" color="gray" />
        {/* Interceptor → AI (request, y=140) */}
        <Pipe d="M520,140 L600,140" color="gray" />
        {/* AI → Interceptor (response, y=240) */}
        <Pipe d="M520,240 L600,240" color="gray" />
        {/* RAG → AI (data flows in) */}
        <Pipe d="M820,140 L740,140" color="gray" />
        {/* Data Lake → AI (data flows in) */}
        <Pipe d="M820,240 L740,240" color="gray" />
        {/* RAG → Warden (y=140) */}
        <Pipe d="M1000,140 L1080,140" color="gray" />
        {/* Data Lake → Warden (y=260) */}
        <Pipe d="M1000,240 L1080,240" color="gray" />
        {/* Interceptor → Platform (straight vertical) */}
        <Pipe d="M410,300 L410,420" color="violet" />
        {/* Warden → Platform (straight vertical) */}
        <Pipe d="M1150,300 L1150,420" color="violet" />

        {/* ───── Boxes ───── */}
        {/* USERS */}
        <g className="arch-box static">
          <rect x="30" y="80" width="180" height="80" rx="10" />
          <text x="120" y="118" className="arch-h">USERS</text>
          <text x="120" y="140" className="arch-sub">Prompts</text>
        </g>
        {/* TOOLS */}
        <g className="arch-box static">
          <rect x="30" y="220" width="180" height="80" rx="10" />
          <text x="120" y="258" className="arch-h">TOOLS</text>
          <text x="120" y="280" className="arch-sub">Outputs · responses</text>
        </g>

        {/* INTERCEPTOR */}
        <g
          className={`arch-box violet clickable ${isActive("interceptor") ? "selected" : ""}`}
          onClick={() => onSelect("interceptor")}
          onMouseEnter={() => onSelect("interceptor", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="300" y="80" width="220" height="220" rx="12" />
          <text x="410" y="150" className="arch-h v">INTERCEPTOR</text>
          <text x="410" y="178" className="arch-sub v">Runtime Security</text>
          <text x="410" y="222" className="arch-cta">{isActive("interceptor") ? "− hide details" : "+ hover or click"}</text>
        </g>

        {/* AI MODEL */}
        <g className="arch-box dark static">
          <rect x="600" y="100" width="140" height="180" rx="14" />
          <g transform="translate(670,175)" className="arch-brain">
            {/* Left hemisphere */}
            <path d="M -4,-30 C -16,-30 -24,-22 -24,-12 C -32,-10 -32,2 -24,4 C -28,12 -22,22 -12,22 C -8,28 -4,28 -4,22 Z" />
            {/* Right hemisphere */}
            <path d="M 4,-30 C 16,-30 24,-22 24,-12 C 32,-10 32,2 24,4 C 28,12 22,22 12,22 C 8,28 4,28 4,22 Z" />
            {/* Folds */}
            <path d="M -10,-18 C -16,-14 -16,-8 -10,-6" />
            <path d="M -14,0 C -18,4 -16,12 -10,12" />
            <path d="M 10,-18 C 16,-14 16,-8 10,-6" />
            <path d="M 14,0 C 18,4 16,12 10,12" />
            {/* Center stem */}
            <path d="M 0,-26 L 0,22" />
          </g>
          <text x="670" y="262" className="arch-h dark">AI MODEL</text>
        </g>

        {/* RAG */}
        <g className="arch-box static">
          <rect x="820" y="100" width="180" height="80" rx="10" />
          <text x="910" y="138" className="arch-h amber">RAG</text>
          <text x="910" y="160" className="arch-sub">Retrieved data</text>
        </g>
        {/* DATA LAKE */}
        <g className="arch-box static">
          <rect x="820" y="220" width="180" height="80" rx="10" />
          <text x="910" y="258" className="arch-h amber">DATA LAKE</text>
          <text x="910" y="280" className="arch-sub">Dataset samples</text>
        </g>

        {/* WARDEN */}
        <g
          className={`arch-box violet clickable ${isActive("warden") ? "selected" : ""}`}
          onClick={() => onSelect("warden")}
          onMouseEnter={() => onSelect("warden", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="1080" y="80" width="140" height="220" rx="12" />
          <text x="1150" y="150" className="arch-h v">WARDEN</text>
          <text x="1150" y="178" className="arch-sub v">Data Security</text>
          <text x="1150" y="222" className="arch-cta">{isActive("warden") ? "− hide details" : "+ hover or click"}</text>
        </g>

        {/* ANTIDOTE PLATFORM — spans full width so vertical pipes land on it */}
        <g
          className={`arch-box violet platform clickable ${isActive("antidote") ? "selected" : ""}`}
          onClick={() => onSelect("antidote")}
          onMouseEnter={() => onSelect("antidote", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="300" y="420" width="920" height="140" rx="12" />
          <text x="760" y="478" className="arch-h v">BLINDSIGHT</text>
          <text x="760" y="514" className="arch-cta">{isActive("antidote") ? "− hide details" : "+ hover or click"}</text>
        </g>
      </svg>
    </div>
  );
}

function Pipe({ d, color }: { d: string; color: "violet" | "gray" }) {
  return (
    <g className={`pipe pipe-${color}`}>
      <path d={d} className="pipe-casing" />
      <path d={d} className="pipe-flow" />
    </g>
  );
}

function VerticalArchitectureDiagram({
  active,
  onSelect,
  children,
}: {
  active: ModuleKey | null;
  onSelect: (key: ModuleKey, hover?: boolean) => void;
  children?: React.ReactNode;
}) {
  const isActive = (k: ModuleKey) => active === k;
  return (
    <div className="arch-wrap arch-wrap-vertical reveal">
      {children}
      <svg viewBox="0 0 600 1320" className="arch-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Blindsight architecture diagram (vertical)">
        <Pipe d="M170,120 L170,200" color="gray" />
        <Pipe d="M430,120 L430,200" color="gray" />
        <Pipe d="M260,360 L260,440" color="gray" />
        <Pipe d="M340,440 L340,360" color="gray" />
        <Pipe d="M260,600 L260,640" color="gray" />
        <Pipe d="M260,640 L170,640" color="gray" />
        <Pipe d="M170,640 L170,680" color="gray" />
        <Pipe d="M340,600 L340,640" color="gray" />
        <Pipe d="M340,640 L430,640" color="gray" />
        <Pipe d="M430,640 L430,680" color="gray" />
        <Pipe d="M170,760 L170,840" color="gray" />
        <Pipe d="M430,760 L430,840" color="gray" />
        <Pipe d="M60,280 L30,280" color="violet" />
        <Pipe d="M30,280 L30,1110" color="violet" />
        <Pipe d="M30,1110 L60,1110" color="violet" />
        <Pipe d="M300,1000 L300,1040" color="violet" />

        <g className="arch-box static">
          <rect x="60" y="40" width="220" height="80" rx="10" />
          <text x="170" y="78" className="arch-h">USERS</text>
          <text x="170" y="100" className="arch-sub">Prompts</text>
        </g>
        <g className="arch-box static">
          <rect x="320" y="40" width="220" height="80" rx="10" />
          <text x="430" y="78" className="arch-h">TOOLS</text>
          <text x="430" y="100" className="arch-sub">Outputs · responses</text>
        </g>

        <g
          className={`arch-box violet clickable ${isActive("interceptor") ? "selected" : ""}`}
          onClick={() => onSelect("interceptor")}
          onMouseEnter={() => onSelect("interceptor", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="60" y="200" width="480" height="160" rx="12" />
          <text x="300" y="252" className="arch-h v">INTERCEPTOR</text>
          <text x="300" y="280" className="arch-sub v">Runtime Security</text>
          <text x="300" y="322" className="arch-cta">{isActive("interceptor") ? "− hide details" : "+ tap or hover"}</text>
        </g>

        <g className="arch-box dark static">
          <rect x="210" y="440" width="180" height="160" rx="14" />
          <g transform="translate(300,510)" className="arch-brain">
            <path d="M -4,-30 C -16,-30 -24,-22 -24,-12 C -32,-10 -32,2 -24,4 C -28,12 -22,22 -12,22 C -8,28 -4,28 -4,22 Z" />
            <path d="M 4,-30 C 16,-30 24,-22 24,-12 C 32,-10 32,2 24,4 C 28,12 22,22 12,22 C 8,28 4,28 4,22 Z" />
            <path d="M -10,-18 C -16,-14 -16,-8 -10,-6" />
            <path d="M -14,0 C -18,4 -16,12 -10,12" />
            <path d="M 10,-18 C 16,-14 16,-8 10,-6" />
            <path d="M 14,0 C 18,4 16,12 10,12" />
            <path d="M 0,-26 L 0,22" />
          </g>
          <text x="300" y="582" className="arch-h dark">AI MODEL</text>
        </g>

        <g className="arch-box static">
          <rect x="60" y="680" width="220" height="80" rx="10" />
          <text x="170" y="718" className="arch-h amber">RAG</text>
          <text x="170" y="740" className="arch-sub">Retrieved data</text>
        </g>
        <g className="arch-box static">
          <rect x="320" y="680" width="220" height="80" rx="10" />
          <text x="430" y="718" className="arch-h amber">DATA LAKE</text>
          <text x="430" y="740" className="arch-sub">Dataset samples</text>
        </g>

        <g
          className={`arch-box violet clickable ${isActive("warden") ? "selected" : ""}`}
          onClick={() => onSelect("warden")}
          onMouseEnter={() => onSelect("warden", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="60" y="840" width="480" height="160" rx="12" />
          <text x="300" y="892" className="arch-h v">WARDEN</text>
          <text x="300" y="920" className="arch-sub v">Data Security</text>
          <text x="300" y="962" className="arch-cta">{isActive("warden") ? "− hide details" : "+ tap or hover"}</text>
        </g>

        <g
          className={`arch-box violet platform clickable ${isActive("antidote") ? "selected" : ""}`}
          onClick={() => onSelect("antidote")}
          onMouseEnter={() => onSelect("antidote", true)}
          role="button"
          tabIndex={0}
        >
          <rect x="60" y="1040" width="480" height="160" rx="12" />
          <text x="300" y="1100" className="arch-h v">BLINDSIGHT</text>
          <text x="300" y="1142" className="arch-cta">{isActive("antidote") ? "− hide details" : "+ tap or hover"}</text>
        </g>
      </svg>
    </div>
  );
}


function Pipeline() {
  const [active, setActive] = useState<ModuleKey | null>(null);
  const select = (k: ModuleKey, hover?: boolean) => {
    if (hover) setActive(k);
    else setActive((cur) => (cur === k ? null : k));
  };
  const info = active ? MODULE_INFO[active] : null;
  return (
    <section className="section section-alt" id="pipeline">
      <div className="section-inner">
        <div className="s-head reveal" style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}>
          <span className="tag">The Pipeline</span>
          <h2>One platform. Every layer of AI security.</h2>
          <p>
            Blindsight secures the path from user input to model output to the data that
            influenced it, closing the loop other tools leave open.
          </p>
          <Link to="/in-action" className="headline-logo-trigger reveal" aria-label="Open the In Action demo" style={{ alignSelf: "center" }}>
            <img src={emblem} alt="" />
            <span className="ht">
              <span className="top">Interactive demo</span>
              <span className="bot">See how attacks happen, and how you can stop them</span>
            </span>
            <span className="arrow"><ArrowRight size={16} aria-hidden="true" /></span>
          </Link>
        </div>

        <ArchitectureDiagram active={active} onSelect={select}>
          <div className={`product-reveal product-reveal-top ${info ? "open" : ""}`} aria-live="polite">
            {info && (
              <div className="product-card">
                <span className="product-card-tag">{info.tag}</span>
                <div className="product-card-desc">{info.desc}</div>
              </div>
            )}
          </div>
        </ArchitectureDiagram>

        <VerticalArchitectureDiagram active={active} onSelect={select}>
          <div className={`product-reveal product-reveal-top ${info ? "open" : ""}`} aria-live="polite">
            {info && (
              <div className="product-card">
                <span className="product-card-tag">{info.tag}</span>
                <div className="product-card-desc">{info.desc}</div>
              </div>
            )}
          </div>
        </VerticalArchitectureDiagram>

      </div>
    </section>
  );
}


/* ── Section progress rail ── */
const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Top" },
  { id: "pipeline", label: "Pipeline" },
  { id: "clients", label: "Clients" },
  { id: "showcase", label: "Platform" },
  { id: "case-studies", label: "Case Studies" },
  { id: "faq", label: "FAQ" },
];

function SectionRail() {
  const [active, setActive] = useState<string>("hero");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <nav className="section-rail" aria-label="Page progress">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`section-rail-item ${active === s.id ? "active" : ""}`}
          onClick={() => go(s.id)}
          aria-current={active === s.id ? "true" : undefined}
        >
          <span className="section-rail-label">{s.label}</span>
          <span className="section-rail-dot" />
        </button>
      ))}
    </nav>
  );
}

/* ── Client / partner logo strip (placeholder marquee) ── */
const CLIENT_LOGOS: { Icon: typeof Building2; name: string }[] = [
  { Icon: Building2, name: "Northwind" },
  { Icon: Landmark, name: "Meridian Bank" },
  { Icon: Globe, name: "Atlas Global" },
  { Icon: Cpu, name: "Nodal AI" },
  { Icon: Network, name: "Lattice" },
  { Icon: ShieldCheck, name: "Aegis" },
  { Icon: Database, name: "Vaultstore" },
  { Icon: Briefcase, name: "Corveau" },
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
              {group.map(({ Icon, name }, i) => (
                <span className="logostrip-item" key={i}>
                  <Icon className="logostrip-icon" strokeWidth={1.5} />
                  <span className="logostrip-name">{name}</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Platform showcase (placeholder for product animation) ── */
function PlatformShowcase() {
  return (
    <section className="section" id="showcase">
      <div className="section-inner">
        <div className="s-head reveal" style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}>
          <span className="tag">Platform Showcase</span>
          <h2>See Blindsight at work.</h2>
          <p>A guided walkthrough of the platform defending a live AI system — interactive showcase landing here soon.</p>
        </div>
        <div className="showcase-frame reveal">
          <div className="showcase-frame-inner">
            <MonitorPlay size={44} strokeWidth={1.3} aria-hidden="true" />
            <span className="showcase-frame-label">Product animation placeholder</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Case studies (placeholder success stories) ── */
const CASE_STUDIES: { Icon: typeof Building2; sector: string; metric: string; quote: string }[] = [
  { Icon: Landmark, sector: "Financial Services", metric: "92% fewer incidents", quote: "Blindsight gave us visibility into AI risk we couldn't get anywhere else." },
  { Icon: ShieldCheck, sector: "Healthcare", metric: "100% audit coverage", quote: "We passed our regulatory review with a full trail mapped to every model call." },
  { Icon: Globe, sector: "Public Sector", metric: "3× faster rollout", quote: "We shipped citizen-facing AI months earlier, with guardrails in place from day one." },
];

function CaseStudies() {
  return (
    <section className="section section-alt" id="case-studies">
      <div className="section-inner">
        <div className="s-head reveal">
          <span className="tag">Case Studies</span>
          <h2>Proven in production.</h2>
          <p>How teams in regulated industries deploy AI with Blindsight. Full stories coming soon.</p>
        </div>
        <div className="case-grid">
          {CASE_STUDIES.map(({ Icon, sector, metric, quote }, i) => (
            <article className="case-card reveal" key={i}>
              <div className="case-card-top">
                <span className="case-card-logo"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="case-card-sector">{sector}</span>
              </div>
              <div className="case-card-metric">{metric}</div>
              <p className="case-card-quote">“{quote}”</p>
              <span className="case-card-link">Read story <ArrowRight size={15} aria-hidden="true" /></span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FAQ (placeholder accordion) ── */
const FAQS: { q: string; a: string }[] = [
  { q: "What is Blindsight?", a: "Blindsight is a platform for securing AI systems across runtime, data, and governance. (Placeholder answer.)" },
  { q: "How does Blindsight deploy?", a: "Cloud, private cloud, or fully on-prem, alongside your existing AI stack. (Placeholder answer.)" },
  { q: "What threats does it stop?", a: "Prompt injection, data exfiltration, poisoning, model misuse, and Shadow AI. (Placeholder answer.)" },
  { q: "Does it work with my model provider?", a: "Yes — Blindsight is model-agnostic and sits between your users, tools, and any model. (Placeholder answer.)" },
  { q: "How does it handle compliance?", a: "It produces an audit trail mapped to the EU AI Act, GDPR, and sector regulators. (Placeholder answer.)" },
  { q: "Will it slow down my AI?", a: "Inspection happens inline with negligible latency overhead. (Placeholder answer.)" },
  { q: "Can I monitor my RAG and data lake?", a: "Yes — Warden continuously watches retrieval and training data sources. (Placeholder answer.)" },
  { q: "Is my data sent to Blindsight?", a: "No — in on-prem and private deployments your data never leaves your environment. (Placeholder answer.)" },
  { q: "How long does onboarding take?", a: "Most teams are up and running in a single working session. (Placeholder answer.)" },
  { q: "How do I get started?", a: "Request a demo and we'll map your AI threat surface in 30 minutes. (Placeholder answer.)" },
];

function FAQ() {
  const [open, setOpen] = useState<number[]>([]);
  const toggle = (i: number) =>
    setOpen((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  return (
    <section className="section" id="faq">
      <div className="section-inner faq-inner">
        <div className="s-head reveal" style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}>
          <span className="tag">FAQ</span>
          <h2>Questions, answered.</h2>
        </div>
        <div className="faq-list reveal">
          {FAQS.map((f, i) => {
            const isOpen = open.includes(i);
            return (
              <div className={`faq-item ${isOpen ? "open" : ""}`} key={i}>
                <button type="button" className="faq-q" aria-expanded={isOpen} onClick={() => toggle(i)}>
                  <span>{f.q}</span>
                  <ChevronDown className="faq-chevron" size={18} aria-hidden="true" />
                </button>
                <div className="faq-a">
                  <div><p>{f.a}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main>
      <SectionRail />
      <Hero />
      <Pipeline />
      <LogoStrip />
      <PlatformShowcase />
      <CaseStudies />
      <FAQ />
    </main>
  );
}
