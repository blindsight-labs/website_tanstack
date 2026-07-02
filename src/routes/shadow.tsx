import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  EyeOff,
  FileCheck2,
  FileSearch,
  FileText,
  ListChecks,
  ScrollText,
  SlidersHorizontal,
  User,
} from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { FaqSection } from "@/components/FaqSection";
import { LogoStrip } from "@/components/LogoStrip";
import { ShadowAiDemo } from "@/components/ShadowAiDemo";
import shadowDemoCss from "@/components/ShadowAiDemo.css?url";
import shadowPageCss from "@/components/shadow-page.css?url";
import { faqSchemaEntities } from "@/lib/faq-content";
import iconBlindsight from "@/assets/ICON_Blindsight.svg";
import logoBlindsight from "@/assets/LOGO_Blindsight.svg";

export const Route = createFileRoute("/shadow")({
  component: ShadowPage,
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
      { property: "og:url", content: "https://blindsight.io/shadow" },
    ],
    links: [
      { rel: "canonical", href: "https://blindsight.io/shadow" },
      { rel: "stylesheet", href: shadowDemoCss },
      { rel: "stylesheet", href: shadowPageCss },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqSchemaEntities("shadow-ai"),
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
              name: "Shadow AI",
              item: "https://blindsight.io/shadow",
            },
          ],
        }),
      },
    ],
  }),
});

const SECTIONS: { id: string; label: string }[] = [
  { id: "hero", label: "Gain Visibility" },
  { id: "stack", label: "How it works" },
  { id: "faq", label: "FAQ" },
  { id: "contact", label: "Get started" },
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

function Hero() {
  const { open } = useDemoModal();
  return (
    <header className="va-hero" id="hero">
      <div className="va-hero-inner">
        <div className="va-hero-copy reveal">
          <h1>
            <span className="hero-h1-pre">Your team will use AI.</span> The question is whether
            you&apos;ll know what it&apos;s doing with your <span className="accent">data</span>.
          </h1>
          <p className="lede">
            <strong>Shadow AI</strong> is every unapproved tool your people already paste contracts,
            code and customer records into — and blocking it just pushes the habit out of sight.
            Blindsight sits between your team and the AI, redacting the sensitive data before the
            model ever sees it. We don&apos;t see it either.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => open("download")}>
              See my Shadow AI
            </button>
          </div>
          <p className="hero-trust">
            We distrust the tool, not your team — so AI gets faster and safer at once.
          </p>
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
          document.getElementById("stack")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        <ChevronDown className="hero-scroll-chevron" strokeWidth={2} aria-hidden="true" />
      </button>
    </header>
  );
}

const HIW_STEPS: {
  n: string;
  title: string;
  tip: string;
  log: string;
  Icon: typeof ListChecks;
  pos: string;
  rev: string;
}[] = [
  { n: "01", title: "Whitelist Check", tip: "Trusted apps and destinations are recognised up front, so approved workflows pass straight through.", log: "Whitelist", Icon: ListChecks, pos: "hiw-p1", rev: "hiw-rev1" }, // prettier-ignore
  { n: "02", title: "File Read", tip: "Blindsight opens and parses the file locally to see exactly what data it carries.", log: "Read", Icon: FileSearch, pos: "hiw-p2", rev: "hiw-rev2" }, // prettier-ignore
  { n: "03", title: "Rule Check", tip: "Each file is scanned against 1,600+ customizable rules covering PII, secrets and sensitive content.", log: "Rules", Icon: SlidersHorizontal, pos: "hiw-p3", rev: "hiw-rev3" }, // prettier-ignore
  { n: "04", title: "Redact", tip: "Sensitive values are masked on the device, so only safe, redacted data ever reaches the model.", log: "Redact", Icon: EyeOff, pos: "hiw-p4", rev: "hiw-rev4" }, // prettier-ignore
];

