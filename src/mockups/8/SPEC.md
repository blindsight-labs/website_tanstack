# Mockup D — build spec

Route: `/mockup-8` (light, default) · `/mockup-8?theme=dark` · `?type=geist` (typeface proposal).
Worktree: `C:/Users/guilh/OneDrive/Desktop/Blindsight/Main-Site-mockups` (uncommitted; never commit).
Dev server: `http://localhost:4322` (already running, HMR on). Do NOT start or stop servers.

## 1. What this page must do

One job: get a CISO or CIO to click **Discover your AI risk** (the only CTA; the button text never
changes). Secondary visitor: head of AI / innovation. After 30 seconds they should believe they have
far less visibility into their AI than they think, there are risks they are not aware of, and they
need a way to find and secure them. Self-serve buyers get a quiet **Pricing** link in the nav, never
a second CTA.

Tagline (locked, one sentence describing how the product works): **See it, secure it, prove it.**
Hero headline (locked): **Use AI without its blind spots.** Subline: see `content.ts` (`hero.subline`);
layout must survive any of the four sublines.

All copy lives in `src/mockups/8/content.ts`. Use it; don't rewrite messaging. Bracketed text is a
placeholder the team will supply — render it visibly as a placeholder (muted, mono), never invent the
figure.

## 2. The look: what we are taking from Octane (and what we are not)

Reference screenshots (1440×900): `C:/Users/guilh/AppData/Local/Temp/claude/C--Users-guilh-OneDrive-Desktop-Blindsight-Main-Site/e782dea2-8cd5-44db-a8bd-d3d52ee41a50/scratchpad/shots/ref_octane_home_00.jpg` … `_13.jpg`
(also `ref_arcjet_home_*`, `ref_chainguard_home_*`, `ref_dub_home_*`). Look at them before you build.

What actually makes Octane premium (measured from their DOM, not guessed):
- **Materials are rendered, not CSS.** Their glass slabs, glass rings and liquid chrome are 3D
  renders (images/canvas/lottie). There is zero CSS `backdrop-filter` on their page. Transparency
  reads as real because light refracts through thick glass edges and chrome reflects a studio.
  → We render real glass/chrome with three.js (`src/mockups/8/three/core.ts`). CSS glass
  (`.mD-glass`) is only for UI surfaces sitting *over* something with depth.
- **Near-monochrome.** Text is pure black; page `#F4F5F8`; white sheets; black inset sheets; ONE blue
  accent used ~8 times on the whole page. → We are black/white/grey with violet used almost never.
- **Metallic grey symbols.** Icons sit in small hex/rounded badges with grey metallic finishes; the
  same chrome/glass language appears in the hero, the cards and the CTA backdrop. → Every symbol on
  our page uses `MetalIcon`/`.mD-hex`/rendered chrome. No flat-colour icons, no coloured icons.
- **Type.** Display in a light, wide geometric face at 54–72px with normal tracking; body 16px;
  labels in IBM Plex Mono 12px uppercase. → We use IBM Plex Sans 300 display (tight tracking) +
  Plex Sans body + Plex Mono labels. `?type=geist` swaps to Geist as the typeface proposal.
- **Rhythm.** Inset sheets 10–12px from the viewport; big quiet whitespace; mono section eyebrow
  with a hex marker; centred H2 over a single strong visual; numbered steps; long FAQ.
- **What we do NOT copy:** their blue, their Questrial display face, their 12px radii (our brief
  says ONE radius, 6px), their exact hex badges (ours are metallic hex *markers*, smaller).

## 3. Hard brand rules (critics check every one)

1. One CTA label: `Discover your AI risk`. Use `<CtaButton>` from `shared.tsx`. Max one CTA per
   viewport. Nav may show it (sm). Pricing is a quiet nav text link only.
