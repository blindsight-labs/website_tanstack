import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Building2, Check, Rocket } from "lucide-react";
import { submitDemoRequest } from "@/lib/demo.functions";
import { friendlyFormError, isValidEmail } from "@/lib/form-error";
import type { DemoVariant } from "./DemoModal";

type Path = "startup" | "team" | null;

/** Shared demo-request form + success state. Used by the /demo page and the demo modal.
 *  `variant` switches between booking a demo and requesting the app download — same
 *  fields, different submit label, source tag and confirmation copy.
 *  The first choice (startup vs. larger team) determines which fields render below it. */
export function DemoForm({ variant = "demo" }: { variant?: DemoVariant }) {
  const submit = useServerFn(submitDemoRequest);
  const isDownload = variant === "download";
  const [path, setPath] = useState<Path>(null);
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
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    let company = "—";
    let role = "";
    let companySize = "";
    let useCase = "";
    if (path === "team") {
      company = String(f.get("company") || "").trim();
      role = String(f.get("role") || "").trim();
      companySize = String(f.get("companySize") || "").trim();
      useCase = String(f.get("useCase") || "").trim();
      if (!company) {
        setError("Please enter your company name.");
        return;
      }
    }

    setSubmitting(true);
    try {
      await submit({
        data: {
          name,
          workEmail: email,
          company,
          role,
          companySize,
          useCase,
          message,
          consent,
          source: isDownload ? "download-app" : "demo-form",
        },
      });
      setDone(true);
    } catch (err) {
      setError(friendlyFormError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="demo-form-wrap reveal">
      {done ? (
        <div className="demo-success">
          <span className="tag">Got it</span>
          <h2>
            {isDownload ? "Thanks, your download is on the way." : "Thanks, we'll be in touch."}
          </h2>
          <p>
            {isDownload ? (
              <>
                We'll email your download link and setup guide within one business day from{" "}
                <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
              </>
            ) : (
              <>
                A founder will reply within one business day from{" "}
                <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
              </>
            )}
          </p>
        </div>
      ) : (
        <form className="demo-form" onSubmit={onSubmit} noValidate>
          <div className="demo-path-toggle" hidden={path !== null}>
            <p className="demo-path-heading">Which best describes you?</p>
            <div className="demo-row">
              <button
                type="button"
                className={path === "startup" ? "demo-path-card is-selected" : "demo-path-card"}
                aria-pressed={path === "startup"}
                onClick={() => setPath("startup")}
              >
                <Rocket size={20} aria-hidden="true" />
                <span className="demo-path-card-title">Startup</span>
                <span className="demo-path-card-meta">≤10 people</span>
                <span className="demo-path-card-caption">Startup-friendly pricing</span>
              </button>
              <button
                type="button"
                className={path === "team" ? "demo-path-card is-selected" : "demo-path-card"}
                aria-pressed={path === "team"}
                onClick={() => setPath("team")}
              >
                <Building2 size={20} aria-hidden="true" />
                <span className="demo-path-card-title">Larger team</span>
              </button>
            </div>
          </div>

          {path !== null && (
            <div className="demo-path-confirm">
              <Check size={16} aria-hidden="true" />
              <span>{path === "startup" ? "Startup (≤10 people)" : "Larger team"}</span>
              <button type="button" className="demo-startup-link" onClick={() => setPath(null)}>
                Change
              </button>
            </div>
          )}

          <div className="demo-fields" hidden={path === null}>
            <label className="demo-field">
              <span>Name *</span>
              <input name="name" type="text" required maxLength={120} autoComplete="name" />
            </label>
            <label className="demo-field">
              <span>Email *</span>
              <input name="email" type="email" required maxLength={255} autoComplete="email" />
            </label>

            {path === "team" && (
              <>
                <div className="demo-row">
                  <label className="demo-field">
                    <span>Company *</span>
                    <input
                      name="company"
                      type="text"
                      required
                      maxLength={200}
                      autoComplete="organization"
                    />
                  </label>
                  <label className="demo-field">
                    <span>Role (optional)</span>
                    <input
                      name="role"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Head of IT / CISO"
                    />
                  </label>
                </div>
                <div className="demo-row">
                  <label className="demo-field">
                    <span>Company size (optional)</span>
                    <select name="companySize" defaultValue="">
                      <option value="" disabled hidden>
                        Select…
                      </option>
                      <option value="11–50">11–50</option>
                      <option value="51–200">51–200</option>
                      <option value="200+">200+</option>
                    </select>
                  </label>
                  <label className="demo-field">
                    <span>Use case (optional)</span>
                    <input
                      name="useCase"
                      type="text"
                      maxLength={80}
                      placeholder="e.g. Shadow AI visibility"
                    />
                  </label>
                </div>
              </>
            )}

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
            {error && (
              <div className="demo-error" role="alert">
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Sending…" : isDownload ? "Send my download link" : "Request demo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
