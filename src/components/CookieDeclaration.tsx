/* Cookiebot's live cookie declaration (every cookie, its purpose, provider and expiry, from
   Cookiebot's monthly scan) plus the visitor's current consent state. cd.js renders into its
   own script tag's parent, so the tag is created on mount. */
import { useEffect, useRef } from "react";

import { COOKIEBOT_CBID } from "@/lib/consent";

export function CookieDeclaration() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!COOKIEBOT_CBID || !el) return;
    const s = document.createElement("script");
    s.id = "CookieDeclaration";
    s.src = `https://consent.cookiebot.com/${COOKIEBOT_CBID}/cd.js`;
    s.type = "text/javascript";
    s.async = true;
    el.appendChild(s);
    return () => {
      el.replaceChildren();
    };
  }, []);

  if (!COOKIEBOT_CBID) return null;
  return <div ref={host} className="pb-cookie-declaration" />;
}
