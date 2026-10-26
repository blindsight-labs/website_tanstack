/** Bump when any scene changes, so cached stills are not reused (runtime renders and the
 *  pre-rendered files in src/assets/stills, whose names carry it). Three-free: Still.tsx and
 *  scripts/export-stills.mjs import it. */
export const VERSION = "b12";
