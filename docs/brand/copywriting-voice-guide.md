# Copywriting Voice Guide

> Focused, copy-ready companion to
> [`content-strategy.md`](./content-strategy.md)
> — that doc covers broader content strategy (posting cadence, content
> pillars, audience tiers); this one is what a copywriter (human or the
> `scribe` agent) needs on hand while actually writing Blindsight copy.

## Brand essence

Purpose: *protect AI so it can protect us* — build trust in AI systems.
The brand is **bold, idealistic, clear-sighted**: "we see what others
don't" (the name is the promise — sight where others are blind). Make
distinct, visionary statements when they fit ("we want to set the
standard for AI Integrity worldwide") — the **brand is bold even though
the founders are humble**.

## Who we write for

Blindsight speaks to **organizations**, not individuals: C-suite and
leadership, industry professionals, journalists, and policymakers. Tune
the register: **challenging but constructive** for leaders (ask the hard
questions, then show the path), **purposeful and stakes-aware** for
industry. Across all of them, stay **trustworthy**.

**Scope guardrail:** this voice is for **Blindsight** (the
organization-facing brand). Do NOT write as "Sky," the separate
personal/educational brand. If a task is clearly Sky-voiced (witty,
hacker-casual, public-explainer), flag it rather than writing it.

## Voice — Analytical, Bold, Human

The core triad. "The calm, collected veteran leading through example amid
the chaos."

- **Analytical / clear-sighted.** Lead with data and evidence — never
  trends, hype, or fear. Turn the complex into the simple.
- **Bold.** Don't beat around the bush. State things as they are,
  challenge the convention, write with confidence.
- **Human.** The mission is humanistic — preserving agency and alignment
  so technology stays in service of us.

Expressed in the copy as:

- **Second person, direct.** Speak to the reader's reality. Exemplar:
  "Your team is already using AI tools you never approved."
- **Confident and tight. No fluff.** Short, declarative sentences for
  impact, with occasional breaks for rhythm. Cut hedging ("might", "could
  help", "we believe"), cut adjective pile-ups, cut throat-clearing
  intros. Every word earns its place.
- **Three-beat rhythm is the signature device.** Use parallel triads
  where they land naturally: "See it. Stop it. Prove it." / "Doers,
  Thinkers, Builders." Don't force it.
- **Alternate fact and perspective.** Pair data/evidence with an ethical
  or strategic read of what it means. Plain metaphors and analogies are
  encouraged to make it land.
- **Call to action, not panic.** Appeal to *decisive, informed action* —
  never fear. Use urgency **sparingly** so it carries weight ("act while
  it still matters"). CTAs are empowering — "act now, you can make a
  difference," never "panic now or it's too late."
- **Human and grounded.** Zürich-based, founder-accessible. Echoes like
  "we read every note" and "we hire for trajectory" — real, not
  corporate.

## Line breaks & orphans

Copy is read on a rendered page, so mind how it wraps:

- **No loose orphans.** Never let a heading or paragraph end on a
  dangling one- or two-word last line. Tighten or rebalance the wording
  so the final line carries weight — adjusting length is the first fix.
  When phrasing alone can't resolve a stubborn single-word orphan, glue
  the last two words with a non-breaking space (`&nbsp;` in JSX/HTML,
  ` ` elsewhere) so they wrap together, and say so in the proposal.
- **Deliberate breaks are good.** When a sentence should land on its own
  for emphasis — a closing line, a punch — recommend an intentional
  break: its own `<p>` (preferred, it adds spacing) or a `<br>`. Call it
  out in the **Why** line so it's applied on purpose. The rule: kill
  *accidental* ragged orphans; use *intentional* breaks to isolate a key
  line.

## Hard constraints (project design system — non-negotiable)

> Carried forward from the previous `copywriter` agent, sourced at the
> time from a project `CLAUDE.md` that could not be located in the
> current repo state (likely moved or removed since). Spot-check these
> against the live codebase before treating them as current — this note
> itself is not a verification.

- **Icons:** Lucide only. Never propose emoji or unicode characters as
  icons/bullets in copy.
- **CTAs map to fixed button tiers:** `btn-primary` (main action),
  `btn-secondary` (alternative), tertiary (plain text/nav link). When
  suggesting a CTA, name its tier.
- **SEO metadata** follows the existing route pattern: `title`, meta
  `description`, `og:title`/`og:description`/`og:url`, and FAQ
  `JSON-LD` schema. Match length norms (title ~50–60 chars, description
  ~150–160).
