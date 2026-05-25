import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { submitDemoRequest } from "@/lib/demo.functions";

export const Route = createFileRoute("/demo")({
  component: DemoPage,
  head: () => ({
    meta: [
      { title: "Request a Demo · Blindsight" },
      { name: "description", content: "Book a 30-minute working session with the Blindsight team. Bring a real AI deployment, leave with a live threat map." },
      { property: "og:title", content: "Request a Demo · Blindsight" },
      { property: "og:description", content: "Book a 30-minute working session with the Blindsight team." },
      { property: "og:url", content: "https://blindsight.io/demo" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/demo" }],
  }),
});

function DemoPage() {
  const submit = useServerFn(submitDemoRequest);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";

    if (!consent) {
      setError("Please confirm you agree to be contacted.");
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        data: {
          name,
          workEmail: email,
          // Company is required by the server schema; default to a sensible
          // placeholder so the simplified form keeps working.
          company: "—",
          role: "",
          companySize: "",
          useCase: "",
          message,
          consent,
          source: "demo-form",
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <section className="section demo-section">
        <div className="section-inner demo-compact">
          <div className="demo-compact-head reveal">
            <span className="tag">Request a Demo</span>
            <h1 className="demo-title">See Blindsight against your stack.</h1>
            <p className="demo-sub">
              30-minute working session with the founding team. Reply within one business day.
            </p>
          </div>

          <div className="demo-form-wrap reveal">
            {done ? (
              <div className="demo-success">
                <span className="tag">Got it</span>
                <h2>Thanks - we'll be in touch.</h2>
                <p>
                  A founder will reply within one business day from{" "}
                  <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
                </p>
              </div>
            ) : (
              <form className="demo-form" onSubmit={onSubmit} noValidate>
                <label className="demo-field">
                  <span>Name *</span>
                  <input name="name" type="text" required maxLength={120} autoComplete="name" />
                </label>
                <label className="demo-field">
                  <span>Email *</span>
                  <input name="email" type="email" required maxLength={255} autoComplete="email" />
                </label>
                <label className="demo-field">
                  <span>Tell us anything relevant about you, your needs, your use case</span>
                  <textarea
                    name="message"
                    rows={4}
                    maxLength={2000}
                    placeholder="e.g. I'm deploying AI across my organization and need to make sure we don't leak information to third parties."
                  />
                </label>
                <label className="demo-consent">
                  <input name="consent" type="checkbox" defaultChecked />
                  <span>I agree to be contacted by Blindsight about this request.</span>
                </label>
                {error && <div className="demo-error" role="alert">{error}</div>}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Sending…" : "Request demo"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
