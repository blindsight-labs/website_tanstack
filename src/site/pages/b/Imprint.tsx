/* Version B · /imprint. The legal text is the legacy page's, verbatim; only the frame is new. */
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
          The protection of your personal data is important to us. Our use of personal data is governed by our Privacy Policy,
          which complies with the Swiss Federal Act on Data Protection (nFADP / revDSG) and, where applicable, the EU General
          Data Protection Regulation (GDPR).
        </p>
        <p>
          This website uses Google Analytics to measure usage. Anonymous usage data may be transmitted to and stored on Google
          servers. You may opt out of analytics collection at any time.
        </p>
        <p>
          <strong>Cookie notice:</strong> This website uses analytics cookies (Google Analytics, ID: G-06PKBPMVBJ) to understand
          visitor behaviour. No personal data is sold or shared with third parties for marketing purposes. By continuing to use
          this site, you acknowledge this use. For full details, see our Privacy Policy.
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
          The European Commission provides an online dispute resolution (ODR) platform for consumers:{" "}
          <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
            ec.europa.eu/consumers/odr
          </a>
          . We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration
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
        was last updated in May 2026.
      </p>
    ),
  },
];

export function ImprintB() {
  return (
    <LegalPage
      title="Imprint"
      printed="Imprint"
      lead="Blindsight Technologies AG · Rennweg 57, 8001 Zürich · last updated May 2026"
      sections={SECTIONS}
    />
  );
}
