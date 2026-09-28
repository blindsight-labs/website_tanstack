/* Version B · /imprint. The legal text is the legacy page's, verbatim; only the frame is new. */
import { Link } from "@tanstack/react-router";

import { LegalPage, type LegalSection } from "./Legal";

const row = (k: string, v: string) => (
  <div className="pb-dl__row">
    <dt>{k}</dt>
    <dd>{v}</dd>
  </div>
);

const SECTIONS: LegalSection[] = [
  {
    id: "company",
    n: "1.",
    title: "Company information",
    body: (
      <dl className="pb-dl">
        {row("Company name:", "Blindsight Technologies AG")}
        {row("Legal form:", "Aktiengesellschaft (AG), Corporation")}
        {row("Seat:", "Zurich")}
        <div className="pb-dl__row">
          <dt>Registered address:</dt>
          <dd>
            <address>
              Blindsight Technologies AG
              <br />
              Rennweg 57
              <br />
              CH-8001 Zurich
              <br />
              Switzerland
            </address>
          </dd>
        </div>
        {row("Commercial register:", "Handelsregister des Kantons Zürich")}
        {row("UID / CHE-Nr.:", "CHE-484.046.837")}
        {row("CH-ID:", "CH-020-3057062-2")}
        {row("FCRO-ID:", "1746169")}
      </dl>
    ),
  },
  {
    id: "contact",
    n: "2.",
    title: "Contact",
    body: (
      <>
        <p>
          Email: <a href="mailto:info@blindsight.io">info@blindsight.io</a>
        </p>
        <p>
          Website: <a href="https://www.blindsight.io">www.blindsight.io</a>
        </p>
      </>
    ),
  },
  {
    id: "responsible",
    n: "3.",
    title: "Responsible for content",
    body: (
      <p>
        Guilherme Santos, Chief Executive Officer (CEO)
        <br />
        Contact: <a href="mailto:info@blindsight.io">info@blindsight.io</a>
      </p>
    ),
  },
  {
    id: "data-protection",
    n: "4.",
    title: "Data protection",
    body: (
      <>
        <p>
          How we process personal data, which cookies we use and your rights are described in our{" "}
          <Link to="/privacy">Privacy Notice</Link>. It covers the Swiss Federal Act on Data Protection (FADP / nDSG), the EU
          and UK GDPR where they apply, and US state privacy laws where they apply.
        </p>
        <p>
          Analytics cookies (Google Analytics) are set only with your consent, which you can give, refuse or withdraw at any
          time in the cookie settings linked in the site footer.
        </p>
      </>
    ),
  },
  {
    id: "disputes",
    n: "5.",
    title: "Dispute resolution",
    body: (
      <>
        <p>
          We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration
          board.
        </p>
        <p>
          For disputes arising from our contractual relationships with business clients, Swiss law applies. The courts of
          Zurich, Switzerland shall have exclusive jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    n: "6.",
    title: "Disclaimer",
    body: (
      <>
        <p>
          <strong>Liability for content:</strong> The content of this website has been created with the utmost care. However, we
          cannot guarantee the accuracy, completeness, or timeliness of the content. As a service provider, we are responsible
          for our own content on these pages in accordance with applicable Swiss law. We are not obligated to monitor
          transmitted or stored third-party information or to investigate circumstances that may indicate illegal activity.
        </p>
        <p>
          <strong>Liability for links:</strong> Our website contains links to external third-party websites. We have no
          influence over the content of those sites and cannot accept any liability for them. The respective provider or
          operator of those pages is always responsible for their content. Linked pages were checked for possible legal
          violations at the time of linking. No illegal content was apparent at that time.
        </p>
        <p>
          <strong>Copyright:</strong> The content and works created by the site operators on this website are subject to Swiss
          copyright law. Reproduction, editing, distribution, or any form of commercial use of such material beyond the scope of
          copyright law requires the prior written consent of its respective author or creator.
        </p>
      </>
    ),
  },
  {
    id: "law",
    n: "7.",
    title: "Governing law",
    body: (
      <p>
        This website and its content are governed by Swiss law. The place of jurisdiction is Zurich, Switzerland. This Imprint
        was last updated in September 2026.
      </p>
    ),
  },
];

export function ImprintB() {
  return (
    <LegalPage
      title="Imprint"
      printed="Imprint"
      lead="Blindsight Technologies AG · Rennweg 57, 8001 Zürich · last updated September 2026"
      sections={SECTIONS}
    />
  );
}
