import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  LayoutGrid,
  Scale,
  ScanEye,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { FaqSection } from "@/components/FaqSection";
import { HeroRail } from "@/components/HeroRail";
import { Iceberg } from "@/components/Iceberg";
import { InfoPill } from "@/components/InfoPill";
import { LogoStrip } from "@/components/LogoStrip";
import { faqSchemaEntities } from "@/lib/faq-content";
import { TopologyGraphDemo } from "@/components/TopologyGraphDemo";
import iconBlindsight from "@/assets/ICON_Blindsight.svg";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Blindsight, Runtime Security for AI" },
      {
        name: "description",
        content:
          "Blindsight runs at runtime, inspecting every prompt, response and tool call. Stop unauthorised AI use, prompt injection, data leaks and RAG poisoning.",
      },
      { property: "og:title", content: "Blindsight, Runtime Security for AI" },
      {
        property: "og:description",
        content:
          "See everything your AI is doing. Stop what it shouldn't. Runtime visibility, enforcement and a full auditable trail.",
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
  { id: "hero", label: "Gain Visibility" },
  { id: "why", label: "Why Blindsight?" },
  { id: "scenarios", label: "Beyond Shadow AI" },
  { id: "stack", label: "Adopt in stages" },
  { id: "faq", label: "FAQ" },
];

function SectionRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  // Show the rail fully (labels visible) on load, then collapse to bare dots.
  // Hovering the rail re-expands it (pure CSS, see .section-rail).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setCollapsed(true), 800);
    return () => clearTimeout(t);
  }, []);
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

/* ── Hero — split: copy + CTA | Runtime Security demo ──
   The single CTA opens the demo modal. Keep its `id="hero-cta"` — __root.tsx
   watches that element with an IntersectionObserver to decide when to reveal
   the floating CTA, and silently does nothing if the id goes missing. */
