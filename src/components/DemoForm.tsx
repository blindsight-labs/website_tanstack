import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Check, Rocket } from "lucide-react";
import { submitDemoRequest } from "@/lib/demo.functions";
import { trackEvent } from "@/lib/consent";
import { checkError, friendlyFormError, isValidEmail, type FormErrorInfo } from "@/lib/form-error";
import { FormAlert } from "./FormAlert";
import { RecaptchaNotice, useRecaptcha } from "./Recaptcha";
import type { DemoVariant } from "./DemoModal";

type Path = "startup" | "team" | null;

function stepsFor(isTrial: boolean, path: Path): string[] {
  if (isTrial) return ["About you", "Your company", "Your setup"];
  if (path === "team") return ["About you", "Your company", "Anything else"];
  return ["About you", "Anything else"];
}

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
 *  source tag and confirmation copy. "demo"/"download" ask the startup-vs-team
 *  question first. The fields then come in short steps (2–3 fields each, see
 *  stepsFor) so the dialog never shows the whole form at once; every field stays
 *  mounted (hidden), so the final submit still reads them all from FormData. */
export function DemoForm({ variant = "demo" }: { variant?: DemoVariant }) {
  const submit = useServerFn(submitDemoRequest);
  const isDownload = variant === "download";
  const isTrial = variant === "trial";
  const [path, setPath] = useState<Path>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorInfo | null>(null);
  const [done, setDone] = useState(false);
  const getCaptchaToken = useRecaptcha("demo");
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = stepsFor(isTrial, path);
  const last = step === steps.length - 1;

  // a new path restarts the steps; each new step puts the cursor in its first field
  useEffect(() => setStep(0), [path]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    formRef.current
      ?.querySelector<HTMLElement>(`[data-step="${step}"] :is(input, select, textarea)`)
      ?.focus();
  }, [step, path]);

  /** The current step's own checks, before moving on. */
  function stepProblem(f: FormData): string | null {
    const v = (k: string) => String(f.get(k) || "").trim();
    if (step === 0) {
      if (!v("name")) return "Please enter your name.";
      if (!isValidEmail(v("email"))) return "Please enter a valid email address.";
    }
    if (step === 1 && isTrial) {
      if (!v("company")) return "Please enter your company name.";
      if (!v("position")) return "Please select your position.";
    }
    if (step === 1 && path === "team" && !v("company")) return "Please enter your company name.";
    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    if (!last) {
      // Continue (or Enter in a field): check this step, then show the next one
      const problem = stepProblem(f);
      if (problem) setError(checkError(problem));
      else setStep(step + 1);
      return;
    }
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";

    if (!consent) {
      setError(checkError("Please accept the Evaluation Terms to continue."));
      return;
    }
    if (!isValidEmail(email)) {
      setError(checkError("Please enter a valid email address."));
      return;
    }

    let company = "Not asked (startup)";
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
        setError(checkError("Please enter your company name."));
        return;
      }
      if (!role) {
        setError(checkError("Please select your position."));
        return;
      }
    } else if (path === "team") {
      company = String(f.get("company") || "").trim();
      role = String(f.get("role") || "").trim();
      companySize = String(f.get("companySize") || "").trim();
      useCase = String(f.get("useCase") || "").trim();
      if (!company) {
        setError(checkError("Please enter your company name."));
        return;
      }
    }

    setSubmitting(true);
    try {
      const captchaToken = await getCaptchaToken(); // fresh per attempt: tokens are single-use
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
          segment: path === "team" ? "Larger team" : path === "startup" ? "Startup" : "",
          captchaToken,
        },
      });
      trackEvent("generate_lead", {
        form: isTrial ? "free-trial" : isDownload ? "download-app" : "demo-form",
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
        <form ref={formRef} className="demo-form" onSubmit={onSubmit} noValidate>
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
            <div className="demo-steps" aria-live="polite">
              <p className="demo-steps__label">
                Step {step + 1} of {steps.length}
                <span aria-hidden="true"> · </span>
                <strong>{steps[step]}</strong>
              </p>
              <div className="demo-steps__bar" aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s} data-state={i < step ? "done" : i === step ? "current" : "todo"} />
                ))}
              </div>
            </div>

            <div className="demo-step" data-step="0" hidden={step !== 0}>
              <label className="demo-field">
                <span>Name *</span>
                <input name="name" type="text" required maxLength={120} autoComplete="name" />
              </label>
              <label className="demo-field">
                <span>{isTrial || path === "team" ? "Work email *" : "Email *"}</span>
                <input name="email" type="email" required maxLength={255} autoComplete="email" />
              </label>
            </div>

            {isTrial && (
              <div className="demo-step" data-step="1" hidden={step !== 1}>
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
              </div>
            )}

            {!isTrial && path === "team" && (
              <div className="demo-step" data-step="1" hidden={step !== 1}>
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
                <div className="demo-row">
                  <label className="demo-field">
                    <span>Role (optional)</span>
                    <input
                      name="role"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Head of IT / CISO"
                    />
                  </label>
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
                </div>
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
            )}

            <div className="demo-step" data-step={steps.length - 1} hidden={!last}>
              {isTrial && (
                <div className="demo-row">
                  <label className="demo-field">
                    <span>Which engine first?</span>
                    <select name="engine" defaultValue="Both, combined">
                      <option value="Both, combined">Both, combined</option>
                      <option value="Runtime Security Proxy">Runtime Security Proxy</option>
                      <option value="Shadow AI discovery">Shadow AI discovery</option>
                      <option value="Not sure yet">Not sure yet</option>
                    </select>
                  </label>
                  <label className="demo-field">
                    <span>Deployment preference</span>
                    <select name="deployment" defaultValue="Not sure, advise me">
                      <option value="Private cloud / your VPC">Private cloud / your VPC</option>
                      <option value="Public cloud, managed by Blindsight">
                        Public cloud, managed by Blindsight
                      </option>
                      <option value="Not sure, advise me">Not sure, advise me</option>
                    </select>
                  </label>
                </div>
              )}
              <label className="demo-field">
                <span>Anything we should know (optional)</span>
                <textarea
                  name="message"
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. We're rolling out AI across the company and need to keep client data from leaking."
                />
              </label>
              <label className="demo-consent">
                <input name="consent" type="checkbox" required />
                <span>
                  I accept the{" "}
                  <Link to="/evaluation-terms" target="_blank" rel="noopener">
                    Evaluation Terms
                  </Link>{" "}
                  and agree to be contacted by Blindsight about this request. How we handle your
                  data:{" "}
                  <Link to="/privacy" target="_blank" rel="noopener">
                    Privacy Notice
                  </Link>
                  .
                </span>
              </label>
            </div>

            {error && (
              <FormAlert error={error} email="info@blindsight.io" subject="Website request" />
            )}
            <div className="demo-nav">
              {step > 0 && (
                <button
                  type="button"
                  className="demo-back"
                  onClick={() => {
                    setError(null);
                    setStep(step - 1);
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                  Back
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {!last
                  ? "Continue"
                  : submitting
                    ? "Sending…"
                    : isTrial
                      ? "Send request"
                      : isDownload
                        ? "Send my download link"
                        : "Request demo"}
              </button>
            </div>
            <RecaptchaNotice className="demo-captcha-note" />
          </div>
        </form>
      )}
    </div>
  );
}
