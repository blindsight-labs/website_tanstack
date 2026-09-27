import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

const PLEX_300 =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap";

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
    name: "1 · Rendered glass, network hero",
    note: "Real three.js glass and metal. The hero is an office network (rack, desks, database) where the sweep finds two unregistered AIs. See it, secure it, govern it.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-2" as const,
    name: "2 · The mark as the lens (7 versions)",
    note: "Every take on the logo hero, switchable in the bottom bar. Default is the turret: 01 finds shadow AI, 02 strips the injected line, 03 stamps and logs it.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-3" as const,
    name: "3 · The assembling mark (versions a, b, c)",
    note: "A play on the turret: chrome pieces come in from the edges and assemble into the logo, which then inspects a computer: shadow AI on screen, a zoom into a hidden prompt injection, and one log for both.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-4" as const,
    name: "4 · The mark at work on a laptop (versions a, b, c)",
    note: "Built on 3b: the mark moves around a laptop and finds shadow AI, an agent, a prompt injection and private data, zooming in close without touching the headline; one log for all of it.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-5" as const,
    name: "5 · Abstract workspace hero + the logo as the scanner (a/b/c and s·a/b/c)",
    note: "Hero: 4c's shadow AI, masking and injection story without a literal computer. Section: the office scene below is scanned by the Blindsight mark itself (s·a is the MRI take).",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-6" as const,
    name: "6 · Mockup 4's heroes + the office scanned by the upright mark (a/b/c and s·a/b/c)",
    note: "Hero: back to mockup 4's laptop direction (a defender, b agent's shift, c control room). Section: the original office floor plan, scanned by the Blindsight mark standing upright and sweeping across it (s·a), plus the floor log (s·b) and checkpoint (s·c) on the real office.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-7" as const,
    name: "7 · Wide shot, then close-up",
    note: "Hero: the office network (every AI across the company, seen and fenced). See / Secure / Govern: the close-up on one machine (the defender). Larger logo, no audit row in the hero, a redesigned deployment section and a dotted parallax field.",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-8" as const,
    name: "8 · Mockup 7 with a quieter See / Secure / Govern (a/b/c/d)",
    note: "Same page as 7; the See / Secure / Govern section gets a second pass: four takes on the left column and the close-up, pairable (?left= / ?anim=).",
    swatch: ["#F2F3F5", "#FFFFFF", "#060607"],
  },
  {
    to: "/mockup-9" as const,
    name: "9 · The whole page, consolidated",
    note: "Mockup 7's page with 8's editorial See / Secure / Govern (d) and the blind-emboss seal from 8a; a whole-page consistency pass, phone and tablet layouts, and a reworked AI-nobody-registered card.",
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
            One story, a few looks.
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
