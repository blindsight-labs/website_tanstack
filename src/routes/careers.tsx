import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/careers")({
  component: CareersPage,
  head: () => ({
    meta: [
      { title: "Careers · Blindsight" },
      {
        name: "description",
        content:
          "Join Blindsight. We're hiring engineers, researchers, and operators to secure the next generation of AI systems.",
      },
      { property: "og:title", content: "Careers · Blindsight" },
      { property: "og:description", content: "Help us secure the next generation of AI systems." },
      { property: "og:url", content: "/careers" },
    ],
    links: [{ rel: "canonical", href: "/careers" }],
  }),
});

type Role = {
  title: string;
  location: string;
  type: string;
  desc: string;
};

const ROLES: Role[] = [
  {
    title: "Founders Associate",
    location: "Zürich",
    type: "Full-time",
    desc: "Drive GTM execution, market intelligence, and investor narrative alongside the founders. Build the commercial playbook that scales with Blindsight.",
  },
  {
    title: "SDR",
    location: "Remote",
    type: "Full-time",
    desc: "Open conversations with AI native companies and enterprises in sectors where the stakes are high. Turn tailored outbound into qualified pipeline the founders close.",
  },
  {
    title: "Solutions Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Partner with regulated enterprises to deploy Blindsight end to end. Translate security requirements into working integrations.",
  },
  {
    title: "ML Security Researcher",
    location: "Remote",
    type: "Full-time",
    desc: "Investigate poisoning, shortcut learning, and backdoors across training and retrieval pipelines. Publish what you discover.",
  },
  {
    title: "GTM Lead",
    location: "Zürich · Hybrid",
    type: "Full-time",
    desc: "Work directly with banks, insurers, and public sector buyers on EU AI Act readiness. Own pipeline from first call to signed contract.",
  },
  {
    title: "Security Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Build the runtime that protects production AI systems end to end. Deep systems work on a tight latency budget.",
  },
  {
    title: "Branding & Marketing Lead",
    location: "Zürich · Hybrid",
    type: "Full-time",
    desc: "Define how Blindsight shows up in the world. Own brand, narrative, and the surfaces that put us in front of CISOs and regulators.",
  },
];

function CareersPage() {
  return (
    <main>
      <header className="hero careers-hero">
        <div className="reveal" style={{ maxWidth: 760 }}>
          <span className="tag">Careers · Zürich</span>
          <h1>
            Build the security layer
            <br />
            <span className="accent">AI runs on.</span>
          </h1>
          <p className="lede">
            We're a small team in Zürich securing the AI systems that teams depend on. Right now,
            the people deploying AI are flying blind on security. They move fast because they have
            to. We exist so they can move fast and safely - with the trust that speed usually can't
            afford.
          </p>
          <div className="hero-actions">
            <a href="mailto:careers@blindsight.io" className="btn btn-primary">
              Email the founders
            </a>
            <a href="#roles" className="btn btn-secondary">
              See open roles <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <section className="section section-alt">
        <div className="section-inner">
          <div className="s-head reveal">
            <span className="tag">What we value</span>
            <h2>How we show up.</h2>
            <p>
              We give people freedom and expect them to use it. Long-term, we want to help solve AI
              alignment and build AI that's actually safe and trustworthy.
            </p>
          </div>
          <div className="values-grid reveal">
            <div className="value-card">
              <div className="value-name">Doers, Thinkers, Builders</div>
              <p>
                If we notice a problem, we fix it, or we bring in the team. Doers, thinkers, and
                builders work best when they're trusted with the freedom to move.
              </p>
            </div>
            <div className="value-card">
              <div className="value-name">Hacker Mindset</div>
              <p>
                Security is a creative discipline. It's built on a deep understanding of the tech,
                by people who refuse to take "that's just how it works" as a final answer.
              </p>
            </div>
            <div className="value-card">
              <div className="value-name">Concerned Optimists</div>
              <p>
                We're passionate about where AI is going and its potential. But AGI and AI alignment
                won't happen safely without securing AI systems and their foundations first.
              </p>
            </div>
            <div className="value-card">
              <div className="value-name">Lifelong Learners</div>
              <p>
                Cybersecurity never stops moving. Neither do we. Curious by default. Uncomfortable
                standing still.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="roles">
        <div className="section-inner">
          <div className="s-head reveal">
            <span className="tag">Open roles</span>
            <h2>We're hiring across the platform.</h2>
            <p>Don't see your role? Write to us anyway, we read every note.</p>
          </div>
          <div className="roles-list reveal">
            {ROLES.map((r) => (
              <Link
                key={r.title}
                to="/careers/apply"
                search={{ role: r.title }}
                className="role-row"
              >
                <div className="role-main">
                  <div className="role-title">{r.title}</div>
                  <div className="role-desc">{r.desc}</div>
                </div>
                <div className="role-meta">
                  <span>{r.location}</span>
                  <span>{r.type}</span>
                </div>
                <ArrowRight className="role-arrow" size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="section-inner">
          <div
            className="s-head reveal"
            style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
          >
            <span className="tag">Get in touch</span>
            <h2>Not on the list?</h2>
            <p>Tell us what you'd build here. We hire for trajectory.</p>
            <a
              href="mailto:careers@blindsight.io"
              className="btn btn-primary"
              style={{ marginTop: 20 }}
            >
              careers@blindsight.io
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
