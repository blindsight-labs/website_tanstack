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
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { Iceberg } from "@/components/Iceberg";
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
    links: [{ rel: "canonical", href: "https://blindsight.io/" }],
  }),
});

/* ── Section progress rail ── */
const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Top" },
  { id: "why", label: "Why" },
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

/* ── FAQ (placeholder accordion) ── */
const FAQS: { q: string; a: string }[] = [
  { q: "What is Blindsight?", a: "Blindsight is a platform for securing AI systems across runtime, data, and governance. (Placeholder answer.)" },
  { q: "What threats does it stop?", a: "Prompt injection, data exfiltration, poisoning, model misuse, and Shadow AI. (Placeholder answer.)" },
  { q: "How does Blindsight deploy?", a: "Cloud, private cloud, or fully on-prem, alongside your existing AI stack. (Placeholder answer.)" },
  { q: "How does it handle compliance?", a: "It produces an audit trail mapped to the EU AI Act, GDPR, and sector regulators. (Placeholder answer.)" },
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
            Your team is already using AI tools you never approved. Blindsight surfaces every
            Shadow AI interaction — and secures it before sensitive data walks out the door.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={openDemo}>
              Request a Demo
            </button>
          </div>
        </div>

        <div className="va-hero-demo reveal">
          <TopologyGraphDemo embedded />
        </div>
      </div>

      <LogoStrip />
    </header>
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
            Blindsight's founders attacked AI systems professionally before building the layer
            that defends them. The CEO is a top global ethical hacker and former Kühne+Nagel
            security architect, the CTO a former Checkmarx security lead, both with dozens of CVEs
            to their name. Detection is built from the attacks they find themselves. Tested on
            competitors' own public benchmarks, where it is hardest to win, Blindsight beats the
            leading runtime benchmarks and covers a wider spectrum of attacks. In security, the
            cost of being second best is the breach you did not stop.
          </p>
        </div>

        <div className="founders-grid reveal">
          {[
            { role: "CEO", label: "CEO photo" },
            { role: "CTO", label: "CTO photo" },
          ].map(({ role, label }) => (
            <figure className="founder-card" key={role}>
              <div className="founder-photo" role="img" aria-label={`Placeholder for ${role} photo`}>
                <UserRound className="founder-photo-icon" strokeWidth={1.5} aria-hidden="true" />
                <span className="founder-photo-label">{label}</span>
              </div>
              <figcaption className="founder-role">{role}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main>
      <SectionRail sections={SECTIONS} />
      <Hero />
      <Iceberg id="why" eyebrow="Why Blindsight?" />
      <WhyBlindsight />
      <FAQ />
    </main>
  );
}
