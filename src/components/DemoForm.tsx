import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Building2, Check, Rocket } from "lucide-react";
import { submitDemoRequest } from "@/lib/demo.functions";
import { trackEvent } from "@/lib/consent";
import {
  FIELD_MESSAGES,
  checkError,
  emailProblem,
  fieldError,
  friendlyFormError,
  type FormErrorInfo,
} from "@/lib/form-error";
import { FieldError, FormAlert, useFieldErrors } from "./FormAlert";
import { RecaptchaNotice, useRecaptcha } from "./Recaptcha";

type Path = "startup" | "team" | null;

/** Demo-request form + success state, in the demo modal. It asks the startup-vs-team question
 *  first; the fields then come in short steps (2–3 fields each) so the dialog never shows the
 *  whole form at once; every field stays mounted (hidden), so the final submit still reads
 *  them all from FormData. */
export function DemoForm() {
  const submit = useServerFn(submitDemoRequest);
  const [path, setPath] = useState<Path>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorInfo | null>(null);
  const [done, setDone] = useState(false);
  const getCaptchaToken = useRecaptcha("demo");
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const steps = path === "team" ? ["About you", "Your company", "Anything else"] : ["About you", "Anything else"];
  const last = step === steps.length - 1;

  // a new path restarts the steps; each new step puts the cursor in its first field
  useEffect(() => setStep(0), [path]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // "Change" clears the path and unmounts itself: the cursor goes back to the path choice
    formRef.current
      ?.querySelector<HTMLElement>(
        path === null ? ".demo-path-pill" : `[data-step="${step}"] :is(input, select, textarea)`,
      )
      ?.focus();
  }, [step, path]);

  // the form (and its focused submit button) is swapped for the confirmation: focus its heading,
  // which also reads the confirmation out (so no role="status" on top, that would read it twice)
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const { errorId, invalid, live } = useFieldErrors(error, formRef);

  /** The checks for one step's fields, in the order they appear. */
  function stepProblem(f: FormData, at: number): FormErrorInfo | null {
    const v = (k: string) => String(f.get(k) || "").trim();
    if (at === 0) {
      if (!v("name")) return checkError(FIELD_MESSAGES.name, "name");
      const email = emailProblem(v("email"));
      if (email) return checkError(email, "email");
    }
    if (at === 1 && path === "team" && !v("company")) {
      return checkError(FIELD_MESSAGES.company, "company");
    }
    return null;
  }


  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    if (!last) {
      // Continue (or Enter in a field): check this step, then show the next one
      const problem = stepProblem(f, step);
      if (problem) setError(problem);
      else setStep(step + 1);
      return;
    }
    // every earlier step again (the visitor may have gone back and cleared a field), then this one
    for (let at = 0; at < step; at++) {
      const problem = stepProblem(f, at);
      if (problem) {
        setStep(at);
        setError(problem);
        return;
      }
    }
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";

    if (!consent) {
      setError(checkError(FIELD_MESSAGES.terms, "consent"));
      return;
    }

    let company = "Not asked (startup)";
    let role = "";
    let companySize = "";
    let useCase = "";

    if (path === "team") {
      company = String(f.get("company") || "").trim();
      role = String(f.get("role") || "").trim();
      companySize = String(f.get("companySize") || "").trim();
      useCase = String(f.get("useCase") || "").trim();
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
          message,
          consent,
          source: "demo-form",
          segment: path === "team" ? "Larger team" : path === "startup" ? "Startup" : "",
          captchaToken,
        },
      });
      trackEvent("generate_lead", { form: "demo-form" });
      setDone(true);
    } catch (err) {
      const problem = friendlyFormError(err);
      // a server check about an earlier step's field: take the visitor back to it
      const at = problem.field
        ? Number(formRef.current?.querySelector(`[name="${problem.field}"]`)?.closest("[data-step]")?.getAttribute("data-step"))
        : NaN;
      if (!Number.isNaN(at) && at !== step) setStep(at);
      setError(problem);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="demo-form-wrap reveal">
      {done ? (
        <div className="demo-success">
          <span className="tag">Got it</span>
          <h2 ref={doneRef} tabIndex={-1}>
            Thanks, we'll be in touch.
          </h2>
          <p>
            A founder will reply within one business day from{" "}
            <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
          </p>
        </div>
      ) : (
        <form
          ref={formRef}
          className="demo-form"
          onSubmit={onSubmit}
          // editing the field an error is about clears it
          onChange={(e) => {
            const { name } = e.target as EventTarget & { name?: string };
            if (error?.field && error.field === name) setError(null);
          }}
          noValidate
        >
          {live}
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

          {path !== null && (
            <div className="demo-path-confirm">
              <Check size={16} aria-hidden="true" />
              <span>{path === "startup" ? "Startup" : "Larger team"}</span>
              <button type="button" className="demo-startup-link" onClick={() => setPath(null)}>
                Change
              </button>
            </div>
          )}

          <div className="demo-fields" hidden={path === null}>
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
                <span>Name <span aria-hidden="true">*</span></span>
                <input
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  autoComplete="name"
                  {...invalid("name")}
                />
                <FieldError id={errorId("name")} message={fieldError(error, "name")} />
              </label>
              <label className="demo-field">
                <span>
                  {path === "team" ? "Work email" : "Email"} <span aria-hidden="true">*</span>
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  autoComplete="email"
                  {...invalid("email")}
                />
                <FieldError id={errorId("email")} message={fieldError(error, "email")} />
              </label>
            </div>

            {path === "team" && (
              <div className="demo-step" data-step="1" hidden={step !== 1}>
                <label className="demo-field">
                  <span>Company <span aria-hidden="true">*</span></span>
                  <input
                    name="company"
                    type="text"
                    required
                    maxLength={200}
                    autoComplete="organization"
                    {...invalid("company")}
                  />
                  <FieldError id={errorId("company")} message={fieldError(error, "company")} />
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
                <input name="consent" type="checkbox" required {...invalid("consent")} />
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
              <FieldError id={errorId("consent")} message={fieldError(error, "consent")} inLabel={false} />
            </div>

            {error && !error.field && (
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
                {!last ? "Continue" : submitting ? "Sending…" : "Request demo"}
              </button>
            </div>
            <RecaptchaNotice className="demo-captcha-note" />
          </div>
        </form>
      )}
    </div>
  );
}
