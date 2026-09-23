import { Play } from "lucide-react";

import { DemoForm } from "@/components/DemoForm";

/* Home page closing CTA: the demo form beside the interactive product tour.
   The last brain layer's "next" (scroll, swipe or rail) lands here. */
export function DemoCta() {
  return (
    <section className="section home-cta" id="demo">
      <div className="section-inner home-cta-grid">
        <div className="home-cta-copy">
          <span className="brain-kicker">Book a demo</span>
          <h2>See it. Govern it. Prove it.</h2>
          <p>Watch Blindsight find, fix and log the threats in your own AI stack.</p>
          <DemoForm variant="demo" />
        </div>
        {/* Swap the stage body for the Supademo <iframe> when the tour is ready:
            width/height 100%, no border. */}
        <div className="home-cta-tour">
          <div className="home-cta-stage">
            <span className="home-cta-play" aria-hidden="true">
              <Play />
            </span>
            <div className="home-cta-stage-title">Interactive product tour</div>
            <p>Can't wait? Click through Blindsight yourself.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
