// Turns an unknown error thrown by a form's server function into a message
// that's safe to show a user. Server-side `zod` validation failures arrive as
// a serialized issue array (e.g. `[{"message":"Invalid email",...}]`); without
// this, that raw JSON would be rendered verbatim in the form's error box.
export function friendlyFormError(err: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!(err instanceof Error) || !err.message) return fallback;

  const msg = err.message.trim();

  // Looks like a serialized zod error → surface the first issue's message.
  if (msg.startsWith("[") || msg.startsWith("{")) {
    try {
      const parsed = JSON.parse(msg);
      const issues = Array.isArray(parsed) ? parsed : parsed?.issues;
      const first = Array.isArray(issues) ? issues[0] : null;
      if (first && typeof first.message === "string") return first.message;
    } catch {
      /* not JSON after all — fall through */
    }
    return "Please check your details and try again.";
  }

  // Server functions already throw human-readable messages (e.g. the Resend
  // failure path) — pass those through unchanged.
  return msg;
}

// Lightweight email check for instant client-side feedback before the server
// roundtrip. Matches the intent of the server's `zod` `.email()` rule.
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
