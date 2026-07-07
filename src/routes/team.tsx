import { createFileRoute } from "@tanstack/react-router";
import photoGuilherme from "@/assets/S.Guilherme.jpg";
import photoFilipe from "@/assets/A.Filipe.jpg";
import photoMario from "@/assets/P.Mário.jpg";
import photoMaurits from "@/assets/K.Maurits.jpg";
import photoFilipa from "@/assets/B.Filipa.jpg";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Team · Blindsight" },
      { name: "description", content: "Blindsight's founders attacked AI systems professionally before building the layer that defends them, dozens of CVEs to their name." },
      { property: "og:title", content: "Team · Blindsight" },
      { property: "og:description", content: "Offensive security, turned to your defense. Meet the founders behind Blindsight." },
      { property: "og:url", content: "/team" },
    ],
    links: [{ rel: "canonical", href: "/team" }],
  }),
});

type Person = {
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

// The two founders carry the security story told in the section intro.
const FOUNDERS: Person[] = [
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
];

// The rest of the team — shown smaller, without the founders' security framing.
const LEADERSHIP: Person[] = [
  {
    role: "COO",
    name: "Mário Portocarrero",
    label: "COO photo",
    photo: photoMario,
    bio: "Operations & Branding",
    highlights: [
      "Product designer & developer of AI, Agentic & VR systems",
      "Informatics Engineering and Digital Media background",
    ],
  },
  {
    role: "CCO",
    name: "Maurits J. de Knecht",
    label: "CCO photo",
    photo: photoMaurits,
    photoPosition: "42% top",
    bio: "Commercialization & GTM",
    highlights: [
      "Business development & GTM initiatives, market-entry with multi-exit founders in AI and DeepTech",
      "Ex-VC & startup advisor: G Squared, Mountain Partners, Co-GP of Conny & Co. II SCSp (1st investor in Destinus)",
      "Ex-Founder & CEO in FMCG",
    ],
  },
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

function PersonCard({
  role,
  name,
  label,
  photo,
  photoPosition,
  photoZoom,
  bio,
  highlights,
}: Person) {
  // Drives the name/title font-size formula in styles.css (.founder-info --name-size):
  // sizing is derived from each string's own length so a long name or a long title
  // (e.g. "Head of Research") is scaled down just enough to stay on a single line,
  // rather than one fixed size wrapping or overflowing on the longer ones.
  const fitVars = {
    "--name-chars": name.length,
    "--role-chars": role.length,
  } as React.CSSProperties;

  return (
    <figure className="founder-card" tabIndex={0}>
      <div className="founder-photo">
        <img
          src={photo}
          alt={label}
          className="founder-photo-img"
          style={{
            objectPosition: photoPosition,
            transform: photoZoom ? `scale(${photoZoom})` : undefined,
          }}
        />
      </div>
      <figcaption className="founder-info" style={fitVars}>
        <span className="founder-role">{role}</span>
        <span className="founder-name">{name}</span>
        <p className="founder-bio">{bio}</p>
        <ul className="founder-highlights">
          {highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

function TeamPage() {
  return (
    <main>
      <section className="section section-alt" style={{ paddingTop: 140 }}>
        <div className="section-inner">
          <div
            className="s-head reveal"
            style={{ alignItems: "center", textAlign: "center", margin: "0 auto" }}
          >
            <h1>Offensive security, turned to your defense</h1>
            <p>
              Blindsight's founders attacked AI systems professionally before building the layer
              that defends them. Between them, dozens of CVEs. Detection is built from the attacks
              they find themselves. Tested on competitors' own public benchmarks, where it is
              hardest to win, Blindsight beats the leading runtime scores and covers a wider
              spectrum of attacks.
            </p>
            <p>In security, the cost of being second best is the breach you did not stop.</p>
          </div>

          <div className="founders-grid reveal">
            {FOUNDERS.map((p) => (
              <PersonCard key={p.role} {...p} />
            ))}
          </div>

          <div className="leadership-grid reveal">
            {LEADERSHIP.map((p) => (
              <PersonCard key={p.role} {...p} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
