# Startup Pricing Call-Out in Demo Form

## Problem

Blindsight's site copy currently reads enterprise-only ("regulated enterprises"). There's no messaging that acknowledges small startups (≤10 people) who work with or are evaluating AI, even though they're a target audience. We want to surface a soft, non-committal note about startup-friendly pricing without introducing a second call-to-action that competes with the primary "Request demo" / "Send my download link" button.

## Scope

Single shared component: `src/components/DemoForm.tsx`. This form is used by:
- `DemoModal.tsx` (both `demo` and `download` variants, opened from nav/hero/in-page CTAs across the site)
- The standalone `/demo` route

Editing `DemoForm.tsx` covers all of these by design — no per-surface conditionals needed.

## Design

### Placement & copy

A single line sits between the consent checkbox and the submit button:

> Team of 10 or fewer? **Let us know** — we'll follow up with startup-friendly pricing.

- Shown in both `demo` and `download` variants, and therefore on `/demo` as well.
- Copy is intentionally soft/non-committal ("startup-friendly pricing", not a number, discount, or "free") since no concrete offer/terms exist yet — this is conceptual messaging, not a locked pricing tier.
- "Let us know" is the only interactive element: an inline underlined text link in `--violet`, no button chrome. It must not visually compete with the primary submit button.

### Interaction

The form is uncontrolled (reads fields via `FormData` on submit), so the textarea needs a `ref`, not React state.

Clicking "Let us know" (`type="button"`, so it cannot trigger form submit):
1. If the textarea is empty → insert: `We're a startup (≤10 people) — interested in startup pricing.`
2. If the textarea has content and doesn't already contain that phrase → append it on a new line, preserving existing text.
3. If the phrase is already present (double-click) → no insertion, just refocus (idempotent).
4. Always focus the textarea afterward with the cursor at the end.

No validation or submit-blocking behavior — entirely optional and cosmetic. Submitting without ever clicking it behaves exactly as today.

### Styling

- New class (e.g. `.demo-startup-note`) styled like `.demo-consent`: small (~12-13px), muted/secondary text color — reads as fine print.
- Link styling: underlined, `--violet`, no background/border — a plain text affordance, not a button.

### Non-goals / no backend changes

- No changes to `demo.functions.ts` or the server schema. The startup mention rides along inside the existing free-text `message` field.
- No new pricing tier, discount logic, or `companySize` field wiring — this is a copy/UI-only change.
- Not a separate CTA or modal path — same single "Request demo" / "Send download link" flow for everyone.

## Testing

- Manual: open both modal variants (nav/hero "Secure your AI" → demo; `/shadow` "Download Blindsight" → download) and the standalone `/demo` page; confirm the note appears in all three, click "Let us know" and confirm insert/append/idempotent-refocus behavior, confirm it doesn't submit the form.
- Confirm existing consent-checkbox validation, error states, and success states are unaffected.
