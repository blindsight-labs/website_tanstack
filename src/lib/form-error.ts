// What a form shows when something goes wrong. Two kinds, shown differently:
//   "check"  — the visitor can fix it (a missing field, an invalid email, a file too large).
//              With a `field`, it sits under that field (FieldError); without one, in FormAlert.
//   "failed" — it didn't go through; the visitor can retry, and gets a direct email
//              fallback plus a reference we can find in the logs.

export type FormErrorInfo = {
  kind: "check" | "failed";
  title: string;
  detail: string;
  /** The form field (input `name`) the problem is about, when there is one. */
  field?: string;
  /** Short support reference from the server log line (failed submissions only). */
  ref?: string;
};

/** A problem with what the visitor entered, optionally tied to one field. */
export function checkError(detail: string, field?: string): FormErrorInfo {
  return { kind: "check", title: "One thing to fix", detail, field };
}

/** The error to show under `field`, if the current error is about it. */
export function fieldError(error: FormErrorInfo | null, field: string): string | null {
  return error?.kind === "check" && error.field === field ? error.detail : null;
}

/** Plain-language messages for each field, shared by the client checks and server replies. */
export const FIELD_MESSAGES = {
  name: "Enter your name so we know who to reply to.",
  emailMissing: "Enter your email address so we can reply.",
  emailInvalid: "That email address doesn't look complete. It should look like name@company.com.",
  company: "Enter your company name.",
  position: "Choose your position from the list.",
  terms: "Tick the box to accept the Evaluation Terms, then send again.",
  contact: "Tick the box so we can contact you about your application.",
} as const;

/** Checks an email field: a message when it's empty or malformed, otherwise null. */
export function emailProblem(value: string): string | null {
  if (!value) return FIELD_MESSAGES.emailMissing;
  return isValidEmail(value) ? null : FIELD_MESSAGES.emailInvalid;
}

// Server field names → the form's input names, and what to say about each.
const SERVER_FIELDS: Record<string, { field: string; message: string }> = {
  name: { field: "name", message: FIELD_MESSAGES.name },
  email: { field: "email", message: FIELD_MESSAGES.emailInvalid },
  workEmail: { field: "email", message: FIELD_MESSAGES.emailInvalid },
  company: { field: "company", message: FIELD_MESSAGES.company },
};

/** Thrown server messages that are about one field. */
const SERVER_MESSAGES: { match: RegExp; field: string; message?: string }[] = [
  { match: /must accept/i, field: "consent", message: FIELD_MESSAGES.terms },
  { match: /agree to be contacted/i, field: "consent", message: FIELD_MESSAGES.contact },
  { match: /\bcv\b|file/i, field: "cv" },
];

/** Server messages that are about the visitor's input, not a failure on our side. */
const INPUT_PROBLEM = /must accept|agree to be contacted|cv file|file type|too large|invalid email|required/i;

// Turns an unknown error thrown by a form's server function into something safe and useful
// to show. Server-side `zod` failures arrive as a serialized issue array; without this, that
// raw JSON would be rendered verbatim.
export function friendlyFormError(err: unknown): FormErrorInfo {
  const unknownFailure: FormErrorInfo = {
    kind: "failed",
    title: "Your request wasn't sent",
    detail: "Something unexpected went wrong. Please try again.",
  };
  if (!(err instanceof Error) || !err.message) return unknownFailure;
  const raw = err.message.trim();

  // The request never reached the server (offline, dropped connection, blocked request).
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed|network request failed/i.test(raw)) {
    return {
      kind: "failed",
      title: "We couldn't reach our server",
      detail: "Check your internet connection, then send it again. Nothing was sent.",
    };
  }
  // The platform rejected the request before our code ran (body too large, timeout, outage).
  if (/^(413|502|503|504)\b|payload too large|gateway|timed? ?out/i.test(raw)) {
    return {
      kind: "failed",
      title: "Your request didn't go through",
      detail: "Our server didn't respond in time. Please wait a moment and send it again.",
    };
  }

  // Serialized zod error → the first issue is about the input.
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      const issues = Array.isArray(parsed) ? parsed : parsed?.issues;
      const first = Array.isArray(issues) ? issues[0] : null;
      const known = first && SERVER_FIELDS[String(first.path?.[0])];
      if (known) return checkError(known.message, known.field);
    } catch {
      /* not JSON after all — fall through */
    }
    return checkError("Some details are missing or incomplete. Check the fields marked * and send again.");
  }

  // Server functions throw human-readable messages; a "(Ref XXXXXX)" suffix is a log reference.
  const refMatch = raw.match(/\s*\(Ref ([A-Z0-9]{4,12})\)\s*$/);
  const detail = refMatch ? raw.slice(0, refMatch.index).trim() : raw;
  if (INPUT_PROBLEM.test(detail)) {
    const known = SERVER_MESSAGES.find((m) => m.match.test(detail));
    return checkError(known?.message ?? detail, known?.field);
  }
  if (/spam check|looked automated|verify your request/i.test(detail)) {
    return { kind: "failed", title: "Our spam check stopped this request", detail, ref: refMatch?.[1] };
  }
  return { kind: "failed", title: "Your request wasn't sent", detail, ref: refMatch?.[1] };
}

// Lightweight email check for instant client-side feedback before the server
// roundtrip. Matches the intent of the server's `zod` `.email()` rule.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
