# Adopt in Stages — Section Upgrade (Design)

**Date:** 2026-06-23
**Status:** Approved (pending spec review)
**Section:** `#stack` — "Adopt in stages" on the home page (`src/routes/index.tsx`, `Stages()`).

## Goal

Upgrade the "Adopt in stages" section to:

1. State that Blindsight's offers can be deployed on-prem or over cloud (private or public).
2. Add a new vertical **engagement-flow** diagram beside the existing stages.
3. Give every stage pill (and the deployment options) hover/tap info, modeled on the iceberg markers.

Pricing-aware Protect content is **explicitly out of scope** for this pass (see Non-Goals).

## Current state

- `Stages()` renders a single, centered column: an intro (`.s-head`), an ordered list of three tiers (`.cstack` → Detect / Protect / Govern), and a closing `.cstack-note` ("Modular by design…").
- Each tier is driven by the `STAGES` array (`id`, `num`, `name`, `Icon`, `tagline`, `requires`, `items[]`). Pills are plain `.cstack-chip` `<li>`s — static text, no interaction.
- The iceberg section (`src/components/Iceberg.tsx`) already implements the target interaction: each marker carries `meta` · `name` · `desc`, shows a CSS tooltip on hover/focus on desktop (`hovered` state), and opens a centered modal on tap on mobile (`pinned` state, Escape/backdrop to close, `isMobile()` via `matchMedia("(max-width: 640px)")`).
- A Radix `tooltip.tsx` exists but is a single-line text tooltip with poor touch support — **not** reused here.

## Design

### 1. Two-column layout

The section body becomes a two-column grid:

- **Left column:** the existing three tiers (`.cstack`), structurally unchanged.
- **Right column:** a new vertical engagement timeline (see §3).
- **Breakpoint:** at ~≤900px the grid collapses to a single column; the engagement timeline stacks **below** the stages.
- The "Modular by design…" note (`.cstack-note`) remains a **full-width caption under both columns**.

The intro (`.s-head`) stays full-width above the grid, centered as today.

### 2. Deployment line

A single line directly under the intro paragraph:

> Deploy anywhere — on-prem, private cloud, or public cloud.

The three deployment terms (**on-prem**, **private cloud**, **public cloud**) are rendered as **info-pills** (§4) with placeholder `desc` copy, e.g.:

- **on-prem** — "Runs entirely on your own hardware, air-gapped if required." *(placeholder)*
- **private cloud** — "Deployed inside your own cloud tenant / VPC, isolated to you." *(placeholder)*
- **public cloud** — "Managed by Blindsight in the cloud, fastest to stand up." *(placeholder)*

### 3. Engagement timeline (right column)

A vertical timeline reusing the stages' rail-and-spine visual language (numbered nodes + dashed `cstack-spine`-style connector). Eyebrow/heading: **"How engagement works"**.

Steps (data-driven array):

1. Fill out the form
2. Discovery call
3. Documents sent
4. Further call *(if needed)* — rendered as a **conditional/optional node**: dashed ring + muted styling to signal it may be skipped.
5. Demo

Each step has a short label and an optional one-line description. Built with DOM + CSS (no SVG) so it remains fluid and stacks cleanly.

### 4. `InfoPill` — reusable hover/tap info component

New component `src/components/InfoPill.tsx`, extracting the iceberg interaction into a reusable unit.

**Responsibility:** render a pill that reveals `meta` · `name` · `desc` on demand.
- **Desktop:** hover/focus → CSS tooltip (mirrors `.ib-tip`).
- **Mobile:** tap → centered modal (mirrors `.ib-modal`; Escape + backdrop close).
- **Interface (props):** `name: string`, `desc: string`, `meta?: string`, plus optional `className` for tier-specific styling.
- **State:** local `hovered` / `pinned` mirroring the iceberg, with the same `isMobile()` matchMedia check. (If a single shared open-modal-at-a-time behavior is desired across many pills, a lightweight context can coordinate; default to self-contained state unless that proves janky.)
- **Dependencies:** `lucide-react` (`X` for modal close), shared CSS in `styles.css`.

**Consumers:**
- Every stage pill — `STAGES[].items` changes from `string[]` to `{ name, meta?, desc }[]`.
- The three deployment options in §2.

**Placeholder copy:** I will draft `meta` + `desc` for all stage pills (Shadow AI visibility, Prompt injection, PII, PHI, Data leak prevention, Data poisoning, Adversarial patching, Compliance) and the three deployment options. Copy is for review in a later pass — wording is not final.

### 5. Styling (`src/styles.css`)

- Two-column grid wrapper for the stages + engagement columns; single-column collapse at the breakpoint.
- Engagement timeline styles, reusing/extending the `cstack-rail` / `cstack-num` / `cstack-spine` tokens; an `optional`/conditional node variant (dashed ring, muted).
- `InfoPill` tooltip + modal styles, adapted from `.ib-tip` / `.ib-modal` / `.ib-tip-*`. Pills keep the current `.cstack-chip` look but gain an affordance (e.g. subtle underline/cursor) signaling they're interactive.

## Non-Goals (this pass)

- **Pricing-aware Protect content.** Protect keeps its current three pills (Prompt injection, Data poisoning, Adversarial patching). The full protection list and how pricing is represented (tiers vs. per-pill vs. callout) is deferred to a separate pass.
- Final copy. All new descriptions are placeholders for later review.
- Any change to the iceberg section itself (we model on it, not refactor it — unless trivially shareable CSS makes extraction worthwhile).

## Files touched

| File | Change |
|---|---|
| `src/routes/index.tsx` | Restructure `Stages()` into two columns; add engagement-step data + column; add deployment line; change `STAGES[].items` shape to objects; render pills via `InfoPill`. |
| `src/components/InfoPill.tsx` *(new)* | Reusable hover/tap info-pill (desktop tooltip + mobile modal). |
| `src/styles.css` | Two-column grid, engagement timeline styles, InfoPill tooltip/modal styles. |

## Success criteria

- Desktop: hovering any stage pill or deployment option shows its description; engagement timeline sits to the right of the stages.
- Mobile/narrow: timeline stacks below the stages; tapping a pill opens a modal that closes on backdrop/Escape.
- The "Deploy anywhere…" line is present under the intro.
- `bun run lint` passes; no edits to `src/routeTree.gen.ts`.
