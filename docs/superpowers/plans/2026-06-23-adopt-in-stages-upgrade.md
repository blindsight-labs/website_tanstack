# Adopt in Stages — Section Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deployment line, a vertical engagement-flow timeline beside the stages, and iceberg-style hover/tap info to every stage pill (and the deployment options) in the home page's "Adopt in stages" section.

**Architecture:** A new reusable `InfoPill` component reproduces the iceberg marker interaction (desktop hover tooltip + mobile tap modal) for any short label. `Stages()` in `src/routes/index.tsx` is restructured into a two-column grid: the existing Detect/Protect/Govern tiers on the left, a new numbered/dashed-spine engagement timeline on the right (DOM + CSS, no SVG), collapsing to one column at ≤900px. All new CSS lives in `src/styles.css` and reuses existing design tokens and the two `ib-modal` keyframes.

**Tech Stack:** TanStack Start + React, Tailwind v4 with custom token layer in `src/styles.css`, `lucide-react` icons, Bun.

## Global Constraints

- Package manager / runner is **Bun**: `bun run lint`, `bun run build`.
- **No test suite exists** in this project. Verification per task = `bun run lint` passes, `bun run build` succeeds, plus a stated manual browser check. There is no unit-test harness to add.
- **Never edit `src/routeTree.gen.ts`** — it is auto-generated.
- **Design system:** UI chrome uses black/white + the single violet accent (`--violet`, `--violet-deep`, `--violet-soft`); red reserved for danger. Use existing CSS tokens (`--surface`, `--surface-2`, `--border`, `--border-mid`, `--violet-border`, `--muted`, `--text`, `--shadow-sm/md/lg`, `--bg-alt`). No new colors.
- **Icons:** lucide-react only (`X` is the only icon needed here). No inline-SVG glyphs/emoji.
- **Mobile breakpoint for tooltip→modal switch is `max-width: 640px`** (matches the iceberg). The **layout collapse breakpoint is `max-width: 900px`** (two-column → stacked). These are intentionally different.
- All new descriptive copy is **placeholder** for later review — wording is not final, but must be real sentences (no "TBD"/"Lorem").

---

### Task 1: `InfoPill` reusable component + styles

Creates the hover/tap info-pill used by both the stage pills and the deployment options. Self-contained local state (no shared context) — only one modal is ever visible on mobile because its backdrop covers the screen.

**Files:**
- Create: `src/components/InfoPill.tsx`
- Modify: `src/styles.css` (append a new `InfoPill` block near the end, before the `@keyframes ib-modal-in` block at line ~1294 so it can reuse those keyframes — appending after them also works)

**Interfaces:**
- Produces: `export type PillInfo = { name: string; desc: string; meta?: string }` and `export function InfoPill(props: PillInfo & { className?: string }): JSX.Element`.

- [ ] **Step 1: Create the component**

Create `src/components/InfoPill.tsx`:

```tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type PillInfo = {
  name: string;
  desc: string;
  /** Short uppercase kicker shown above the name (optional). */
  meta?: string;
};

const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

/** A small pill that reveals `meta · name · desc` on hover/focus (desktop)
 *  or in a centered tap-modal (mobile). Modeled on the iceberg markers. */
export function InfoPill({
  name,
  desc,
  meta,
  className = "",
}: PillInfo & { className?: string }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Mobile modal closes on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  const tap = () => (isMobile() ? setPinned((p) => !p) : setHovered((h) => !h));

  return (
    <>
      <button
        type="button"
        className={`ipill ${hovered ? "active" : ""} ${className}`.trim()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={tap}
        aria-expanded={hovered}
      >
        <span className="ipill-label">{name}</span>
        <span className="ipill-tip" role="tooltip">
          {meta && <span className="ipill-tip-meta">{meta}</span>}
          <span className="ipill-tip-name">{name}</span>
          <span className="ipill-tip-desc">{desc}</span>
        </span>
      </button>

      {pinned && (
        <div
          className="ipill-modal"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setPinned(false)}
        >
          <div className="ipill-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ipill-modal-close"
              onClick={() => setPinned(false)}
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {meta && <span className="ipill-tip-meta">{meta}</span>}
            <span className="ipill-tip-name">{name}</span>
            <p className="ipill-tip-desc">{desc}</p>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Add the styles**

Append to `src/styles.css` (anywhere after the `.cstack-*` block; the `@media (max-width:640px)` modal reuses the existing `ib-modal-in` / `ib-modal-card-in` keyframes already defined in the file):

```css
/* ── InfoPill: hover/tap info pill (modeled on the iceberg markers) ── */
.ipill {
  position: relative;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.02em;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border-mid);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: help;
}
.ipill:hover,
.ipill.active {
  border-color: var(--violet);
}
.ipill-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  width: 240px;
  padding: 14px 16px;
  text-align: left;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  z-index: 20;
  transition:
    opacity 0.16s ease,
    visibility 0.16s ease;
}
.ipill:hover .ipill-tip,
.ipill.active .ipill-tip {
  opacity: 1;
  visibility: visible;
}
.ipill-tip::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: -6px;
  width: 11px;
  height: 11px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  transform: translateX(-50%) rotate(45deg);
}
.ipill-tip-meta {
  display: block;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--violet-deep);
  margin-bottom: 5px;
}
.ipill-tip-name {
  display: block;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}
.ipill-tip-desc {
  display: block;
  font-family: var(--font-sans);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--muted);
}
.ipill-modal {
  display: none;
}
@media (max-width: 640px) {
  .ipill {
    cursor: pointer;
  }
  .ipill-tip {
    display: none;
  }
  .ipill-modal {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: 200;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(17, 17, 24, 0.5);
    backdrop-filter: blur(3px);
    animation: ib-modal-in 0.18s ease-out;
  }
  .ipill-modal-card {
    position: relative;
    width: 100%;
    max-width: 360px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 22px 22px 24px;
    box-shadow: var(--shadow-lg);
    animation: ib-modal-card-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .ipill-modal-card .ipill-tip-name {
    font-size: 17px;
    margin-bottom: 8px;
    padding-right: 28px;
  }
  .ipill-modal-card .ipill-tip-desc {
    font-size: 13.5px;
  }
  .ipill-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: var(--bg-alt);
    border: 1px solid var(--border);
    color: var(--muted);
    cursor: pointer;
  }
  .ipill-modal-close:hover {
    color: var(--text);
    border-color: var(--border-mid);
  }
}
```

- [ ] **Step 3: Lint**

Run: `bun run lint`
Expected: PASS (no errors). The component is not yet imported anywhere, which is fine.

- [ ] **Step 4: Commit**

```bash
git add src/components/InfoPill.tsx src/styles.css
git commit -m "Add: InfoPill hover/tap info component"
```

---

### Task 2: Convert stage pills to `InfoPill` with placeholder copy

Changes `STAGES[].items` from `string[]` to `PillInfo[]` and renders each via `InfoPill`. Protect keeps its current three items (pricing/full list is out of scope this pass).

**Files:**
- Modify: `src/routes/index.tsx` (the `STAGES` array at ~228-267, the import block at ~3-15, and the pill render in `Stages()` at ~303-309)

**Interfaces:**
- Consumes: `InfoPill`, `PillInfo` from Task 1.
- Produces: `STAGES[].items` is now `PillInfo[]` (relied on by the render in this task only).

- [ ] **Step 1: Import `InfoPill`**

Add to the existing local-import group in `src/routes/index.tsx` (near line 17-23):

```tsx
import { InfoPill, type PillInfo } from "@/components/InfoPill";
```

- [ ] **Step 2: Change the `items` type and data**

In the `STAGES` type annotation, change `items: string[];` to `items: PillInfo[];`. Replace each stage's `items` array with placeholder copy:

```tsx
  {
    id: "detect",
    num: "01",
    name: "Detect",
    Icon: ScanEye,
    tagline:
      "See every AI interaction — and the exposure hiding inside it. Visibility is the proof of value, before you spend a franc on defense.",
    requires: "Foundation · start here",
    items: [
      {
        name: "Shadow AI visibility",
        meta: "Detect",
        desc: "Surfaces every AI tool and interaction in use across your org — including the ones nobody approved.",
      },
      {
        name: "Prompt injection",
        meta: "Detect",
        desc: "Flags attempts to talk the model out of its instructions, from the obvious to the subtly disguised.",
      },
      {
        name: "PII",
        meta: "Detect",
        desc: "Spots personally identifiable information moving into or out of AI prompts and responses.",
      },
      {
        name: "PHI",
        meta: "Detect",
        desc: "Identifies protected health information in AI traffic, so regulated data doesn't leak unnoticed.",
      },
      {
        name: "Data leak prevention",
        meta: "Detect",
        desc: "Catches sensitive data leaving the organization through AI channels before it becomes an incident.",
      },
    ],
  },
  {
    id: "protect",
    num: "02",
    name: "Protect",
    Icon: ShieldCheck,
    tagline:
      "Top-of-the-line security that stops what Detect surfaces — at the prompt, in the data, and across retrieval.",
    requires: "Requires Detect",
    items: [
      {
        name: "Prompt injection",
        meta: "Protect",
        desc: "Blocks injection attempts at the prompt boundary before they reach the model.",
      },
      {
        name: "Data poisoning",
        meta: "Protect",
        desc: "Defends training and fine-tuning pipelines against tainted samples that corrupt model behavior.",
      },
      {
        name: "Adversarial patching",
        meta: "Protect",
        desc: "Neutralizes crafted perturbations designed to steer the model toward the wrong answer.",
      },
    ],
  },
  {
    id: "govern",
    num: "03",
    name: "Govern",
    Icon: Scale,
    tagline:
      "Turn enforcement into an audit trail you can prove — mapped to the regulations you answer to.",
    requires: "Requires Protect",
    items: [
      {
        name: "Compliance",
        meta: "Govern",
        desc: "Maps enforcement to the regulations you answer to and produces an audit trail you can hand to an auditor.",
      },
    ],
  },
