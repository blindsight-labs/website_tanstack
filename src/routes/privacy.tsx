import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyNotice,
  head: () => ({
    meta: [
      { title: "Privacy Notice · Blindsight" },
      { name: "description", content: "How Blindsight Technologies AG collects, uses, and protects your personal data." },
      { property: "og:title", content: "Privacy Notice · Blindsight" },
      { property: "og:url", content: "https://blindsight.io/privacy" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://blindsight.io/privacy" }],
  }),
});

function PrivacyNotice() {
  return (
    <main className="legal-page">
      <span className="tag">Legal</span>
      <h1>Privacy Notice</h1>
      <p>
        At Blindsight Technologies AG, your privacy is important to us. This notice explains what
        personal data we collect when you visit blindsight.io, how we use it, and your rights
        under applicable law. It applies under the Swiss Federal Act on Data Protection
        (nDSG / revFADP) and, where applicable, the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>1. Controller</h2>
      <p>
        Blindsight Technologies AG, Rennweg 57, 8001 Zürich, Switzerland.<br />
        Contact: <a href="mailto:info@blindsight.io">info@blindsight.io</a>.{" "}
        Full company details: <Link to="/imprint">Imprint</Link>.
      </p>

      <h2>2. Data we collect</h2>
      <p>
        <strong>Forms.</strong> When you submit a contact, demo request, or careers form, we
        collect the information you provide: typically your name, work email address, message,
        and (for applications) any CV or covering note. We use this only to respond to you,
        arrange a demo, or evaluate your application.
      </p>
      <p>
        <strong>Server logs.</strong> Our website host automatically records technical access data
        (IP address, browser, requested URL, referrer, timestamp) to operate the site and protect
        against abuse. We do not use this data to profile visitors.
      </p>
      <p>
        <strong>Cookies and tracking.</strong> We use only strictly necessary cookies required for
        basic site functionality. We do not use analytics, advertising, or any third-party
        tracking technologies.
      </p>

      <h2>3. Retention</h2>
      <p>
        Contact and demo enquiries: up to 24 months, or until you ask us to delete the data. Job
        applications: until the role is filled, or up to 6 months after an unsuccessful outcome.
        Server logs: only as long as needed for security and operations.
      </p>

      <h2>4. Infrastructure and processors</h2>
      <p>
        We use the following providers to operate this site, each acting as a data processor on
        our behalf:
      </p>
      <ul style={{ color: "var(--muted)", paddingLeft: "20px", marginBottom: "8px", lineHeight: "1.9" }}>
        <li>
          <strong>Bluehost</strong> (Newfold Digital Inc., USA): website hosting and server logs.
        </li>
        <li>
          <strong>Resend, Inc.</strong> (USA): transactional email delivery for form submissions.
        </li>
        <li>
          <strong>Microsoft Ireland Operations Limited</strong> (Ireland): the Microsoft 365
          mailbox where form submissions are delivered, with EU data residency.
        </li>
      </ul>
      <p>
        We do not sell, rent, or share your personal data with any third party for their own
        purposes.
      </p>

      <h2>5. International data transfers</h2>
      <p>
        Some of your personal data is transferred to the United States through our use of
        Bluehost and Resend. These transfers are covered by the European Commission's Standard
        Contractual Clauses (SCCs), as recognised under Swiss law, and where applicable by the
        EU–U.S. Data Privacy Framework and its Swiss extension. The remainder of your data is
        stored and processed within Switzerland and the European Economic Area.
      </p>

      <h2>6. Legal basis</h2>
      <p>
        We rely on legitimate interest (GDPR Art. 6(1)(f); equivalent under nDSG) for responding
        to enquiries and operating the site, and on pre-contractual steps (Art. 6(1)(b)) for
        processing job applications.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You can request access, correction, erasure, restriction, objection, portability (GDPR),
        or withdrawal of consent at any time by emailing{" "}
        <a href="mailto:info@blindsight.io">info@blindsight.io</a>. We respond within the legally
        required timeframes.
      </p>

      <h2>8. Complaints</h2>
      <p>
        <strong>Switzerland:</strong> Federal Data Protection and Information Commissioner
        (FDPIC),{" "}
        <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer">
          edoeb.admin.ch
        </a>.
      </p>
      <p>
        <strong>EU/EEA:</strong> the supervisory authority in your country of residence or
        workplace.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this notice to reflect changes in our practices or applicable law. The
        current version is always available at this URL.
      </p>
      <p><strong>Last updated:</strong> May 2026</p>
    </main>
  );
}
