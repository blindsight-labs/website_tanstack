// Server-side Google reCAPTCHA v3 check for form submissions. Server-only.
//
// Env: RECAPTCHA_SECRET_KEY, and optionally RECAPTCHA_MIN_SCORE (default 0.5; 0 = bot,
// 1 = human). In production a missing secret fails closed (every submission is rejected) so
// the forms can never silently run unprotected; in dev it skips the check.

const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export async function verifyCaptcha(
  token: string | undefined,
  expectedAction?: string,
): Promise<void> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[captcha] RECAPTCHA_SECRET_KEY is not set");
      throw new Error("Could not verify your request. Please try again later.");
    }
    return;
  }
  if (!token) throw new Error("Please try again: the spam check did not complete.");

  let result: {
    success?: boolean;
    score?: number;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    result = await res.json();
  } catch (err) {
    console.error("[captcha] siteverify request failed", err);
    throw new Error("Could not verify your request. Please try again.");
  }

  const configured = Number(process.env.RECAPTCHA_MIN_SCORE);
  const minScore = Number.isFinite(configured) && configured > 0 && configured <= 1 ? configured : 0.5;
  // score/action are absent only with Google's v2 test keys; real v3 keys always return them
  const lowScore = typeof result.score === "number" && result.score < minScore;
  const wrongAction = expectedAction && result.action && result.action !== expectedAction;
  // the token must have been solved on our own site (not a key lifted onto another page)
  const wrongHost =
    process.env.NODE_ENV === "production" &&
    result.hostname !== undefined &&
    !/(^|\.)blindsight\.io$|\.netlify\.app$/.test(result.hostname);
  if (!result.success || lowScore || wrongAction || wrongHost) {
    console.warn("[captcha] rejected", {
      codes: result["error-codes"],
      score: result.score,
      action: result.action,
      hostname: result.hostname,
    });
    throw new Error("Your request looked automated. Please try again, or email us directly.");
  }
}
