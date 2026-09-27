/* Version B · /team. Header object: the Blindsight mark as a lens. Body (A's structure): one
   white sheet, a sticky kicker left and the portraits right: the founders and the team
   together, two across, monochrome, on hairlines. */
import { FinalCta } from "@/site/FinalCta";
import { useSiteTheme } from "@/site/theme";
import { FOUNDERS, LEADERSHIP, type Person } from "../legacy/Team";
import { Page, PageHead, SheetGroup, Split } from "./parts";

function Portrait({ p, size }: { p: Person; size: "lg" | "sm" }) {
  return (
    <li className={`pb-person pb-person--${size}`} data-reveal>
      <figure className="pb-person__fig">
        <div className="pb-person__photo">
          <img
            src={p.photo}
            alt={`${p.name}, ${p.role}`}
            loading="lazy"
            decoding="async"
            style={{ objectPosition: p.photoPosition, transform: p.photoZoom ? `scale(${p.photoZoom})` : undefined }}
          />
        </div>
        <figcaption className="pb-person__cap">
          <span className="pb-person__role">{p.role}</span>
          <span className="pb-person__name">{p.name}</span>
          <span className="pb-person__bio">{p.bio}</span>
        </figcaption>
      </figure>
      <ul className="pb-person__list">
        {p.highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </li>
  );
}

export function TeamB() {
  const { theme } = useSiteTheme();
  return (
    <Page className="pb-team">
      <PageHead
        scene="team"
        label="Company · Team"
        title="Offensive security, turned to your defense."
        lead="Blindsight's founders attacked AI systems professionally before building the layer that defends them. Between them, dozens of CVEs."
      />

      <SheetGroup>
        <Split
          kicker="Team"
          title="They broke it first."
          note={
            <p>
              Detection is built from the attacks they find themselves. Tested on competitors' own public benchmarks, where it is
              hardest to win, Blindsight beats the leading runtime scores and covers a wider spectrum of attacks.
            </p>
          }
          side={<p className="pb-pull">In security, the cost of being second best is the breach you did not stop.</p>}
        >
          <ul className="pb-people pb-people--lg" role="list">
            {[...FOUNDERS, ...LEADERSHIP].map((p) => (
              <Portrait key={p.role} p={p} size="lg" />
            ))}
          </ul>
        </Split>
      </SheetGroup>

      <FinalCta theme={theme} />
    </Page>
  );
}
