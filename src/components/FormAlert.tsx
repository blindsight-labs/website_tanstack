/* The error block under a form's fields, for problems not tied to one field (those show under
   the field, FieldError). "check" errors name what to fix; "failed" errors say
   what happened, that it's safe to retry, and give a direct email fallback (subject prefilled,
   with the log reference when there is one). Styled in b-forms.css (.form-alert). */
import { useEffect, useId, useRef, type RefObject } from "react";
import { AlertCircle, CircleSlash } from "lucide-react";

import { fieldError, type FormErrorInfo } from "@/lib/form-error";

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

/** The message under one field, when the current "check" error is about it (see fieldError).
 *  The field points at `id` with aria-describedby, so it's read with the field (see
 *  useFieldErrors). Inside the field's <label> it is aria-hidden, or it would also be part of
 *  the field's name and read twice; aria-describedby still reads hidden text. */
export function FieldError({
  id,
  message,
  inLabel = true,
}: {
  id: string;
  message: string | null;
  inLabel?: boolean;
}) {
  if (!message) return null;
  return (
    <small className="field-error" id={id} aria-hidden={inLabel || undefined}>
      <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
      {message}
    </small>
  );
}

/** A form's field-error wiring. The cursor goes to the field an error is about, so the fix is
 *  one keystroke away and the error is read as its description. When the field already has
 *  focus (Enter in it), focus can't move to say it, so `live` announces it instead. */
export function useFieldErrors(error: FormErrorInfo | null, formRef: RefObject<HTMLFormElement | null>) {
  const uid = useId();
  const liveRef = useRef<HTMLParagraphElement>(null);
  const errorId = (field: string) => `${uid}-${field}-error`;
  /** Props that mark a field invalid while its error shows, and point it at that error. */
  const invalid = (field: string) =>
    fieldError(error, field) ? { "aria-invalid": true as const, "aria-describedby": errorId(field) } : {};

  useEffect(() => {
    const live = liveRef.current;
    if (live) live.textContent = "";
    if (!error?.field) return;
    const el = formRef.current?.elements.namedItem(error.field);
    if (!(el instanceof HTMLElement)) return;
    if (el !== document.activeElement) return el.focus();
    // set directly, a beat after the clear: the same error twice is still a change to announce
    const t = setTimeout(() => {
      if (live) live.textContent = error.detail;
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formRef is a stable ref
  }, [error]);

  const live = <p ref={liveRef} className="sr-only" aria-live="polite" />;
  return { errorId, invalid, live };
}
