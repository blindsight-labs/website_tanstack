/* Google reCAPTCHA v3 for the site's forms: invisible, scores each submission; the server
   re-checks every token (src/lib/captcha.server.ts).

   The script loads only once a form is on screen (never site-wide), so visitors who never
   open a form send nothing to Google. The floating badge is hidden (b-forms.css), which
   Google allows when the form shows <RecaptchaNotice /> instead.

   Env (build time): VITE_RECAPTCHA_SITE_KEY. Unset (local dev): no script, execute()
   resolves undefined and the server skips the check outside production. */
import { useCallback, useEffect } from "react";

export const RECAPTCHA_SITE_KEY: string | undefined =
  import.meta.env.VITE_RECAPTCHA_SITE_KEY || undefined;

type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

let loading: Promise<Grecaptcha> | undefined;

function loadRecaptcha(key: string): Promise<Grecaptcha> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(key)}`;
    s.async = true;
    s.onload = () => {
      const g = window.grecaptcha;
      if (g) g.ready(() => resolve(g));
      else reject(new Error("reCAPTCHA failed to load"));
    };
    s.onerror = () => {
      loading = undefined; // allow a retry on the next attempt
      reject(new Error("reCAPTCHA failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Loads reCAPTCHA while the calling form is mounted; execute() returns a fresh, single-use
 *  token for `action` (the server checks it matches), or undefined when not configured. */
export function useRecaptcha(action: string) {
  useEffect(() => {
    if (RECAPTCHA_SITE_KEY) loadRecaptcha(RECAPTCHA_SITE_KEY).catch(() => undefined);
  }, []);

  return useCallback(async (): Promise<string | undefined> => {
    if (!RECAPTCHA_SITE_KEY) return undefined;
    try {
      const g = await loadRecaptcha(RECAPTCHA_SITE_KEY);
      return await g.execute(RECAPTCHA_SITE_KEY, { action });
    } catch {
      throw new Error("We couldn't load the spam check. Check your connection or ad blocker and try again.");
    }
  }, [action]);
}

/** Google's required attribution when the badge is hidden. */
export function RecaptchaNotice({ className }: { className?: string }) {
  if (!RECAPTCHA_SITE_KEY) return null;
  return (
    <p className={className}>
      Protected by reCAPTCHA. Google's{" "}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
        Privacy Policy
      </a>{" "}
      and{" "}
      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
        Terms of Service
      </a>{" "}
      apply.
    </p>
  );
}
