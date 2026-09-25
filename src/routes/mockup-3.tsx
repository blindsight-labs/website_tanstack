import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUp, Eye, FileCheck, ShieldCheck } from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import * as c from "@/mockups/content";
import css from "@/mockups/3.css?url";
import logo from "@/assets/LOGO_Blindsight.svg";
import icon from "@/assets/ICON_Blindsight.svg";

export const Route = createFileRoute("/mockup-3")({
  component: MockupC,
  head: () => c.mockupHead("C · Hairline", css),
});

function DemoButton({ size }: { size?: "sm" }) {
  const { open } = useDemoModal();
  return (
    <button type="button" className={`mC-btn mC-btn-dark${size === "sm" ? " mC-btn-sm" : ""}`} onClick={() => open("demo")}>
      Book a demo
    </button>
  );
}

const stepIcons = [Eye, ShieldCheck, FileCheck];
const stepTitles = ["Discover every AI system", "Protect it at runtime", "Evidence governance"];
const nodes = ["Employees", "Apps & agents", "Models", "RAG & data"];

function MockupC() {
  return (
    <div className="mC">
      <div className="mC-rule mC-rule-l" aria-hidden="true" />
      <div className="mC-rule mC-rule-r" aria-hidden="true" />

      <nav className="mC-nav">
        <Link to="/mockup-3" aria-label="Blindsight home">
          <img src={logo} alt="Blindsight" className="mC-logo" />
        </Link>
        <div className="mC-nav-links">
          <a href="#platform">Platform</a>
          <a href="#coverage">Coverage</a>
          <a href="#research">Research</a>
          <Link to="/team">Team</Link>
        </div>
        <div className="mC-nav-right">
          <Link to="/contact" className="mC-nav-plain">
            Contact
          </Link>
          <DemoButton size="sm" />
        </div>
      </nav>

      {/* HERO */}
      <section className="mC-frame mC-hero">
        <div className="mC-hero-copy">
          <div className="mC-label">AI security platform · Zurich</div>
          <h1>
            See every AI system you run. <span>Secure it at runtime. Prove it to your auditors.</span>
          </h1>
          <p>
            Discovery, runtime protection and compliance reporting for AI, deployed locally or in your private cloud.
            Built for regulated teams.
          </p>
          <div className="mC-row">
            <DemoButton />
            <a href="#coverage" className="mC-btn mC-btn-line">
              See coverage
            </a>
          </div>
        </div>
        <div className="mC-hero-visual mC-dots">
          <div className="mC-glass mC-glass-back">
            <div className="mC-ui-head">
              <span>Runtime · 24h</span>
              <span>Illustrative</span>
            </div>
            {c.runtime.slice(0, 3).map((r) => (
              <div key={r.time} className="mC-ui-row">
                <span>{r.event}</span>
                <span className={r.tone === "flag" ? "mC-violet" : undefined}>{r.verdict}</span>
              </div>
            ))}
          </div>
          <div className="mC-glass mC-glass-front">
            <div className="mC-ui-head">
              <span>AI inventory · 23 systems</span>
              <span>Illustrative</span>
            </div>
            {c.inventory.map((r) => (
              <div key={r.name} className="mC-ui-row mC-ui-row-3">
                <span>{r.name}</span>
                <span className="mC-grey">{r.users}</span>
                {r.tone === "flag" ? (
                  <span className="mC-flag">
                    <i />
                    {r.status}
                  </span>
                ) : (
                  <span className="mC-grey">{r.status}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="mC-frame mC-trust">
        {c.trust.map((t) => (
          <div key={t}>{t}</div>
        ))}
      </section>

      {/* TWO QUESTIONS */}
      <section className="mC-frame mC-cols-2">
        {c.questions.map((q, i) => (
          <div key={q} className="mC-question">
            <div>
              <div className="mC-label">{i === 0 ? "The first question" : "The second question"}</div>
              <div className="mC-question-text">{q}</div>
            </div>
            <div className="mC-label mC-ink">{i === 0 ? "→ See it" : "→ Secure it · Prove it"}</div>
          </div>
        ))}
      </section>

      {/* SEE / SECURE / PROVE */}
      <section id="platform" className="mC-frame">
        <div className="mC-head">
          <h2>See it. Secure it. Prove it.</h2>
          <p>
            Each layer builds on the one before. You can't secure what you can't see, and you can't prove what you
            didn't secure.
          </p>
        </div>
        <div className="mC-cols-3">
          {c.steps.map((s, i) => {
            const Icon = stepIcons[i];
            return (
              <div key={s.n} className="mC-col">
                <Icon size={30} strokeWidth={1.2} />
                <div className="mC-label">
                  {s.n} / {s.verb.replace(" it", "")}
                </div>
                <div className="mC-col-title">{stepTitles[i]}</div>
                <p>{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* COVERAGE */}
      <section id="coverage" className="mC-frame mC-pad">
        <div className="mC-head mC-head-flat">
          <h2>Coverage, including the attacks most tools don't touch.</h2>
          <p>
            Poisoned data and adversarial inputs look legitimate all the way through. Catching them lets your teams
            build on retrieval and agents safely.
          </p>
        </div>
        <div className="mC-table" role="table" aria-label="Threat coverage">
          <div className="mC-tr mC-th" role="row">
            <span role="columnheader">Threat</span>
            <span role="columnheader">Where it happens</span>
            <span role="columnheader">Layer</span>
            <span role="columnheader" />
          </div>
          {c.coverage.map((r) => (
            <div key={r.threat} className={`mC-tr${r.beyond ? " is-beyond" : ""}`} role="row">
              <span role="cell" className="mC-strong">
                {r.threat}
              </span>
              <span role="cell">{r.where}</span>
              <span role="cell">{r.layer}</span>
              <span role="cell" className="mC-tag">
                {r.beyond ? "Beyond filters" : ""}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* DEPLOYMENT */}
      <section className="mC-frame mC-deploy">
        <div className="mC-deploy-copy">
          <div className="mC-label">Deployment</div>
          <h2>Runs where your data lives.</h2>
          <p>{c.deployBody}</p>
        </div>
        <div className="mC-diagram">
          <div className="mC-boundary">
            <span className="mC-boundary-label">Your environment · local or private cloud</span>
            <div className="mC-nodes">
              {nodes.map((n) => (
                <div key={n} className="mC-node">
                  {n}
                </div>
              ))}
            </div>
            <svg className="mC-wires" viewBox="0 0 60 100" preserveAspectRatio="none" aria-hidden="true">
              {[12.5, 37.5, 62.5, 87.5].map((y) => (
                <line key={y} x1="0" y1={y} x2="60" y2="50" vectorEffect="non-scaling-stroke" />
              ))}
            </svg>
            <div className="mC-bar">
              <img src={icon} alt="Blindsight" />
            </div>
            <div className="mC-wire-out" aria-hidden="true" />
            <div className="mC-report">
              <span>Compliance</span>
              <small>Reporting</small>
            </div>
          </div>
          <div className="mC-boundary-note">
            <ArrowUp size={13} /> Sensitive data never crosses this line
          </div>
        </div>
      </section>

      {/* DETECTION */}
      <section id="research" className="mC-frame">
        <div className="mC-head">
          <h2>We build against attacks we've run ourselves.</h2>
        </div>
        <div className="mC-cols-3">
          {c.detection.map((d, i) => (
            <div key={d.label} className="mC-col mC-col-sm">
              <div className="mC-label">{d.label}</div>
              <p>
                {d.body}
                {i === 2 && (
                  <>
                    {" "}
                    <Link to="/team" className="mC-underline">
                      Meet the team
                    </Link>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PERSONAS */}
      <section className="mC-frame mC-cols-3">
        {c.personas.map((p) => (
          <div key={p.role} className="mC-col mC-persona">
            <div>
              <div className="mC-label">For the {p.role}</div>
              <div className="mC-persona-q">"{p.question}"</div>
            </div>
            <p>{p.points.join(". ")}.</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="mC-frame mC-cta mC-dots">
        <h2>{c.ctaTitle}</h2>
        <div className="mC-row">
          <DemoButton />
          <Link to="/contact" className="mC-btn mC-btn-line">
            Talk to the founders
          </Link>
        </div>
      </section>

      <footer className="mC-footer">
        <div>
          <img src={logo} alt="Blindsight" className="mC-logo mC-logo-sm" />
          <div className="mC-grey">Blindsight Technologies AG · Zurich, Switzerland</div>
        </div>
        <div className="mC-footer-links">
          <Link to="/team">Team</Link>
          <Link to="/careers">Careers</Link>
          <Link to="/blog">Blog</Link>
          <Link to="/imprint">Imprint</Link>
          <Link to="/privacy">Privacy</Link>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
