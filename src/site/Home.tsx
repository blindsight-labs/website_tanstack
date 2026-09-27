/* Home — the landing page at "/": Hero, the proof strip, the new risks, See / Secure /
   Govern, the product walkthrough (with its dot field), deployment and the final CTA.
   The Nav, the Footer and the design-system wrapper (.mD, theme) come from the root. */
import { Deployment } from "./Deployment";
import { FinalCta } from "./FinalCta";
import { Hero } from "./Hero";
import { ProofStrip } from "./ProofStrip";
import { Risks } from "./Risks";
import { Sequence } from "./Sequence";
import { Walkthrough } from "./Walkthrough";
import { useSiteTheme } from "./theme";
import { loadOffice } from "./three/load";

// Start the Hero's 3D download (three.js + the office scene) now, while the page hydrates,
// not after: the Hero's effect picks up the same promise.
if (typeof window !== "undefined") loadOffice().catch(() => undefined);

export function Home() {
  const { theme } = useSiteTheme();
  return (
    <main>
      <Hero theme={theme} />
      <ProofStrip theme={theme} />
      <Risks theme={theme} />
      <Sequence theme={theme} />
      <Walkthrough theme={theme} />
      <Deployment theme={theme} />
      <FinalCta theme={theme} />
    </main>
  );
}
