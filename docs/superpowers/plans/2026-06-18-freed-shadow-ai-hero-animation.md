# Freed Shadow AI Hero Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Free the Shadow AI hero animation from its bordered card so it fills the hero space — taller, bleeding to the hero's right edge, with floating HUD-style controls/stats — without regressing tablet or mobile.

**Architecture:** CSS-only. The DOM in `ShadowAiDemo.tsx` and the animation engine are untouched; packets are absolutely positioned within `.arena` and travel via `left`/`top` percentages, so a taller/wider arena works automatically. All edits land in `src/components/ShadowAiDemo.css`, with a possible targeted overflow guard in `src/styles.css`.

**Tech Stack:** TanStack Start (React SSR), Tailwind v4 + a co-located plain-CSS file (`ShadowAiDemo.css`), Bun, deployed on Netlify.

## Global Constraints

- **No automated test suite exists.** Verification per task = `bun run lint` and `bun run build` must succeed, PLUS the manual visual checklist in that task via `bun run dev`.
- **Do not edit** `src/routeTree.gen.ts` (auto-generated).
- **Do not change** the animation engine logic, lane data, timing, or the traffic-light palette (indigo/red/green/purple) — this is illustrative content exempt from the violet-only UI rule.
- **Do not touch** the standalone `in-action` / `InActionModal` demo.
- **Icons:** lucide-react only (already used — `Cloud`, `TriangleAlert`). No new bespoke SVG icons.
- **Mobile safety is a hard requirement** (see Task 5 acceptance criteria): no horizontal scroll ≤980px, toggle stays tappable, all four stat counters readable, vertical (`sa3`) scene still plays without clipping, light + dark both correct.
- **Spec refinement (in service of mobile safety):** The desktop full treatment (bleed + floating overlays) is confined to **≥981px** (the two-column hero). At **641–980px** the `sa2` scene is **de-boxed but keeps its chrome in normal document flow** (not floated). This is simpler and safer than floating overlays in a single-column layout, and avoids absolute-positioning collisions at tablet widths. At **≤640px** the vertical `sa3` is de-boxed with chrome in flow.

Branch: `hero-test` (already checked out). Commit after each task.

---

### Task 1: De-box both card containers

Remove the white background, border, rounded corners, padding, and `overflow: hidden` from both orientation cards so the scene sits directly on the hero. Applies at all widths (foundational for every later task). At this point the layout is still in normal flow — just un-carded.

**Files:**
- Modify: `src/components/ShadowAiDemo.css` (existing card rules, currently lines ~52–64)

