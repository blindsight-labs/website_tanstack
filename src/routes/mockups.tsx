import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PLEX_300 } from "@/mockups/content";

export const Route = createFileRoute("/mockups")({
  component: MockupIndex,
  head: () => ({
    meta: [{ title: "Mockups · Blindsight" }, { name: "robots", content: "noindex, nofollow" }],
    links: [{ rel: "stylesheet", href: PLEX_300 }],
  }),
});

const directions = [
  {
    to: "/mockup-1" as const,
    name: "1 · Clear Glass",
    note: "Light, closest to Octane. White panels on grey, frosted See / Secure / Prove panes, mono buttons. Purple is a dot.",
    swatch: ["#ECEDF0", "#FFFFFF", "#0E0F13"],
  },
  {
    to: "/mockup-2" as const,
    name: "2 · Smoked Glass",
    note: "Dark, frosted panels. The hero animates the chaos-to-order idea around the model. Purple only where Blindsight acts.",
    swatch: ["#08080A", "#1A1A1F", "#F4F4F6"],
  },
  {
    to: "/mockup-3" as const,
    name: "3 · Hairline",
    note: "Light and editorial. A visible grid, a coverage table and a boundary diagram. Most restrained of the three.",
    swatch: ["#F7F7F8", "#E2E2E7", "#111114"],
  },
  {
    to: "/mockup-4" as const,
    name: "4 · Rendered Glass",
    note: "The brief build. Real three.js glass and metal, the floor-plan hero, See / Secure / Prove as a sticky sequence. Light and dark.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-5" as const,
    name: "5 · Rendered Glass, network hero",
    note: "Mockup 4 with a new hero: an office network (rack, desks, database) where the sweep finds two unregistered AIs. See it, secure it, govern it.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-6" as const,
    name: "6 · Rendered Glass, logo hero",
    note: "Mockup 5 with the Blindsight mark as the hero: a glass-and-chrome hub-and-orbit that turns like a dial through See it, secure it, govern it.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-7" as const,
    name: "7 · Logo hero, clearer risk cards",
    note: "Mockup 6 with the four risk examples made explicit: the pasted client data is visible in the prompt, and each card carries a one-line detection event.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-8" as const,
    name: "8 · Clearer risk cards, animated on hover",
    note: "Mockup 7 where hovering a risk card plays the incident: the contract slides out, the loupe finds the hidden line, the page shifts, the connector plugs in.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
];

function MockupIndex() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F7F7F8",
        color: "#111114",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        padding: "clamp(40px, 8vw, 120px) clamp(20px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.12em", color: "#8C8C96" }}>
            HOMEPAGE MOCKUPS · NOT LIVE
          </div>
          <h1 style={{ margin: 0, fontSize: 48, fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            One story, eight looks.
          </h1>
          <p style={{ margin: 0, maxWidth: 620, fontSize: 17, lineHeight: 1.6, color: "#55555E" }}>
            Same sections, same copy, same fonts and purple. Only the visual treatment changes, so compare the look,
            not the words. Product screens use illustrative data.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", borderTop: "1px solid #E2E2E7" }}>
          {directions.map((d) => (
            <Link
              key={d.to}
              to={d.to}
              style={{
                display: "grid",
                gridTemplateColumns: "72px 1fr 24px",
                gap: 24,
                alignItems: "center",
                padding: "28px 0",
                borderBottom: "1px solid #E2E2E7",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              <span style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #E2E2E7", height: 40 }}>
                {d.swatch.map((s) => (
                  <span key={s} style={{ flex: 1, background: s }} />
                ))}
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.01em" }}>{d.name}</span>
                <span style={{ fontSize: 15, lineHeight: 1.55, color: "#55555E" }}>{d.note}</span>
              </span>
              <ArrowRight size={18} strokeWidth={1.4} />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