function Deployment() {
  const figRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const CYCLE = 11000;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let started = false;
    let full = true;
    const runCycle = () => {
      fig.classList.remove("is-full", "is-pass");
      void fig.offsetWidth;
      fig.classList.add(full ? "is-full" : "is-pass");
      full = !full;
      timers.push(setTimeout(runCycle, CYCLE));
    };
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          timers.push(setTimeout(runCycle, 2000));
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(fig);
    return () => {
      obs.disconnect();
      timers.forEach(clearTimeout);
      fig.classList.remove("is-full", "is-pass");
    };
  }, []);
  return (
    <section className="section deploy-section" id="stack">
      <div className="section-inner">
        <div
          className="s-head reveal"
          style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
        >
          <span className="tag">How it works</span>
          <h2>Protection that runs on the machine.</h2>
          <p>
            Blindsight installs as a desktop app on every user&apos;s machine. It intercepts AI
            traffic, redacts sensitive data before the model ever sees it, and logs every AI tool in
            use — without slowing anyone down.
          </p>
        </div>

        <div className="hiw-stage reveal">
          <figure
            ref={figRef}
            className="hiw"
            aria-label="A file carrying sensitive data leaves the user and enters the Blindsight environment, where it passes four checks — whitelist, read, rules, and redaction. Only the redacted file is sent to the LLM, whose response returns to the user. Every step is written to an always-on activity log inside the environment."
          >
            <div className="hiw-box" aria-hidden="true">
              <span className="hiw-box-head">
                <img src={iconBlindsight} alt="" className="hiw-box-logo" />
                Blindsight environment
              </span>
            </div>

            <svg
              className="hiw-wires hiw-wires-d"
              viewBox="0 0 1000 500"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="hiw-wire hiw-wire-return"
                d="M945 248 V449 Q945 465 929 465 H71 Q55 465 55 449 V248"
              />
              <path
                className="hiw-wire hiw-wire-pass"
                d="M230 248 V44 Q230 28 246 28 H929 Q945 28 945 44 V248"
              />
              <path className="hiw-wire hiw-wire-flow" d="M55 248 H945" />
            </svg>
            <svg
              className="hiw-wires hiw-wires-m"
              viewBox="0 0 380 860"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="hiw-wire hiw-wire-return"
                d="M190 757 H337 Q353 757 353 741 V59 Q353 43 337 43 H190"
              />
              <path
                className="hiw-wire hiw-wire-pass"
                d="M190 206 H43 Q27 206 27 222 V741 Q27 757 43 757 H190"
              />
              <path className="hiw-wire hiw-wire-flow" d="M190 43 V757" />
            </svg>

            <div className="hiw-node hiw-user">
              <span className="hiw-node-ico">
                <User strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="hiw-node-name">User</span>
            </div>

            {HIW_STEPS.map(({ n, title, tip, Icon, pos }) => (
              <div className={`hiw-step ${pos}`} key={n} tabIndex={0}>
                <span className="hiw-step-head">
                  <span className="hiw-step-ico">
                    <Icon strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <span className="hiw-step-n">{n}</span>
                </span>
                <span className="hiw-step-slot" aria-hidden="true" />
                <span className="hiw-step-title">{title}</span>
                <span className="hiw-step-tip" role="tooltip">
                  {tip}
                </span>
              </div>
            ))}

            <div className="hiw-log">
              <span className="hiw-log-head">
                <ScrollText strokeWidth={1.6} aria-hidden="true" />
                Activity log
              </span>
              <ul className="hiw-log-list">
                {HIW_STEPS.map(({ n, log, rev }) => (
                  <li className={`hiw-log-item ${rev}`} key={n}>
                    <span className="hiw-log-mark">
                      <Check className="hiw-log-check" strokeWidth={3} aria-hidden="true" />
                    </span>
                    <span className="hiw-log-label">{log}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="hiw-node hiw-llm">
              <span className="hiw-node-ico">
                <Bot strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="hiw-node-name">LLM</span>
            </div>

            <div className="hiw-file" aria-hidden="true">
              <span className="hiw-file-face hiw-file-grey">
                <FileText strokeWidth={1.6} aria-hidden="true" />
                <span className="hiw-file-tag">File</span>
              </span>
              <span className="hiw-file-face hiw-file-flag">
                <FileText strokeWidth={1.6} aria-hidden="true" />
                <span className="hiw-file-tag">File</span>
              </span>
              <span className="hiw-file-face hiw-file-ok">
                <FileCheck2 strokeWidth={1.6} aria-hidden="true" />
                <span className="hiw-file-tag">Ok</span>
              </span>
              <span className="hiw-file-scan" />
            </div>
          </figure>
        </div>

        <p className="dflow-platforms reveal">
          <span className="dflow-os is-on">
            <svg viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
              <path d="M0 93.7l183.6-25.3v177.4H0V93.7zm0 324.6l183.6 25.3V268.4H0v149.9zm203.8 28L448 480V268.4H203.8v177.9zm0-380.6v180.1H448V32L203.8 65.7z" />
            </svg>
            Windows — available now
          </span>
          <span className="dflow-os is-pending">
            <svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
            macOS — coming soon
          </span>
        </p>
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
          <h2>See what your team is really sending to AI.</h2>
          <p>
            Reveal every Shadow AI interaction across your organization — and secure it before
            sensitive data leaks. No rollout, no productivity tax.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => open("download")}>
            See my Shadow AI
          </button>
          <img src={logoBlindsight} alt="Blindsight" className="final-cta-logo" />
        </div>
      </div>
    </section>
  );
}

function ShadowPage() {
  return (
    <main className="page-home">
      <SectionRail sections={SECTIONS} />
      <Hero />
      <Deployment />
      <FaqSection onlyTheme="shadow-ai" />
      <FinalCta />
    </main>
  );
}
