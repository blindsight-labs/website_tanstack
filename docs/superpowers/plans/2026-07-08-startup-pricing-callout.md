# Startup Pricing Call-Out Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-competing, informational call-out to the shared demo request form that acknowledges startups (≤10 people) and lets them flag interest in startup-friendly pricing.

**Architecture:** Single-file UI change in `src/components/DemoForm.tsx` — the form shared by `DemoModal.tsx`'s `demo`/`download` variants and the standalone `/demo` route — plus a small CSS addition in `src/styles.css`. No server/schema changes: the note text rides inside the existing free-text `message` field.

**Tech Stack:** React 18 (this form is uncontrolled — reads via `FormData` on submit, so the textarea needs a `ref`), Tailwind v4 + custom CSS design tokens (`src/styles.css`), TanStack Start.

## Global Constraints

- Copy must stay soft/non-committal: "startup-friendly pricing" — never a specific discount, price, or "free" claim (spec: no locked offer/terms exist yet).
- The call-out must not visually compete with the primary submit button — plain text, with only the "Let us know" affordance styled as an underlined violet link (no button chrome).
- No backend/schema changes — `src/lib/demo.functions.ts` is untouched.
- The note text only ever lives inside the existing `message` textarea — no new form fields, no new server payload keys.
- Must render identically in both the `demo` and `download` modal variants, and on the standalone `/demo` page (single shared component, no per-surface conditionals).
- Reference spec: `docs/superpowers/specs/2026-07-08-startup-pricing-callout-design.md`.

---

### Task 1: Add the startup pricing call-out to DemoForm

**Files:**
- Modify: `src/components/DemoForm.tsx`
- Modify: `src/styles.css` (insert after the `.demo-consent` rules, ~line 5236)

**Interfaces:**
- No new exports, props, or shared types — this is entirely internal to `DemoForm.tsx`. `DemoForm`'s existing `{ variant }` prop signature is unchanged.

- [ ] **Step 1: Add `useRef` to the React import and define the note text constant**

In `src/components/DemoForm.tsx`, change line 2 and add a new module-level constant right after the imports (after line 5, before the JSDoc comment on line 7):

```tsx
import { useRef, useState, type FormEvent } from "react";
```

```tsx
const STARTUP_NOTE = "We're a startup (≤10 people) — interested in startup pricing.";
```

- [ ] **Step 2: Add the textarea ref and click handler inside the component**

Immediately after the existing state declarations (after `const [done, setDone] = useState(false);` on line 15), add:

```tsx
  const messageRef = useRef<HTMLTextAreaElement>(null);
```

Immediately after the closing brace of `onSubmit` (after line 58, before the `return (` on line 60), add:

```tsx
  function handleStartupNoteClick() {
    const el = messageRef.current;
    if (!el) return;
    if (!el.value.includes(STARTUP_NOTE)) {
      el.value = el.value.length > 0 ? `${el.value}\n${STARTUP_NOTE}` : STARTUP_NOTE;
    }
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }
```

