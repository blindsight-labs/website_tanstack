/* The AI exposure assessment: eight risks, one question each, and the scoring that moves the
   iceberg. Each answer carries two numbers, 0..1:
     see      how much of this risk the organization can see today
     prevent  how much of it is stopped (not just seen) today
   A risk counts as "in view" (above the waterline) at see ≥ 0.5.
   `bs` is what runtime controls like Blindsight add for that risk: the ceiling "could prevent"
   uses. [Placeholder figures: confirm the per-risk coverage with the product team.] */

export type Option = { label: string; see: number; prevent: number };

export type Risk = {
  id: string;
  name: string;
  question: string;
  options: Option[];
  /** one line: what this risk is, for the dive */
  what: string;
  /** a typical organization's visibility, used before the question is answered */
  baseline: number;
  bs: { see: number; prevent: number; action: string };
};

export const RISKS: Risk[] = [
  {
    id: "shadow",
    name: "Shadow AI",
    question: "Could you list every AI tool your people used last week?",
    options: [
      { label: "Yes, from live discovery per user and device", see: 1, prevent: 0.6 },
      { label: "Roughly, from proxy logs, expenses or surveys", see: 0.5, prevent: 0.2 },
      { label: "Only the tools we approved", see: 0.2, prevent: 0.1 },
      { label: "Not with confidence", see: 0, prevent: 0 },
    ],
    what: "Personal AI accounts, browser extensions and plugins on company machines. Nobody registered them; they still see company data.",
    baseline: 0.3,
    bs: { see: 1, prevent: 0.9, action: "Flagged per user, then allowed, masked or blocked" },
  },
  {
    id: "data",
    name: "Sensitive data in prompts",
    question: "Someone pastes a client contract into an AI chat. What happens?",
    options: [
      { label: "Sensitive fields are masked before it leaves", see: 1, prevent: 1 },
      { label: "It's logged and reviewed later", see: 0.7, prevent: 0.2 },
      { label: "A policy says they shouldn't", see: 0.1, prevent: 0.1 },
      { label: "We wouldn't know it happened", see: 0, prevent: 0 },
    ],
    what: "Names, IBANs, contracts and source code pasted into prompts. Once sent, it can sit in a provider's logs you don't control.",
    baseline: 0.2,
    bs: { see: 1, prevent: 1, action: "Masked before the prompt leaves" },
  },
  {
    id: "injection",
    name: "Prompt injection",
    question:
      "Your AI reads emails, PDFs and web pages. Would you catch an instruction hidden inside one?",
    options: [
      { label: "Yes, every input is inspected at runtime", see: 1, prevent: 0.9 },
      { label: "We red-team before each release", see: 0.4, prevent: 0.3 },
      { label: "We rely on the model provider's guardrails", see: 0.2, prevent: 0.2 },
      { label: "It hasn't come up yet", see: 0, prevent: 0 },
    ],
    what: "Instructions hidden in a document or web page your AI reads. The model follows them as if your own user had typed them.",
    baseline: 0.1,
    bs: { see: 1, prevent: 0.9, action: "Stripped before the model reads it" },
  },
  {
    id: "agents",
    name: "Agent actions",
    question:
      "Your AI agents can send email, move money and change records. Can you see every action they take?",
    options: [
      { label: "Every tool call is logged and checked against policy", see: 1, prevent: 0.9 },
      { label: "Permissions are scoped, but actions aren't recorded", see: 0.3, prevent: 0.5 },
      { label: "They run with a user's or a service account's access", see: 0.1, prevent: 0.1 },
      { label: "We don't know how many agents are running", see: 0, prevent: 0 },
    ],
    what: "Agents act with real credentials: payments, emails, record changes. One injected instruction turns into an action.",
    baseline: 0.15,
    bs: { see: 1, prevent: 0.9, action: "Blocked when a tool call breaks policy" },
  },
  {
    id: "saas",
    name: "AI inside your SaaS",
    question: "How many of your software vendors switched on AI features this year?",
    options: [
      { label: "We know each one and review it", see: 1, prevent: 0.6 },
      { label: "We know the big ones", see: 0.5, prevent: 0.2 },
      { label: "We find out from release notes", see: 0.2, prevent: 0.1 },
      { label: "No idea", see: 0, prevent: 0 },
    ],
    what: "CRM, ticketing and office suites that added AI features this year, often switched on by default, with access to your records.",
    baseline: 0.55,
    bs: { see: 0.8, prevent: 0.6, action: "Flagged when company data reaches it" },
  },
  {
    id: "supply",
    name: "Models and training data",
    question: "Who can change the models, fine-tuning data and documents your AI answers from?",
    options: [
      { label: "Named owners; every change is versioned and logged", see: 1, prevent: 0.8 },
      { label: "Access is controlled, but changes aren't monitored", see: 0.5, prevent: 0.4 },
      { label: "Mostly shared drives and public models", see: 0.2, prevent: 0.1 },
      { label: "We'd have to find out", see: 0, prevent: 0 },
    ],
    what: "A poisoned document in the knowledge base or a tampered model answers wrongly on purpose, and looks normal while doing it.",
    baseline: 0.2,
    bs: { see: 0.8, prevent: 0.6, action: "Logged, and flagged when answers drift" },
  },
  {
    id: "inventory",
    name: "AI inventory",
    question:
      "A regulator asks for your AI inventory and each system's risk class. How long does it take?",
    options: [
      { label: "Same day; it's kept up to date", see: 1, prevent: 0.8 },
      { label: "A few weeks", see: 0.5, prevent: 0.4 },
      { label: "It would be a project", see: 0.2, prevent: 0.1 },
      { label: "We don't have one", see: 0, prevent: 0 },
    ],
    what: "The EU AI Act asks which AI you run, what it touches and how risky it is. Most answers today live in a spreadsheet.",
    baseline: 0.5,
    bs: { see: 1, prevent: 0.9, action: "Logged into one live register" },
  },
  {
    id: "audit",
    name: "Incident reconstruction",
    question: "An AI system leaked data last Tuesday. Could you reconstruct what happened?",
    options: [
      {
        label: "Yes: prompts, responses and tool calls are in one audit log",
        see: 1,
        prevent: 0.8,
      },
      { label: "Partly, from application logs", see: 0.5, prevent: 0.3 },
      { label: "Only if someone reports it", see: 0.1, prevent: 0.1 },
      { label: "No", see: 0, prevent: 0 },
    ],
    what: "Without the prompt, the response and the tool call, an AI incident is a rumor: no scope, no root cause, no report.",
    baseline: 0.25,
    bs: { see: 1, prevent: 0.9, action: "Sealed into a tamper-evident audit log" },
  },
];

