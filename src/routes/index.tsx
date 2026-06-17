import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  Building2,
  ChevronDown,
  Cpu,
  Database,
  Globe,
  Landmark,
  Network,
  Scale,
  ScanEye,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { FaqSection } from "@/components/FaqSection";
import { Iceberg } from "@/components/Iceberg";
import { ShadowAiDemo } from "@/components/ShadowAiDemo";
import shadowDemoCss from "@/components/ShadowAiDemo.css?url";
import { faqSchemaEntities } from "@/lib/faq-content";
import { TopologyGraphDemo } from "@/routes/in-action";

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
    links: [
      { rel: "canonical", href: "https://blindsight.io/" },
      { rel: "stylesheet", href: shadowDemoCss },
    ],
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

/* ── Section progress rail ── */
const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Top" },
  { id: "scenarios", label: "Threats" },
  { id: "why", label: "Why" },
  { id: "stack", label: "Layers" },
  { id: "founders", label: "Team" },
  { id: "faq", label: "FAQ" },
];

function SectionRail({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string>(sections[0]?.id ?? "");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
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

/* ── Hero — split: Shadow AI heading | scenario demo ── */
function Hero() {
  const { open: openDemo } = useDemoModal();
  return (
    <header className="va-hero" id="hero">
      <div className="va-hero-inner">
        <div className="va-hero-copy reveal">
          <span className="tag">Shadow AI</span>
          <h1>
            See more with <span className="accent">Blindsight</span>
          </h1>
          <p className="lede">
            Your team is already using AI tools you never approved. Blindsight surfaces every Shadow
            AI interaction — and secures it before sensitive data walks out the door.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={openDemo}>
              Reveal your team&apos;s Shadow AI
            </button>
          </div>
        </div>

        <div className="va-hero-demo reveal">
          <ShadowAiDemo />
        </div>
      </div>

      <LogoStrip />

      <button
        type="button"
        className="hero-scroll-cue"
        aria-label="Scroll to see more"
        onClick={() =>
          document
            .getElementById("scenarios")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
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

/* ── Why Blindsight — founders / offensive-security pedigree ── */
function WhyBlindsight() {
  return (
    <section className="section section-alt" id="founders">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">Why Blindsight</span>
          <h2>Offensive security, turned to your defense</h2>
          <p>
            Blindsight's founders attacked AI systems professionally before building the layer that
            defends them — between them, dozens of CVEs to their name. Detection is built from the
            attacks they find themselves. Tested on competitors' own public benchmarks, where it is
            hardest to win, Blindsight beats the leading runtime benchmarks and covers a wider
            spectrum of attacks. In security, the cost of being second best is the breach you did
            not stop.
          </p>
        </div>

        <div className="founders-grid reveal">
          {[
            {
              role: "CEO",
              label: "CEO photo",
              bio: "Top global ethical hacker and former Kühne+Nagel security architect.",
            },
            {
              role: "CTO",
              label: "CTO photo",
              bio: "Former Checkmarx security lead.",
            },
          ].map(({ role, label, bio }) => (
            <figure className="founder-card" key={role}>
              <div
                className="founder-photo"
                role="img"
                aria-label={`Placeholder for ${role} photo`}
              >
                <UserRound className="founder-photo-icon" strokeWidth={1.5} aria-hidden="true" />
                <span className="founder-photo-label">{label}</span>
              </div>
              <figcaption className="founder-info">
                <span className="founder-role">{role}</span>
                <p className="founder-bio">{bio}</p>
              </figcaption>
            </figure>
          ))}
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
  items: string[];
}[] = [
  {
    id: "detect",
    num: "01",
    name: "Detect",
    Icon: ScanEye,
    tagline:
      "See every AI interaction — and the exposure hiding inside it. Visibility is the proof of value, before you spend a franc on defense.",
    requires: "Foundation · start here",
    items: ["Shadow AI visibility", "Prompt injection", "PII", "PHI", "Data leak prevention"],
  },
  {
    id: "protect",
    num: "02",
    name: "Protect",
    Icon: ShieldCheck,
    tagline:
      "Top-of-the-line security that stops what Detect surfaces — at the prompt, in the data, and across retrieval.",
    requires: "Requires Detect",
    items: ["Prompt injection", "Data poisoning", "Adversarial patching"],
  },
  {
    id: "govern",
    num: "03",
    name: "Govern",
    Icon: Scale,
    tagline:
      "Turn enforcement into an audit trail you can prove — mapped to the regulations you answer to.",
    requires: "Requires Protect",
    items: ["Compliance"],
  },
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

        <ol className="cstack reveal">
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
                    <li className="cstack-chip" key={it}>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>

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
    <main>
      <SectionRail sections={SECTIONS} />
      <Hero />
      <Scenarios />
      <Iceberg id="why" eyebrow="Why Blindsight?" alt />
      <Stages />
      <WhyBlindsight />
      <FaqSection />
    </main>
  );
}