This is idempotent (won't double-insert on repeat clicks), preserves anything the user already typed, and always leaves focus in the textarea with the cursor at the end.

- [ ] **Step 3: Attach the ref to the textarea**

The textarea is currently (lines 94–99):

```tsx
            <textarea
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="e.g. I'm deploying AI across my organization and need to make sure we don't leak information to third parties."
            />
```

Add `ref={messageRef}` as the first prop:

```tsx
            <textarea
              ref={messageRef}
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="e.g. I'm deploying AI across my organization and need to make sure we don't leak information to third parties."
            />
```

- [ ] **Step 4: Insert the call-out between the consent checkbox and the error/submit button**

The consent block and what follows currently reads (lines 101–112):

```tsx
          <label className="demo-consent">
            <input name="consent" type="checkbox" defaultChecked />
            <span>I agree to be contacted by Blindsight about this request.</span>
          </label>
          {error && (
            <div className="demo-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : isDownload ? "Send my download link" : "Request demo"}
          </button>
```

Insert a new `<p>` immediately after the closing `</label>` of `.demo-consent` and before the `{error && (...)}` block:

```tsx
          <label className="demo-consent">
            <input name="consent" type="checkbox" defaultChecked />
            <span>I agree to be contacted by Blindsight about this request.</span>
          </label>
          <p className="demo-startup-note">
            Team of 10 or fewer?{" "}
            <button type="button" className="demo-startup-link" onClick={handleStartupNoteClick}>
              Let us know
            </button>{" "}
            — we'll follow up with startup-friendly pricing.
          </p>
          {error && (
            <div className="demo-error" role="alert">
              {error}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Sending…" : isDownload ? "Send my download link" : "Request demo"}
          </button>
```

The `type="button"` on the "Let us know" control is required — this form has no other button until the submit button, and without an explicit type a `<button>` inside a `<form>` defaults to `type="submit"` and would send the form early.

- [ ] **Step 5: Add the CSS for `.demo-startup-note` and `.demo-startup-link`**

In `src/styles.css`, the `.demo-consent` rules end at line 5236 (`.demo-consent input { margin-top: 3px; }`), immediately followed by `.demo-error` at line 5237. Insert the new rules between them:

```css
.demo-startup-note {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}
.demo-startup-link {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--violet);
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.demo-startup-link:hover {
  color: var(--violet-deep);
}
```

`.demo-form`'s `gap: 18px` (flex column) already spaces this `<p>` consistently above and below — no extra margin needed. `--violet` and `--violet-deep` are pre-existing tokens (`src/styles.css:31/68` light/dark, `--violet-deep` defined alongside them) already used elsewhere in this file, so both themes are covered automatically.

- [ ] **Step 6: Manual verification**

This repo has no automated test suite (see `CLAUDE.md`), so verification is manual against a locally running dev server. **Do not start a new dev server** — check whether one is already running first (e.g. ask the user, or check the usual dev port); if not, ask the user to run `bun run dev` themselves rather than starting it yourself.

Once a dev server is available, in the browser:

1. Open the homepage, click the nav or hero "Secure your AI" CTA → confirm the modal opens with the new line "Team of 10 or fewer? **Let us know** — we'll follow up with startup-friendly pricing." between the consent checkbox and the submit button, styled as small muted text with only "Let us know" underlined in violet.
2. Click "Let us know" with the message textarea empty → confirm it inserts `We're a startup (≤10 people) — interested in startup pricing.` and focuses the textarea (cursor blinking at the end).
3. Type some extra text in the textarea, click "Let us know" again → confirm the note text is not duplicated (it's already present) and focus/cursor still lands at the end.
4. Clear the textarea, type unrelated text (e.g. "Hi, checking this out"), click "Let us know" → confirm the note is appended on a new line below the existing text, not overwriting it.
5. Confirm clicking "Let us know" does **not** submit the form (no validation errors appear, modal stays open, no "Sending…" state).
6. Navigate to `/shadow`, open the "Download Blindsight" CTA → confirm the same call-out appears in the `download` variant of the modal.
7. Navigate directly to `/demo` → confirm the call-out also appears in the standalone page form, laid out consistently with the `.demo-side` panel next to it.
8. Confirm the existing consent-checkbox validation, error state, and success state (submit with valid data) are all unaffected.
9. Toggle light/dark theme (if a theme switcher is present) and confirm `--muted` / `--violet` / `--violet-deep` render legibly in both.

- [ ] **Step 7: Commit**

```bash
git add src/components/DemoForm.tsx src/styles.css
git commit -m "$(cat <<'EOF'
Add: Startup pricing call-out to demo form

Non-competing informational note for startups (<=10 people) in the
shared demo/download modal and standalone /demo form, per
docs/superpowers/specs/2026-07-08-startup-pricing-callout-design.md.
EOF
)"
```
