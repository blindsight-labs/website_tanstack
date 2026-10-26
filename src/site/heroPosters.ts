/* The hero posters (src/assets/hero, see its README). Its own module so routes/index.tsx can
   preload them from head() without pulling the Hero component into the entry chunk. */
const POSTER_FILES = import.meta.glob("/src/assets/hero/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const POSTER_KEYS = ["light-wide", "light-narrow", "dark-wide", "dark-narrow"] as const;

/** The poster URLs by key, or null when any of the four is missing. */
export const HERO_POSTERS = POSTER_KEYS.every((k) => POSTER_FILES[`/src/assets/hero/poster-${k}.webp`])
  ? (Object.fromEntries(POSTER_KEYS.map((k) => [k, POSTER_FILES[`/src/assets/hero/poster-${k}.webp`]])) as Record<
      (typeof POSTER_KEYS)[number],
      string
    >)
  : null;