function Hero() {
  const { open } = useDemoModal();

  return (
    <header className="va-hero" id="hero">
      <div className="va-hero-inner">
        <div className="va-hero-copy reveal">
          <h1>
            <span className="accent">
              See everything your AI is doing. Stop what it shouldn&apos;t.
            </span>
          </h1>
          <p className="lede">
            Blindsight runs at runtime, inspecting every prompt, response, and tool call. Prevent
            unauthorised AI usage on employee laptops, prompt injection, sensitive data leaks, and
            RAG poisoning.
          </p>
          <p className="lede">
            Our free assessment takes one hour to install and starts returning findings the same
            day. Run it for 30 days, to get a full report on every unsanctioned AI tool in your
            organization, and decide after you have seen the results. No cost, no commitment, no
            change to how your team works.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              id="hero-cta"
              className="btn btn-primary"
              onClick={() => open("demo")}
            >
              Book a demo
            </button>
          </div>
        </div>

        <div className="va-hero-demo reveal">
          <HeroRail />
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
      <div className="section-inner scenarios-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">Threat Surface</span>
          <h2>Shadow AI is only the beginning.</h2>
          <p className="scenarios-copy">
            The same pipeline can hide multiple vulnerabilities. Pick a scenario and watch each one
            play out, with Blindsight off, then on.
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
}[] = [
  {
    id: "detect",
    num: "01",
    name: "Detect",
    Icon: ScanEye,
    tagline:
      "Blindsight inspects every prompt, document and tool output in real time, catching threats as they happen and surfacing the AI activity behind them.",
    requires: "Foundation, start here",
  },
  {
    id: "protect",
    num: "02",
    name: "Protect",
    Icon: ShieldCheck,
    tagline:
      "Prompt injection, data poisoning and other attacks are blocked at the layer while legitimate traffic passes untouched. Attackers are shut out.",
    requires: "Requires Detect",
  },
  {
    id: "govern",
    num: "03",
    name: "Govern",
    Icon: Scale,
    tagline:
      "See every AI system in use, including Shadow AI, with every action logged to a tamper-proof record and ready for audit.",
    requires: "Requires Protect",
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

/* ── Stage-flow diagram (above the coverage stack) ──
   Structural SVG illustration (exempt from the lucide-only icon rule): legitimate
   prompts / data / tool outputs pass through the Blindsight layer to the secured
   AI, while malicious traffic and attackers are blocked at the wall. Colours map
   to the design tokens via .sd-* classes in styles.css, so it adapts to theme. */
function StageDiagram() {
  return (
    <figure
      className="sd"
      aria-label="Legitimate prompts, data and tool outputs pass through the Blindsight layer to your secured AI, while malicious traffic and attackers are blocked."
    >
      <figcaption className="sd-legend">
        <span className="sd-legend-item">
          <span className="sd-legend-swatch sd-legend-mal" /> Malicious · blocked
        </span>
        <span className="sd-legend-item">
          <span className="sd-legend-swatch sd-legend-ok" /> Legitimate traffic
        </span>
      </figcaption>

      <svg className="sd-svg" viewBox="0 0 946 290" aria-hidden="true">
        {/* legit (solid) wires: source → through bar → AI */}
        <path className="sd-ok" d="M176 33 L708 128" />
        <path className="sd-ok" d="M176 99 L708 160" />
        <path className="sd-ok" d="M176 165 L708 192" />

        {/* malicious (dashed) wires: source → blocked at bar */}
        <path className="sd-mal" d="M176 33 L450 41" />
        <path className="sd-mal" d="M176 99 L450 99" />
        <path className="sd-mal" d="M176 165 L450 159" />
        <path className="sd-mal" d="M176 259 L450 250" />

        {/* Blindsight barrier on top of the wires — legit traffic passes behind it,
            with the Blindsight mark inside the wall */}
        <rect className="sd-bar" x="454" y="6" width="60" height="280" rx="24" />
        <image className="sd-mark" href={iconBlindsight} x="467" y="129" width="34" height="34" />

        {/* blocked markers on the wall */}
        <g className="sd-x">
          <path d="M449 36 l10 10 M459 36 l-10 10" />
          <path d="M449 94 l10 10 M459 94 l-10 10" />
          <path d="M449 154 l10 10 M459 154 l-10 10" />
          <path d="M449 245 l10 10 M459 245 l-10 10" />
        </g>

        {/* sources — lucide icons; icon + label centred as a group in each pill */}
        <rect className="sd-card" x="8" y="6" width="168" height="54" rx="12" />
        <Users className="sd-ico" x="57" y="23" width="20" height="20" />
        <text className="sd-title" x="85" y="32">
          Users
        </text>
        <text className="sd-sub" x="85" y="45">
          prompts
        </text>

        <rect className="sd-card" x="8" y="72" width="168" height="54" rx="12" />
        <FileText className="sd-ico" x="38" y="89" width="20" height="20" />
        <text className="sd-title" x="66" y="98">
          Data &amp; docs
        </text>
        <text className="sd-sub" x="66" y="111">
          RAG sources
        </text>

        <rect className="sd-card" x="8" y="138" width="168" height="54" rx="12" />
        <LayoutGrid className="sd-ico" x="34" y="155" width="20" height="20" />
        <text className="sd-title" x="62" y="164">
          Tool outputs
        </text>
        <text className="sd-sub" x="62" y="177">
          results
        </text>

        <rect className="sd-acard" x="8" y="232" width="168" height="54" rx="12" />
        <AlertTriangle className="sd-aico" x="44" y="249" width="20" height="20" />
        <text className="sd-atitle" x="72" y="263">
          Attackers
        </text>

        {/* Your AI — secured */}
        <rect className="sd-aicard" x="708" y="44" width="230" height="232" rx="16" />
        <text className="sd-aititle" x="728" y="80">
          Your AI
        </text>
        <text className="sd-aisub" x="728" y="97">
          SECURED
        </text>
        <circle className="sd-badge" cx="912" cy="72" r="14" />
        <path className="sd-checkw" d="M905 72 l5 5 9 -10" />

        <rect className="sd-row" x="722" y="116" width="202" height="28" rx="7" />
        <text className="sd-rowtx" x="736" y="134">
          Prompts
        </text>
        <path className="sd-check" d="M900 130 l4 4 8 -9" />

        <rect className="sd-row" x="722" y="150" width="202" height="28" rx="7" />
        <text className="sd-rowtx" x="736" y="168">
          Knowledge / RAG
        </text>
        <path className="sd-check" d="M900 164 l4 4 8 -9" />

        <rect className="sd-row" x="722" y="184" width="202" height="28" rx="7" />
        <text className="sd-rowtx" x="736" y="202">
          Tool outputs
        </text>
        <path className="sd-check" d="M900 198 l4 4 8 -9" />

        <rect className="sd-row" x="722" y="218" width="202" height="28" rx="7" />
        <text className="sd-rowtx" x="736" y="236">
          Data
        </text>
        <path className="sd-check" d="M900 232 l4 4 8 -9" />
      </svg>

      {/* Vertical layout — shown only at the mobile breakpoint (see .sd-svg-v). */}
      <svg className="sd-svg-v" viewBox="0 0 440 430" aria-hidden="true">
        {/* legit (solid) wires: source → through barrier → AI (angled inward so
            they stay clear of the straight-down malicious lines) */}
        <path className="sd-ok" d="M55 54 L150 178" />
        <path className="sd-ok" d="M165 54 L220 178" />
        <path className="sd-ok" d="M275 54 L290 178" />

        {/* malicious (dashed) wires: source → straight down, blocked at the wall */}
        <path className="sd-mal" d="M55 54 L55 102" />
        <path className="sd-mal" d="M165 54 L165 102" />
        <path className="sd-mal" d="M275 54 L275 102" />
        <path className="sd-mal" d="M385 54 L385 102" />

        {/* Blindsight barrier (horizontal) over the wires */}
        <rect className="sd-bar" x="24" y="104" width="392" height="46" rx="23" />
        <image className="sd-mark" href={iconBlindsight} x="205" y="112" width="30" height="30" />

        {/* blocked markers on the wall */}
        <g className="sd-x">
          <path d="M49 98 l12 12 M61 98 l-12 12" />
          <path d="M159 98 l12 12 M171 98 l-12 12" />
          <path d="M269 98 l12 12 M281 98 l-12 12" />
          <path d="M379 98 l12 12 M391 98 l-12 12" />
        </g>

        {/* sources — single row, lucide icons, content centred per pill */}
        <rect className="sd-card" x="3" y="4" width="104" height="50" rx="12" />
        <Users className="sd-ico" x="22" y="20" width="18" height="18" />
        <text className="sd-title" x="46" y="33">
          Users
        </text>

        <rect className="sd-card" x="113" y="4" width="104" height="50" rx="12" />
        <FileText className="sd-ico" x="118" y="20" width="18" height="18" />
        <text className="sd-title" x="142" y="33">
          Data &amp; docs
        </text>

        <rect className="sd-card" x="223" y="4" width="104" height="50" rx="12" />
        <LayoutGrid className="sd-ico" x="227" y="20" width="18" height="18" />
        <text className="sd-title" x="251" y="33">
          Tool outputs
        </text>

        <rect className="sd-acard" x="333" y="4" width="104" height="50" rx="12" />
        <AlertTriangle className="sd-aico" x="343" y="20" width="18" height="18" />
        <text className="sd-atitle" x="367" y="33">
          Attackers
        </text>

        {/* Your AI — secured */}
        <rect className="sd-aicard" x="8" y="178" width="424" height="240" rx="16" />
        <text className="sd-aititle" x="28" y="216">
          Your AI
        </text>
        <text className="sd-aisub" x="28" y="234">
          SECURED
        </text>
        <circle className="sd-badge" cx="404" cy="208" r="14" />
        <path className="sd-checkw" d="M397 208 l5 5 9 -10" />

        <rect className="sd-row" x="22" y="250" width="396" height="34" rx="8" />
        <text className="sd-rowtx" x="38" y="272">
          Prompts
        </text>
        <path className="sd-check" d="M390 264 l4 4 8 -9" />

        <rect className="sd-row" x="22" y="290" width="396" height="34" rx="8" />
        <text className="sd-rowtx" x="38" y="312">
          Knowledge / RAG
        </text>
        <path className="sd-check" d="M390 304 l4 4 8 -9" />

        <rect className="sd-row" x="22" y="330" width="396" height="34" rx="8" />
        <text className="sd-rowtx" x="38" y="352">
          Tool outputs
        </text>
        <path className="sd-check" d="M390 344 l4 4 8 -9" />

        <rect className="sd-row" x="22" y="370" width="396" height="34" rx="8" />
        <text className="sd-rowtx" x="38" y="392">
          Data
        </text>
        <path className="sd-check" d="M390 384 l4 4 8 -9" />
      </svg>
    </figure>
  );
}

function Stages() {
  const { open } = useDemoModal();
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
            The three layers stack in order: protection builds on what Detect can see, governance on
            what Protect enforces. What you turn on inside each layer is scoped to you.
          </p>
        </div>

        <div className="cstack-deploy reveal">
          <span className="cstack-deploy-label">Deploy anywhere</span>
          <InfoPill
            name="On-prem"
            meta="Deployment"
            desc="Runs entirely on your own hardware, air-gapped if required, nothing leaves your perimeter."
          />
          <InfoPill
            name="Private cloud"
            meta="Deployment"
            desc="Deployed inside your own cloud tenant or VPC, isolated to your organization."
          />
          <InfoPill
            name="Public cloud"
            meta="Deployment"
            desc="Managed by Blindsight in the cloud, the fastest way to stand up and evaluate."
          />
        </div>

        <div className="cstack-flow reveal">
          <StageDiagram />

          <ol className="cstack">
            {STAGES.map(({ id, num, name, Icon, tagline, requires }, i) => (
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
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="engage reveal">
          <span className="engage-eyebrow">How engagement works</span>
          <div className="engage-steps-outer">
            {/* Snake connector — only rendered in the stacked breakpoint via CSS */}
            <svg
              className="engage-snake"
              viewBox="0 0 440 52"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="engage-snake-path"
                d="M44,0 C88,0 88,52 132,52 C176,52 176,0 220,0 C264,0 264,52 308,52 C352,52 352,0 396,0"
              />
            </svg>
            <ol className="engage-steps">
              {ENGAGEMENT.map((s, i) => (
                <li className={`engage-step ${s.optional ? "is-optional" : ""}`} key={s.label}>
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
          </div>
          <div className="engage-cta">
            <button type="button" className="btn btn-primary" onClick={() => open("demo")}>
              Gain visibility, secure your runtime
            </button>
          </div>
        </aside>
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
        segue="If you don't even have visibility over Shadow AI, how can you catch the more insidious vulnerabilities behind it? See how each one plays out, and how Blindsight shuts it down."
      />
      <Scenarios />
      <Stages />
      <FaqSection />
    </main>
  );
}
