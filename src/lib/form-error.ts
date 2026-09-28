// What a form shows when something goes wrong. Two kinds, shown differently (FormAlert):
//   "check"  — the visitor can fix it (a missing field, an invalid email, a file too large)
//   "failed" — it didn't go through; the visitor can retry, and gets a direct email
//              fallback plus a reference we can find in the logs.

export type FormErrorInfo = {
  kind: "check" | "failed";
  title: string;
  detail: string;
  /** Short support reference from the server log line (failed submissions only). */
  ref?: string;
};

/** A problem with what the visitor entered. */
export function checkError(detail: string): FormErrorInfo {
  return { kind: "check", title: "Please check the form", detail };
}

/** Server messages that are about the visitor's input, not a failure on our side. */
const INPUT_PROBLEM = /must accept|agree to be contacted|unsupported cv|too large|invalid email|required/i;

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
      if (first && typeof first.message === "string") return checkError(first.message);
    } catch {
      /* not JSON after all — fall through */
    }
    return checkError("Some details look incomplete. Please review the fields and try again.");
  }

  // Server functions throw human-readable messages; a "(Ref XXXXXX)" suffix is a log reference.
  const refMatch = raw.match(/\s*\(Ref ([A-Z0-9]{4,12})\)\s*$/);
  const detail = refMatch ? raw.slice(0, refMatch.index).trim() : raw;
  if (INPUT_PROBLEM.test(detail)) return checkError(detail);
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
