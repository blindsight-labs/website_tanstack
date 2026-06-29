import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { submitDemoRequest } from "@/lib/demo.functions";
import { friendlyFormError, isValidEmail } from "@/lib/form-error";
import type { DemoVariant } from "./DemoModal";

/** Shared demo-request form + success state. Used by the /demo page and the demo modal.
 *  `variant` switches between booking a demo and requesting the app download — same
 *  fields, different submit label, source tag and confirmation copy. */
export function DemoForm({ variant = "demo" }: { variant?: DemoVariant }) {
  const submit = useServerFn(submitDemoRequest);
  const isDownload = variant === "download";
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
          {error && (
            <div className="demo-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : isDownload ? "Send my download link" : "Request demo"}
          </button>
        </form>
      )}
    </div>
  );
}
