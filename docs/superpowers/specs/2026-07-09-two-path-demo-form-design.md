# Two-Path Demo Form (Startup vs. Larger Team)

## Problem

The current demo/download form (`src/components/DemoForm.tsx`) is a one-size-fits-all form: Name, Email, Message, Consent. A prior change ([2026-07-08-startup-pricing-callout-design.md](2026-07-08-startup-pricing-callout-design.md)) bolted on a small footer note for startups (≤10 people) that just appends a sentence to the free-text message field.

That approach under-serves both audiences: startups get a throwaway one-liner instead of real acknowledgement, and larger teams never get asked for basic qualifying info (company, role, use case) even though the server schema (`demo.functions.ts`) has always defined fields for `company`, `role`, `companySize`, and `useCase` — they've simply been defaulted/dropped since the form was simplified (see `565ced5` for the last commit that predates the simplification).

This revamp replaces the footer note with a first-class fork: the user's very first interaction with the form is choosing whether they're a startup (≤10 people) or a larger team, and the fields shown afterward are tailored to that choice.

## Scope

Single shared component: `src/components/DemoForm.tsx`, used by:
- `DemoModal.tsx` (`demo` and `download` variants — nav/hero/in-page CTAs)
- The standalone `/demo` route

Both variants and the standalone route get the two-path behavior — no per-surface conditionals, consistent with how this component is shared today.

The old startup footer note/link (`STARTUP_NOTE`, `.demo-startup-note`, `.demo-startup-link` insertion behavior) is removed and replaced entirely by this feature.

No changes to `demo.functions.ts` — the Zod schema already accepts `company`, `role`, `companySize`, `useCase` as optional strings (with `company` required, `min(1)`). This feature starts actually populating them instead of sending placeholders.

## Design

### State

One new piece of state: `path: "startup" | "team" | null`, initialized to `null`.

- `null`: only the toggle renders. No fields, consent, or submit button.
- `"startup"` or `"team"`: toggle collapses to a compact confirmation row with a "Change" link; the path-appropriate fields, consent, and submit render below it.

Switching path (via "Change") preserves whatever the user already typed into the shared fields (Name, Email, Message) — it only changes which additional fields are shown/cleared.

### Toggle UI

Above everything else, a heading and two selectable cards:

```
Which best describes you?

┌─────────────────────┐  ┌─────────────────────┐
│ [Rocket icon]        │  │ [Building2 icon]     │
│ Startup               │  │ Larger team           │
│ ≤10 people            │  │                       │
│ Startup-friendly      │  │                       │
│ pricing               │  │                       │
└─────────────────────┘  └─────────────────────┘
```

- `type="button"` cards, side by side on desktop, stacked on mobile (reuse the `.demo-row` breakpoint pattern: `grid-template-columns: 1fr 1fr` → `1fr` under 640px).
- Icons from `lucide-react`: `Rocket` (startup), `Building2` (larger team) — per the project's icon rule, no emoji/bespoke SVG.
- The "Startup-friendly pricing" line is a small muted caption under the Startup card only — it replaces the old footer note's job of surfacing pricing-friendliness, now visible at the point of choice rather than after.
- Selected/hover state: violet border + subtle violet-tinted background (`color-mix(in oklab, var(--violet) ...)`, consistent with existing focus-ring treatment in `.demo-field input:focus`). This is a selectable card, not a `btn-primary`/`btn-secondary` — it doesn't compete with those tiers.
- Once chosen: cards collapse to one line, e.g. a `Check` icon (lucide) + "Startup (≤10 people)" + a text-link "Change" button styled like the old `.demo-startup-link` (violet, underlined, no chrome). Clicking "Change" reopens the two cards and resets `path` to `null` without clearing shared field values (the fields stay in the DOM/refs; only visibility toggles).

### Fields per path

Common to both, in this order: Name *, Email *, then path-specific fields, then Message (optional), then Consent, then Submit.

**Startup path** — unchanged from today's minimal form:
```
Name *
Email *
Message (optional)
[ ] Consent
[Request demo]
```

**Larger-team path** — reinstates the dormant schema fields:
```
Name *
Email *
Company *              Role (optional)
Company size (opt.)    Use case (optional)
Message (optional)
[ ] Consent
[Request demo]
```

- Company + Role paired in a `.demo-row` (2-column grid, stacks on mobile).
- Company size + Use case paired in a second `.demo-row`.
- Role and Use case: free-text `.demo-field input`, placeholders `e.g. Head of IT / CISO` and `e.g. Shadow AI visibility`.
- Company size: `<select>` (styled via the existing `.demo-field select` rule) with options `11–50`, `51–200`, `200+`, plus a blank/placeholder default (unselected → sends `""`, matching the optional schema field).
- Message textarea keeps its current generic label/placeholder in both paths — no per-path copy fork there.

### Submit button & success copy

Unchanged in both paths: button reads "Request demo" / "Send my download link" (per variant, as today); success state copy is the same in both paths (no path-specific success message). The path only affects which fields are collected, not the CTA or confirmation copy.

### Validation & submission

- `consent` required and `isValidEmail(email)` — unchanged, apply to both paths.
- **New:** if `path === "team"`, `company` must be non-empty (`"Please enter your company name."`), matching the existing inline `.demo-error` pattern (`setError`, shown above the submit button).
- If `path === "startup"`, `company` is still sent as `"—"` (today's default) since there's no Company field in that path; `role`, `companySize`, `useCase` sent as `""`.
- If `path === "team"`, `company`/`role`/`companySize`/`useCase` are read from `FormData` (trimmed) and sent as-is.
- If `path` is `null`, there is no submit button to click — nothing to validate.
- `source` is unchanged (`"demo-form"` / `"download-app"` per variant). The startup/team distinction is not separately tagged in `source`; it's visible in the notification email from whether `company`/`role`/etc. are populated (see `demo.functions.ts`'s `renderFields` call, which already renders `null`/empty fields as omitted).

### Styling

- New classes: `.demo-path-toggle` (container), `.demo-path-card` (+ `.is-selected` modifier), `.demo-path-confirm` (collapsed row), reusing `.demo-startup-link` styling for the "Change" link.
- Larger-team fields reuse existing `.demo-field`, `.demo-row`, and `select` styling already defined in `styles.css` — no new input styling needed.
- Remove now-unused `.demo-startup-note` class (the link style `.demo-startup-link` is kept/reused for "Change").

### Non-goals

- No changes to `demo.functions.ts` / `DemoRequestSchema` — all fields already exist.
- No dropdown/select for Role or Use case — free text only.
- No path-specific submit label or success message — those stay uniform across paths.
- No separate `source` tagging for startup vs. team.
- No persistence of the chosen path across modal close/reopen — reopening the modal starts fresh at `path: null`.

## Testing

Manual (no test suite configured for this repo):
- Open both modal variants (nav/hero → demo; download CTA → download) and the standalone `/demo` page; confirm the toggle renders first with nothing else visible.
- Pick "Startup" → confirm minimal field set (Name/Email/Message/Consent) appears, confirm caption/pricing copy was visible pre-selection.
- Pick "Larger team" → confirm Company/Role/Company size/Use case appear in paired rows; submit with empty Company → confirm the new inline error; fill Company → confirm successful submission.
- Click "Change" after selecting a path → confirm toggle reopens, previously typed Name/Email/Message values are preserved, switching path again works.
- Confirm mobile layout: cards stack, paired rows collapse to single column.
- Confirm existing consent-checkbox validation, email validation, and error/success states are otherwise unaffected.
