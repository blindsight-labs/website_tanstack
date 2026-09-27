/* Version B · /careers/apply. Header object: the chosen role's glass card over a paper CV.
   The form sits on a white card beside the role it is for; submission, validation and the
   server function are the legacy page's, unchanged. */
import { getRouteApi, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { submitApplication } from "@/lib/careers.functions";
import { friendlyFormError, isValidEmail } from "@/lib/form-error";
import { Label } from "@/site/shared";
import { ROLES } from "../legacy/Careers";
import { fileToBase64 } from "../legacy/CareersApply";
import { Meta, Page, PageHead, Steps } from "./parts";

const applyRoute = getRouteApi("/careers_/apply");

export function CareersApplyB() {
  const { role } = applyRoute.useSearch();
  const submit = useServerFn(submitApplication);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");
  const known = ROLES.find((r) => r.title === role);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") || "").trim();
    const email = String(f.get("email") || "").trim();
    const message = String(f.get("message") || "").trim();
    const consent = f.get("consent") === "on";
    const file = f.get("cv") as File | null;

    if (!consent) {
      setError("Please confirm you agree to be contacted.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("CV must be 5MB or smaller.");
      return;
    }

    setSubmitting(true);
    try {
      const cv =
        file && file.size > 0
          ? { filename: file.name, mimeType: file.type || "application/octet-stream", base64: await fileToBase64(file) }
          : null;
      await submit({
        data: { role: role || "General application", name, email, message, consent, cv },
      });
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
              <form className="pb-form" onSubmit={onSubmit} noValidate>
                <div className="pb-form__row">
                  <label className="pb-field">
                    <span className="pb-field__k">Name *</span>
                    <input name="name" type="text" required maxLength={120} autoComplete="name" />
                  </label>
                  <label className="pb-field">
                    <span className="pb-field__k">Email *</span>
                    <input name="email" type="email" required maxLength={255} autoComplete="email" />
                  </label>
                </div>
                <label className="pb-field pb-file" data-has={fileName ? "true" : undefined}>
                  <span className="pb-field__k">CV · PDF, DOC, DOCX or TXT · max 5MB</span>
                  <input
                    name="cv"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? "")}
                  />
                  <span className="pb-file__face" aria-hidden="true">
                    <span className="pb-file__name">{fileName || "Choose a file"}</span>
                    <span className="pb-file__btn">{fileName ? "Replace" : "Browse"}</span>
                  </span>
                </label>
                <label className="pb-field">
                  <span className="pb-field__k">Anything you'd like us to know</span>
                  <textarea name="message" rows={5} maxLength={2000} placeholder="Optional: links, what you'd build here, when you can start." />
                </label>
                <label className="pb-check">
                  <input name="consent" type="checkbox" />
                  <span>I agree to be contacted by Blindsight about this application.</span>
                </label>
                {error && (
                  <p className="pb-error" role="alert">
                    {error}
                  </p>
                )}
                <div className="pb-form__foot">
                  <button type="submit" className="mD-btn mD-btn--primary mD-btn--lg" disabled={submitting}>
                    {submitting ? "Sending…" : "Submit application"}
                    {!submitting && <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />}
                  </button>
                </div>
              </form>
            )}
          </div>

        </div>
      </section>
    </Page>
  );
}
