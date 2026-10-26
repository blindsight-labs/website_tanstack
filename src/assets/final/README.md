# Closing sheet backgrounds

Pre-rendered backgrounds of the black closing sheet (`src/site/FinalCta.tsx`, on the home
page and most subpages). When a file fits the sheet it is the background and three.js is
never loaded for it; otherwise the sheet is rendered at runtime (`core.renderOnce`).
`#stills-live` in the URL hash skips the files (the export renders through it).

Files are `final-{FINAL_VERSION}-{theme}-{kind}.webp`; `FINAL_VERSION` (currently `v5`) is the
constant in FinalCta.tsx that also keys the runtime render, and `kind` follows the scene's own
split: `wide` when the sheet's aspect (w / h, of its 40 px-bucketed size) is ≥ 1.1, else
`narrow`. A file is used only when that aspect is within 1.3× of the file's (`FILE_ASPECT` in
FinalCta.tsx), shown `object-fit: cover`; anything else renders at runtime (by design: tablets
in portrait, about 0.9, and around 1.25).

| File                           | Exported at (CSS → px, 1.5×)                   | Aspect | Used for sheet aspects                |
| ------------------------------ | ---------------------------------------------- | ------ | ------------------------------------- |
| `final-v5-{theme}-wide.webp`   | 1920 × 1080 viewport, 1680 × 800 → 2520 × 1200 | 2.1    | 1.62 – 2.73 (desktops, 1024 × 768 up) |
| `final-v5-{theme}-narrow.webp` | 390 × 844 viewport, 360 × 640 → 540 × 960      | 0.5625 | 0.43 – 0.73 (phones)                  |

Re-export whenever the scene changes: bump `FINAL_VERSION` in FinalCta.tsx (the files then
stop matching and the sheet renders at runtime until they are re-exported), then run

```
node scripts/export-stills.mjs
```

which exports these and the subpage header stills together (see `src/assets/stills/README.md`
for what it needs). If an export changes a file's size, update `FILE_ASPECT`.
