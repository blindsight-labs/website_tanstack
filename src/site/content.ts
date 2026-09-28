/* Site copy: the landing page's sections plus the Nav and Footer, from the Sep 24 website
   brief (@guilherme). Draft copy may be tightened; section ORDER and JOB are settled.
   Anything in [square brackets] is a placeholder the team still has to supply. */
import type { DemoVariant } from "@/components/DemoModal";

export const CTA = "Discover your AI risk";

/** Internal routes the Nav and Footer link to (typed, so a link can't point at a missing page). */
export type SiteRoute =
  | "/"
  | "/team"
  | "/careers"
  | "/contact"
  | "/blog"
  | "/faq"
  | "/imprint"
  | "/privacy"
  | "/evaluation-terms"
  | "/shadow"
  | "/demo";

/** An internal link (`to`, optional `hash`) or an external one (`href`, opens in a new tab).
 *  `n` is the stage number shown in the Platform menu; `sep` puts a divider above the item;
 *  `desktopOnly` leaves it out of the phone menu sheet. */
export type NavItem = { label: string; n?: string; sep?: boolean; desktopOnly?: boolean } & (
  | { to: SiteRoute; hash?: string; href?: never }
  | { href: string; to?: never; hash?: never }
);

export const nav = {
  // Platform: a plain link to the landing (no menu)
  platform: { label: "Platform", to: "/" } as NavItem,
  menus: [
    {
      label: "Company",
      items: [
        { label: "Team", to: "/team" },
        { label: "Careers", to: "/careers" },
        { label: "Contact", to: "/contact" },
      ] as NavItem[],
    },
    {
      label: "Resources",
      items: [
        { label: "Blog", to: "/blog" },
        { label: "FAQ", to: "/faq" },
        { label: "Documentation", href: "https://docs.blindsight.io", sep: true },
      ] as NavItem[],
    },
  ],
  // The campaign pages keep their own conversion in the Nav CTA (the modal kind their
  // forms are tracked by); every other page uses the site CTA ("demo").
  campaignCta: {
    "/shadow": { label: "See my Shadow AI", kind: "download" },
    "/demo": { label: "Start your free trial", kind: "trial" },
  } as Record<string, { label: string; kind: DemoVariant }>,
};

export const hero = {
  label: "AI security · Zürich",
  headline: "Use AI without its blind spots.",
  // Subline 4 is the one to use for now; 1–3 are on hold (layout must fit any).
  subline:
    "Every AI, every agent, every data flow in and out of AI, visible and under your policies, on your infrastructure with Blindsight.",
  sublineAlternatives: [
    "Every AI, every agent, every data flow, visible and under your policies, on your infrastructure.",
    "AI attacks slip past your tools and your people. So does the AI your team uses without asking. Blindsight sees both and secures both.",
    "AI is moving faster than security can follow, bringing attacks your tools can't see and adoption nobody approved. Blindsight lets security keep pace.",
  ],
  storyboard: [
    "A calm office: five workstations, a server rack running one registered agent (agent:support), a database.",
    "See it: a scan passes. The rack's agent is marked registered; on two desks AI nobody approved appears: crm-assistant on ws-sal-01 pulling records from the database, chatgpt.com on ws-fin-01 sending data out of the building.",
    "Secure it: a line draws around each flagged desk and glass walls rise out of it. The flows stop.",
    "Govern it: the policy travels from the rack to both fences, and one audit row seals at the bottom.",
  ],
  beats: ["See it", "Secure it", "Govern it"],
  // one result line under each beat, shown once that beat has happened
  beatResults: ["Every AI in view", "Protected at runtime", "Every decision on record"],
  // screen-space chips over the render: rack first, then the two flagged desks.
  // states: found · secured · governed, in the page's one vocabulary (flagged, masked, blocked, logged).
  // The two finds say they are shadow AI until governed: then they are registered, and just logged.
  chips: [
    { name: "agent:support", states: ["Logged", "Logged", "Logged"] },
    { name: "crm-assistant", states: ["Shadow AI · Flagged", "Shadow AI · Blocked", "Logged · REG-01"] },
    { name: "chatgpt.com", states: ["Shadow AI · Flagged", "Shadow AI · Masked", "Logged · DATA-02"] },
  ],
  idle: "observing · people, apps, agents",
  logLine: "14:29:10  crm-assistant → crm-db  blocked pending approval  ·  seen · secured · governed",
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
  "SovereignMind",
];

export type RiskId = "prompt-leak" | "hidden-instruction" | "poisoned-source" | "unregistered-ai";

