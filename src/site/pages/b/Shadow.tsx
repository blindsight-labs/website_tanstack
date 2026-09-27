/* Version B · /shadow, the Shadow AI campaign. Header object: the AI register, a variation of
   the landing's 04 plaque, with the line nobody wrote (chatgpt.com, m.keller) in violet. The
   interactive ShadowAiDemo sits on its own white sheet; the FAQ renders the shadow-ai topic,
   matching the route's FAQPage schema (faqSchemaEntities("shadow-ai")). */
import { ShadowAiDemo } from "@/components/ShadowAiDemo";
import { THEMES } from "@/lib/faq-content";
import { FinalCta } from "@/site/FinalCta";
import { ProofStrip } from "@/site/ProofStrip";
import { CtaButton } from "@/site/shared";
import { useSiteTheme } from "@/site/theme";
import { TopicBody } from "./Faq";
import { Page, PageHead, Sec, SheetGroup, Split } from "./parts";

const CTA = "See my Shadow AI";

const STEPS = [
  { title: "Whitelist check", tip: "Trusted apps and destinations are recognized up front, so approved workflows pass straight through." },
  { title: "File read", tip: "Blindsight opens and parses the file locally to see exactly what data it carries." },
  { title: "Rule check", tip: "Each file is scanned against 1,600+ customizable rules covering PII, secrets and sensitive content." },
  { title: "Redact", tip: "Sensitive values are masked on the device, so only safe, redacted data ever reaches the model." },
];

/** One file through the four checks, in the audit-trail voice (the landing's cast). */
const LOG = [
  { t: "14:31:56", s: "chatgpt.com · m.keller, ws-fin-01 · not on the list", v: "flagged" },
  { t: "14:31:57", s: "client_contract.pdf · read on the device", v: "logged" },
  { t: "14:31:57", s: "rules matched · client names, figures", v: "flagged" },
  { t: "14:31:58", s: "client_contract.pdf → chatgpt.com · redacted copy sent", v: "masked", live: true },
];

export function ShadowB() {
  const { theme } = useSiteTheme();
  const topic = THEMES.find((t) => t.id === "shadow-ai");
  return (
    <Page className="pb-shadow">
      <PageHead
        scene="register"
        label="Shadow AI"
        long
        title={
          <>
            Your team will use AI. <span className="pb-head__quiet">The question is whether you'll know what it's doing with your data.</span>
          </>
        }
        lead={
          <>
            <strong>Shadow AI</strong> is every unapproved tool your people already paste contracts, code and customer records
            into. Blocking it just pushes the habit out of sight. Blindsight sits between your team and the AI, redacting the
            sensitive data before the model ever sees it. We don't see it either.
          </>
        }
        actions={<CtaButton kind="download" size="lg" label={CTA} />}
        note="We distrust the tool, not your team, so AI gets faster and safer at once."
      />
      <ProofStrip theme={theme} />

      <Sec
        sheet
        id="live"
        label="Live traffic"
        title="The same four requests, with and without Blindsight."
        lead="Four employees send requests to a third-party AI. With Blindsight off, sensitive data and prompt injections leak. Toggle it on and the runtime proxy redacts sensitive data and blocks attacks."
      >
        <div className="pb-shadow__demo" data-reveal>
          <ShadowAiDemo />
        </div>
      </Sec>

      <SheetGroup>
      <Split
        id="stack"
        kicker="How it works"
        title="Protection that runs on the machine."
        note={
          <p>
            Blindsight installs as a desktop app on every user's machine. It intercepts AI traffic, redacts sensitive data before
            the model ever sees it, and logs every AI tool in use. All without slowing anyone down.
          </p>
        }
      >
        <div className="pb-machine pb-machine--stack">
          <ol className="pb-checks" role="list">
            {STEPS.map((s, i) => (
              <li key={s.title} className="pb-check4" data-reveal>
                <span className="pb-step__n">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="pb-check4__title">{s.title}</h3>
                <p>{s.tip}</p>
              </li>
            ))}
          </ol>
          <div className="pb-card mD-log pb-shadow__log" data-reveal>
            <div className="mD-log__head">
              <span>Activity log · ws-fin-01</span>
              <span>always on</span>
            </div>
            {LOG.map((r) => (
              <div key={r.t + r.v + r.s} className="mD-log__row">
                <span className="mD-log__time">{r.t}</span>
                <span className="pb-shadow__subj">{r.s}</span>
                <span className="mD-log__verdict">
                  {r.live && <span className="mD-live" aria-hidden="true" />}
                  {r.v}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="pb-platforms" data-reveal>
          <span className="pb-platform">Windows: available now</span>
          <span className="pb-platform pb-platform--soon">macOS: coming soon</span>
        </p>
      </Split>

      {topic && (
        <Split id="faq" kicker="FAQ" title="Shadow AI, answered." note={<p>{topic.questions.length} questions, with sources.</p>}>
          <div className="pb-shadow__faq">
            <TopicBody theme={topic} />
          </div>
        </Split>
      )}
      </SheetGroup>

      <FinalCta theme={theme} kind="download" />
    </Page>
  );
}
