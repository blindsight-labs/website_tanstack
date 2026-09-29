/* Version B · /careers/apply. Header object: the chosen role's glass card over a paper CV.
   The form sits on a white card beside the role it is for; submission, validation and the
   server function are the legacy page's, unchanged. */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { FieldError, FormAlert } from "@/components/FormAlert";
import { RecaptchaNotice, useRecaptcha } from "@/components/Recaptcha";
import { submitApplication } from "@/lib/careers.functions";
import { trackEvent } from "@/lib/consent";
import {
  FIELD_MESSAGES,
  checkError,
  emailProblem,
  fieldError,
  friendlyFormError,
  type FormErrorInfo,
} from "@/lib/form-error";
import { Label } from "@/site/shared";
import { ROLES, fileToBase64 } from "../data";
import { Meta, Page, PageHead, Steps } from "./parts";

const applyRoute = getRouteApi("/careers_/apply");

const MAX_CV_BYTES = 4 * 1024 * 1024;
const CV_TYPES = /\.(pdf|docx?|txt)$/i;

export function CareersApplyB() {
  const { role } = applyRoute.useSearch();
  const submit = useServerFn(submitApplication);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<FormErrorInfo | null>(null);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");
  const getCaptchaToken = useRecaptcha("careers");
  const known = ROLES.find((r) => r.title === role);
  const formRef = useRef<HTMLFormElement>(null);

  // a field's error goes to that field: the cursor moves there so the fix is one keystroke away
  useEffect(() => {
    if (!error?.field) return;
    const el = formRef.current?.elements.namedItem(error.field);
    if (el instanceof HTMLElement) el.focus();
  }, [error]);

  /** Props that mark a field invalid while its error shows. */
  const invalid = (field: string) => (fieldError(error, field) ? { "aria-invalid": true as const } : {});

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";
    const file = f.get("cv") as File | null;

    // in the order the fields appear
    const emailIssue = emailProblem(email);
    const hasFile = !!file && file.size > 0;
    const problem = !name
      ? checkError(FIELD_MESSAGES.name, "name")
      : emailIssue
        ? checkError(emailIssue, "email")
        : hasFile && !CV_TYPES.test(file.name)
          ? checkError("That file type isn't supported. Upload your CV as a PDF, DOC, DOCX or TXT file.", "cv")
          : hasFile && file.size > MAX_CV_BYTES
            ? checkError(
                `Your CV is ${(file.size / 1024 / 1024).toFixed(1)} MB. Upload one of 4 MB or smaller, e.g. a compressed PDF.`,
                "cv",
              )
            : !consent
              ? checkError(FIELD_MESSAGES.contact, "consent")
              : null;
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    try {
      const cv =
        file && file.size > 0
          ? { filename: file.name, mimeType: file.type || "application/octet-stream", base64: await fileToBase64(file) }
          : null;
      const captchaToken = await getCaptchaToken(); // fresh per attempt: tokens are single-use
      await submit({
        data: { role: role || "General application", name, email, message, consent, cv, captchaToken },
      });
      trackEvent("generate_lead", { form: "job-application" });
      setDone(true);
    } catch (err) {
      setError(friendlyFormError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page className="pb-apply">
      <PageHead
        short
        scene="apply"
        arg={role ?? ""}
        above={
          <Link to="/careers" className="pb-back">
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            All roles
          </Link>
        }
        label={role ? `Apply · ${role}` : "Apply"}
        title="Join the team."
        lead="Send your CV and a short note. We read every application and reply within a few business days."
      />

      <section className="mD-sheet pb-apply__sheet" aria-label="Application">
        <div className="mD-container pb-apply__grid">
          <aside className="pb-apply__side" data-reveal>
            <div className="pb-apply__sticky">
              <Label>{known ? "The role" : "Your application"}</Label>
              <h2 className="pb-apply__role">{known?.title ?? role ?? "General application"}</h2>
              <p className="pb-apply__desc">{known ? known.desc : "Tell us what you'd build here. We hire for trajectory."}</p>
              {known && <Meta items={[known.location, known.type]} />}
              <p className="pb-next__head pb-apply__nextK">What happens next</p>
              <Steps
                label="What happens next"
                items={[
                  { k: "Read", v: "We read every application, CV and note." },
                  { k: "Reply", v: "You hear back within a few business days." },
                  {
                    k: "Questions",
                    v: (
                      <>
                        Write to <a href="mailto:careers@blindsight.io">careers@blindsight.io</a>
                      </>
                    ),
                  },
                ]}
              />
            </div>
          </aside>

          <div className="pb-apply__panel" data-reveal>
            {done ? (
              <div className="pb-done" role="status">
                <Label>Received</Label>
                <h2 className="mD-h2">Thanks, we'll be in touch.</h2>
                <p>
                  Questions in the meantime? Write to <a href="mailto:careers@blindsight.io">careers@blindsight.io</a>.
                </p>
                <Link to="/careers" className="mD-btn mD-btn--secondary">
                  <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                  Back to careers
                </Link>
              </div>
            ) : (
              <form
                ref={formRef}
                className="pb-form"
                onSubmit={onSubmit}
                // editing the field an error is about clears it
                onChange={(e) => {
                  const { name } = e.target as EventTarget & { name?: string };
                  if (error?.field && error.field === name) setError(null);
                }}
                noValidate
              >
                <div className="pb-form__row">
                  <label className="pb-field">
                    <span className="pb-field__k">Name *</span>
                    <input name="name" type="text" required maxLength={120} autoComplete="name" {...invalid("name")} />
                    <FieldError message={fieldError(error, "name")} />
                  </label>
                  <label className="pb-field">
                    <span className="pb-field__k">Email *</span>
                    <input name="email" type="email" required maxLength={255} autoComplete="email" {...invalid("email")} />
                    <FieldError message={fieldError(error, "email")} />
                  </label>
                </div>
                <label className="pb-field pb-file" data-has={fileName ? "true" : undefined}>
                  <span className="pb-field__k">CV · PDF, DOC, DOCX or TXT · max 4MB</span>
                  <input
                    name="cv"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? "")}
                    {...invalid("cv")}
                  />
                  <span className="pb-file__face" aria-hidden="true">
                    <span className="pb-file__name">{fileName || "Choose a file"}</span>
                    <span className="pb-file__btn">{fileName ? "Replace" : "Browse"}</span>
                  </span>
                  <FieldError message={fieldError(error, "cv")} />
                </label>
                <label className="pb-field">
                  <span className="pb-field__k">Anything you'd like us to know</span>
                  <textarea name="message" rows={5} maxLength={2000} placeholder="Optional: links, what you'd build here, when you can start." />
                </label>
                <label className="pb-check">
                  <input name="consent" type="checkbox" required {...invalid("consent")} />
                  <span>
                    I agree to be contacted by Blindsight about this application. See our{" "}
                    <Link to="/privacy" target="_blank" rel="noopener">
                      Privacy Notice
                    </Link>
                    .
                  </span>
                </label>
                <FieldError message={fieldError(error, "consent")} />
                {error && !error.field && <FormAlert error={error} email="careers@blindsight.io" subject="Job application" />}
                <div className="pb-form__foot">
                  <button type="submit" className="mD-btn mD-btn--primary mD-btn--lg" disabled={submitting}>
                    {submitting ? "Sending…" : "Submit application"}
                    {!submitting && <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />}
                  </button>
                </div>
                <RecaptchaNotice className="pb-captcha-note" />
              </form>
            )}
          </div>

        </div>
      </section>
    </Page>
  );
}
