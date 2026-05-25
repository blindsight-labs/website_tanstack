import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: "Contact · Blindsight" },
      { name: "description", content: "Get in touch with Blindsight. Talk to the team securing production AI for regulated enterprises." },
      { property: "og:title", content: "Contact · Blindsight" },
      { property: "og:description", content: "Get in touch with the Blindsight team." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
});

function ContactPage() {
  return (
    <main>
      <header className="hero">
        <div className="reveal" style={{ maxWidth: 760 }}>
          <span className="tag">Contact</span>
          <h1>
            Let's talk about
            <br />
            <span className="accent">securing your AI.</span>
          </h1>
          <p className="lede">
            Whether you're evaluating LLM security for the first time or replacing an existing
            stack, the founders read every note. Expect a reply within one business day.
          </p>
          <div className="hero-actions">
            <a href="mailto:info@blindsight.io" className="btn btn-primary">info@blindsight.io</a>
            <a href="mailto:careers@blindsight.io" className="btn btn-ghost">careers@blindsight.io</a>
          </div>
        </div>
      </header>

      <section className="section section-alt">
        <div className="section-inner">
          <div className="s-head reveal">
            <span className="tag">Where to find us</span>
            <h2>Zürich, Switzerland.</h2>
            <p>
              HQ in Zürich. We work with regulated enterprises across the EU, UK, and Switzerland.
            </p>
          </div>
          <div className="values-grid reveal">
            <div className="value-card">
              <div className="value-name">Sales & partnerships</div>
              <p><a href="mailto:info@blindsight.io">info@blindsight.io</a></p>
            </div>
            <div className="value-card">
              <div className="value-name">Careers</div>
              <p><a href="mailto:careers@blindsight.io">careers@blindsight.io</a></p>
            </div>
            <div className="value-card">
              <div className="value-name">Security & disclosures</div>
              <p><a href="mailto:security@blindsight.io">security@blindsight.io</a></p>
            </div>
            <div className="value-card">
              <div className="value-name">Press</div>
              <p><a href="mailto:press@blindsight.io">press@blindsight.io</a></p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
