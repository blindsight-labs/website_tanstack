import { useEffect } from "react";
import type { FC, HTMLAttributes } from "react";

type RailAttrs = HTMLAttributes<HTMLElement> & {
  accent?: string;
  risk?: string;
  speed?: string;
  loop?: string;
  theme?: string;
};

/* React ships no typing for custom elements. Casting the tag name to a
   component types it for the one place it is used; the alternative — augmenting
   JSX.IntrinsicElements — needs a `namespace`, which this repo's lint config
   bans (@typescript-eslint/no-namespace). React renders an unrecognised
   lowercase tag verbatim, so the cast changes nothing at runtime. */
const Rail = "blindsight-hero-rail" as unknown as FC<RailAttrs>;

/* Hero right-column visual — a thin wrapper around <blindsight-hero-rail>, the
 * self-contained canvas custom element in blindsight-hero-rail.js.
 *
 * The element module is imported client-side only: it calls
 * customElements.define() at module scope, which has no meaning during SSR. The
 * tag itself still renders on the server — the browser parses it as an inert
 * element and upgrades it in place once define() runs, so nothing needs to be
 * gated on a "loaded" flag.
 *
 * No colours are passed down. The element reads <html data-theme> itself each
 * frame and picks a palette mirroring the styles.css tokens, so the nav's
 * dark-mode toggle drives it with no wiring here. */
export function HeroRail() {
  useEffect(() => {
    import("./blindsight-hero-rail.js");
  }, []);

  return (
    <div
      className="hero-rail"
      role="img"
      aria-label="Animated diagram of an AI runtime: traffic flows along a rail through gateway, model and egress nodes while two scans surface and then isolate shadow AI, prompt injection, RAG poisoning and data-leak risks."
    >
      <Rail loop="20" />
    </div>
  );
}