**Interfaces:**
- Consumes: nothing.
- Produces: `.sa2-card` becomes `position: relative` (the positioning context that Task 3's absolute overlays pin to). Both `.sa2-card` / `.sa3-card` have zero padding and transparent/borderless chrome with `overflow: visible`.

- [ ] **Step 1: Replace the card chrome rules**

Find this block in `src/components/ShadowAiDemo.css`:

```css
.shadow-demo .sa2-card,
.shadow-demo .sa3-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
}
.shadow-demo .sa2-card {
  padding: 24px 26px 22px;
}
.shadow-demo .sa3-card {
  padding: 22px 22px 20px;
}
```

Replace it with:

```css
/* Freed hero: cards are transparent positioning stages, no chrome.
   .sa2-card is the positioning context for the desktop floating overlays. */
.shadow-demo .sa2-card,
.shadow-demo .sa3-card {
  background: none;
  border: 0;
  border-radius: 0;
  overflow: visible;
}
.shadow-demo .sa2-card {
  position: relative;
  padding: 0;
}
.shadow-demo .sa3-card {
  padding: 0;
}
```

- [ ] **Step 2: Lint and build**

Run: `bun run lint && bun run build`
Expected: both succeed, no errors.

- [ ] **Step 3: Manual visual check**

Run: `bun run dev`, open the home page.
Expected:
- The Shadow AI demo no longer has a white card/border/rounded box around it — it sits directly on the hero background.
- The animation still plays (packets fly, toggle works, auto-toggles every ~6.5s).
- Toggle to dark mode (nav): no leftover white card edges; scene reads correctly on dark.
- Nothing is clipped that was previously visible (the proxy orb's pulse ring shows).

- [ ] **Step 4: Commit**

```bash
git add src/components/ShadowAiDemo.css
git commit -m "Improve: De-box Shadow AI hero demo (remove card chrome)"
```

---

### Task 2: Desktop stage — taller arena + right-edge bleed (≥981px)

Grow the horizontal arena to fill the hero vertically and bleed its right edge (the 3rd-party AI "cloud" wall) to the hero's right padding edge. Two-column desktop only.

**Files:**
- Modify: `src/components/ShadowAiDemo.css` (append a new media block at end of file)

**Interfaces:**
- Consumes: `.sa2-card { position: relative }` from Task 1.
- Produces: a `@media (min-width: 981px)` block. The `.sa2 .arena` is now `clamp(360px, 52vh, 520px)` tall with `margin-right: -48px` (cancels the hero's 48px right padding). The `.aiwall` (`right: 0` within arena) consequently sits flush at the hero's right edge.

- [ ] **Step 1: Append the desktop stage media block**

Add to the **end** of `src/components/ShadowAiDemo.css`:

```css
/* ── Freed hero — desktop two-column only (≥981px) ──────────────────────────
   Below 981px the hero is single-column; the scene stays de-boxed but in
   normal flow (no bleed, no floating overlays) so tablet/mobile never gain
   horizontal scroll or overlay collisions. */
@media (min-width: 981px) {
  /* Taller stage; bleed the right edge so the AI wall meets the hero edge.
     -48px exactly cancels .va-hero's 48px right padding (styles.css), so the
     arena reaches the hero edge without exceeding the viewport. */
  .shadow-demo .sa2 .arena {
    height: clamp(360px, 52vh, 520px);
    margin: 20px -48px 24px 0;
  }
}
```

- [ ] **Step 2: Lint and build**

Run: `bun run lint && bun run build`
Expected: both succeed.

- [ ] **Step 3: Manual visual check (desktop width ≥1100px)**

Run: `bun run dev`, view home at a wide window.
Expected:
- The animation is noticeably taller and the four people-lanes are spread across more vertical space.
- The "3rd-party AI" cloud wall sits at the right edge of the hero (flush to the viewport edge below 1600px width; flush to the centered hero edge above).
- **No horizontal scrollbar appears.** (Resize the window from ~1100px up to very wide; confirm no scrollbar at any point.)
- Packets still travel from the people on the left, past the proxy line, to the wall.

- [ ] **Step 4: Commit**

```bash
git add src/components/ShadowAiDemo.css
git commit -m "Improve: Taller, edge-bleeding Shadow AI stage on desktop"
```

---

### Task 3: Desktop floating HUD overlays (≥981px)

Lift the toggle/badge, sub-caption, kicker, stats, and footer off the flow and float them over the open space, clearing the right-edge AI wall. Stats become translucent blurred HUD pills.

**Files:**
- Modify: `src/components/ShadowAiDemo.css` (append to the same/another `@media (min-width: 981px)` block at end of file)

**Interfaces:**
- Consumes: `.sa2-card { position: relative }` (Task 1); the bled arena geometry (Task 2) — the AI wall spans the rightmost 96px of the arena starting 48px outside the card's right edge, so overlays pinned `right: 64px` clear it with a ~16px gap.
- Produces: floating, HUD-styled chrome. No new interfaces consumed downstream except Task 4's dark override of the pill backgrounds.

- [ ] **Step 1: Append the overlay media block**

Add to the **end** of `src/components/ShadowAiDemo.css` (after the Task 2 block):

```css
@media (min-width: 981px) {
  /* Top bar floats across the top: kicker pinned left, toggle/badge right.
     right:64px keeps the toggle clear of the 96px AI wall + bleed (~16px gap).
     pointer-events gating keeps the open arena non-interactive but the toggle
     fully clickable. */
  .shadow-demo .sa2 .sa2-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 64px;
    z-index: 5;
    margin: 0;
    pointer-events: none;
  }
  .shadow-demo .sa2 .sa2-ctrl {
    pointer-events: auto;
  }

  /* Sub-caption tucks under the toggle, right-aligned, clear of the wall. */
  .shadow-demo .sa2 .sa2-sub {
    position: absolute;
    top: 42px;
    right: 64px;
    max-width: 300px;
    margin: 0;
    text-align: right;
    z-index: 5;
  }

  /* Stats float as a translucent HUD row pinned bottom-left. */
  .shadow-demo .sa2 .sa2-stats {
    position: absolute;
    left: 0;
    bottom: 0;
    width: auto;
    margin: 0;
    gap: 10px;
    z-index: 5;
  }
  .shadow-demo .sa2 .minis {
    flex: 0 0 auto;
  }
  .shadow-demo .sa2 .dgr {
    min-width: 0;
  }
  /* HUD glass treatment on the counter pills. */
  .shadow-demo .sa2 .dgr,
  .shadow-demo .sa2 .mini {
    background: color-mix(in srgb, var(--card) 72%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  /* Footer label pins to the bottom-right corner, clear of the wall. */
  .shadow-demo .sa2 .sa2-foot {
    position: absolute;
    right: 64px;
    bottom: 6px;
    margin: 0;
    z-index: 5;
  }
}
```

- [ ] **Step 2: Lint and build**

Run: `bun run lint && bun run build`
Expected: both succeed.

- [ ] **Step 3: Manual visual check (desktop width ≥1100px)**

Run: `bun run dev`.
Expected:
- The `// Shadow AI — live traffic` kicker floats top-left; the Blindsight toggle + Unprotected/Protected badge float top-right (clear of the AI wall, not overlapping it).
- The sub-caption sits under the toggle, right-aligned, and swaps text when you toggle protection.
- The four stat counters (Data leaked / Allowed / Redacted / Blocked) float as a translucent, slightly blurred HUD row at the bottom-left; the `// blindsight — securing AI` footer sits bottom-right.
- **The toggle is clickable** and flips protection on/off; clicking pauses the auto-toggle.
- Flying packets pass behind the HUD pills (HUD reads as an overlay), and the toggle never sits on top of the cloud wall.

- [ ] **Step 4: Commit**

```bash
git add src/components/ShadowAiDemo.css
git commit -m "Improve: Float Shadow AI controls and stats as HUD overlays"
```

---

### Task 4: Dark-mode HUD pill surfaces (≥981px)

The translucent `color-mix(... var(--card) ...)` pill background from Task 3 is overridden by the existing opaque dark rule (`[data-theme="dark"] .shadow-demo .mini { background: var(--surface-2) }`). Add a more specific dark override so the HUD pills stay translucent + blurred on dark.

**Files:**
- Modify: `src/components/ShadowAiDemo.css` (append a final media block at end of file)

**Interfaces:**
- Consumes: the floating pill selectors from Task 3.
- Produces: nothing downstream.

- [ ] **Step 1: Append the dark HUD override**

Add to the **very end** of `src/components/ShadowAiDemo.css` (after the Task 3 block, so it wins on order as well as specificity):

```css
/* Dark: keep the freed desktop HUD pills translucent + blurred (the base dark
   rule sets them opaque via --surface-2). Specificity (4) + later position
   beats [data-theme="dark"] .shadow-demo .mini. */
@media (min-width: 981px) {
  [data-theme="dark"] .shadow-demo .sa2 .dgr,
  [data-theme="dark"] .shadow-demo .sa2 .mini {
    background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  }
}
```

- [ ] **Step 2: Lint and build**

Run: `bun run lint && bun run build`
Expected: both succeed.

- [ ] **Step 3: Manual visual check (desktop, dark mode)**

Run: `bun run dev`, switch to dark mode via the nav toggle, view home at a wide window.
Expected:
- The HUD stat pills are translucent dark glass (blurred), not flat opaque boxes — consistent with the light-mode HUD.
- Counter text (red leaked count, green/indigo/purple minis) remains legible against the blurred background.
- Toggle back to light mode: pills still correct (Task 3 behavior unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/components/ShadowAiDemo.css
git commit -m "Fix: Dark-mode translucent HUD pills for freed hero demo"
```

---

### Task 5: Responsive & mobile no-regression verification (+ guard if needed)

Verify the hard mobile-safety criteria across breakpoints and add a targeted overflow guard only if a real horizontal overflow is observed. This task is mostly verification; the only conditional code change is the guard.

**Files:**
- Possibly modify: `src/styles.css` (`.va-hero-inner`) — ONLY if Step 2 finds horizontal overflow.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: nothing downstream.

- [ ] **Step 1: Build to confirm a clean production bundle**

Run: `bun run lint && bun run build`
Expected: both succeed.

- [ ] **Step 2: Breakpoint sweep in dev (the acceptance criteria)**

Run: `bun run dev`. Using browser devtools responsive mode, check these widths in **both light and dark**:

- **1440px (desktop):** full treatment — taller scene, edge bleed, floating HUD, toggle clickable. No horizontal scrollbar.
- **1024px (small desktop, still two-column):** overlays still clear the AI wall; stats row and footer don't overlap. No horizontal scrollbar.
- **900px (tablet, single-column):** `sa2` is de-boxed but chrome is back in **normal flow** (toggle/kicker on top, stats below) — NOT floating. No bleed. No horizontal scrollbar.
- **768px (tablet):** same as 900px; readable, no overflow.
- **600px (phone, vertical `sa3`):** vertical scene shows, de-boxed, chrome in flow; the AI wall at the bottom and all packets are visible (not clipped); toggle is a comfortable tap target; all four stat counters readable.
- **375px (small phone):** no horizontal scroll; toggle tappable; stats readable; vertical animation plays and fits.

Record any width where a **horizontal scrollbar** appears or content is clipped/overlapping.

- [ ] **Step 3: Conditional overflow guard (ONLY if Step 2 found horizontal scroll)**

If — and only if — a horizontal scrollbar appears at any width due to the desktop bleed, add a guard to `.va-hero-inner` in `src/styles.css`. (`.va-hero-inner` does NOT contain the full-bleed `LogoStrip`, which is a sibling, so clipping here is safe and won't break the logo strip's `100vw` breakout.)

Find:

```css
.va-hero-inner {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  gap: 56px;
  align-items: center;
}
```

Add `overflow-x: clip;` (clip, not hidden — it doesn't create a scroll container):

```css
.va-hero-inner {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  gap: 56px;
  align-items: center;
  overflow-x: clip;
}
```

Then re-run `bun run lint && bun run build` and re-check Step 2 widths: confirm the scrollbar is gone AND the proxy orb's pulse ring is not visibly clipped at the arena top/bottom. If the orb ring gets clipped, instead revert this and reduce the bleed in Task 2 to `margin-right: -44px`.

If Step 2 found **no** overflow, skip this step entirely (no code change).

- [ ] **Step 4: Commit (only if Step 3 made a change)**

```bash
git add src/styles.css
git commit -m "Fix: Guard hero against horizontal overflow from demo bleed"
```

If no change was made in Step 3, there is nothing to commit for this task.

---

## Self-Review

**Spec coverage:**
- Drop card chrome → Task 1. ✓
- Taller arena + right-edge bleed to hero edge (not raw viewport) → Task 2. ✓
- Floating overlay chrome (toggle, sub, kicker, stats HUD, footer) → Task 3. ✓
- Dark variant of HUD pills → Task 4. ✓
- Responsive: ≥981 full, 641–980 de-boxed in-flow (refinement, noted in Global Constraints), ≤640 `sa3` de-boxed in-flow → Tasks 1 + 5. ✓
- Mobile no-regression acceptance criteria (no overflow, tappable toggle, readable stats, vertical plays, light+dark) → Task 5. ✓
- Overflow guard risk → Task 5 Step 3 (conditional). ✓
- CSS-only, engine untouched → all tasks touch only CSS. ✓

**Placeholder scan:** No TBD/TODO; every code step shows the exact CSS. Verification steps are concrete (lint/build + explicit visual expectations) given no test suite exists.

**Type/selector consistency:** Selectors used are consistent with the actual DOM in `ShadowAiDemo.tsx` (`.sa2-card`, `.sa2-top`, `.sa2-ctrl`, `.sa2-sub`, `.sa2-stats`, `.dgr`, `.minis`, `.mini`, `.sa2-foot`, `.arena`, `.aiwall`) and the existing dark selectors in `ShadowAiDemo.css`. The `right: 64px` clearance value is derived consistently from the `aiwall` width (96px) + `-48px` bleed across Tasks 2 and 3.
