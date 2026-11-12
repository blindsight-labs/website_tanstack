import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
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

/** Demo-request form + success state, in the demo modal: one page of fields. */
export function DemoForm() {
  const submit = useServerFn(submitDemoRequest);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorInfo | null>(null);
  const [done, setDone] = useState(false);
  const getCaptchaToken = useRecaptcha("demo");
  const formRef = useRef<HTMLFormElement>(null);

  // the form (and its focused submit button) is swapped for the confirmation: focus its heading,
  // which also reads the confirmation out (so no role="status" on top, that would read it twice)
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  const { errorId, invalid, live } = useFieldErrors(error, formRef);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) || "").trim();
    const name = v("name");
    const email = v("email");
    const company = v("company");
    const consent = f.get("consent") === "on";

    // the checks in the order the fields appear, so the first problem is the first field
    const emailIssue = emailProblem(email);
    const problem = !name
      ? checkError(FIELD_MESSAGES.name, "name")
      : emailIssue
        ? checkError(emailIssue, "email")
        : !company
          ? checkError(FIELD_MESSAGES.company, "company")
          : !consent
            ? checkError(FIELD_MESSAGES.terms, "consent")
            : null;
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      const captchaToken = await getCaptchaToken(); // fresh per attempt: tokens are single-use
      await submit({
        data: {
          name,
          workEmail: email,
          company,
          role: v("role"),
          companySize: v("companySize"),
          consent,
          source: "demo-form",
          captchaToken,
        },
      });
      trackEvent("generate_lead", { form: "demo-form" });
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
          <label className="demo-field">
            <span>Name <span aria-hidden="true">*</span></span>
            <input name="name" type="text" required maxLength={120} autoComplete="name" {...invalid("name")} />
            <FieldError id={errorId("name")} message={fieldError(error, "name")} />
          </label>
          <label className="demo-field">
            <span>Work email <span aria-hidden="true">*</span></span>
            <input name="email" type="email" required maxLength={255} autoComplete="email" {...invalid("email")} />
            <FieldError id={errorId("email")} message={fieldError(error, "email")} />
          </label>
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
          <label className="demo-field">
            <span>Job title (optional)</span>
            <input
              name="role"
              type="text"
              maxLength={120}
              autoComplete="organization-title"
              placeholder="e.g. CISO, CIO, IT Director"
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
          <label className="demo-consent">
            <input name="consent" type="checkbox" required {...invalid("consent")} />
            <span>
              I accept the{" "}
              <Link to="/evaluation-terms" target="_blank" rel="noopener">
                Evaluation Terms
              </Link>{" "}
              and agree to be contacted by Blindsight about this request. How we handle your data:{" "}
              <Link to="/privacy" target="_blank" rel="noopener">
                Privacy Notice
              </Link>
              .
            </span>
          </label>
          <FieldError id={errorId("consent")} message={fieldError(error, "consent")} inLabel={false} />

          {error && !error.field && (
            <FormAlert error={error} email="info@blindsight.io" subject="Website request" />
          )}
          <button type="submit" className="mD-btn mD-btn--primary mD-btn--lg" disabled={submitting}>
            {submitting ? "Sending…" : "Request a demo"}
          </button>
          <RecaptchaNotice className="demo-captcha-note" />
        </form>
      )}
    </div>
  );
}
