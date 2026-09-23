// Copy for the home page's brain experience. Bracketed values are placeholders
// until real policy ids, tools and audit data are supplied.

export type LayerId = "hero" | "see" | "govern" | "prove";
export type StepId = Exclude<LayerId, "hero">;

export const LAYERS: {
  id: LayerId;
  num: string;
  name: string;
  heading: string;
  sub: string;
}[] = [
  {
    id: "hero",
    num: "",
    name: "AI runtime security",
    heading: "How can you secure what you can't see?",
    sub: "Your system is already compromised. Swipe or scroll to see how.",
  },
  {
    id: "see",
    num: "01",
    name: "See it",
    heading: "Five of these are attacks.",
    sub: "Hover or tap a red object. It stops, and you see what it is.",
  },
  {
    id: "govern",
    num: "02",
    name: "Govern it",
    heading: "Same threats. Now under policy.",
    sub: "Hover or tap a green object to see how it was fixed.",
  },
  {
    id: "prove",
    num: "03",
    name: "Prove it",
    heading: "Every fix leaves evidence.",
    sub: "Hover or tap an object to read its audit trail.",
  },
];

export type MarkedObject = {
  id: string;
  /** Resting position in the poster, as % of its box (static / fallback layout). */
  x: number;
  y: number;
  source: string;
  threat: { title: string; body: string; target: string; severity: "Critical" | "High" | "Medium" };
  fix: { title: string; body: string; policy: string; action: string; outcome: string };
  detected: string;
};

export const MARKED: MarkedObject[] = [
  {
    id: "injection",
    x: 76,
    y: 30,
    source: "RAG · support-agent",
    threat: {
      title: "Prompt injection",
      body: "A hidden instruction in a retrieved PDF tells your support agent to export the customer table.",
      target: "export_table(customers)",
      severity: "Critical",
    },
    fix: {
      title: "Injected instruction stripped",
      body: "Untrusted document text can't trigger tool calls. The agent finishes the ticket without the export.",
      policy: "[POLICY-ID] no-pii-export",
      action: "Block tool call",
      outcome: "Agent continues task",
    },
    detected: "Instruction injected via a retrieved PDF",
  },
  {
    id: "leak",
    x: 18,
    y: 38,
    source: "Browser · [AI tool]",
    threat: {
      title: "Sensitive data leak",
      body: "An employee pastes a customer's bank details into a public chatbot.",
      target: "Prompt to external LLM",
      severity: "High",
    },
    fix: {
      title: "Bank details redacted",
      body: "The prompt still goes through, without the account number.",
      policy: "[POLICY-ID] redact-financial-data",
      action: "Redact",
      outcome: "Prompt sent without the data",
    },
    detected: "Account number found in an outgoing prompt",
  },
  {
    id: "shadow",
    x: 30,
    y: 76,
    source: "Endpoint · [team]",
    threat: {
      title: "Unsanctioned AI tool",
      body: "A team uses an AI tool nobody approved, with company documents.",
      target: "[AI tool]",
      severity: "Medium",
    },
    fix: {
      title: "Redirected to the approved tool",
      body: "The user is told why, and routed to the tool your company signed off.",
      policy: "[POLICY-ID] approved-ai-only",
      action: "Flag and redirect",
      outcome: "User moved to [approved tool]",
    },
    detected: "Traffic to an unapproved AI service",
  },
  {
    id: "poisoning",
    x: 70,
    y: 72,
    source: "Knowledge base · [doc id]",
    threat: {
      title: "RAG poisoning",
      body: "An edited knowledge-base article quietly changes the refund policy your assistant quotes.",
      target: "support-agent answers",
      severity: "High",
    },
    fix: {
      title: "Article quarantined",
      body: "The changed source is pulled from retrieval until someone reviews it.",
      policy: "[POLICY-ID] verified-sources",
      action: "Block source",
      outcome: "Answers use the verified version",
    },
    detected: "Retrieved content diverges from the verified source",
  },
  {
    id: "agent",
    x: 52,
    y: 12,
    source: "Agent · [agent name]",
    threat: {
      title: "Over-privileged agent action",
      body: "An agent tries to delete records in your production CRM.",
      target: "delete_records(crm)",
      severity: "Critical",
    },
    fix: {
      title: "Action held for approval",
      body: "Destructive tool calls wait for a human before they run.",
      policy: "[POLICY-ID] human-approval",
      action: "Hold for review",
      outcome: "[Owner] approves or rejects",
    },
    detected: "Destructive tool call outside the agent's scope",
  },
];

export const AUDIT_CHECKS = [
  "Policy check passed",
  "EU AI Act Art. 12 · record-keeping",
  "[Framework] control [ref]",
];
