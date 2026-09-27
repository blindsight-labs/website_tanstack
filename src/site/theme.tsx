/* Site theme: light (default) or dark, applied as data-theme on <html> (the legacy pages'
   stylesheet keys off it) and on the .mD wrapper (the design system keys off it).

   No flash and no hydration mismatch: the server always renders "light". Before paint,
   THEME_INIT_SCRIPT (in <head>) resolves the theme (saved choice → OS preference → light) onto
   <html>, and THEME_WRAPPER_SCRIPT (first child of the .mD wrapper) copies it onto the wrapper.
   After hydration the provider reads it back into state, so React and the DOM agree. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Theme } from "./shared";

export const THEME_STORAGE_KEY = "bs-theme";

/** Runs in <head> before paint. Falls back to the pre-redesign key ("theme") once. */
export const THEME_INIT_SCRIPT = `(function(){var t='light';try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');if(s!=='dark'&&s!=='light'){s=localStorage.getItem('theme');}if(s==='dark'||s==='light'){t=s;}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){t='dark';}}catch(e){}document.documentElement.setAttribute('data-theme',t);})();`;

/** Runs as the first child of the .mD wrapper, before the rest of the page paints. */
export const THEME_WRAPPER_SCRIPT = `(function(){var s=document.currentScript,t=document.documentElement.getAttribute('data-theme');if(s&&s.parentNode&&(t==='dark'||t==='light')){s.parentNode.setAttribute('data-theme',t);}})();`;

/** Body background per theme, so overscroll and short pages match the page grey (and SSR does too). */
export const THEME_BODY_CSS = `html:has(.bs-site) body{background:#F3F4F6}html[data-theme="dark"]:has(.bs-site) body{background:#060607}`;

type SiteThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const SiteThemeContext = createContext<SiteThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function SiteThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Adopt what THEME_INIT_SCRIPT resolved before hydration.
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t === "dark" || t === "light") setThemeState(t);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page view */
    }
  }, []);

  const value = useMemo<SiteThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark") }),
    [theme, setTheme],
  );

  return <SiteThemeContext.Provider value={value}>{children}</SiteThemeContext.Provider>;
}

/** The current site theme and its setters. Outside the provider: light, no-op setters. */
export function useSiteTheme() {
  return useContext(SiteThemeContext);
}
