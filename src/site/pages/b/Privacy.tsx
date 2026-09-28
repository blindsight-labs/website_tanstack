/* Version B · /privacy. Covers the Swiss FADP (nDSG), the EU/UK GDPR and US state privacy laws
   (CCPA/CPRA and similar). Keep section 4 in sync with every provider the site loads or sends
   data to, and the "last updated" date with the text. */
import { Link } from "@tanstack/react-router";

import { CookieDeclaration } from "@/components/CookieDeclaration";
import { COOKIEBOT_CBID, openCookieSettings } from "@/lib/consent";
import { LegalPage, type LegalSection } from "./Legal";

const UPDATED = "28 September 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "controller",
    n: "1.",
    title: "Controller",
    body: (
      <p>
        Blindsight Technologies AG, Rennweg 57, 8001 Zürich, Switzerland, is responsible for the
        processing described here.
        <br />
        Privacy contact: <a href="mailto:info@blindsight.io">info@blindsight.io</a>. Full company
        details: <Link to="/imprint">Imprint</Link>.
      </p>
    ),
  },
  {
    id: "data",
    n: "2.",
    title: "Data we collect",
    body: (
      <>
        <p>
          <strong>Demo, trial and download requests.</strong> Name, work email, company, and
          anything else you enter (role, company size, use case, deployment preference, message),
          the time you submitted it, and the version of the{" "}
          <Link to="/evaluation-terms">Evaluation Terms</Link> you accepted.
        </p>
        <p>
          <strong>Job applications.</strong> Name, email, the role you apply for, your message, and
          your CV with whatever it contains. Please do not include sensitive data (such as health
          information or religious beliefs) that is not needed to assess your application.
        </p>
        <p>
          <strong>Spam protection.</strong> When a form is on screen, Google reCAPTCHA checks that
          submissions come from a person, using technical signals from your browser and device (such as IP
          address, browser characteristics and interaction with the page), and may set a cookie for this
          purpose. It loads only on pages with a form, and its data is used only to protect our forms.
        </p>
        <p>
          <strong>Server logs.</strong> Our hosting provider records technical access data (IP
          address, browser, requested URL, referrer, time) to deliver the site and protect it
          against abuse.
        </p>
        <p>
          <strong>Cookies and analytics.</strong> Only with your consent, we use Google Analytics to
          understand how the site is used (pages visited, time on page, approximate location, device
          type, and whether a form was sent). IP addresses are truncated, Google signals and
          advertising features are disabled, and we do not send form contents to Google. Your
          consent choice itself is stored by Cookiebot. See section 6.
        </p>
      </>
    ),
  },
  {
    id: "purposes",
    n: "3.",
    title: "Purposes and legal bases",
    body: (
      <>
        <p>
          We process personal data only for the purposes below. Where the GDPR applies, the legal
          basis is:
        </p>
        <ul className="pb-legal__list">
          <li>
            <strong>Answering requests and running evaluations:</strong> steps at your request
            before a contract and performance of the Evaluation Terms (Art. 6(1)(b) GDPR), and
            our legitimate interest in answering business enquiries (Art. 6(1)(f)).
          </li>
          <li>
            <strong>Handling job applications:</strong> steps before an employment contract (Art.
            6(1)(b), and Art. 88 GDPR with applicable employment law).
          </li>
          <li>
            <strong>Analytics:</strong> your consent (Art. 6(1)(a) GDPR, and Art. 5(3) of the
            ePrivacy Directive as implemented in your country). You can withdraw it at any time,
            with effect for the future.
          </li>
          <li>
            <strong>Security, spam protection and server logs:</strong> our legitimate interest in
            keeping the site and our forms secure (Art. 6(1)(f)).
          </li>
          <li>
            <strong>Recording consent choices:</strong> our legal obligation to demonstrate consent
            (Art. 6(1)(c) and Art. 7(1) GDPR).
          </li>
        </ul>
        <p>
          Under the Swiss FADP we process data in line with its principles and rely on the
          corresponding justifications. We do not use your data for automated decisions that have
          legal or similarly significant effects on you, and we do not sell it.
        </p>
      </>
    ),
  },
  {
    id: "processors",
    n: "4.",
    title: "Service providers",
    body: (
      <>
        <p>
          These providers process data on our behalf under data processing agreements, and only as
          we instruct:
        </p>
        <ul className="pb-legal__list">
          <li>
            <strong>Netlify, Inc.</strong> (USA): website hosting and server logs.
          </li>
          <li>
            <strong>Microsoft Ireland Operations Limited</strong> (Ireland): Microsoft 365 mailboxes
            and Microsoft Dataverse, where form submissions are stored, in data centres in
            Switzerland or the EU.
          </li>
          <li>
            <strong>Atlassian</strong> (Atlassian Pty Ltd, Australia, and Atlassian US, Inc., USA):
            Jira, where we track follow-up on requests and applications.
          </li>
          <li>
            <strong>Resend, Inc.</strong> (USA): delivery of notification emails about form
            submissions.
          </li>
          <li>
            <strong>Google Ireland Limited</strong> (Ireland), with Google LLC (USA): reCAPTCHA spam protection
            on our forms.
          </li>
          <li>
            <strong>Usercentrics A/S</strong> (Denmark): Cookiebot consent management.
          </li>
          <li>
            <strong>Google Ireland Limited</strong> (Ireland), with Google LLC (USA): Google
            Analytics, only with your consent.
          </li>
        </ul>
        <p>Beyond these providers, we share personal data only where the law requires it.</p>
      </>
    ),
  },
  {
    id: "transfers",
    n: "5.",
    title: "International transfers",
    body: (
      <p>
        Some providers above process data in the USA or Australia. Transfers to US companies
        certified under the EU–U.S. Data Privacy Framework, its UK extension and the Swiss–U.S. Data
        Privacy Framework rely on those frameworks. Otherwise, and in addition where appropriate,
        they rely on the European Commission's Standard Contractual Clauses, as adapted for
        Switzerland and the UK. You can ask us for a copy of the safeguards at the contact above.
      </p>
    ),
  },
  {
    id: "cookies",
    n: "6.",
    title: "Cookies and your choices",
    body: (
      <>
        <p>
          Strictly necessary cookies (such as the one storing your consent choice) are always on.
          Statistics cookies (Google Analytics) are set only after you accept them in our cookie
          banner. We use no marketing or advertising cookies. We honour the Global Privacy Control
          (GPC) browser signal as an opt-out of analytics.
        </p>
        <p>
          You can change or withdraw your consent at any time via{" "}
          {COOKIEBOT_CBID ? (
            <button type="button" className="pb-linkbtn" onClick={openCookieSettings}>
              Cookie settings
            </button>
          ) : (
            "Cookie settings"
          )}{" "}
          (also in the site footer). The full, current list of cookies follows.
        </p>
        <CookieDeclaration />
      </>
    ),
  },
  {
    id: "retention",
    n: "7.",
    title: "Retention",
    body: (
      <ul className="pb-legal__list">
        <li>
          Demo, trial and download requests: 24 months after our last contact, unless we enter into
          a contract.
        </li>
        <li>
          Job applications: until the role is filled, then deleted within 6 months of an
          unsuccessful outcome, unless you agree to a longer period.
        </li>
        <li>Notification emails: deleted on the same schedule as the underlying request.</li>
        <li>Analytics data: 14 months.</li>
        <li>Consent records: 12 months, after which we ask again.</li>
        <li>
          Server logs: kept only as long as needed for security and operations, typically no more
          than 30 days.
        </li>
      </ul>
    ),
  },
  {
    id: "rights",
    n: "8.",
    title: "Your rights",
    body: (
      <>
        <p>
          Depending on the law that applies to you, you have the right to access your personal data,
          to have it corrected or deleted, to restrict or object to its processing (including at any
          time to processing based on legitimate interests), to data portability, and to withdraw
          consent at any time without affecting the lawfulness of processing before the withdrawal.
        </p>
        <p>
          To exercise these rights, write to{" "}
          <a href="mailto:info@blindsight.io">info@blindsight.io</a>. We may need to verify your
          identity. We respond within one month (GDPR) or 30 days (FADP), and tell you if we need
          longer as the law allows.
        </p>
      </>
    ),
  },
  {
    id: "us",
    n: "9.",
    title: "Notice for US residents",
    body: (
      <>
        <p>
          This section applies to residents of US states with consumer privacy laws, such as the
          California Consumer Privacy Act as amended by the CPRA, to the extent those laws apply to
          us.
        </p>
        <p>
          <strong>What we collect, and why.</strong> In the last 12 months we collected: identifiers
          (name, email address, IP address); professional or employment-related information
          (company, role, and for applicants their CV); internet or other electronic network
          activity (pages visited and interactions, only with consent); and approximate geolocation
          derived from IP address. We collect it directly from you and from your browser, for the
          purposes in section 3, and keep it for the periods in section 7. We do not collect
          sensitive personal information for the purpose of inferring characteristics about you.
        </p>
        <p>
          <strong>No sale or sharing.</strong> We do not sell personal information, and we do not
          share it for cross-context behavioral advertising, and have not done so in the last 12
          months. We do not knowingly collect personal information from anyone under 16. We disclose
          personal information for business purposes only to the service providers in section 4.
        </p>
        <p>
          <strong>Your rights.</strong> You may request to know what personal information we
          collected, used and disclosed, and to access, correct or delete it. You may also opt out
          of analytics at any time through Cookie settings or a GPC signal. To make a request, email{" "}
          <a href="mailto:info@blindsight.io">info@blindsight.io</a>. We will verify your request by
          matching the information you give us with what we hold. You may use an authorized agent,
          who must provide proof of your authorization. We will not discriminate against you for
          exercising your rights. If we deny your request, you may appeal by replying to our
          decision.
        </p>
      </>
    ),
  },
  {
    id: "security",
    n: "10.",
    title: "Security",
    body: (
      <p>
        We protect personal data with appropriate technical and organisational measures, including
        encryption in transit, access control on a need-to-know basis, and processors bound by
        confidentiality and security obligations.
      </p>
    ),
  },
  {
    id: "complaints",
    n: "11.",
    title: "Complaints",
    body: (
      <>
        <p>
          <strong>Switzerland:</strong> Federal Data Protection and Information Commissioner
          (FDPIC),{" "}
          <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer">
            edoeb.admin.ch
          </a>
          .
        </p>
        <p>
          <strong>EU/EEA and UK:</strong> the supervisory authority in your country of residence or
          work, or where an alleged infringement took place.
        </p>
        <p>
          <strong>California:</strong> the California Privacy Protection Agency,{" "}
          <a href="https://cppa.ca.gov" target="_blank" rel="noopener noreferrer">
            cppa.ca.gov
          </a>
          .
        </p>
        <p>We would appreciate the chance to address your concern first.</p>
      </>
    ),
  },
  {
    id: "changes",
    n: "12.",
    title: "Changes",
    body: (
      <>
        <p>
          We update this notice when our practices or the law change. The current version is always
          at this address. Where a change requires your consent, we will ask for it.
        </p>
        <p>
          <strong>Last updated:</strong> {UPDATED}
        </p>
      </>
    ),
  },
];

export function PrivacyB() {
  return (
    <LegalPage
      title="Privacy Notice"
      printed="Privacy|Notice"
      lead={`Blindsight Technologies AG · Rennweg 57, 8001 Zürich · last updated ${UPDATED}`}
      intro={
        <p>
          This notice explains what personal data we collect when you visit blindsight.io or contact
          us through it, how we use it, and your rights. It applies under the Swiss Federal Act on
          Data Protection (FADP / nDSG), the EU and UK General Data Protection Regulation (GDPR)
          where they apply, and US state privacy laws where they apply.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
