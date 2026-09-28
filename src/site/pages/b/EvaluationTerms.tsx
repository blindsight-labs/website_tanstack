/* Version B · /evaluation-terms. The terms a visitor accepts when requesting a demo, a trial or the
   app download through the site's demo form. Bump EVALUATION_TERMS_VERSION when this text changes. */
import { Link } from "@tanstack/react-router";

import { EVALUATION_TERMS_UPDATED } from "@/lib/evaluation-terms";
import { LegalPage, type LegalSection } from "./Legal";

const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    title: "Scope and acceptance",
    body: (
      <>
        <p>
          These Evaluation Terms ("Terms") apply when you request a product demonstration, a
          free trial or a download of the Blindsight software through blindsight.io (a "Request"),
          and to any demonstration, trial access or software Blindsight Technologies AG
          ("Blindsight", "we") provides in response (the "Evaluation").
        </p>
        <p>
          You accept these Terms by ticking the box on the request form and submitting it. If you
          submit a Request on behalf of a company or other organisation, you confirm that you are
          authorised to accept these Terms for it, and "you" means that organisation.
        </p>
        <p>
          The Evaluation is offered to businesses only, for business purposes. It is not offered to
          consumers.
        </p>
      </>
    ),
  },
  {
    id: "no-obligation",
    title: "No obligation",
    body: (
      <p>
        A Request does not create an obligation for you to buy anything, or for us to provide a
        demonstration, trial or software. We may accept, decline or limit any Request at our
        discretion, for example to verify that it comes from a business. Any paid use of Blindsight
        is governed only by a separate written agreement.
      </p>
    ),
  },
  {
    id: "licence",
    title: "Evaluation licence",
    body: (
      <>
        <p>
          If we give you trial access or software, we grant you a limited, non-exclusive,
          non-transferable, non-sublicensable and revocable right to use it during the evaluation
          period, solely to evaluate whether to buy Blindsight for your internal business. The
          evaluation period is 30 days from when access is first provided, unless we agree a
          different period in writing (email is sufficient).
        </p>
        <p>You must not, and must not allow anyone else to:</p>
        <ul className="pb-legal__list">
          <li>
            use the Evaluation in production, or to protect live systems you rely on, unless we
            agree otherwise in writing;
          </li>
          <li>
            copy, modify, decompile, disassemble or reverse engineer the software, except to the
            extent mandatory law expressly permits this despite this restriction;
          </li>
          <li>
            sell, rent, share or give third parties access to the Evaluation, other than your own
            staff and contractors who evaluate it for you;
          </li>
          <li>
            use the Evaluation to build or improve a competing product, or publish benchmark or test
            results without our prior written consent;
          </li>
          <li>
            probe, scan or test the security of our systems. Report suspected vulnerabilities to{" "}
            <a href="mailto:security@blindsight.io">security@blindsight.io</a> instead;
          </li>
          <li>
            use the Evaluation in breach of applicable law, including export control and sanctions
            laws of Switzerland, the European Union and the United States, or from a sanctioned
            country or on behalf of a sanctioned person.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-data",
    title: "Your data during the Evaluation",
    body: (
      <>
        <p>
          You keep all rights in the data you or your systems send to the Evaluation ("Evaluation
          Data"). We use Evaluation Data only to provide and support the Evaluation.
        </p>
        <p>
          Please use test or non-sensitive data. Do not submit personal data, and in particular no
          special categories of personal data (such as health data), unless we have first signed a
          data processing agreement with you under Art. 28 GDPR and Art. 9 of the Swiss Federal Act
          on Data Protection (FADP). We provide one on request.
        </p>
        <p>
          When the Evaluation ends, we delete Evaluation Data within 30 days, unless you move to a
          paid subscription and ask us to keep it, or the law requires us to retain it.
        </p>
      </>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <p>
        Each party keeps confidential the non-public information the other shares in connection with
        the Evaluation (including demonstration content, product roadmaps, pricing and Evaluation
        Data). Each uses it only for the Evaluation, and shares it only with people who need it for
        that purpose and are bound by equivalent confidentiality obligations. This does not apply to
        information that is or becomes public through no fault of the receiving party, that the
        receiving party already lawfully had or independently developed, or that it must disclose by
        law or court order. These obligations last three years after the Evaluation ends. Please do
        not record a demonstration without the consent of all participants.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property and feedback",
    body: (
      <p>
        Blindsight and its licensors keep all rights in the software, the service, the
        demonstrations and related materials. Only the rights expressly granted in these Terms are
        granted to you. If you give us suggestions or feedback, we may use them freely without
        obligation to you, but we will not identify you as their source without your consent.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "No warranty",
    body: (
      <p>
        <strong>
          The Evaluation is provided free of charge, "as is" and "as available". To the fullest
          extent permitted by law, we give no warranties or representations of any kind, express or
          implied, including any implied warranties of merchantability, fitness for a particular
          purpose, non-infringement, or that the Evaluation will be uninterrupted, error-free or
          will detect or prevent every threat.
        </strong>
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          <strong>
            To the fullest extent permitted by law, Blindsight is not liable for any damage arising
            from the Evaluation or these Terms, including lost profits, lost data, business
            interruption, or indirect or consequential damage.
          </strong>
        </p>
        <p>
          Nothing in these Terms excludes or limits liability for intent or gross negligence (Art.
          100 of the Swiss Code of Obligations), for death or personal injury, or any other
          liability that cannot be excluded or limited under applicable mandatory law.
        </p>
      </>
    ),
  },
  {
    id: "term",
    title: "Term and termination",
    body: (
      <p>
        Either party may end the Evaluation at any time, with immediate effect, by written notice
        (email is sufficient). When the Evaluation ends, your rights to use it end, and you must
        stop using and delete any software we provided. Sections on your data, confidentiality,
        intellectual property, warranty, liability and governing law survive.
      </p>
    ),
  },
  {
    id: "contact-data",
    title: "Contacting you and your personal data",
    body: (
      <>
        <p>
          We use the details you submit to respond to your Request, arrange and deliver the
          Evaluation, and follow up on it. We will not send you newsletters or unrelated marketing
          unless you separately agree to it. You can ask us to stop contacting you at any time by
          writing to <a href="mailto:info@blindsight.io">info@blindsight.io</a>.
        </p>
        <p>
          How we process your personal data, and your rights, are described in our{" "}
          <Link to="/privacy">Privacy Notice</Link>. Accepting these Terms is not consent to data
          processing: we process your request data because it is needed to answer it and on the
          basis of our legitimate interests, as explained there.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          <strong>Precedence.</strong> If you and Blindsight sign a written agreement covering the
          Evaluation (such as a pilot, proof-of-concept or subscription agreement), it prevails over
          these Terms.
        </p>
        <p>
          <strong>Changes.</strong> The version of these Terms in force when you submit your Request
          applies to that Request. We may update these Terms for future Requests; the current
          version is always available at this address.
        </p>
        <p>
          <strong>Assignment.</strong> You may not transfer your rights under these Terms without
          our consent. We may transfer them to an affiliate or to a successor of our business.
        </p>
        <p>
          <strong>Severability.</strong> If any provision is found invalid or unenforceable, the
          rest remain in effect, and the provision is replaced by a valid one that comes closest to
          its purpose.
        </p>
      </>
    ),
  },
  {
    id: "law",
    title: "Governing law and jurisdiction",
    body: (
      <p>
        These Terms are governed by Swiss substantive law, excluding its conflict-of-laws rules and
        the United Nations Convention on Contracts for the International Sale of Goods (CISG). The
        courts of the City of Zurich, Switzerland, have exclusive jurisdiction, subject to any
        mandatory jurisdiction under applicable law.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        <p>
          Blindsight Technologies AG, Rennweg 57, 8001 Zürich, Switzerland ·{" "}
          <a href="mailto:info@blindsight.io">info@blindsight.io</a>. Full company details:{" "}
          <Link to="/imprint">Imprint</Link>.
        </p>
        <p>
          <strong>Last updated:</strong> {EVALUATION_TERMS_UPDATED}
        </p>
      </>
    ),
  },
];

export function EvaluationTermsB() {
  return (
    <LegalPage
      title="Evaluation Terms"
      printed="Evaluation|Terms"
      lead={`Blindsight Technologies AG · Rennweg 57, 8001 Zürich · last updated ${EVALUATION_TERMS_UPDATED}`}
      intro={
        <p>
          These terms apply when you ask us for a demo, a free trial or the Blindsight app through
          our website. They are short on purpose: the Evaluation is free, it creates no obligation
          to buy, and a signed agreement replaces them if we work together.
        </p>
      }
      sections={SECTIONS}
    />
  );
}
