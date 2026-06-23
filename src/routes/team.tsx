import { createFileRoute } from "@tanstack/react-router";
import { UserRound } from "lucide-react";

export const Route = createFileRoute("/team")({
  component: TeamPage,
  head: () => ({
    meta: [
      { title: "Team · Blindsight" },
      { name: "description", content: "Blindsight's founders attacked AI systems professionally before building the layer that defends them — dozens of CVEs to their name." },
      { property: "og:title", content: "Team · Blindsight" },
      { property: "og:description", content: "Offensive security, turned to your defense. Meet the founders behind Blindsight." },
      { property: "og:url", content: "/team" },
    ],
    links: [{ rel: "canonical", href: "/team" }],
  }),
});

type Person = { role: string; label: string; bio: string };

// The two founders carry the security story told in the section intro.
const FOUNDERS: Person[] = [
  {
    role: "CEO",
    label: "CEO photo",
    bio: "Top global ethical hacker and former Kühne+Nagel security architect.",
  },
  {
    role: "CTO",
    label: "CTO photo",
    bio: "Former Checkmarx security lead.",
  },
];

// The rest of the team — shown smaller, without the founders' security framing.
const LEADERSHIP: Person[] = [
  {
    role: "COO",
    label: "COO photo",
    bio: "Scales operations and delivery as Blindsight grows.",
  },
  {
    role: "CFO",
    label: "CFO photo",
    bio: "Runs finance and fundraising for a venture-backed company.",
  },
  {
    role: "Head of Research",
    label: "Head of Research photo",
    bio: "Directs Blindsight's research agenda and detection science.",
  },
];

function PersonCard({ role, label, bio }: Person) {
  return (
    <figure className="founder-card">
      <div className="founder-photo" role="img" aria-label={`Placeholder for ${role} photo`}>
        <UserRound className="founder-photo-icon" strokeWidth={1.5} aria-hidden="true" />
        <span className="founder-photo-label">{label}</span>
      </div>
      <figcaption className="founder-info">
        <span className="founder-role">{role}</span>
        <p className="founder-bio">{bio}</p>
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
            <span className="tag">Why Blindsight</span>
            <h1>Offensive security, turned to your defense</h1>
            <p>
              Blindsight's founders attacked AI systems professionally before building the layer
              that defends them — between them, dozens of CVEs to their name. Detection is built
              from the attacks they find themselves. Tested on competitors' own public benchmarks,
              where it is hardest to win, Blindsight beats the leading runtime benchmarks and
              covers a wider spectrum of attacks.
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