2. Colour: black, white, greys. Violet `var(--signal)` means ONE thing — a **live signal**: what
   Blindsight just found or acted on (live dot, the flagged item in an animation, the acted-on log
   row, the single "Blindsight" bar in the benchmark, focus rings). Never on CTAs, logo, headings,
   labels, links, icons, backgrounds, borders of cards, gradients. Budget: at most ~1% of pixels in
   any screenshot. No other hues at all (no red/amber/green, no blue).
3. One radius: `var(--r)` = 6px on every button, card, input, menu, sheet, badge, chart bar.
   Circles only for dots. No pills.
4. No gradients as decoration. Allowed gradients: `--metal` on symbols, `--glass-bg` on glass UI, and
   whatever the 3D renderer produces. No glow orbs, no radial "aurora", no indigo washes.
5. Section openers use the micro-label `<Label n="03">Prove it</Label>` → "03 · PROVE IT".
6. Product UI is rendered as real UI in the audit-trail style (`.mD-log`: mono, hairlines,
   timestamp · subject · decision). Mark mock data `Illustrative` in the panel header.
7. Headlines are statements. No question headlines (FAQ questions are fine).
8. Avoid: glowing brain / node-network hero; grids of identical icon cards with three bullets; menu
   items with a grey description line; large or inconsistent radii; emoji; stock "shield + lock"
   imagery; centred-everything layouts; generic dashboard screenshots.
9. Theme: every component must look right in `light` (default) and `dark`. Use tokens only
   (`var(--ink)`, `var(--surface)` …). Never hard-code a colour that breaks in the other theme.
10. Mobile (390px) must not overflow horizontally; stack gracefully.
11. Accessibility: real `<button>`/`<a>`, visible focus (signal ring), `aria-hidden` on decorative
    canvases, honour `prefers-reduced-motion` (show the settled end state).

## 4. The system (already written — use it, don't fork it)

- `system.css` — tokens (spacing `--s1..11`, `--r`, type `--t-*`, colours, `--glass-*`, `--metal`,
  `--signal`), layout (`.mD-container`, `.mD-section`, `.mD-sheet`, `.mD-sheet--inverse`), type roles
  (`.mD-display/.mD-h1/.mD-h2/.mD-h3/.mD-lead/.mD-small`), `.mD-label`, `.mD-hex`, `.mD-live`,
  buttons (`.mD-btn` + `--primary/--secondary/--ghost`, `--sm/--lg`), `.mD-card`, `.mD-glass`,
  `.mD-dots`, `.mD-log*` (audit-trail panel), `.mD-nav*`, `.mD-menu*`, `[data-reveal]`.
  If a token is genuinely missing, add it to YOUR css file scoped to your section, not system.css.
- `shared.tsx` — `Label`, `CtaButton`, `MetalDefs` (already mounted), `MetalIcon`, `useReveal`,
  `scrollProgress`, types `Theme`, `SectionProps`.
- `three/core.ts` — `createRenderer`, `studioEnvironment` (softbox studio: gives chrome its banding
  and glass its rims), `materials.glass|frosted|chrome|satin|signal`, `backdrop(theme, w, h,
  'dots'|'chars')` (glass needs something behind it to refract!), `slab()` (rounded box),
  `studioLights`, `renderOnce(key, build, {width,height,theme,transparent})` → PNG data URL, `PALETTE`.
  Tone mapping is Neutral on purpose (keeps white white through glass).
  - three is client-only: `import("@/mockups/8/three/core")` inside `useEffect`, never at module top.
  - Performance budget: at most TWO live WebGL canvases on the page (hero + optionally the
    sequence). Everything else that wants a rendered object uses `renderOnce` → `<img>`.
  - Headless screenshots use SwiftShader: keep scenes modest (≤ ~40 meshes, no post-processing).
- Theme/type switching lives in the route; your component receives `theme` via props.

## 5. Sections, order, and who owns which files

Page order (route `src/routes/mockup-8.tsx`, do not edit it unless told): Nav → Hero → ProofStrip →
Risks → Sequence → Walkthrough → Deployment → Discovery → Why → Faq → FinalCta → Footer.
Each builder owns ONLY its files. Never edit another owner's files, `system.css`, `shared.tsx`,
`content.ts`, or the route. (Owner "hero" may tune `three/core.ts` material parameters.)

