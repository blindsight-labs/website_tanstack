/* Shared copy for the three homepage mockups (/mockup-1, -2, -3).
   One story, three looks: every direction renders this same content so the
   comparison is purely visual. Product UI rows are illustrative, not data. */

export const PLEX_300 =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";

export const trust = [
  "NVIDIA Inception",
  "Global Council for Responsible AI",
  "Clínic Barcelona",
  "Universitat de Barcelona",
  "Agent Economy Association",
];

export const heroBody =
  "Blindsight discovers every AI system running across your organisation, including shadow AI, and protects it at runtime against prompt injection, data leakage and poisoning. Deployed locally or in your private cloud.";

export const questions = [
  "Which AI systems are actually running in our environment?",
  "What happens when someone attacks them?",
];

export type Status = "flag" | "muted" | "plain";

export const inventory: { name: string; type: string; users: string; data: string; status: string; tone: Status }[] = [
  { name: "chatgpt.com", type: "Web tool", users: "41", data: "Contracts, PII", status: "Unsanctioned", tone: "flag" },
  { name: "M365 Copilot", type: "Embedded", users: "212", data: "Email, docs", status: "Sanctioned", tone: "muted" },
  { name: "claims-rag", type: "Internal", users: "—", data: "Policy KB", status: "Sanctioned", tone: "muted" },
  { name: "cursor", type: "Dev tool", users: "7", data: "Source code", status: "Unsanctioned", tone: "flag" },
  { name: "crm-assistant", type: "Embedded", users: "18", data: "Customer records", status: "Review", tone: "muted" },
];

export const runtime: { time: string; event: string; verdict: string; tone: Status }[] = [
  { time: "14:32:07", event: "Injection in retrieved doc", verdict: "Blocked", tone: "flag" },
  { time: "14:32:05", event: "IBAN in prompt", verdict: "Redacted", tone: "plain" },
  { time: "14:31:58", event: "Adversarial suffix on input", verdict: "Blocked", tone: "flag" },
  { time: "14:31:52", event: "Poisoned chunk · kb/0412", verdict: "Quarantined", tone: "plain" },
  { time: "14:31:47", event: "Summarise claim #88213", verdict: "Allowed", tone: "muted" },
];

export const evidence = ["AI system inventory", "Request-level decision log", "Policy change history", "Incident timeline"];

export const steps = [
  {
    n: "01",
    verb: "See it",
    title: "Every AI system in use, including the ones nobody approved.",
    body: "Discover every AI system across the organisation, sanctioned or not: employee tools, AI inside the SaaS you already pay for, and your own models and pipelines.",
  },
  {
    n: "02",
    verb: "Secure it",
    title: "Every prompt, response and retrieval, inspected at runtime.",
    body: "Prompt injection, data leakage and abuse are stopped at the layer. Legitimate work passes untouched.",
  },
  {
    n: "03",
    verb: "Prove it",
    title: "The evidence your compliance team needs, already collected.",
    body: "The same telemetry becomes governance: what ran, what was stopped, and why, ready to hand to an auditor.",
  },
];

export const beyond = [
  {
    title: "Adversarial suffixes & patches",
    body: "Machine-crafted strings that steer a model while looking like noise to a filter.",
    layer: "Runtime",
  },
  {
    title: "Training-data poisoning",
    body: "Mislabelled and triggered samples that teach a model to misbehave on cue.",
    layer: "Pipeline",
  },
  {
    title: "RAG poisoning",
    body: "Instructions hidden in the documents your assistant retrieves and trusts.",
    layer: "Retrieval",
  },
];

export const beyondIntro =
  "Adversarial suffixes and patches. Poisoned training data. Poisoned RAG pipelines. They look legitimate all the way through, which is why surface filters miss them. Catching them lets your teams build on retrieval and agents without inheriting the risk.";

export const detection = [
  { label: "Offensive security", body: "Top-ranked offensive work. We know how tools like ours get defeated, because that used to be our job." },
  { label: "PhD-level research", body: "Detection grounded in adversarial ML research, not pattern lists that age out in six months." },
  { label: "Commercial experience", body: "Operators and investors on the team keep the depth pointed at a product, not a lab." },
];

export const personas = [
  {
    role: "CISO",
    question: "What is attacking our AI, and did we stop it?",
    points: [
      "Runtime detection of injection, leakage and poisoning",
      "Detection built from real offensive work",
      "Every decision logged for incident response",
    ],
  },
  {
    role: "CIO",
    question: "Which AI is running here, and where is our data going?",
    points: [
      "Discovery of sanctioned and shadow AI",
      "Runs locally or in your private cloud",
      "One view across tools, models and pipelines",
    ],
  },
  {
    role: "Head of Innovation",
    question: "Can we ship RAG and agents without inheriting the risk?",
    points: [
      "Protection for retrieval and agent pipelines",
      "Security that doesn't block the roadmap",
      "Reporting compliance can sign off on",
    ],
  },
];

export const coverage: { threat: string; where: string; layer: string; beyond?: boolean }[] = [
  { threat: "Shadow AI", where: "Employee tools, AI inside approved SaaS", layer: "See" },
  { threat: "Prompt injection", where: "Prompts, documents, tool outputs", layer: "Secure" },
  { threat: "Data leakage", where: "Prompts and responses", layer: "Secure" },
  { threat: "Adversarial suffixes & patches", where: "Inputs crafted to look benign", layer: "Secure", beyond: true },
  { threat: "Training-data poisoning", where: "Model training pipelines", layer: "Secure", beyond: true },
  { threat: "RAG poisoning", where: "Retrieval corpora and knowledge bases", layer: "Secure", beyond: true },
  { threat: "Audit & reporting", where: "Every decision above, logged", layer: "Prove" },
];

export const deployBody =
  "Local or in your private cloud. Sensitive data never leaves your control, and the same telemetry feeds the reports your compliance team needs.";

export const ctaTitle = "Find out what AI is running in your organisation.";
export const ctaBody = "Talk to the founders. We'll show you Blindsight on a setup like yours.";

export const mockupHead = (title: string, css: string) => ({
  meta: [{ title: `Mockup · ${title}` }, { name: "robots", content: "noindex, nofollow" }],
  links: [
    { rel: "stylesheet", href: PLEX_300 },
    { rel: "stylesheet", href: css },
  ],
});
