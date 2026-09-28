// Cookie consent (Cookiebot) and the tags it gates.
//
// Cookiebot runs in manual blocking mode: nothing is auto-blocked. Its script (uc.js) is
// loaded only after React has hydrated (loadCookiebot, called from __root.tsx): loaded from
// <head> it injected the banner before hydration, React found DOM it had not rendered, threw
// away the server HTML and redrew the page, and the banner was sometimes wiped with it.
// Every non-essential tag is rendered inert (type="text/plain") with a
// data-cookieconsent category; Cookiebot activates it only once that category is accepted.
// Google Analytics therefore never loads before an opt-in in the EU/CH. Region rules (GDPR
// opt-in for EU/EEA/CH, CCPA opt-out for the US) are set per domain group in the Cookiebot
// admin, not here.
//
// Env (build time — set in Netlify):
//   VITE_COOKIEBOT_CBID — the Cookiebot domain group ID. Unset (local dev): no banner and no
//                         analytics at all, since analytics may only load behind consent.

export const COOKIEBOT_CBID: string | undefined = import.meta.env.VITE_COOKIEBOT_CBID || undefined;

const GA_ID = "G-06PKBPMVBJ";

type HeadScript = Record<string, string | boolean | undefined> & { children?: string };

/** Head scripts in required order: consent-mode defaults, then the gated tags (Cookiebot
 *  itself comes later, see loadCookiebot). */
export function consentHeadScripts(): HeadScript[] {
  if (!COOKIEBOT_CBID) return [];
  return [
    {
      // Google Consent Mode v2: everything denied until Cookiebot reports a choice.
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'denied',personalization_storage:'denied',security_storage:'granted',wait_for_update:500});gtag('set','ads_data_redaction',true);`,
    },
    // Google Analytics — statistics consent only.
    {
      type: "text/plain",
      "data-cookieconsent": "statistics",
      src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`,
      async: true,
    },
    {
      type: "text/plain",
      "data-cookieconsent": "statistics",
      // Global Privacy Control (US opt-out signal, e.g. CCPA/CPRA): honoured on top of consent.
      children: `if(!navigator.globalPrivacyControl){gtag('js',new Date());gtag('config','${GA_ID}',{anonymize_ip:true,allow_google_signals:false,allow_ad_personalization_signals:false});}`,
    },
  ];
}

/** Adds Cookiebot's script once the page has hydrated. Idempotent. */
export function loadCookiebot(): void {
  if (!COOKIEBOT_CBID || typeof document === "undefined") return;
  if (document.getElementById("Cookiebot")) return;
  const s = document.createElement("script");
  s.id = "Cookiebot";
  s.src = "https://consent.cookiebot.com/uc.js";
  s.async = true;
  s.dataset.cbid = COOKIEBOT_CBID;
  s.dataset.blockingmode = "manual";
  document.head.appendChild(s);
}

type CookiebotApi = { renew: () => void; consent?: { statistics?: boolean } };
type ConsentWindow = Window & {
  Cookiebot?: CookiebotApi;
  gtag?: (...args: unknown[]) => void;
  navigator: Navigator & { globalPrivacyControl?: boolean };
};

/** Reopens the consent banner so a visitor can change or withdraw consent. */
export function openCookieSettings(): void {
  (window as ConsentWindow).Cookiebot?.renew();
}

/** Sends a GA4 event, only with statistics consent and no Global Privacy Control signal.
 *  (The guard matters: calls queued before consent would otherwise be flushed to Google
 *  once gtag.js loads.) */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as ConsentWindow;
  if (!w.Cookiebot?.consent?.statistics || w.navigator.globalPrivacyControl || !w.gtag) return;
  w.gtag("event", name, params);
}

/** A client-side navigation: GA4 only counts the first page load by itself. */
export function trackPageView(path: string): void {
  trackEvent("page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
