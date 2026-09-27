/* The page version the site renders: "b" ("Objects": a glass/chrome object in each page
   header over editorial page bodies), chosen after the redesign review of versions a/b/c.

   Version stylesheets are scoped to `.mD[data-site-variant="b"]`, so the site wrapper and
   the demo modal's backdrop carry the attribute. */
export type SiteVariant = "b";

export const SITE_VARIANT: SiteVariant = "b";

/** The active page version (fixed). */
export function useSiteVariant(): { variant: SiteVariant; active: true } {
  return { variant: SITE_VARIANT, active: true };
}
