/* Version B · /careers/apply. Header object: the chosen role's glass card over a paper CV.
   The form sits on a white card beside the role it is for; submission, validation and the
   server function are the legacy page's, unchanged. */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { FieldError, FormAlert, useFieldErrors } from "@/components/FormAlert";
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

  const { errorId, invalid, live } = useFieldErrors(error, formRef);

  // the form (and its focused submit button) is swapped for the confirmation: focus its heading,
  // which also reads the confirmation out (so no role="status" on top, that would read it twice)
  const doneRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);


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
              <div className="pb-done">
                <Label>Received</Label>
                <h2 ref={doneRef} tabIndex={-1} className="mD-h2">Thanks, we'll be in touch.</h2>
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
                {live}
                <div className="pb-form__row">
                  <label className="pb-field">
                    <span className="pb-field__k">Name <span aria-hidden="true">*</span></span>
                    <input name="name" type="text" required maxLength={120} autoComplete="name" {...invalid("name")} />
                    <FieldError id={errorId("name")} message={fieldError(error, "name")} />
                  </label>
                  <label className="pb-field">
                    <span className="pb-field__k">Email <span aria-hidden="true">*</span></span>
                    <input name="email" type="email" required maxLength={255} autoComplete="email" {...invalid("email")} />
                    <FieldError id={errorId("email")} message={fieldError(error, "email")} />
                  </label>
                </div>
                <label className="pb-field pb-file" data-has={fileName ? "true" : undefined}>
                  <span className="pb-field__k">CV (optional) · PDF, DOC, DOCX or TXT · max 4MB</span>
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
                  <FieldError id={errorId("cv")} message={fieldError(error, "cv")} />
                </label>
                <label className="pb-field">
                  <span className="pb-field__k">Anything you'd like us to know (optional)</span>
                  <textarea name="message" rows={5} maxLength={2000} placeholder="Links, what you'd build here, when you can start." />
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
                <FieldError id={errorId("consent")} message={fieldError(error, "consent")} inLabel={false} />
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