```

- [ ] **Step 3: Render pills via `InfoPill`**

In `Stages()`, replace the existing items list (currently `.cstack-chip` `<li>`s):

```tsx
                <ul className="cstack-items">
                  {items.map((it) => (
                    <li className="cstack-chip" key={it}>
                      {it}
                    </li>
                  ))}
                </ul>
```

with:

```tsx
                <ul className="cstack-items">
                  {items.map((it) => (
                    <li key={it.name}>
                      <InfoPill name={it.name} meta={it.meta} desc={it.desc} />
                    </li>
                  ))}
                </ul>
```

- [ ] **Step 4: Lint + build**

Run: `bun run lint && bun run build`
Expected: both PASS. (The now-unused `.cstack-chip` CSS rule may remain harmlessly; leave it.)

- [ ] **Step 5: Manual check**

Run `bun run dev`, open the home page, scroll to "Adopt in stages". Hovering a pill (e.g. "PII") shows a tooltip with the description above it. Narrow the window to <640px (or use devtools device mode) and tap a pill — a centered modal appears and closes on backdrop tap / Escape.

- [ ] **Step 6: Commit**

```bash
git add src/routes/index.tsx
git commit -m "Update: stage pills carry hover/tap info"
```

---

### Task 3: Deployment line under the section intro

Adds the "Deploy anywhere" line, with the three deployment options as `InfoPill`s.

**Files:**
- Modify: `src/routes/index.tsx` (`Stages()`, just after the `.s-head` block at ~283)
- Modify: `src/styles.css` (add `.cstack-deploy` styles)

**Interfaces:**
- Consumes: `InfoPill` from Task 1.

- [ ] **Step 1: Add the markup**

In `Stages()`, immediately after the closing `</div>` of the `.s-head` block, insert:

```tsx
        <div className="cstack-deploy reveal">
          <span className="cstack-deploy-label">Deploy anywhere</span>
          <InfoPill
            name="On-prem"
            meta="Deployment"
            desc="Runs entirely on your own hardware, air-gapped if required — nothing leaves your perimeter."
          />
          <InfoPill
            name="Private cloud"
            meta="Deployment"
            desc="Deployed inside your own cloud tenant or VPC, isolated to your organization."
          />
          <InfoPill
            name="Public cloud"
            meta="Deployment"
            desc="Managed by Blindsight in the cloud — the fastest way to stand up and evaluate."
          />
        </div>
