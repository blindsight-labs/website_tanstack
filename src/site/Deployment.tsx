/* Section 5 — Deployment. Styles: deploy.css (prefix .dp7-).
   One linear diagram, left to right, every node on the same light surface:
     sources  →  ONE Blindsight card  →  destinations
   The card has two entry ports (A endpoint agent, B SDK or proxy) around its
   centre (the mark, "detection on local models"). "Your environment" is a
   rounded boundary around sources + card; the outgoing wires cross it.
   Everything is placed on one CSS grid — no absolutely positioned layers:
   the boundary is an ordinary grid item that shares cells with the nodes.
   ≤ 1080 px the map turns vertical in two lanes; ≤ 600 px it is one column. */
import { Fragment, useRef, type ComponentType } from "react";
import { Bot, Boxes, MessagesSquare, Users, type LucideProps } from "lucide-react";

import iconBlindsight from "@/assets/ICON_Blindsight.svg";
import { deployment } from "./content";
import { Label, MetalIcon, useReveal, type SectionProps } from "./shared";

/** device management the endpoint agent rolls out through */
const MDM = ["Intune", "Jamf", "GPO", "SCCM"];

const STEPS: { n: string; title: string; body: string; tools?: string[] }[] = [
  {
    n: "01",
    title: "Install.",
    body: "The endpoint agent rolls out through your existing device management. The SDK is a single change on the AI systems you build.",
    tools: MDM,
  },
  {
    n: "02",
    title: "Discover.",
    body: "Blindsight maps AI use and risk across your organization. Nothing is blocked, nothing changes for your people.",
  },
  {
    n: "03",
    title: "Govern.",
    body: "Enforce your policies and controls, mitigate your findings and risk, and let your people keep using AI, safely.",
  },
];

/** "a · b · c" as unbreakable segments, each carrying its trailing dot ("a ·"), so a
 *  line wraps only between segments and a dot only ever ends a line, never starts one. */
function Segments({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((s, i) => (
        <Fragment key={s}>
          <span className="dp7-seg">
            {s}
            {i < parts.length - 1 && " ·"}
          </span>
          {/* the space between segments sits outside them: the only place a line breaks */}
          {i < parts.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

function Node({
  area,
  icon,
  name,
  detail,
  tone,
}: {
  area: string;
  icon: ComponentType<LucideProps>;
  name: string;
  detail: string;
  tone: "ink" | "light";
}) {
  return (
    <div className="dp7-node" data-area={area} style={{ gridArea: area }}>
      <span className="dp7-node__k">
        <MetalIcon icon={icon} size={15} tone={tone} />
        {name}
      </span>
      <span className="dp7-node__v">
        <Segments text={detail} />
      </span>
    </div>
  );
}

/** A hairline connector: caption above, line centred on the row, chevron at the end. */
function Wire({ area, caption, out = false }: { area: string; caption: string; out?: boolean }) {
  return (
    <div className="dp7-wire" data-area={area} data-out={out ? "true" : undefined} style={{ gridArea: area }}>
      <span className="dp7-wire__cap">
        <Segments text={caption} />
      </span>
      <span className="dp7-wire__line" aria-hidden="true" />
    </div>
  );
}

function Port({ area, tag, name, caption }: { area: string; tag: string; name: string; caption: string }) {
  return (
    <div className="dp7-port" data-area={area} style={{ gridArea: area }}>
      <span className="dp7-port__k">
        <span className="dp7-tag" aria-hidden="true">
          {tag}
        </span>
        <span>
          <span className="dp7-sr">Surface {tag}: </span>
          {name}
        </span>
      </span>
      <span className="dp7-port__v">{caption}</span>
    </div>
  );
}

export function Deployment({ theme }: SectionProps) {
  const root = useRef<HTMLElement>(null);
  useReveal(root);

  const tone = theme === "dark" ? "light" : "ink";
  const [agent, sdk] = deployment.surfaces;

  return (
    <section ref={root} id="deployment" className="mD-section dp7" aria-labelledby="dp7-title">
      <div className="mD-container">
        <header className="dp7-head" data-reveal>
          <div>
            <h2 id="dp7-title" className="mD-h1 dp7-title">
              {deployment.headline}
            </h2>
          </div>

          {/* where it runs: the choice the headline promises, beside it */}
          <div className="dp7-runs" aria-labelledby="dp7-runs-title">
            <h3 id="dp7-runs-title" className="dp7-kicker">
              <Label>Runs on</Label>
            </h3>
            <ul className="dp7-runs__list">
              {deployment.hosting.map((h) => (
                <li key={h}>
                  {h}
                </li>
              ))}
            </ul>
            <p className="dp7-runs__note">{deployment.local}</p>
          </div>
        </header>

        <figure className="dp7-fig" data-reveal aria-label="How Blindsight deploys">
          <p className="dp7-sr">
            Inside your environment, your people reach AI tools through the endpoint agent, and your AI systems reach
            their models and tools through the SDK or proxy. Both surfaces feed one Blindsight detection layer that
            runs on local models.
          </p>

          <div className="dp7-map">
            {/* first in the DOM so every node paints above it */}
            <div className="dp7-env" aria-hidden="true">
              <span className="dp7-env__k">Your environment</span>
            </div>

            <Node area="srcA" icon={Users} name="Your people" detail="laptops · browser · desktop apps" tone={tone} />
            <Wire area="inA" caption="prompts · uploads" />
            <Node area="srcB" icon={Bot} name="Your AI systems" detail="agents · RAG apps · n8n" tone={tone} />
            <Wire area="inB" caption="prompts · retrievals · tool calls" />

            {/* ONE Blindsight card: port A, the detection layer, port B */}
            <Port
              area="pA"
              tag="A"
              name={agent.name}
              caption="On every laptop. Pseudonymizes sensitive data before it leaves and shields people from prompt injection and poisoning."
            />
            <div className="dp7-core" style={{ gridArea: "core" }}>
              <img className="dp7-core__mark" src={iconBlindsight} alt="" width={26} height={26} draggable={false} />
              <span className="dp7-core__name">Blindsight</span>
              <span className="dp7-core__v">
                <span className="mD-live" aria-hidden="true" />
                detection on local models
              </span>
            </div>
            <Port area="pB" tag="B" name={sdk.name} caption="One line of SDK, or point traffic at the proxy." />

            <Wire area="outA" caption="pseudonymized" out />
            <Node area="dstA" icon={MessagesSquare} name="AI tools" detail="ChatGPT · Copilot · DeepL" tone={tone} />
            <Wire area="outB" caption="inspected at runtime" out />
            <Node area="dstB" icon={Boxes} name="Models & tools" detail="LLM APIs · MCP · actions" tone={tone} />
          </div>
        </figure>

        <div className="dp7-below">
          <section className="dp7-steps" aria-labelledby="dp7-steps-title" data-reveal>
            <h3 id="dp7-steps-title" className="dp7-kicker">
              <Label>Step by step</Label>
            </h3>
            <ol className="dp7-steps__list">
              {STEPS.map((s) => (
                <li key={s.n} className="dp7-step">
                  <span className="dp7-step__n">{s.n}</span>
                  <h4 className="dp7-step__title">{s.title}</h4>
                  <p className="dp7-step__body">{s.body}</p>
                  {s.tools && (
                    <p className="dp7-step__tools">
                      <span className="dp7-step__toolsK">Works with</span>
                      {s.tools.map((t) => (
                        <span key={t} className="dp7-step__tool">
                          {t}
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </section>
  );
}
