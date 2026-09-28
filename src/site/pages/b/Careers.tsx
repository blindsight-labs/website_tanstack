/* Version B · /careers. Header object: a file of glass role cards, one per open role. Body
   (A's structure): one sheet, values as a numbered ruled grid, the roles as ruled rows (each
   opens the application), and a last row for everyone not on the list. */
import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { FinalCta } from "@/site/FinalCta";
import { useSiteTheme } from "@/site/theme";
import { ROLES } from "../legacy/Careers";
import { Page, PageHead, SheetGroup, Split } from "./parts";

const VALUES = [
  {
    name: "Doers, Thinkers, Builders",
    body: "If we notice a problem, we fix it, or we bring in the team. Doers, thinkers, and builders work best when they're trusted with the freedom to move.",
  },
  {
    name: "Hacker Mindset",
    body: `Security is a creative discipline. It's built on a deep understanding of the tech, by people who refuse to take "that's just how it works" as a final answer.`,
  },
  {
    name: "Concerned Optimists",
    body: "We're passionate about where AI is going and its potential. But AGI and AI alignment won't happen safely without securing AI systems and their foundations first.",
  },
  {
    name: "Lifelong Learners",
    body: "Cybersecurity never stops moving. Neither do we. Curious by default. Uncomfortable standing still.",
  },
];

export function CareersB() {
  const { theme } = useSiteTheme();
  return (
    <Page className="pb-careers">
      <PageHead
        scene="careers"
        label="Careers · Zürich"
        title="Build the security layer AI runs on."
        lead="We're a small team in Zürich securing the AI systems that teams depend on. Right now, the people deploying AI are flying blind on security. They move fast because they have to. We exist so they can move fast and safely, with the trust that speed usually can't afford."
        actions={
          <>
            <a href="#roles" className="mD-btn mD-btn--primary">
              See open roles
              <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />
            </a>
            <a href="mailto:careers@blindsight.io" className="mD-btn mD-btn--secondary">
              Email the founders
            </a>
          </>
        }
      />

      <SheetGroup>
        <Split
          kicker="What we value"
          title="How we show up."
          note={
            <p>
              We give people freedom and expect them to use it. Long-term, we want to help solve AI alignment and build AI that's
              actually safe and trustworthy.
            </p>
          }
        >
          <ul className="pb-values" role="list">
            {VALUES.map((v) => (
              <li key={v.name} className="pb-value" data-reveal>
                <h3 className="mD-h3">{v.name}</h3>
                <p>{v.body}</p>
              </li>
            ))}
          </ul>
        </Split>

        <Split
          id="roles"
          kicker="Open roles"
          title="We're hiring across the platform."
          note={<p>{ROLES.length} open roles. Don't see yours? Write to us anyway, we read every note.</p>}
        >
          <ul className="pb-rows pb-rows--roles" role="list" data-reveal>
            {ROLES.map((r) => (
              <li key={r.title}>
                <Link to="/careers/apply" search={{ role: r.title }} className="pb-row">
                  <span className="pb-row__main">
                    <span className="pb-row__title">{r.title}</span>
                    <span className="pb-row__desc">{r.desc}</span>
                  </span>
                  <span className="pb-row__meta">
                    <strong>{r.location}</strong>
                    <span>{r.type}</span>
                  </span>
                  <ArrowRight className="pb-row__arrow" size={16} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <a href="mailto:careers@blindsight.io" className="pb-row pb-row--open">
                <span className="pb-row__main">
                  <span className="pb-row__title">Not on the list?</span>
                  <span className="pb-row__desc">Tell us what you'd build here. We hire for trajectory.</span>
                </span>
                <span className="pb-row__meta">
                  <strong>careers@blindsight.io</strong>
                </span>
                <ArrowUpRight className="pb-row__arrow" size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </Split>
      </SheetGroup>

      <FinalCta theme={theme} />
    </Page>
  );
}