```

- [ ] **Step 2: Add the styles**

Append to `src/styles.css` (near the `.cstack-*` block):

```css
.cstack-deploy {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 22px auto 0;
}
.cstack-deploy-label {
  font-size: 14px;
  color: var(--muted);
}
```

- [ ] **Step 3: Lint + build**

Run: `bun run lint && bun run build`
Expected: both PASS.

- [ ] **Step 4: Manual check**

`bun run dev` → the line "Deploy anywhere [On-prem] [Private cloud] [Public cloud]" sits centered under the intro; each option reveals its description on hover (desktop) / tap (mobile).

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/styles.css
git commit -m "Add: deployment-anywhere line to Adopt in stages"
```

---

### Task 4: Two-column layout + engagement timeline

Wraps the stages and a new engagement timeline in a two-column grid; moves the "Modular by design…" note to a full-width caption below.

**Files:**
- Modify: `src/routes/index.tsx` (add the `ENGAGEMENT` data near `STAGES`; restructure the `Stages()` return — wrap the `<ol className="cstack">` and a new `<aside>` in `.cstack-grid`; keep `.cstack-note` outside the grid)
- Modify: `src/styles.css` (add `.cstack-grid` + `.engage-*` styles and the 900px collapse)

**Interfaces:**
- Consumes: nothing from earlier tasks (engagement steps are plain text/numbers, not InfoPills).
- Produces: `const ENGAGEMENT: { label: string; note?: string; optional?: boolean }[]`.

- [ ] **Step 1: Add the engagement data**

In `src/routes/index.tsx`, directly after the `STAGES` array definition (after line ~267), add:

```tsx
/* ── Engagement flow shown beside the coverage stack ── */
const ENGAGEMENT: { label: string; note?: string; optional?: boolean }[] = [
  { label: "Fill out the form" },
  { label: "Discovery call" },
  { label: "Documents sent" },
  { label: "Further call", note: "if needed", optional: true },
  { label: "Demo" },
];
```

- [ ] **Step 2: Restructure the `Stages()` return**

Replace the current body (the `<ol className="cstack reveal">…</ol>` and the `<p className="cstack-note reveal">…</p>` that follows it) so the `<ol>` is wrapped in a grid alongside the new engagement aside, and the note stays below the grid. The intro `.s-head` and the `.cstack-deploy` block from Task 3 are unchanged above this.

```tsx
        <div className="cstack-grid reveal">
          <ol className="cstack">
            {STAGES.map(({ id, num, name, Icon, tagline, requires, items }, i) => (
              <li className={`cstack-tier cstack-${id}`} key={id}>
                <div className="cstack-rail" aria-hidden="true">
                  <span className="cstack-num">{num}</span>
                  {i < STAGES.length - 1 && <span className="cstack-spine" />}
                </div>
                <div className="cstack-card">
                  <div className="cstack-head">
                    <span className="cstack-icon">
                      <Icon strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <div className="cstack-headtext">
                      <h3 className="cstack-name">{name}</h3>
                      <span className="cstack-requires">{requires}</span>
                    </div>
                  </div>
                  <p className="cstack-tagline">{tagline}</p>
                  <ul className="cstack-items">
                    {items.map((it) => (
                      <li key={it.name}>
                        <InfoPill name={it.name} meta={it.meta} desc={it.desc} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          <aside className="engage">
            <span className="engage-eyebrow">How engagement works</span>
            <ol className="engage-steps">
              {ENGAGEMENT.map((s, i) => (
                <li
                  className={`engage-step ${s.optional ? "is-optional" : ""}`}
                  key={s.label}
                >
                  <div className="engage-rail" aria-hidden="true">
                    <span className="engage-num">{i + 1}</span>
                    {i < ENGAGEMENT.length - 1 && <span className="engage-spine" />}
                  </div>
                  <div className="engage-body">
                    <span className="engage-step-label">{s.label}</span>
                    {s.note && <span className="engage-step-note">{s.note}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        <p className="cstack-note reveal">
          Modular by design — begin with Detect to prove the value, then layer in Protect and Govern
          as you need them.
        </p>
```

