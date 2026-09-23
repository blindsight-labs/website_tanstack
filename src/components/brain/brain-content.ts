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
    heading: "Nine of these are attacks.",
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

/** Layer change: a scan line sweeps the stage in `scanMs`; each object takes its
 *  new colour `beatMs` after the line passes it, easing the hue over `hueMs`. */
export const TRANSITION = { scanMs: 700, beatMs: 120, hueMs: 650 };

export type SymbolId =
  | "prompt-injection"
  | "jailbreak"
  | "shadow-ai"
  | "backdoor"
  | "mislabeled-data"
  | "rag-injection"
  | "adversarial-patch"
  | "poisoned-samples"
  | "shortcut";

export type MarkedObject = {
  id: SymbolId;
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
    id: "prompt-injection",
    x: 76,
    y: 28,
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
    id: "jailbreak",
    x: 86,
    y: 50,
    source: "Chat · [assistant]",
    threat: {
      title: "Jailbreak string",
      body: "A user pastes a role-play prompt built to talk your assistant out of its safety rules.",
      target: "System prompt guardrails",
      severity: "High",
    },
    fix: {
      title: "Jailbreak refused",
      body: "The known jailbreak pattern is caught before it reaches the model, and the user gets a policy reply.",
      policy: "[POLICY-ID] jailbreak-patterns",
      action: "Block prompt",
      outcome: "Guardrails intact",
    },
    detected: "Prompt matches a known jailbreak pattern",
  },
  {
    id: "shadow-ai",
    x: 22,
    y: 28,
    source: "Endpoint · [team]",
    threat: {
      title: "Shadow AI",
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
    id: "backdoor",
    x: 13,
    y: 54,
    source: "Model registry · [model]",
    threat: {
      title: "Model back-door",
      body: "A third-party fine-tuned model behaves normally until a hidden trigger phrase makes it leak data.",
      target: "[model] in production",
      severity: "Critical",
    },
    fix: {
      title: "Model quarantined",
      body: "The trigger behaviour is caught in scanning, and the model is pulled before it serves traffic.",
      policy: "[POLICY-ID] model-provenance",
      action: "Quarantine model",
      outcome: "Previous version serves traffic",
    },
    detected: "Hidden trigger behaviour in a third-party model",
  },
  {
    id: "mislabeled-data",
    x: 28,
    y: 80,
    source: "Training data · [dataset]",
    threat: {
      title: "Mislabeled & low-quality data",
      body: "Thousands of wrongly labelled examples quietly degrade what your model learns.",
      target: "[dataset] v[n]",
      severity: "Medium",
    },
    fix: {
      title: "Bad samples filtered",
      body: "Suspect labels and low-quality rows are flagged and held out of the next training run.",
      policy: "[POLICY-ID] data-quality",
      action: "Exclude samples",
      outcome: "Clean dataset version",
    },
    detected: "Label noise above threshold in a training set",
  },
  {
    id: "rag-injection",
    x: 70,
    y: 78,
    source: "Knowledge base · [doc id]",
    threat: {
      title: "Adversarial RAG injection",
      body: "A planted knowledge-base article quietly changes the refund policy your assistant quotes.",
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
    id: "adversarial-patch",
    x: 50,
    y: 11,
    source: "Vision model · [camera]",
    threat: {
      title: "Adversarial patch",
      body: "A printed patch in the frame makes your vision model misread what it sees.",
      target: "[vision model]",
      severity: "High",
    },
    fix: {
      title: "Manipulated input rejected",
      body: "Inputs carrying adversarial patterns are flagged and sent for human review.",
      policy: "[POLICY-ID] input-integrity",
      action: "Flag for review",
      outcome: "No automated decision",
    },
    detected: "Adversarial pattern in an image input",
  },
  {
    id: "poisoned-samples",
    x: 50,
    y: 90,
    source: "Training pipeline · [source]",
    threat: {
      title: "Poisoned training samples",
      body: "Crafted samples slipped into a data feed teach your model a behaviour an attacker chose.",
      target: "Next training run",
      severity: "Critical",
    },
    fix: {
      title: "Samples quarantined",
      body: "Samples from the compromised feed are isolated before training starts.",
      policy: "[POLICY-ID] data-provenance",
      action: "Quarantine feed",
      outcome: "Training uses verified data",
    },
    detected: "Anomalous samples from one data source",
  },
  {
    id: "shortcut",
    x: 88,
    y: 72,
    source: "Model eval · [model]",
    threat: {
      title: "Demographic shortcut learning",
      body: "Your model predicts from a demographic proxy, like postcode, instead of the signal it should use.",
      target: "[decision] outcomes",
      severity: "High",
    },
    fix: {
      title: "Release blocked on bias check",
      body: "The shortcut is caught in evaluation, and the model doesn't ship until it's retrained.",
      policy: "[POLICY-ID] fairness-eval",
      action: "Block release",
      outcome: "Retrain before deploy",
    },
    detected: "Outcome gap tied to a demographic proxy",
  },
];

/** Selected when See it opens, until the visitor picks another object. */
export const DEFAULT_PICK = MARKED.findIndex((m) => m.id === "shadow-ai");

export const AUDIT_CHECKS = [
  "Policy check passed",
  "EU AI Act Art. 12 · record-keeping",
  "[Framework] control [ref]",
];
