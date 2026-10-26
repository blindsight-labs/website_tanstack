# Subpage header stills

Pre-rendered header objects of the subpages (`src/site/pages/b/Still.tsx`, shown by `PageHead`
at 880 × 720 CSS px). When a file exists it is the header image and three.js is never loaded
for it; a missing file falls back to rendering it at runtime (`objects` → `core.renderOnce`).
`#stills-live` in the URL hash skips the files (the export renders through it).

Files are `{name}-{VERSION}-{theme}.webp`. `VERSION` is the objects version
(`src/site/pages/b/objects/version.ts`, currently `b12`); `name` is the element's `data-still`: the scene, plus
`-{fnv(arg)}` (FNV-1a, base36) when the scene takes an argument (blog posts, the blog index,
the legal pages). All are 1320 × 1080: exported at 1.5×, the same cap as runtime renders.

| File                                 | Page                                  |
| ------------------------------------ | ------------------------------------- |
| `team-b12-{theme}.webp`              | /team                                 |
| `careers-b12-{theme}.webp`           | /careers                              |
| `apply-b12-{theme}.webp`             | /careers/apply (no `?role`)           |
| `contact-b12-{theme}.webp`           | /contact                              |
| `faq-b12-{theme}.webp`               | /faq                                  |
| `lost-b12-{theme}.webp`              | the 404 page and a missing blog post  |
| `legal-{hash}-b12-{theme}.webp` (×3) | /imprint, /privacy, /evaluation-terms |
| `blog-{hash}-b12-{theme}.webp` (×8)  | /blog and each /blog/{slug}           |

Re-export whenever `VERSION` is bumped (bump it whenever a scene changes) or a post / legal
page changes its printed title. Either changes the file name a page looks for, so until the
re-export that page silently falls back to runtime rather than showing a stale still:

```
node scripts/export-stills.mjs
```

Needs Node ≥ 22.18 (built-in `WebSocket`, and it imports `version.ts` directly).

It starts a vite dev server on port 3123 and the installed Edge (override with `EDGE=<path>`),
needs a hardware WebGL renderer (it stops on SwiftShader), reads the pages from `/sitemap.xml`,
renders both themes, and only then replaces the old `*.webp` (a failed run leaves them as
they were); it warns about any file over 120 KB.

Author pages and `/careers/apply?role=…` stay runtime by design: their scene prints
data-driven text or a photo, so there is no fixed set to export.