### Owner `hero` — `Hero.tsx`, `hero.css`, `three/heroScene.ts`, (may tune `three/core.ts`)
Animation first, then headline, subline, the one CTA, and a hard-proof row next to the CTA
(`hero.proof`, figures are placeholders). The animation shows AI risk being discovered and secured —
NOT a brain, NOT a glowing node network. Storyboard, ~8 s, loops calmly:
1. A calm company "floor": people, apps, a couple of AI agents — as rendered objects (e.g. frosted
   glass tiles for apps, small satin/chrome pucks for people, clear glass blocks for agents) on a
   subtle backdrop, seen at a gentle 3/4 angle.
2. A scan passes (a thin light plane / sweep, NOT neon). AI tools that weren't on the map resolve
   into view (fade from invisible/wireframe to glass). One incoming document (thin glass sheet)
   glows with a hidden instruction inside it — the violet signal, the only colour in the scene.
3. Risky items get contained (a glass enclosure settles over them), the hidden instruction is
   pulled out of the document and dissolves; the agent carries on.
4. One log line seals at the bottom (DOM, `.mD-log` style): `hero.logLine` types/fades in and ends
   with a small sealed state ("detected · corrected · logged").
Everything metallic grey/clear glass; violet only on the hidden instruction + the log row's live dot.
Layout: the render is the hero (large, bleeding), text sits in a clear area (left or below), Octane-like
inset sheet. Reduced motion: show the final sealed frame.

### Owner `top` — `Nav.tsx`, `ProofStrip.tsx`, `Risks.tsx`, `top.css`
- **Nav**: logo (`@/assets/LOGO_Blindsight.svg`, invert in dark), mono uppercase links
  (`nav.links`), quiet Pricing link, sm CTA. Sticky, frosted, hairline appears on scroll
  (`data-scrolled`). Optional "Platform" dropdown using `.mD-menu` with single-line items only.
  Mobile: collapse to a menu button + CTA.
- **ProofStrip** (section 1): one mixed strip of ALL `proofStrip` names, monochrome. Use real logo
  files where they exist in `src/assets/` (LOGO_JFloor.svg, LOGO_Rebels.svg, LOGO_ClinicBarcelona.svg,
  LOGO_nvidiainception.svg, LOGO_AES.svg = Agent Economy Association, LOGO_GCRAI.png) rendered in
  grey (filter), and set the rest as quiet typographic wordmarks at matching cap height. Slow marquee
  or static wrap — must not look like a cheap ticker. Mono micro-label e.g. "Working with".
- **Risks** (section 2): headline `What AI risk actually looks like.` Four cards (`risks`): title +
  one-sentence scenario, NO extra body text. Each card gets a DIFFERENT rendered object via
  `renderOnce` (glass/chrome, one tiny violet signal max per card) that depicts its scenario — e.g. a
  glass contract sheet halfway through a chrome slot; a glass invoice with a violet hidden line; a
  stack of glass knowledge pages with one displaced; a chrome connector plugged into a glass block.
  Cards are not identical icon cards: vary composition (image bleed, crop), keep one grid.

### Owner `sequence` — `Sequence.tsx`, `sequence.css`
Section 3: **See it, Secure it, Prove it** as ONE continuous sticky sequence (not three sections).
A tall section (~300–400vh) with a sticky stage; `scrollProgress()` drives state. Labels
`01 · SEE IT`, `02 · SECURE IT`, `03 · PROVE IT` + the stage title/body from `sequence.stages`.
The four scenarios from Risks are the thread (`sequence.thread`): in See they are discovered and
labelled on a map of the company's AI (include the decision chips Block / Approve / Protect /
Onboard); in Secure each is handled (pseudonymised / stripped / quarantined / paused); in Prove each
handling seals into an audit entry in the audit-trail panel (`.mD-log`) with the frameworks named
plainly (FADP · Cyber Resilience Act · ISO 27001 · EU AI Act). Each stage animates into the next.
Visual: glass/metal UI over a quiet backdrop; may use ONE live WebGL canvas or `renderOnce` images
+ DOM. Violet only on the item currently being acted on. Must degrade to a readable stacked layout on
mobile and with reduced motion.

