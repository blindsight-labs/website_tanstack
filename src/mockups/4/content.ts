/* Copy for mockup D, taken from the Sep 24 website brief (@guilherme).
   Draft copy may be tightened; section ORDER and JOB are settled. Anything in
   [square brackets] is a placeholder the team still has to supply. */

export const CTA = "Discover your AI risk";

export const nav = {
  links: [
    { label: "Platform", href: "#sequence" },
    { label: "Deployment", href: "#deployment" },
    { label: "Research", href: "#why" },
    { label: "Company", href: "/team" },
  ],
  quiet: { label: "Pricing", href: "#faq" },
};

export const hero = {
  label: "AI security · Zurich",
  headline: "Use AI without its blind spots.",
  // Subline 4 is the one to use for now; 1–3 are on hold (layout must fit any).
  subline:
    "Your company is adopting AI faster than security can check it, and attackers are counting on that. Blindsight closes the gap, so AI can keep moving.",
  sublineAlternatives: [
    "Every AI, every agent, every data flow, visible and under your policies, on your infrastructure.",
    "AI attacks slip past your tools and your people. So does the AI your team uses without asking. Blindsight sees both and secures both.",
    "AI is moving faster than security can follow, bringing attacks your tools can't see and adoption nobody approved. Blindsight lets security keep pace.",
  ],
  // Octane puts hard proof next to the CTA. Figures come from Filipe.
  proof: [
    { value: "[xx]%", label: "attacks caught, public benchmarks" },
    { value: "[x] ms", label: "added latency per request" },
    { value: "0", label: "third-party LLM calls in detection" },
  ],
  storyboard: [
    "A calm company network: people, apps, a couple of AI agents.",
    "A scan passes. AI tools that were not on the map light up. One incoming document glows with a hidden instruction.",
    "Risky items get contained, the hidden instruction is stripped, the agent carries on.",
    "One log line seals at the bottom: detected, corrected, logged.",
  ],
  logLine: "14:32:07  invoice_0412.pdf → agent:finance  hidden instruction stripped  ·  detected · corrected · logged",
};

export const proofStrip = [
  "Noéda",
  "J floor",
  "Rebels",
  "Clínic Barcelona / Universitat de Barcelona",
  "NVIDIA Inception",
  "ETH AI Center",
  "ATHENE UP26 finalist",
  "CF Accelerator",
  "Agent Economy Association",
  "Global Council for Responsible AI",
  "Agentegra",
  "SovereignMind",
];

export type RiskId = "prompt-leak" | "hidden-instruction" | "poisoned-source" | "unregistered-ai";

export const risks: { id: RiskId; title: string; scenario: string; short: string }[] = [
  {
    id: "prompt-leak",
    title: "Data leaves through a prompt.",
    scenario:
      "An employee pastes a client contract into ChatGPT to summarise it. The contract is now outside your company.",
    short: "Contract pasted into ChatGPT",
  },
  {
    id: "hidden-instruction",
    title: "An attack hidden in a document.",
    scenario:
      "Your AI agent reads a supplier invoice with an instruction hidden in the text. It follows it and emails out customer data.",
    short: "Hidden instruction in invoice",
  },
  {
    id: "poisoned-source",
    title: "A poisoned source.",
    scenario:
      "Someone edits a page in your internal knowledge base. Your AI assistant now gives employees the attacker's answer.",
    short: "Edited knowledge-base page",
  },
  {
    id: "unregistered-ai",
    title: "AI nobody registered.",
    scenario:
      "A sales rep connects an AI assistant to the CRM with their own login. It can read every customer record, and security doesn't know it exists.",
    short: "AI assistant on the CRM",
  },
];

export const sequence = {
  tagline: "See it, secure it, prove it.",
  stages: [
    {
      n: "01",
      label: "See it",
      title: "Find every AI in use, approved or not.",
      body: "Blindsight maps the AI tools your people use and the AI systems your teams build, including automations like n8n and Power Automate. For each one you decide: block, approve, protect, or fully onboard.",
      decisions: ["Block", "Approve", "Protect", "Onboard"],
    },
    {
      n: "02",
      label: "Secure it",
      title: "Protect the AI you build and the AI your people use.",
      body: "For your people, sensitive data is pseudonymised before it reaches any AI tool. For your AI systems, prompt injection, adversarial patching and poisoned RAG data are caught at runtime, by models running on your infrastructure.",
    },
    {
      n: "03",
      label: "Prove it",
      title: "Every decision leaves evidence.",
      body: "Your written policies become rules Blindsight enforces. Every block, redaction and approval is logged for FADP, the Cyber Resilience Act, ISO 27001 and the EU AI Act.",
      frameworks: ["FADP", "Cyber Resilience Act", "ISO 27001", "EU AI Act"],
    },
  ],
  // How each scenario from "The new risks" moves through the three stages.
  thread: {
    "prompt-leak": {
      see: "chatgpt.com · web tool · 41 users",
      secure: "Client names and figures pseudonymised before upload",
      prove: "policy DATA-02 · redacted · 14:31:58",
    },
    "hidden-instruction": {
      see: "agent:finance reads invoice_0412.pdf",
      secure: "Hidden instruction stripped, agent carries on",
      prove: "policy AGENT-07 · stripped · 14:32:07",
    },
    "poisoned-source": {
      see: "kb/pricing · page edited 09:12 by unknown",
      secure: "Poisoned chunk quarantined from retrieval",
      prove: "policy RAG-03 · quarantined · 14:30:44",
    },
    "unregistered-ai": {
      see: "crm-assistant · OAuth via personal login",
      secure: "Access paused pending approval",
      prove: "policy REG-01 · blocked · 14:29:10",
    },
  } as Record<RiskId, { see: string; secure: string; prove: string }>,
};

