/* Version B · /demo, the free-trial campaign. Header object: the two columns, a variation of
   the landing's glass: the catch rate and what it costs, standing side by side. The console
   is the landing's own Walkthrough (it auto-advances once it is 45% in view, until the visitor
   takes over). Body in A's structure: sheets with a sticky kicker. Copy and FAQ (DEMO_FAQS,
   which also feed the route's JSON-LD) are the legacy page's. */
import { FinalCta } from "@/site/FinalCta";
import { ProofStrip } from "@/site/ProofStrip";
import { Walkthrough } from "@/site/Walkthrough";
import { CtaButton } from "@/site/shared";
import { useSiteTheme } from "@/site/theme";
import { DEMO_FAQS, DEMO_TOKEN_LABEL as TOKENS } from "../legacy/Demo";
import { Page, PageHead, QaList, SheetGroup, Split, pad2 } from "./parts";

const TRIAL = "Start your free trial";

const BENCHMARKS = [
  { value: "0.9008", label: "Attacks blocked", method: "Across all 77 datasets" },
  { value: "0.9185", label: "Legitimate work delivered", method: "The column nobody prints" },
  { value: "+35", unit: "pts", label: "Detection gain from origin", method: "0.617 → 0.967, InjecAgent" },
  { value: "57–388", unit: "ms", label: "Scan time scales with input", method: "Every window classified" },
];

const ENGINES = [
  {
    name: "Shadow AI",
    kicker: "Client-side · discover & redact",
    body: "Your team is already using AI tools you never approved. Shadow AI runs on the machine, names every one of them, and masks sensitive values before a model ever sees them.",
    points: [
      "Watches the reply, not just the prompt: the leak happens on the way out",
      "Machine credentials, not only personal data: API keys and tokens in model output",
      "Redaction happens on-device. The data never reaches a model, or us",
    ],
  },
  {
    name: "Runtime Security Proxy",
    kicker: "Server-side · inspect & enforce",
    body: `Indirect injection isn't a model problem, it's a contract problem. "Summarize the 2020 climate report" is work when your user types it and an attack when it arrives inside a fetched page. Declare where each span came from and the same classifier goes from 0.617 to 0.967, with no new false positives.`,
    points: [
      "Origin-aware inspection: user turn, document and tool output are not the same input",
      "Classifies every window of a long input: an instruction in paragraph nine still gets caught",
      "Every allow, flag and block written to a tamper-evident audit trail",
    ],
  },
];

const STEPS = [
  { label: "Apply", note: "Two minutes." },
  { label: "Install", note: "Same day, no re-architecture." },
  { label: "Start protecting your AI", note: "Your own numbers, day one." },
];

export function DemoB() {
  const { theme } = useSiteTheme();
  return (
    <Page className="pb-demo">
      <PageHead
        scene="columns"
        label="Runtime + Shadow AI · Free trial"
        title="A detection rate on its own is worthless."
        lead={`Anything scores a perfect 1.000 by blocking everything. So we measured 8 systems across 77 datasets and published the second column: what each one costs on legitimate traffic. Here is ours. Run it on your own stack with ${TOKENS} free tokens.`}
        actions={<CtaButton kind="trial" size="lg" label={TRIAL} />}
        note={`${TOKENS} tokens per organization. No card, no procurement, no commitment.`}
      />
      <ProofStrip theme={theme} />

      <Split
        sheet
        id="benchmark"
        kicker="Benchmark"
        title="8 systems, 77 datasets, both columns."
        note={<p>Every figure carries its method and raw runs, including the four where we come second.</p>}
      >
        <dl className="pb-stats">
          {BENCHMARKS.map((b) => (
            <div key={b.label} className="pb-stat" data-reveal>
              <dt className="pb-stat__label">{b.label}</dt>
              <dd className="pb-stat__value">
                {b.value}
                {b.unit && <span className="pb-stat__unit">{b.unit}</span>}
              </dd>
              <dd className="pb-stat__method">{b.method}</dd>
            </div>
          ))}
        </dl>
      </Split>

      <Walkthrough theme={theme} />

      <SheetGroup className="pb-demo__body">
        <Split
          id="included"
          kicker="What's included"
          title="Both engines. One runtime."
          note={
            <p>
              Shadow AI covers what leaves the laptop. Runtime covers what reaches the model, and what it sends back. Together
              they answer the question your board is already asking: what is our AI actually doing?
            </p>
          }
        >
          <div className="pb-engines">
            {ENGINES.map((e) => (
              <article key={e.name} className="pb-engine" data-reveal>
                <p className="pb-engine__kicker">{e.kicker}</p>
                <h3 className="mD-h3">{e.name}</h3>
                <p className="pb-engine__body">{e.body}</p>
                <ul className="pb-ticks" role="list">
                  {e.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="pb-banner" data-reveal>
            <span>
              One platform, one policy set, one tamper-evident audit trail, yours to export. Model claims decay in six months. An
              architecture claim doesn't.
            </span>
            <span className="pb-banner__tag">Included in the trial</span>
          </p>
        </Split>

        <Split
          id="how"
          kicker="How it works"
          title="Three steps. No procurement cycle."
          note={
            <p>
              Nothing to re-architect, no committee to convene. Point your traffic at the proxy and read your own second column by
              the end of the day.
            </p>
          }
        >
          <ol className="pb-steps" role="list">
            {STEPS.map((s, i) => (
              <li key={s.label} className="pb-step" data-reveal>
                <span className="pb-step__n">{pad2(i)}</span>
                <span className="pb-step__label">{s.label}</span>
                <span className="pb-step__note">{s.note}</span>
              </li>
            ))}
          </ol>
          <div className="pb-deploy" data-reveal>
            <p className="pb-deploy__k">Deploy in your cloud</p>
            <div className="pb-deploy__opts">
              <div className="pb-deploy__opt">
                <strong>Private cloud</strong>
                <span>Deployed inside your own cloud tenant or VPC, isolated to your organization.</span>
              </div>
              <div className="pb-deploy__opt">
                <strong>Public cloud</strong>
                <span>Managed by Blindsight: the fastest way to stand up and evaluate.</span>
              </div>
            </div>
            <p className="pb-deploy__note">
              The trial runs in the cloud, your tenant or ours. On-prem and air-gapped deployments exist outside this program; ask
              on the call.
            </p>
          </div>
        </Split>

        <Split id="faq" kicker="FAQ" title="The method, and the terms.">
          <QaList idPrefix="pb-demo-qa" items={DEMO_FAQS.map((f) => ({ q: f.q, a: <p>{f.a}</p> }))} />
        </Split>
      </SheetGroup>

      <FinalCta theme={theme} kind="trial" />
    </Page>
  );
}
