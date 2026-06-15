import icebergImg from "@/assets/iceberg.webp";

/** "Only see the tip" iceberg section. Eyebrow/id are parametrized so different
 *  landing-page versions can re-frame it (e.g. "The Problem" vs "Why Blindsight?"). */
export function Iceberg({ id = "why", eyebrow = "The Problem" }: { id?: string; eyebrow?: string }) {
  return (
    <section className="section" id={id}>
      <div className="section-inner">
        <div className="s-head reveal">
          <span className="tag">{eyebrow}</span>
          <h2>Existing tools only see the tip.</h2>
          <p>
            Most AI security platforms catch the surface threats, the prompts that look obviously
            wrong. Hackers adapt and evolve. The most dangerous attacks are the ones others least
            expect, and the ones that look legitimate all the way through.
          </p>
        </div>

        <div className="iceberg-grid">
          <div className="reveal">
            <div className="threat-list">
              <div className="threat-row">
                <div className="name">Obvious prompt injections</div>
                <div className="meta">Visible · Caught today</div>
              </div>
              <div className="threat-row">
                <div className="name">Known jailbreak strings</div>
                <div className="meta">Visible · Caught today</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Poisoned training samples</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Adversarial RAG ingestion</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Demographic shortcut learning</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Back-doors</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Adversarial patching</div>
                <div className="meta">Hidden</div>
              </div>
              <div className="threat-row hidden-row">
                <div className="name">Misuse by privileged insiders</div>
                <div className="meta">Hidden</div>
              </div>
            </div>
            <p className="iceberg-footnote">
              If even <span className="iceberg-footnote-accent">1</span> of these threats reach production, the model is compromised, and you
              won't know until the damage has been done.
            </p>
          </div>

          <div className="reveal">
            <div
              className="iceberg-img"
              role="img"
              aria-label="Iceberg illustration: visible threats above water, hidden mass below"
              style={{ backgroundImage: `url(${icebergImg})` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