### Owner `mid` — `Walkthrough.tsx`, `Deployment.tsx`, `Discovery.tsx`, `mid.css`
- **Walkthrough** (section 4, "build this first"): interactive walkthrough of the platform. We have
  no real screenshots, so build a faithful console mock (Dub-style: real product UI is the visual):
  window chrome, left nav (Inventory · Runtime · Policies · Audit), tabs that actually switch views,
  each view built from `.mD-log`-style rows and restrained data. Header tag "Illustrative walkthrough".
  Sits on an inverse (black) inset sheet or over a rendered glass backdrop.
- **Deployment** (section 5): `Up and running without a project.` Two surfaces explained plainly
  (`deployment.surfaces`), hosting options (On-prem · Private cloud · Our cloud) as quiet chips, the
  "detection runs locally" line, and the step-by-step placeholder. A simple architecture drawing is
  welcome (hairline + glass), not an icon grid.
- **Discovery** (section 6): `Know your AI risk in two weeks.` Numbered four-step (Octane-style
  01–04) + the CTA. Show time as a real axis (weeks 0–2), not four equal icon cards.

### Owner `bottom` — `Why.tsx`, `Faq.tsx`, `FinalCta.tsx`, `Footer.tsx`, `bottom.css`
- **Why** (section 7): `Built by red team specialists.` + body + benchmark chart (horizontal bars,
  greys; the single Blindsight bar may use the signal; axis labels mono; note "Illustrative …").
  Optionally a place for a CISO quote (placeholder "[CISO quote]" — never invent a quote).
- **Faq** (section 8): the five questions with full answers (`faq`), accessible accordion, long-form
  like Octane (question 20px, hairlines, mono index). Placeholder brackets stay visible.
- **FinalCta** (section 9): `See what AI is doing in your organisation.` + the CTA, on a black inset
  sheet with a rendered glass/chrome composition (renderOnce), like Octane's closing sheet.
- **Footer**: company line, links, and the terminal-style line (`footer.terminal`) in mono.

## 6. How to check your work (do this before you say you're done)

Screenshot tool (WebGL on, unique port per run, safe to run in parallel):
```
node "C:/Users/guilh/AppData/Local/Temp/claude/C--Users-guilh-OneDrive-Desktop-Blindsight-Main-Site/e782dea2-8cd5-44db-a8bd-d3d52ee41a50/scratchpad/shoot2.mjs" <OUT_DIR> "/mockup-8,/mockup-8?theme=dark"
```
env: `VP=390x844` for phone, `TIMELINE=800,3000,5500,8000` + `SCROLL=0` for hero frames,
`PREFIX=x_`. Output dir: use your own folder under
`C:/Users/guilh/AppData/Local/Temp/claude/C--Users-guilh-OneDrive-Desktop-Blindsight-Main-Site/e782dea2-8cd5-44db-a8bd-d3d52ee41a50/scratchpad/build/<owner>/`.
The script prints runtime exceptions — fix any that come from your files. Then **look at the images**
(Read tool) and compare against the Octane references.

Typecheck your files: `npx tsc --noEmit -p .` from the worktree root and fix errors in your files
(ignore pre-existing errors elsewhere). Lint is not required.

In PowerShell set env with `$env:VP="390x844"`; in Bash use `VP=390x844 node …`.

## 7. Definition of done

Your sections render without runtime errors in light and dark at 1440 and 390; follow every rule in
§3; look like they were art-directed by one person alongside Octane's page — restrained, material,
precise — and nothing like a generic AI-generated SaaS page.
