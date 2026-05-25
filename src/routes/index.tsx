import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import logo from "@/assets/logo.png";
import emblem from "@/assets/emblem.png";
import icebergImg from "@/assets/iceberg.webp";
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
  return (
    <>
      <header className="hero-hex">
        <HexBg className="hero-hex-canvas" />
        <div className="hero-hex-inner reveal">
          <span className="tag">Securing AI · Built in Zurich</span>
          <h1>
            <span className="hero-line">Deploy AI Systems</span>
            <br />
            <span className="accent-grad">you can trust.</span>
          </h1>
          <p className="lede">
            Deploy AI without blind spots. AI systems face threats from bad actors, misuse, and
            human error at every layer. Blindsight is the only platform securing all of them.
          </p>
          <div className="hero-actions">
            <Link to="/demo" className="btn btn-violet">Request a Demo</Link>
            <Link to="/in-action" className="btn btn-outline-violet">See attacks in action →</Link>
          </div>
        </div>
      </header>
      <div className="threat-strip">
        <strong>Threat vectors //</strong> Bad actors · Misuse · Human error · Supply chain
      </div>
    </>
  );
}

function Stats() {
  return (
    <section className="section section-alt">
      <div className="section-inner">
        <div className="s-head reveal" style={{ marginBottom: 56 }}>
          <span className="tag">The Trust Gap</span>
          <h2>AI is shipping faster than it's being secured.</h2>
          <p>Regulators, boards, and customers are catching up. The market is responding.</p>
        </div>
        <div className="stats-grid reveal">
          <div className="stat">
            <div className="stat-num">$38.94<span className="unit">B</span></div>
            <div className="stat-label">Projected AI governance &amp; policy management market by 2030.</div>
            <div className="stat-source">Mordor Intelligence · 2025</div>
          </div>
          <div className="stat">
            <div className="stat-num">39.85<span className="unit">%</span></div>
            <div className="stat-label">CAGR for AI governance platforms through the end of the decade.</div>
            <div className="stat-source">Mordor Intelligence · 2025</div>
          </div>
          <div className="stat">
            <div className="stat-num">4 / 7</div>
            <div className="stat-label">Independent AI security competitors acquired into broader platforms since 2023.</div>
            <div className="stat-source">Blindsight market analysis</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Iceberg() {
  return (
    <section className="section">
      <div className="section-inner">
        <div className="s-head reveal">
          <span className="tag">The Problem</span>
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
              <div className="threat-row">
                <div className="name">Obvious prompt injections</div>
                <div className="meta">Visible · Caught today</div>
              </div>
              <div className="threat-row">
                <div className="name">Known jailbreak strings</div>
                <div className="meta">Visible · Caught today</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Poisoned training samples</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Adversarial RAG ingestion</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Demographic shortcut learning</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Back-doors</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Adversarial patching</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Misuse by privileged insiders</div>
                <div className="meta">Hidden</div>
              </div>
            </div>
            <p className="iceberg-footnote">
              If even <span className="iceberg-footnote-accent">1</span> of these threats reach production, the model is compromised, and you
              won't know until the damage has been done.
            </p>
          </div>

          <div className="reveal">
            <div
              className="iceberg-img"
              role="img"
              aria-label="Iceberg illustration: visible threats above water, hidden mass below"
              style={{ backgroundImage: `url(${icebergImg})` }}
            />
          </div>
        </div>
      </div>
    </section>
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


function Platform() {
  const [active, setActive] = useState<ModuleKey | null>(null);
  const select = (k: ModuleKey, hover?: boolean) => {
    if (hover) setActive(k);
    else setActive((cur) => (cur === k ? null : k));
  };
  const info = active ? MODULE_INFO[active] : null;
  return (
    <section className="section section-alt" id="platform">
      <div className="section-inner">
        <div className="s-head reveal" style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}>
          <span className="tag">The Solution</span>
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
            <span className="arrow">→</span>
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


function CTA() {
  return (
    <section style={{ padding: "100px 0" }}>
      <div className="cta-banner reveal">
        <div>
          <span className="tag" style={{ color: "var(--dark-muted)" }}>Get started</span>
          <h2 style={{ marginTop: 10 }}>Deploy AI you can defend.</h2>
          <p>30-minute working session. Bring a real AI system. Leave with a threat map and a remediation path mapped to the regulators that matter to you.</p>
        </div>
        <a href="mailto:info@blindsight.io" className="btn btn-primary">Request a Demo</a>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main>
      <Hero />
      <Iceberg />
      <Platform />
      <CTA />
    </main>
  );
}
