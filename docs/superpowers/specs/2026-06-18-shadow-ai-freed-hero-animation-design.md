# Freed Shadow AI hero animation — design

**Date:** 2026-06-18
**Component:** `src/components/ShadowAiDemo.tsx` + `src/components/ShadowAiDemo.css`
**Hero host:** `src/routes/index.tsx` (`Hero`), `src/styles.css` (`.va-hero*`)

## Problem

The Shadow AI hero animation reads as "box-y": it lives inside a white,
bordered, rounded card (`.sa2-card` / `.sa3-card`) confined to the right
column of the hero's two-column grid (`minmax(0,0.7fr) minmax(0,1.3fr)`). The
card chrome plus the stacked secondary panels (kicker, toggle, sub-caption,
stats panel, footer) make it feel cramped and contained, wasting the open
space of the full-height hero.

## Goal

Free the animation from its container so it makes fuller use of hero space,
while keeping the left-column copy intact. Lean into a more space-filling,
immersive scene. **Do not regress the mobile experience.**

## Decisions (from brainstorming)

- **Keep the copy.** Left column heading/lede/CTA stays as-is.
- **Lean into space-filling** for the animation.
- **Float the secondary UI as overlays** (toggle, stats, kicker, footer) over
  the open animation space rather than stacking them in a card.
- **Composition: bleed right, copy stays left.** Copy anchored in the left
  margin; animation breaks out of its column, grows taller, and bleeds to the
  hero's right edge so the 3rd-party AI "cloud" sits near the screen edge.

## Design

### 1. Layout & bleed (desktop ≥980px)

- Keep the hero two-column grid and left copy column unchanged.
- Remove card chrome from `.sa2-card`: drop background, border, border-radius,
  padding, and `overflow: hidden`. The scene sits directly on the hero.
- The demo column's arena gets a negative right margin (≈ `-48px`, cancelling
  the hero's right padding) so the AI "cloud" wall sits flush at the hero edge.
  Bleed targets the hero's right padding edge, **not** the raw viewport — on
  ultra-wide screens the hero is centered at `max-width: 1600px`, so bleeding to
  the viewport would open a large gap.
- Arena height grows from `224px` to `clamp(360px, 52vh, 520px)`. The four
  lanes' `y` percentages (14/38/62/86%) already scale, so lanes redistribute
  across the taller space with mostly a height change.

### 2. Floating overlay chrome (desktop ≥980px)

- **Toggle** (Blindsight switch + Unprotected/Protected badge): floats
  top-right of the arena over open space.
- **Sub-caption** (`SUB_OFF`/`SUB_ON`): tucks under the toggle, top-right.
- **Stats** (Data leaked / Allowed / Redacted / Blocked): float as light,
  semi-transparent HUD pills along the arena's bottom edge — `backdrop-blur` +
  hairline border, not a solid panel.
- **Kicker** (`// Shadow AI — live traffic`) and **footer**
  (`// blindsight — securing AI`): faint mono labels pinned to arena corners
  (top-left / bottom-right), no panel.
- Overlays live in the arena margins with enough internal arena padding that
  flying packets never collide with them.

### 3. Responsive behavior

- **640–980px (single-column, still horizontal `sa2`):** copy centers above the
  demo. Card chrome still dropped; chrome still floats. **No right-edge bleed**
  (no left column to play against) — arena stays within hero padding. The
  negative bleed margin is applied ONLY inside the `≥980px` rule so it can never
  introduce horizontal overflow at this width.
- **≤640px (vertical `sa3`):** **Mobile-safe priority over "free" aesthetics.**
  Drop the white card (de-box) and sit the scene on the hero background, but
  **keep the toggle and stats in normal document flow** (not absolutely
  positioned overlays). Floating overlays on a narrow viewport risk collisions
  with packets and with each other; in-flow stacking preserves tap targets and
  readability. The vertical scene is already tight, so "freeing" here means
  removing the card, not repositioning controls.

### 4. Mobile / no-regression requirements (explicit acceptance criteria)

These MUST hold after the change:

1. **No horizontal scroll / overflow-x** at any width ≤980px. The bleed margin
   is desktop-only; verify `.va-hero` / `.va-hero-demo` don't gain unwanted
   `overflow` that clips or scrolls on mobile.
2. **Toggle remains a comfortable tap target** (≥40px effective hit area) and
   stays fully visible and tappable on small screens.
3. **Stats stay readable** — all four counters legible, not overlapping packets
   or each other, on phone widths.
4. **Vertical (`sa3`) animation still plays and fits** within the hero without
   clipping packets or the AI wall.
5. **Light and dark** both correct at mobile widths.

### 5. Implementation approach

- **CSS-only by default.** The DOM in `ShadowAiDemo.tsx` and the animation
  engine stay untouched — packets are absolutely positioned in `.arena` and
  travel via `left`/`top` percentages, so a taller/wider arena "just works."
  All primary edits land in `ShadowAiDemo.css`.
- Restructure `.sa2-top` / `.sa2-stats` from in-flow blocks to
  `position: absolute` overlays within/around `.arena` (desktop only).
- Add bleed margin + new arena height; add `backdrop-blur` HUD styling for the
  floating pills.
- **Dark variant** (bottom of `ShadowAiDemo.css`) needs matching tweaks: the
  floating pills' translucent backgrounds and hairline borders must resolve on
  dark — reuse `--surface-2` / `--border-mid` tokens already wired there.
- Possible small `index.tsx` / `styles.css` touch only if `.va-hero` /
  `.va-hero-demo` `overflow`/`min-width` clips the bleed — verify and adjust.

### Risks

- Overlay chrome colliding with flying packets → keep pills in margins, add
  arena internal padding.
- Right-edge bleed vs. the centered `max-width: 1600px` hero on ultra-wide
  screens → bleed to hero edge, not raw viewport.
- Negative margin leaking into ≤980px and causing overflow → gate strictly
  inside the `≥980px` media query.

## Out of scope

- No changes to the animation engine logic, lane data, timing, or palette.
- No changes to the standalone `in-action` / `InActionModal` demo.
- No unrelated hero refactoring beyond what the bleed requires.
