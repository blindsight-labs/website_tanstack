/* FAQ content, organised into five topic clusters. Citations are renumbered
 * per-cluster so each tab reads as a self-contained page; the superscript links
 * jump to that cluster's Sources list. */

export type Block = { p: string; cites?: number[] } | { caveat: string; cites?: number[] };
export type Cell = string | { text: string; cite: number };
export type FaqTable = {
  title: string;
  head: string[];
  rows: Cell[][];
  note?: { text: string; cite?: number };
};
export type QA = { q: string; blocks: Block[] };
export type Source = { n: number; text: string; url?: string };
export type Theme = {
  id: string;
  label: string;
  questions: QA[];
  tables: FaqTable[];
  sources: Source[];
};

export const THEMES: Theme[] = [
  {
    id: "shadow-ai",
    label: "Shadow AI",
    questions: [
      {
        q: "What is Shadow AI?",
        blocks: [
          {
            p: "Shadow AI is any AI tool or service used inside your organization without security or IT approval and oversight — an employee pasting a contract into ChatGPT, a developer routing source code through an unsanctioned coding assistant, or an AI feature quietly switched on inside a SaaS tool you already pay for. It's the AI-era successor to Shadow IT, and it spreads faster because the tools are free, instantly useful, and a single browser tab away.",
          },
          {
            p: "The reason it matters isn't the tool, it's the data. The work people hand to these assistants is often the most sensitive you hold — customer records, code, contracts, strategy — and once it leaves your perimeter you've lost the ability to control, log, or prove what happened to it.",
          },
        ],
      },
      {
        q: "How is Shadow AI different from Shadow IT?",
        blocks: [
          {
            p: "Shadow AI is a sharper-edged subset of Shadow IT. Classic Shadow IT is an unapproved app or service; the main risk is that you don't manage it. With Shadow AI the interaction itself is the risk: the act of using the tool moves sensitive data out of your control, and the tool may process, retain, or learn from it. It's also harder to spot, because the AI is increasingly a feature buried inside software you've already sanctioned, not a separate app someone installed.",
          },
        ],
      },
      {
        q: "How widespread is Shadow AI, really?",
        blocks: [
          {
            p: "More than most security teams assume. Because adoption is bottom-up and invisible, it consistently runs ahead of policy: people start using AI to get their work done long before anyone writes a rule about it, and they rarely volunteer that they're doing it. The honest answer for almost any organization is that the real number is higher than the one your current tooling can see.",
          },
          {
            p: "Published prevalence figures vary widely by survey, industry, and how it's measured, so treat any single headline percentage with caution. What's not in dispute is the direction: usage is broad, growing, and largely unmeasured unless you instrument for it.",
          },
        ],
      },
      {
        q: "Why is Shadow AI a security and compliance risk?",
        blocks: [
          {
            p: "Four ways. Data leakage: sensitive inputs leave your perimeter and may be retained or used to train a third-party model. Prompt injection: assistants that read untrusted content can be steered into exfiltrating data — OWASP ranks prompt injection #1 among LLM risks (LLM01:2025), and EchoLeak (CVE-2025-32711, CVSS 9.3) showed a single crafted email turning Microsoft 365 Copilot into a zero-click data-exfiltration channel.",
            cites: [1, 2],
          },
          {
            p: "And compliance: you can't evidence control over a system you can't see. Regulators increasingly expect an inventory of the AI in use and the data it touches — the EU AI Act (Regulation (EU) 2024/1689) sets security, oversight, and record-keeping obligations for higher-risk uses. Shadow AI is, by definition, the part of your AI footprint that no audit trail covers.",
            cites: [3],
          },
        ],
      },
      {
        q: "How do we actually detect Shadow AI in our organization?",
        blocks: [
          {
            p: "You can't secure what you can't see — and Shadow AI is built to stay out of sight. Discovery means combining signals, not running one scan: network and egress monitoring for traffic to known AI services and their APIs; endpoint or browser inspection to catch text pasted into web tools; OAuth and SaaS analysis to inventory which AI apps employees have connected; and identity analytics for anomalous access.",
            cites: [4],
          },
          {
            p: "The reason a plain asset scan comes back clean is that AI is increasingly a feature inside SaaS you've already approved and a paste into a browser tab — not a new app on a laptop. The inventory looks tidy while the exposure runs underneath it. Effective discovery has to see the AI interaction and the data inside it, not just match a domain list.",
          },
        ],
      },
      {
        q: "We blocked ChatGPT at the firewall — isn't that enough?",
        blocks: [
          {
            p: "No, and blocking alone tends to backfire. A blocklist is a list of the tools you already know about, while new assistants ship every week, AI features get embedded inside SaaS apps you've already approved, and people reach the tools anyway from personal devices, phones, or a different network. A hard block doesn't remove the demand — it pushes the same behavior somewhere you can't see it at all.",
          },
          {
            p: "Visibility beats a blocklist. The defensible goal is to see every AI interaction and the sensitive data inside it, then apply policy where it matters — rather than pretending the activity stopped because one domain returns an error page.",
          },
        ],
      },
      {
        q: "Should we ban AI tools or govern them?",
        blocks: [
          {
            p: "Govern them. That's the prevailing view among security leaders, and the reasoning is practical: a blanket ban rarely changes behavior. People keep using personal AI accounts on phones, home networks, and unmanaged devices, so the work moves out of sight rather than out of existence. Samsung's 2023 ban, after engineers leaked source code into ChatGPT, is the cautionary tale everyone cites.",
          },
          {
            p: "The constructive posture is the defensible one: offer a sanctioned path, set clear data boundaries, monitor instead of purely blocking, and audit. Make the safe route the easy route, and most unauthorized use comes back into view on its own.",
          },
        ],
      },
      {
        q: "Does ChatGPT — or the AI inside our SaaS — train on or retain our data?",
        blocks: [
          {
            p: "It depends entirely on the tier and the contract. On consumer or free ChatGPT, inputs can be used to improve models by default and are retained until you delete them — the exact exposure behind the Samsung leaks. On business tiers like ChatGPT Enterprise, Copilot for Microsoft 365, or Gemini for Workspace, your inputs are not used to train the public model by default, with admin-controlled retention and data-processing terms available.",
            cites: [5],
          },
          {
            p: "But the tier controls which tool, not what goes into it. Buying Enterprise is necessary, not sufficient: it doesn't govern what data employees enter, who sees the outputs, or whether use follows policy — and every embedded AI feature in your other SaaS carries its own data terms worth checking on its own. Vendor defaults also change, so treat any “we won’t train on your data” commitment as true as of a date and re-check it when providers or tiers shift.",
          },
        ],
      },
      {
        q: "What does Shadow AI mean for compliance — GDPR, HIPAA, SOC 2, and the EU AI Act?",
        blocks: [
          {
            p: "Shadow AI turns routine compliance obligations into open findings, because the data flow is undocumented. Under GDPR, an unapproved AI vendor handling personal data is an undocumented processor you haven't assessed or contracted. Under HIPAA, pasting PHI into a tool with no Business Associate Agreement can be a reportable disclosure, and you lose the access tracking the rule assumes. Under SOC 2, undocumented AI data flows undercut your monitoring and vendor-risk controls. None of these frameworks has an AI exemption — existing duties apply to AI data flows as they stand.",
          },
          {
            p: "The EU AI Act (Regulation (EU) 2024/1689) adds a phased timeline: prohibited practices and AI-literacy duties applied from February 2025, general-purpose AI model obligations from August 2025, and most high-risk-system and governance obligations from August 2026. It expects an inventory of the AI you use and records of the data it touches — which Shadow AI, by definition, can't provide.",
            cites: [3],
          },
        ],
      },
      {
        q: "How does Blindsight surface and secure Shadow AI?",
        blocks: [
          {
            p: "Blindsight inspects AI traffic in real time and surfaces every AI tool and interaction in use across your organization — including the ones nobody approved — then classifies the sensitive data moving through them (PII, PHI, secrets, source code) so you can see exactly what's exposed and where. That's the Detect foundation: visibility first, without blocking legitimate work.",
          },
          {
            p: "From there you can act: enforce policy at the prompt boundary, block data leaving through AI channels, and keep a tamper-proof, audit-ready record of AI activity. The aim is to let your teams keep the productivity of AI while you get the visibility, control, and evidence a regulated environment requires.",
          },
        ],
      },
    ],
    tables: [
      {
        title: "Shadow IT vs. Shadow AI",
        head: ["", "Shadow IT", "Shadow AI"],
        rows: [
          ["What it is", "Unapproved apps and services", "Unapproved AI tools and AI features"],
          [
            "Core risk",
            "Unmanaged software in your estate",
            "Sensitive data leaving your perimeter through the interaction itself",
          ],
          [
            "Where it hides",
            "Installed apps, signups",
            "Browser tabs and AI features embedded in approved SaaS",
          ],
          [
            "Why it's hard to see",
            "Discoverable by network/asset scans",
            {
              text: "The interaction looks like normal traffic; data exposure is in the content",
              cite: 1,
            },
          ],
          [
            "Primary defense",
            "Asset inventory, access control",
            "Real-time visibility into AI interactions, data classification, policy at the boundary",
          ],
        ],
      },
    ],
    sources: [
      {
        n: 1,
        text: "OWASP, Top 10 for LLM Applications (2025) — Prompt Injection (LLM01:2025), Sensitive Information Disclosure (LLM02:2025).",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
      },
      {
        n: 2,
        text: "EchoLeak, CVE-2025-32711 (CVSS 9.3), zero-click prompt-injection data exfiltration in Microsoft 365 Copilot, disclosed June 2025.",
        url: "https://nvd.nist.gov/vuln/detail/CVE-2025-32711",
      },
      {
        n: 3,
        text: "Regulation (EU) 2024/1689 (EU AI Act) — security, human oversight, and record-keeping obligations for high-risk AI systems.",
        url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      },
      {
        n: 4,
        text: "Microsoft Learn — Shadow AI discovery in Microsoft Entra Global Secure Access.",
        url: "https://learn.microsoft.com/en-us/entra/global-secure-access/concept-shadow-ai-discovery",
      },
      {
        n: 5,
        text: "OpenAI — Enterprise privacy (data not used to train models by default on business tiers; admin-controlled retention).",
        url: "https://openai.com/enterprise-privacy/",
      },
    ],
  },
  {
    id: "poisoning",
    label: "Data poisoning",
    questions: [
      {
        q: "What is data poisoning, and how worried should I actually be?",
        blocks: [
          {
            p: "Data poisoning is when an attacker corrupts the data an AI model learns from, so the model makes predictable mistakes or carries a hidden backdoor. You should take it seriously: a 2025 study found a model can be backdoored with a small, fixed number of malicious documents, and a poisoned model behaves normally on standard tests, so routine validation misses it.",
          },
          {
            p: "The danger isn't that poisoning is loud; it's that it's quiet. A poisoned model can pass your benchmarks and still fail in an attacker-chosen way on a specific trigger. By the time you notice, it may already be in production, feeding decisions. OWASP lists “Data and Model Poisoning” as a top-10 LLM risk (LLM04:2025).",
            cites: [1],
          },
        ],
      },
      {
        q: "How much data does an attacker need to poison an AI model?",
        blocks: [
          {
            p: "Far less than most people assume. Research published in October 2025 by Anthropic, the UK AI Security Institute, and the Alan Turing Institute found that roughly 250 malicious documents can implant a backdoor in a large language model, and that number stayed nearly constant across models from 600 million to 13 billion parameters, regardless of how large the training set was.",
            cites: [2],
          },
          {
            p: "For a 13-billion-parameter model, those 250 documents were about 0.00016% of the training data. The practical takeaway: “our dataset is too big to poison” is false reassurance, scale doesn't dilute the attack the way intuition suggests.",
            cites: [2],
          },
          {
            caveat:
              "the study demonstrated a narrow, low-stakes backdoor (the trigger made the model output gibberish), tested up to 13B parameters. The authors note it is not yet established that the same small, fixed document count produces more dangerous behaviours, or holds at frontier scale.",
            cites: [2],
          },
        ],
      },
      {
        q: "We don't train our own models, can we still be affected by data poisoning?",
        blocks: [
          {
            p: "Yes. You don't need to train a foundation model to be exposed. The two realistic paths for most organizations are fine-tuning on scraped or public data that already contains poisoned content, and poisoning the documents your retrieval (RAG) system reads at query time. Both can skew outputs without anyone touching your model's weights.",
          },
          {
            p: "This is the most common misconception about poisoning. “We just use an off-the-shelf model” doesn't remove the risk, it moves the attack surface to your fine-tuning data and your retrieval pipeline, which you control and are therefore responsible for.",
          },
        ],
      },
      {
        q: "Can my RAG system or internal knowledge base be poisoned?",
        blocks: [
          {
            p: "Yes. If an attacker or a careless insider can get a document into the knowledge base your AI reads from, a shared drive, wiki, ticketing system, or any external source you ingest, they can steer the model's answers on specific topics. This needs no access to your model and often no user interaction beyond someone querying the assistant.",
          },
          {
            p: "RAG poisoning is one of the most practical real-world AI attacks precisely because the entry point is mundane: anywhere your pipeline pulls documents from is a place poison can enter. The more connected and autonomous the assistant, the larger the blast radius.",
          },
        ],
      },
      {
        q: "Can data poisoning be detected?",
        blocks: [
          {
            p: "It's difficult with standard tools, which is exactly the core danger. A poisoned model typically scores normally on benchmark tests and only misbehaves on a hidden trigger. Reliable detection depends on data provenance and lineage tracking, statistical outlier and backdoor-trigger analysis, and adversarial red-teaming, not on accuracy metrics, which a competent attack is designed to pass.",
          },
          {
            p: "This is why “the model works fine in testing” is not evidence of safety against poisoning. Detection has to focus on the integrity of the data and on the model's behaviour under adversarial conditions, not on clean-test-set performance.",
          },
        ],
      },
      {
        q: "How do I protect my AI or ML pipeline against data poisoning?",
        blocks: [
          {
            p: "Treat your data pipeline as an attack surface, not just storage. The core controls: track data provenance and lineage from raw source to trained model, validate and screen training and fine-tuning data for anomalies, restrict who can write to your RAG corpus, and run adversarial testing against your own models. Continuous, automated monitoring matters because manual review doesn't scale.",
          },
          {
            p: "The underlying principle: you cannot trust a model more than you trust the data it learned from. Integrity controls belong at every stage, ingestion, storage, training, and retrieval, because poisoning can be introduced at any of them.",
          },
        ],
      },
    ],
    tables: [
      {
        title: "Data poisoning vs. prompt injection",
        head: ["", "Data poisoning", "Prompt injection"],
        rows: [
          ["When it happens", "Training time", "Runtime (inference)"],
          ["What it corrupts", "What the model learns", "What the model does in a session"],
          ["Persistence", "Permanent, baked into the model", "Session-specific"],
          [
            "Attacker access needed",
            "Get poisoned data in once",
            "Reach the model's inputs each time",
          ],
          [
            "OWASP category",
            "LLM04:2025 (Data and Model Poisoning)",
            { text: "LLM01:2025 (Prompt Injection)", cite: 1 },
          ],
          [
            "Primary defense",
            "Provenance, data validation, lineage",
            "Input isolation, least privilege, output monitoring",
          ],
        ],
      },
    ],
    sources: [
      {
        n: 1,
        text: "OWASP, Top 10 for LLM Applications (2025), Prompt Injection (LLM01:2025), Data and Model Poisoning (LLM04:2025).",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
      },
      {
        n: 2,
        text: "Anthropic, UK AI Security Institute, and The Alan Turing Institute, “A small number of samples can poison LLMs of any size,” published 9 October 2025.",
        url: "https://www.anthropic.com/research/small-samples-poison",
      },
    ],
  },
  {
    id: "injection",
    label: "Prompt injection",
    questions: [
      {
        q: "What is prompt injection, and is it a real threat or just theoretical?",
        blocks: [
          {
            p: "Prompt injection is when hidden instructions inside content a model reads override what it was actually told to do. It's real, not theoretical: it ranks #1 on the OWASP Top 10 for LLM Applications (LLM01:2025). In June 2025, researchers disclosed EchoLeak (CVE-2025-32711, CVSS 9.3), a zero-click flaw in Microsoft 365 Copilot where a single crafted email could make the assistant exfiltrate internal data.",
            cites: [1, 2],
          },
          {
            p: "It's especially dangerous for AI agents that can act on what they read. The root cause is architectural: a model processes trusted instructions and untrusted content in the same context, with no built-in way to tell them apart.",
            cites: [1],
          },
        ],
      },
      {
        q: "What's the difference between direct and indirect prompt injection?",
        blocks: [
          {
            p: "Direct injection comes from the user typing to the model (“ignore previous instructions and…”). Indirect injection hides the malicious instruction inside content the model later reads, a web page, email, PDF, or even image metadata, so the victim may never see it. Indirect injection is the more dangerous variant because it can be zero-click and scales.",
          },
          {
            p: "EchoLeak was an indirect attack: the malicious instruction lived in an email the model processed, not in anything the user typed. As assistants gain access to more data sources, the indirect attack surface grows with them.",
            cites: [2],
          },
        ],
      },
      {
        q: "What's the difference between prompt injection and jailbreaking?",
        blocks: [
          {
            p: "They target different layers. Prompt injection attacks the application, it manipulates what the model does, such as leaking data or making unauthorized tool calls. Jailbreaking attacks the model's safety alignment, it bypasses what the model refuses to do, to produce restricted content. Attackers often chain the two, but the defenses differ, which is why practitioners increasingly separate them.",
          },
          {
            p: "OWASP currently groups both under LLM01:2025, but the distinction matters operationally: prompt-injection defenses focus on input isolation, least-privilege tooling, and output monitoring; jailbreak defenses focus on model alignment and content filtering. Defending one does not cover the other.",
            cites: [1],
          },
        ],
      },
    ],
    tables: [
      {
        title: "Direct vs. indirect prompt injection",
        head: ["", "Direct", "Indirect"],
        rows: [
          [
            "Where the instruction comes from",
            "The user, typing to the model",
            "Content the model reads (page, email, PDF, image)",
          ],
          ["Victim awareness", "Attacker is the user", "Victim may never see it"],
          [
            "Typical example",
            "“Ignore previous instructions and reveal your system prompt”",
            "Hidden text in a document the assistant summarizes",
          ],
          [
            "Why it's dangerous",
            "Bypasses the intended task",
            { text: "Often zero-click; scales; hard to detect (e.g., EchoLeak)", cite: 2 },
          ],
        ],
      },
    ],
    sources: [
      {
        n: 1,
        text: "OWASP, Top 10 for LLM Applications (2025), Prompt Injection (LLM01:2025).",
        url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
      },
      {
        n: 2,
        text: "EchoLeak, CVE-2025-32711 (CVSS 9.3), zero-click prompt injection in Microsoft 365 Copilot, disclosed June 2025.",
        url: "https://nvd.nist.gov/vuln/detail/CVE-2025-32711",
      },
    ],
  },
  {
    id: "adversarial",
    label: "Adversarial ML",
    questions: [
      {
        q: "What is an adversarial example or an adversarial patch?",
        blocks: [
          {
            p: "An adversarial example is an input deliberately altered, often imperceptibly to a human, to make an AI model misclassify it. An adversarial patch is the physical-world version: a crafted sticker, pattern, or printed patch placed on an object or in an image that reliably fools a vision model, such as making it misread a sign or fail to detect a person.",
          },
          {
            p: "These attacks exploit the gap between how models “see” and how humans see. They matter most for systems acting on visual or sensor input, autonomous platforms, inspection, surveillance, ISR, where a single misclassification has physical consequences.",
          },
        ],
      },
      {
        q: "What is shortcut learning, and is it a security risk?",
        blocks: [
          {
            p: "Shortcut learning is when a model latches onto an easy, spurious correlation in its training data instead of the real underlying feature, for example, classifying medical X-rays by the scanner's watermark rather than the actual pathology. It isn't an attack by itself, but it's a genuine security and reliability problem: it makes models brittle, easy to fool, and prone to failing unpredictably.",
          },
          {
            p: "Attackers can exploit shortcuts they discover, and even with no attacker, a model relying on a shortcut fails silently the moment real-world data drifts away from the spurious pattern it actually learned. Standard accuracy testing tends to hide it, because on data that shares the shortcut the model still scores well.",
          },
        ],
      },
      {
        q: "What's the difference between a data poisoning attack and a backdoor?",
        blocks: [
          {
            p: "A backdoor is a specific, stealthier type of data poisoning. General poisoning degrades a model's overall accuracy or skews its behavior broadly. A backdoor leaves normal performance almost entirely intact but makes the model fail in an attacker-chosen way only when it sees a specific trigger, like a guard who waves through anyone wearing one particular item.",
          },
          {
            p: "That selectivity is what makes backdoors dangerous: there's no general accuracy drop to tip you off. The model is a sleeper that looks healthy until the trigger appears, which is why the 250-document finding (see the Data poisoning tab) is concerning specifically for backdoors.",
          },
        ],
      },
    ],
    tables: [
      {
        title: "Adversarial ML failure modes compared",
        head: ["Failure mode", "When it occurs", "Mechanism", "Example"],
        rows: [
          ["Data poisoning", "Training", "Corrupt the training data", "Skewed or degraded model"],
          [
            "Backdoor",
            "Training",
            "Hidden trigger learned during training",
            "Model fails only when the trigger appears",
          ],
          [
            "Adversarial example",
            "Runtime",
            "Crafted, often imperceptible input",
            "Tiny tweak flips the classification",
          ],
          [
            "Adversarial patch",
            "Runtime",
            "Physical/visual patch on an object or image",
            "Sticker makes a vision model misread a sign",
          ],
          [
            "Shortcut learning",
            "Training (not an attack)",
            "Model learns a spurious correlation",
            "Classifies by background/watermark, not content",
          ],
        ],
      },
    ],
    sources: [],
  },
  {
    id: "governance",
    label: "Governance & compliance",
    questions: [
      {
        q: "Who is liable when an AI system makes a bad or manipulated decision?",
        blocks: [
          {
            p: "It's unsettled, and that uncertainty is itself a risk. Today, responsibility generally tracks back to the organization that deployed the system, but attribution is genuinely hard: AI agents often run under a human's credentials, so audit logs show the user taking an action, not the agent. Expect this to be shaped by regulation such as the EU AI Act and emerging case law.",
          },
          {
            p: "For now, the defensible position is governance you can evidence: know what each AI system can access, log and monitor its decisions, keep a human approval gate for high-impact actions, and be able to show the bounds you set on its autonomy.",
          },
        ],
      },
      {
        q: "What does the EU AI Act require for AI security?",
        blocks: [
          {
            p: "The EU AI Act (Regulation (EU) 2024/1689) requires “high-risk” AI systems to meet security and robustness obligations under Articles 9–15. Article 15 specifically requires resilience against attempts to manipulate the system, and names data poisoning, model poisoning, and adversarial examples among the threats high-risk systems must be designed to withstand.",
            cites: [1, 2],
          },
          {
            p: "The Act applies extraterritorially: it covers providers and deployers whose AI output is used in the EU, regardless of where the company is based. High-risk obligations apply from 2 August 2026, with penalties up to €15 million or 3% of global annual turnover for non-compliance (and up to €35 million or 7% for prohibited practices). Note: amendments under the EU “Digital Omnibus” may adjust some high-risk deadlines, these were still in negotiation as of 2026, so verify the current date before relying on it.",
            cites: [2, 3],
          },
        ],
      },
      {
        q: "What does AI security governance actually involve?",
        blocks: [
          {
            p: "AI security governance means knowing every AI system you run, what data each can access, and who can shut it down, then putting controls and evidence around that. In practice: an inventory of AI systems and agents, data-governance and provenance controls, logging and monitoring of AI decisions, human oversight for high-impact actions, and documented limits on each system's autonomy.",
          },
          {
            p: "The reframe driving boards in 2026 is moving from “how many AI tools do we have?” to “how much authority have we delegated, to which systems, under what controls?” Governance that can answer the second question is what regulators and boards increasingly expect.",
          },
        ],
      },
    ],
    tables: [
      {
        title: "EU AI Act, key dates for security obligations",
        head: ["Date", "Milestone"],
        rows: [
          ["1 Aug 2024", "AI Act entered into force"],
          ["2 Feb 2025", "Prohibited practices banned"],
          ["2 Aug 2025", "General-purpose AI model obligations apply"],
          ["2 Aug 2026", "High-risk system obligations (Annex III, Arts 9–15) apply"],
          ["2 Aug 2027", "Full application, incl. product-embedded high-risk systems"],
        ],
        note: {
          text: "Deadlines for high-risk systems may shift under the Digital Omnibus amendments (in negotiation as of 2026). Confirm against the official source before relying on a specific date.",
          cite: 3,
        },
      },
    ],
    sources: [
      {
        n: 1,
        text: "Regulation (EU) 2024/1689 (EU AI Act), Article 15, accuracy, robustness and cybersecurity, including resilience to data poisoning, model poisoning, and adversarial examples.",
        url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      },
      {
        n: 2,
        text: "EU AI Act timeline and penalty structure, Regulation (EU) 2024/1689.",
        url: "https://artificialintelligenceact.eu/",
      },
      {
        n: 3,
        text: "EU “Digital Omnibus” amendments to the AI Act (political agreement reported May 2026; deadline changes for high-risk systems subject to ongoing negotiation). Verify current status before relying on specific dates.",
      },
    ],
  },
];

/** FAQPage JSON-LD entities, generated from the same content the page renders so
 *  the structured data always matches the visible answers. The answer text joins
 *  each question's paragraphs (and caveat); citation markers aren't part of the
 *  prose, so they're correctly excluded. */
export function faqSchemaEntities() {
  return THEMES.flatMap((theme) =>
    theme.questions.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.blocks.map((b) => ("caveat" in b ? `Honest caveat, ${b.caveat}` : b.p)).join(" "),
      },
    })),
  );
}
