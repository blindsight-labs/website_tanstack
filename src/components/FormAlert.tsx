/* The error block under a form's fields, for problems not tied to one field (those show under
   the field, FieldError). "check" errors name what to fix; "failed" errors say
   what happened, that it's safe to retry, and give a direct email fallback (subject prefilled,
   with the log reference when there is one). Styled in b-forms.css (.form-alert). */
import { AlertCircle, CircleSlash } from "lucide-react";

import type { FormErrorInfo } from "@/lib/form-error";

export function FormAlert({
  error,
  email,
  subject,
}: {
  error: FormErrorInfo;
  /** Where to write if it keeps failing, e.g. info@blindsight.io */
  email: string;
  subject: string;
}) {
  const Icon = error.kind === "check" ? AlertCircle : CircleSlash;
  const mailSubject = error.ref ? `${subject} (Ref ${error.ref})` : subject;
  return (
    <div className="form-alert" data-kind={error.kind} role="alert" aria-live="assertive">
      <Icon className="form-alert__icon" size={16} strokeWidth={1.75} aria-hidden="true" />
      <div className="form-alert__body">
        <p className="form-alert__title">{error.title}</p>
        <p className="form-alert__detail">{error.detail}</p>
        {error.kind === "failed" && (
          <p className="form-alert__help">
            Still not working? Email{" "}
            <a href={`mailto:${email}?subject=${encodeURIComponent(mailSubject)}`}>{email}</a> and we'll
            take it from there.
            {error.ref && (
              <>
                {" "}
                Reference <span className="form-alert__ref">{error.ref}</span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

/** The message under one field, when the current "check" error is about it (see fieldError). */
export function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <small className="field-error" role="alert">
      <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
      {message}
    </small>
  );
}