export const N = RISKS.length;
export const IN_VIEW = 0.5;

export type Answers = (number | null)[];

export const emptyAnswers = (): Answers => RISKS.map(() => null);

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Visibility of each risk: the answer's, or the baseline while unanswered. */
export function seeOf(answers: Answers) {
  return RISKS.map((r, i) => (answers[i] == null ? r.baseline : r.options[answers[i]!].see));
}

/** Slot order for the iceberg, top to bottom: most visible first (ties keep question order). */
export function orderOf(answers: Answers) {
  const see = seeOf(answers);
  return RISKS.map((_, i) => i).sort((a, b) => see[b] - see[a] || a - b);
}

export function seenCount(answers: Answers) {
  return seeOf(answers).filter((s) => s >= IN_VIEW).length;
}

export type Score = {
  seen: number;
  prevented: number;
  withSeen: number;
  withPrevented: number;
  inView: number;
};

/** Percentages, rounded. Equal weight per risk. Only meaningful once every question is answered. */
export function score(answers: Answers): Score {
  const picked = RISKS.map((r, i) => r.options[answers[i] ?? r.options.length - 1]);
  const pct = (x: number) => Math.round(x * 100);
  return {
    seen: pct(avg(picked.map((o) => o.see))),
    prevented: pct(avg(picked.map((o) => o.prevent))),
    withSeen: pct(avg(picked.map((o, i) => Math.max(o.see, RISKS[i].bs.see)))),
    withPrevented: pct(avg(picked.map((o, i) => Math.max(o.prevent, RISKS[i].bs.prevent)))),
    inView: seenCount(answers),
  };
}

export function verdict(s: Score) {
  if (s.seen < 40) return "Most of your AI exposure sits below the waterline.";
  if (s.seen < 65)
    return "About half of your AI exposure is in view. The rest is where incidents usually surface.";
  return "Most of your AI exposure is in view. What's left below is the part attackers look for.";
}

/** A risk's status words for the dive. */
export function seenWord(see: number) {
  return see >= 0.9 ? "Yes" : see >= IN_VIEW ? "Mostly" : see > 0 ? "Barely" : "No";
}
export function preventWord(p: number) {
  return p >= 0.8 ? "Yes" : p >= 0.4 ? "Partly" : p > 0 ? "Barely" : "No";
}