Note: the old `<ol className="cstack reveal">` loses its `reveal` class (the wrapper `.cstack-grid` carries `reveal` now). Confirm no stray duplicate `cstack-note`/`</ol>` remains from the original markup.

- [ ] **Step 3: Add the styles**

Append to `src/styles.css` (after the `.cstack-*` block, before the `@media (max-width: 620px)` cstack rules or after — order is fine since selectors don't overlap):

```css
/* ── Two-column: coverage stack + engagement flow ── */
.cstack-grid {
  margin: 56px auto 0;
  max-width: 1080px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 48px;
  align-items: start;
}
.cstack-grid .cstack {
  margin: 0;
  max-width: none;
}
.engage {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 26px;
  box-shadow: var(--shadow-md);
}
.engage-eyebrow {
  display: block;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--violet);
  margin-bottom: 22px;
}
.engage-steps {
  list-style: none;
  display: flex;
  flex-direction: column;
}
.engage-step {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 16px;
}
.engage-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.engage-num {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  background: var(--surface);
  color: var(--violet);
  border: 1.5px solid var(--violet-border);
  box-shadow: var(--shadow-sm);
}
.engage-step.is-optional .engage-num {
  border-style: dashed;
  color: var(--muted);
  background: var(--surface-2);
}
.engage-spine {
  flex: 1;
  width: 2px;
  min-height: 16px;
  margin: 6px 0;
  background: repeating-linear-gradient(var(--violet-border) 0 5px, transparent 5px 11px);
}
.engage-body {
  padding-top: 7px;
  padding-bottom: 18px;
}
.engage-step:last-child .engage-body {
  padding-bottom: 0;
}
.engage-step-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.engage-step.is-optional .engage-step-label {
  color: var(--muted);
}
.engage-step-note {
  display: block;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  margin-top: 3px;
}
@media (max-width: 900px) {
  .cstack-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 860px;
  }
}
```

- [ ] **Step 4: Lint + build**

Run: `bun run lint && bun run build`
Expected: both PASS.

- [ ] **Step 5: Manual check**

`bun run dev` → on a wide viewport the engagement timeline sits to the right of the three stages, numbered 1–5 with a dashed spine; step 4 ("Further call · if needed") has a dashed ring and muted text. Below ~900px the timeline stacks beneath the stages. The "Modular by design…" caption spans full width at the bottom.

- [ ] **Step 6: Commit**

```bash
git add src/routes/index.tsx src/styles.css
git commit -m "Add: engagement-flow timeline beside Adopt in stages"
```

---

## Self-Review

**Spec coverage:**
- Deploy on-prem/cloud line → Task 3. ✓
- Engagement diagram (form → discovery → docs → optional call → demo) → Task 4. ✓
- Pill hover info like iceberg numbers → Tasks 1 + 2 (and deployment options in 3). ✓
- Pricing-aware Protect → explicitly Non-Goal in spec; not planned. ✓ (intentional gap)
- Two-column layout, stacks on narrow, modular note full-width → Task 4. ✓

**Placeholder scan:** No "TBD"/"TODO"/"add error handling" steps; all copy is real placeholder sentences; all code shown in full.

**Type consistency:** `PillInfo` (`name`/`desc`/`meta?`) defined in Task 1 and consumed unchanged in Tasks 2 & 3; `STAGES[].items: PillInfo[]` matches the `InfoPill` props; `ENGAGEMENT` shape (`label`/`note?`/`optional?`) defined and consumed only in Task 4. CSS class names (`ipill*`, `engage*`, `cstack-grid`, `cstack-deploy`) are consistent between the JSX that emits them and the CSS that styles them.
