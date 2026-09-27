/* Version B · /contact. Header object: a chrome pin standing on the dotted plane at Rennweg 57.
   Body: the address on one card, the four inboxes as rows on another. */
import { ArrowUpRight } from "lucide-react";

import { CtaButton, Label } from "@/site/shared";
import { FinalCta } from "@/site/FinalCta";
import { useSiteTheme } from "@/site/theme";
import { Page, PageHead, Split } from "./parts";

const INBOXES = [
  { k: "Sales & partnerships", mail: "info@blindsight.io" },
  { k: "Careers", mail: "careers@blindsight.io" },
  { k: "Security & disclosures", mail: "security@blindsight.io" },
  { k: "Press", mail: "press@blindsight.io" },
];

export function ContactB() {
  const { theme } = useSiteTheme();
  return (
    <Page className="pb-contact">
      <PageHead
        scene="contact"
        label="Contact · Zürich"
        title="Let's talk about securing your AI."
        lead="Whether you're evaluating LLM security for the first time or replacing an existing stack, the founders read every note. Expect a reply within one business day."
        actions={
          <>
            <a href="mailto:info@blindsight.io" className="mD-btn mD-btn--primary">
              info@blindsight.io
            </a>
            <CtaButton variant="secondary" />
          </>
        }
      />

      <Split
        sheet
        kicker="Where to find us"
        title="Zürich, Switzerland."
        note={<p>From our Zürich HQ, we work with regulated enterprises across the EU, UK, and Switzerland.</p>}
      >
        <div className="pb-contact__grid">
          <div className="pb-address" data-reveal>
            <Label>Headquarters</Label>
            <address className="pb-address__lines">
              Blindsight Technologies AG
              <br />
              Rennweg 57
              <br />
              8001 Zürich
              <br />
              Switzerland
            </address>
            <p className="pb-address__note">Expect a reply within one business day.</p>
          </div>
          <ul className="pb-inboxes" role="list" data-reveal>
            {INBOXES.map((x) => (
              <li key={x.mail}>
                <a href={`mailto:${x.mail}`} className="pb-inbox">
                  <span className="pb-inbox__k">{x.k}</span>
                  <span className="pb-inbox__v">{x.mail}</span>
                  <ArrowUpRight className="pb-inbox__go" size={16} strokeWidth={1.5} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Split>

      <FinalCta theme={theme} />
    </Page>
  );
}
