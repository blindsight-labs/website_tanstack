import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Building2, Check, Rocket } from "lucide-react";
import { submitDemoRequest } from "@/lib/demo.functions";
import { friendlyFormError, isValidEmail } from "@/lib/form-error";
import type { DemoVariant } from "./DemoModal";

type Path = "startup" | "team" | null;

const TRIAL_POSITIONS = [
  "CEO / Founder",
  "CTO",
  "CISO",
  "Head of IT",
  "Head of Compliance / Risk",
  "Head of Data / AI",
  "Engineering lead",
  "Other",
];

/** Shared demo-request form + success state. Used by the demo modal.
 *  `variant` switches between booking a demo, requesting the app download, or
 *  starting the free trial — same shared fields, different submit label,
 *  source tag and confirmation copy. The "trial" variant always shows its
 *  full field set (position, deployment, engine); "demo"/"download" ask the
 *  startup-vs-team question first and reveal fields once that's answered. */
export function DemoForm({ variant = "demo" }: { variant?: DemoVariant }) {
  const submit = useServerFn(submitDemoRequest);
  const isDownload = variant === "download";
  const isTrial = variant === "trial";
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
    let engine = "";
    let deployment = "";

    if (isTrial) {
      company = String(f.get("company") || "").trim();
      role = String(f.get("position") || "").trim();
      companySize = String(f.get("companySize") || "").trim();
      engine = String(f.get("engine") || "").trim();
      deployment = String(f.get("deployment") || "").trim();
      if (!company) {
        setError("Please enter your company name.");
        return;
      }
      if (!role) {
        setError("Please select your position.");
        return;
      }
    } else if (path === "team") {
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
          engine,
          deployment,
          message,
          consent,
          source: isTrial ? "free-trial" : isDownload ? "download-app" : "demo-form",
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
            {isTrial
              ? "A founder replies within one business day."
              : isDownload
                ? "Thanks, your download is on the way."
                : "Thanks, we'll be in touch."}
          </h2>
          <p>
            {isTrial ? (
              <>
                We'll send your keys and deployment options from{" "}
                <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
              </>
            ) : isDownload ? (
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
          {!isTrial && (
            <div className="demo-path-toggle" hidden={path !== null}>
              <p className="demo-path-heading">Which best describes you?</p>
              <div className="demo-path-row">
                <button
                  type="button"
                  className={
                    path === "team"
                      ? "demo-path-pill demo-path-pill-primary is-selected"
                      : "demo-path-pill demo-path-pill-primary"
                  }
                  aria-pressed={path === "team"}
                  onClick={() => setPath("team")}
                >
                  <span className="demo-path-pill-row">
                    <Building2 size={22} aria-hidden="true" />
                    <span className="demo-path-pill-title">Larger team</span>
                  </span>
                  <span className="demo-path-pill-meta">
                    Security &amp; compliance for your org
                  </span>
                </button>
                <button
                  type="button"
                  className={
                    path === "startup"
                      ? "demo-path-pill demo-path-pill-secondary is-selected"
                      : "demo-path-pill demo-path-pill-secondary"
                  }
                  aria-pressed={path === "startup"}
                  onClick={() => setPath("startup")}
                >
                  <span className="demo-path-pill-row">
                    <Rocket size={15} aria-hidden="true" />
                    <span className="demo-path-pill-title">Startup</span>
                  </span>
                  <span className="demo-path-pill-meta">Quick self-serve setup</span>
                </button>
              </div>
            </div>
          )}

          {!isTrial && path !== null && (
            <div className="demo-path-confirm">
              <Check size={16} aria-hidden="true" />
              <span>{path === "startup" ? "Startup" : "Larger team"}</span>
              <button type="button" className="demo-startup-link" onClick={() => setPath(null)}>
                Change
              </button>
            </div>
          )}

          <div className="demo-fields" hidden={!isTrial && path === null}>
            <label className="demo-field">
              <span>Name *</span>
              <input name="name" type="text" required maxLength={120} autoComplete="name" />
            </label>
            <label className="demo-field">
              <span>{isTrial ? "Work email *" : "Email *"}</span>
              <input name="email" type="email" required maxLength={255} autoComplete="email" />
            </label>

            {isTrial ? (
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
                    <span>Your position *</span>
                    <select name="position" defaultValue="" required>
                      <option value="" disabled hidden>
                        Select…
                      </option>
                      {TRIAL_POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="demo-row">
                  <label className="demo-field">
                    <span>Company size (optional)</span>
                    <select name="companySize" defaultValue="">
                      <option value="" disabled hidden>
                        Select…
                      </option>
                      <option value="1–49">1–49</option>
                      <option value="50–200">50–200</option>
                      <option value="200–1,000">200–1,000</option>
                      <option value="1,000+">1,000+</option>
                    </select>
                  </label>
                  <label className="demo-field">
                    <span>Which engine first?</span>
                    <select name="engine" defaultValue="Both">
                      <option value="Both">Both, combined</option>
                      <option value="Runtime">Runtime Security Proxy</option>
                      <option value="ShadowAI">Shadow AI discovery</option>
                      <option value="Not sure">Not sure yet</option>
                    </select>
                  </label>
                </div>
                <label className="demo-field">
                  <span>Deployment preference</span>
                  <select name="deployment" defaultValue="Not sure">
                    <option value="Private cloud">Private cloud / your VPC</option>
                    <option value="Public cloud">Public cloud, managed by Blindsight</option>
                    <option value="Not sure">Not sure — advise me</option>
                  </select>
                </label>
              </>
            ) : (
              path === "team" && (
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
                        <option value="50–200">50–200</option>
                        <option value="200–1,000">200–1,000</option>
                        <option value="1,000+">1,000+</option>
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
              )
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
              {submitting
                ? "Sending…"
                : isTrial
                  ? "Send request"
                  : isDownload
                    ? "Send my download link"
                    : "Request demo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
