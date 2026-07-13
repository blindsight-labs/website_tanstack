import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/imprint")({
  component: Imprint,
  head: () => ({
    meta: [
      { title: "Imprint · Blindsight" },
      {
        name: "description",
        content:
          "Legal information for Blindsight Technologies AG, registered in Zurich, Switzerland.",
      },
      { property: "og:title", content: "Imprint · Blindsight" },
      { property: "og:url", content: "/imprint" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/imprint" }],
  }),
});

function Imprint() {
  return (
    <main className="legal-page">
      <span className="tag">Legal</span>
      <h1>Imprint</h1>

      <h2>Company information</h2>
      <p>
        <strong>Company name:</strong> Blindsight Technologies AG
      </p>
      <p>
        <strong>Legal form:</strong> Aktiengesellschaft (AG), Corporation
      </p>
      <p>
        <strong>Seat:</strong> Zurich
      </p>
      <p>
        <strong>Registered address:</strong>
      </p>
      <address>
        Blindsight Technologies AG
        <br />
        Rennweg 57
        <br />
        CH-8001 Zurich
        <br />
        Switzerland
      </address>
      <p>
        <strong>Commercial register:</strong> Handelsregister des Kantons Zürich
      </p>
      <p>
        <strong>UID / CHE-Nr.:</strong> CHE-484.046.837
      </p>
      <p>
        <strong>CH-ID:</strong> CH-020-3057062-2
      </p>
      <p>
        <strong>FCRO-ID:</strong> 1746169
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:info@blindsight.io">info@blindsight.io</a>
      </p>
      <p>
        Website: <a href="https://www.blindsight.io">www.blindsight.io</a>
      </p>

      <h2>Responsible for content</h2>
      <p>
        Guilherme Santos, Chief Executive Officer (CEO)
        <br />
        Contact: <a href="mailto:info@blindsight.io">info@blindsight.io</a>
      </p>

      <h2>Data protection</h2>
      <p>
        The protection of your personal data is important to us. Our use of personal data is
        governed by our Privacy Policy, which complies with the Swiss Federal Act on Data Protection
        (nFADP / revDSG) and, where applicable, the EU General Data Protection Regulation (GDPR).
      </p>
      <p>
        This website uses Google Analytics to measure usage. Anonymous usage data may be transmitted
        to and stored on Google servers. You may opt out of analytics collection at any time.
      </p>
      <p>
        <strong>Cookie notice:</strong> This website uses analytics cookies (Google Analytics, ID:
        G-06PKBPMVBJ) to understand visitor behaviour. No personal data is sold or shared with third
        parties for marketing purposes. By continuing to use this site, you acknowledge this use.
        For full details, see our Privacy Policy.
      </p>

      <h2>Dispute resolution</h2>
      <p>
        The European Commission provides an online dispute resolution (ODR) platform for consumers:{" "}
        <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        . We are neither obligated nor willing to participate in dispute resolution proceedings
        before a consumer arbitration board.
      </p>
      <p>
        For disputes arising from our contractual relationships with business clients, Swiss law
        applies. The courts of Zurich, Switzerland shall have exclusive jurisdiction.
      </p>

      <h2>Disclaimer</h2>
      <p>
        <strong>Liability for content:</strong> The content of this website has been created with
        the utmost care. However, we cannot guarantee the accuracy, completeness, or timeliness of
        the content. As a service provider, we are responsible for our own content on these pages in
        accordance with applicable Swiss law. We are not obligated to monitor transmitted or stored
        third-party information or to investigate circumstances that may indicate illegal activity.
      </p>
      <p>
        <strong>Liability for links:</strong> Our website contains links to external third-party
        websites. We have no influence over the content of those sites and cannot accept any
        liability for them. The respective provider or operator of those pages is always responsible
        for their content. Linked pages were checked for possible legal violations at the time of
        linking. No illegal content was apparent at that time.
      </p>
      <p>
        <strong>Copyright:</strong> The content and works created by the site operators on this
        website are subject to Swiss copyright law. Reproduction, editing, distribution, or any form
        of commercial use of such material beyond the scope of copyright law requires the prior
        written consent of its respective author or creator.
      </p>

      <h2>Governing law</h2>
      <p>
        This website and its content are governed by Swiss law. The place of jurisdiction is Zurich,
        Switzerland. This Imprint was last updated in May 2026.
      </p>
    </main>
  );
}