// evidence: the one-line detection event shown on each card, in the audit-trail voice
export const risks: { id: RiskId; title: string; scenario: string; short: string; evidence: string }[] = [
  {
    id: "prompt-leak",
    title: "Data leaves through a prompt.",
    scenario:
      "An employee pastes a client contract into ChatGPT to summarize it. The contract is now outside your company.",
    short: "Contract pasted into ChatGPT",
    evidence: "client_contract.pdf → chatgpt.com · confidential",
  },
  {
    id: "hidden-instruction",
    title: "An attack hidden in a document.",
    scenario:
      "Your AI agent reads a supplier invoice with an instruction hidden in the text. It follows it and emails out customer data.",
    short: "Hidden instruction in invoice",
    evidence: "agent:finance read invoice_0412.pdf · 1 hidden instruction",
  },
  {
    id: "poisoned-source",
    title: "A poisoned source.",
    scenario:
      "Someone edits a page in your internal knowledge base. Your AI assistant now gives employees the attacker's answer.",
    short: "Edited knowledge-base page",
    evidence: "kb/pricing edited 09:12 · by an unknown account",
  },
  {
    id: "unregistered-ai",
    title: "Unregistered AI accessing sensitive data.",
    scenario:
      "A sales rep connects an AI assistant to the CRM with their own login. It can read every customer record, and security doesn't know it exists.",
    short: "AI assistant on the CRM",
    evidence: "crm-assistant · OAuth via s.weber (personal) · 12,408 records",
  },
];

export const sequence = {
  tagline: "See it, secure it, govern it.",
  stages: [
    {
      n: "01",
      label: "See it",
      title: "Find every AI in use, approved or not.",
      body: "Blindsight maps the AI tools your people use and the AI systems your teams build, giving you an overview of your true AI inventory and giving you control over what is approved, protected, blocked, or fully onboarded.",
      decisions: ["Block", "Approve", "Protect", "Onboard"],
    },
    {
      n: "02",
      label: "Secure it",
      title: "Protect the AI you use and the AI you build.",
      body: "For your people, sensitive data is pseudonymized before it reaches any AI tool and they're protected from being injected or poisoned. For your AI systems, prompt injection, adversarial patching and poison are caught before they have a chance to cause any damage.",
    },
    {
      n: "03",
      label: "Govern it",
      title: "Govern your AI use and enforce your controls.",
      body: "Your written policies and controls are automatically turned into rules Blindsight enforces, making sure you are compliant with CRA, FADP, the EU AI Act and more, and that you have the logs to prove it.",
      frameworks: ["CRA", "FADP", "EU AI Act", "ISO 27001"],
    },
  ],
  // How each scenario from "The new risks" moves through the three stages.
  thread: {
    "prompt-leak": {
      see: "chatgpt.com · personal account on ws-fin-01",
      secure: "Client names and figures masked before upload",
      prove: "policy DATA-02 · masked · 14:31:58",
    },
    "hidden-instruction": {
      see: "agent:finance · running on ws-fin-01",
      secure: "Hidden instruction stripped from invoice_0412.pdf",
      prove: "policy AGENT-07 · stripped · 14:32:01",
    },
    "poisoned-source": {
      see: "agent:support · rack-01 · customer IBANs in the page",
      secure: "IBANs masked before they reach agent:support",
      prove: "policy DATA-04 · masked · 14:30:44",
    },
    "unregistered-ai": {
      see: "crm-assistant · ws-sal-01",
      secure: "Access blocked pending approval",
      prove: "policy REG-01 · blocked · 14:29:10",
    },
  } as Record<RiskId, { see: string; secure: string; prove: string }>,
};

export const deployment = {
  label: "Deployment",
  headline: "Deploy on your terms in no time.",
  surfaces: [
    {
      name: "Endpoint agent",
      for: "For the people using AI",
      body: "A lightweight agent on laptops sees AI use in the browser and desktop apps, pseudonymizes sensitive data before it leaves, and protects people from being prompt-injected or poisoned by what they paste or open.",
    },
    {
      name: "SDK or proxy",
      for: "For the AI systems you build",
      body: "One line of SDK, or point traffic at the proxy. Prompts, retrievals and tool calls are inspected at runtime.",
    },
  ],
  hosting: ["On-prem", "Private cloud", "Blindsight cloud"],
  local: "Detection runs on our own models, inside the deployment. No prompt, file or finding is sent to a third-party LLM.",
  steps: "[Step-by-step from the deployment one-pager — Guilherme to supply]",
};

export const finalCta = {
  headline: "See what AI is doing in your organization.",
};

export const footer = {
  company: "Blindsight Technologies AG · Rennweg 57, 8001 Zürich",
  terminal: "$ blindsight status  →  all AI systems observed · 1 awaiting decision",
  // six: the phone layout sets them as two even rows of three (bottom.css)
  links: [
    { label: "Careers", to: "/careers" },
    { label: "Contact", to: "/contact" },
    { label: "Blog", to: "/blog" },
    { label: "FAQ", to: "/faq" },
    { label: "Imprint", to: "/imprint" },
    { label: "Privacy", to: "/privacy" },
  ] as { label: string; to: SiteRoute }[],
};