export const deployment = {
  label: "Deployment",
  headline: "Up and running without a project.",
  surfaces: [
    {
      name: "Endpoint agent",
      for: "For the people using AI",
      body: "A lightweight agent on laptops sees AI use in the browser and desktop apps, and pseudonymises sensitive data before it leaves.",
    },
    {
      name: "SDK or proxy",
      for: "For the AI systems you build",
      body: "One line of SDK, or point traffic at the proxy. Prompts, retrievals and tool calls are inspected at runtime.",
    },
  ],
  hosting: ["On-prem", "Private cloud", "Our cloud"],
  local: "Detection runs locally, not through third-party LLM calls.",
  steps: "[Step-by-step from the deployment one-pager — Guilherme to supply]",
};

export const discovery = {
  label: "How discovery works",
  headline: "Know your AI risk in two weeks.",
  steps: [
    { n: "01", title: "Install.", body: "Endpoint agent and SDK or proxy, on your infrastructure." },
    { n: "02", title: "Blindsight runs quietly.", body: "One to two weeks. Nothing is blocked, nothing changes for your people." },
    { n: "03", title: "You get a findings report.", body: "Shadow AI, leak points, attack attempts." },
    { n: "04", title: "Switch protection on.", body: "Turn findings into enforced policy, one decision at a time." },
  ],
};

export const why = {
  label: "Why Blindsight",
  headline: "Built by red team specialists.",
  body: "We've attacked and secured AI systems inside Fortune 500 companies. Our team combines offensive security specialised in AI with security ML research, so we know how AI gets attacked, and how defensive tools get bypassed. Blindsight is built against both, and we benchmark it against the tools you're likely comparing us with.",
  benchmarkNote: "Illustrative. Benchmark figures to come from Filipe.",
  // Placeholder series: shape only, NOT real results.
  benchmark: [
    { name: "Blindsight", value: 0.9, us: true },
    { name: "[Competitor A]", value: 0.74 },
    { name: "[Competitor B]", value: 0.68 },
    { name: "[Competitor C]", value: 0.61 },
    { name: "[Competitor D]", value: 0.52 },
  ],
};

export const faq = [
  {
    q: "How long does deployment take?",
    a: "Days, not a project. The endpoint agent installs through your existing device management, and the SDK or proxy is one change on the AI systems you build. Discovery then runs for one to two weeks before anything is enforced. [Confirm typical timings with the deployment one-pager.]",
  },
  {
    q: "Where does our data go?",
    a: "Nowhere new. Blindsight runs on-prem, in your private cloud, or in our cloud if you prefer, and detection runs on models inside that environment rather than through third-party LLM calls. Sensitive data is pseudonymised on the endpoint before it reaches any AI tool.",
  },
  {
    q: "How is this different from DLP, a gateway, or Microsoft Purview?",
    a: "Those tools watch for known data patterns or known destinations. AI risk also lives inside the content: an instruction hidden in a document, a poisoned knowledge-base page, an adversarial patch. Blindsight inspects prompts, retrievals and tool calls at runtime, sees AI used outside the sanctioned stack, and turns every decision into audit evidence. It sits alongside the controls you already run. [Legal/positioning review before publishing.]",
  },
  {
    q: "What does it cost to start?",
    a: "Discovery is scoped with you on a short call, and there is a self-serve option for teams that want to buy without a demo. [Pricing model to confirm.]",
  },
  {
    q: "What happens after discovery?",
    a: "You get the findings report and walk through it with us. From there you switch protection on for the risks that matter, turn written policies into enforced rules, and start collecting evidence for FADP, the Cyber Resilience Act, ISO 27001 and the EU AI Act.",
  },
];

export const finalCta = {
  headline: "See what AI is doing in your organisation.",
};

export const footer = {
  company: "Blindsight Technologies AG · Rennweg 57, 8001 Zürich",
  terminal: "$ blindsight status  →  all AI systems observed · 0 unreviewed decisions",
  links: [
    { label: "Team", href: "/team" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Pricing", href: "#faq" },
    { label: "Imprint", href: "/imprint" },
    { label: "Privacy", href: "/privacy" },
  ],
};
