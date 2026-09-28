/* Page data shared by the site's pages (team, careers, the demo card): people, open roles,
   the demo card's copy, and the CV upload helper. */
import photoGuilherme from "@/assets/S.Guilherme.jpg";
import photoFilipe from "@/assets/A.Filipe.jpg";
import photoMaurits from "@/assets/K.Maurits.jpg";
import photoFilipa from "@/assets/B.Filipa.jpg";

export type Person = {
  role: string;
  name: string;
  label: string;
  photo: string;
  // Per-photo crop tweaks — source photos vary in framing, so these correct
  // individual outliers rather than changing the shared object-fit rules.
  photoPosition?: string;
  photoZoom?: number;
  bio: string;
  highlights: string[];
};

// The founders (the first two carry the security story told in the section intro).
export const FOUNDERS: Person[] = [
  {
    role: "CEO",
    name: "Guilherme Santos",
    label: "CEO photo",
    photo: photoGuilherme,
    bio: "AI & Cybersecurity Expert",
    highlights: [
      "Ex-Kühne+Nagel Security Architect",
      "Ethical Hacker: Top 30 Global Leaderboard, Rank #1 Portugal",
      "+20 zero-day vulnerability disclosures",
      "Global Council for Responsible AI: President of Germany chapter & Global Ambassador",
      "International keynote speaker on AI security and cybersecurity strategy",
    ],
  },
  {
    role: "CTO",
    name: "Filipe Azevedo",
    label: "CTO photo",
    photo: photoFilipe,
    bio: "Adversarial Machine Learning & Security R&D",
    highlights: [
      "Ex-Checkmarx, Principal-level Engineer leading Fortune 500 security projects",
      "Global expert in code-reading and vulnerability triage for enterprise systems",
    ],
  },
  {
    role: "CCO",
    name: "Maurits J. de Knecht",
    label: "CCO photo",
    photo: photoMaurits,
    photoPosition: "42% top",
    bio: "Leads Go-to-Market strategy and partnerships at Blindsight",
    highlights: [
      "VC operator background in security, deep tech, and AI; co-launched Conny & Co. early-stage fund part of a global house of funds (first investor in Destinus)",
      "Former Founder and CEO of an FMCG and E-Commerce business",
      "Advised technology companies on market entry of complex products and internationalization strategy",
    ],
  },
];

// The rest of the team — shown smaller, without the founders' security framing.
export const LEADERSHIP: Person[] = [
  {
    role: "Head of Research",
    name: "Filipa Barros",
    label: "Head of Research photo",
    photo: photoFilipa,
    photoZoom: 1.35,
    bio: "PhD in Computer Science (FCUP/LIACC)",
    highlights: [
      "Published researcher in Adversarial Anomaly Detection and ML",
      "Co-supervised MSc thesis on Adversarial ML and Computer Vision",
      "Co-PI of SIOS-funded research project",
      "Peer-reviewed publications across EAAI, IAC, and ESANN",
    ],
  },
];

export type Role = {
  title: string;
  location: string;
  type: string;
  desc: string;
};

export const ROLES: Role[] = [
  {
    title: "Founders Associate",
    location: "Zürich",
    type: "Full-time",
    desc: "Drive GTM execution, market intelligence, and investor narrative alongside the founders. Build the commercial playbook that scales with Blindsight.",
  },
  {
    title: "SDR",
    location: "Remote",
    type: "Full-time",
    desc: "Open conversations with AI native companies and enterprises in sectors where the stakes are high. Turn tailored outbound into qualified pipeline the founders close.",
  },
  {
    title: "Solutions Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Partner with regulated enterprises to deploy Blindsight end to end. Translate security requirements into working integrations.",
  },
  {
    title: "ML Security Researcher",
    location: "Remote",
    type: "Full-time",
    desc: "Investigate poisoning, shortcut learning, and backdoors across training and retrieval pipelines. Publish what you discover.",
  },
  {
    title: "GTM Lead",
    location: "Zürich · Hybrid",
    type: "Full-time",
    desc: "Work directly with banks, insurers, and public sector buyers on EU AI Act readiness. Own pipeline from first call to signed contract.",
  },
  {
    title: "Security Engineer",
    location: "Remote",
    type: "Full-time",
    desc: "Build the runtime that protects production AI systems end to end. Deep systems work on a tight latency budget.",
  },
  {
    title: "Branding & Marketing Lead",
    location: "Zürich · Hybrid",
    type: "Full-time",
    desc: "Define how Blindsight shows up in the world. Own brand, narrative, and the surfaces that put us in front of CISOs and regulators.",
  },
];

/** The demo card's heading copy. */
export const DEMO_MODAL_COPY = {
  tag: "Request a Demo",
  title: "See Blindsight against your stack.",
  sub: "30-minute working session with the founding team. Reply within one business day.",
};

/** Reads a File as bare base64 (no data: prefix), as submitApplication expects. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
