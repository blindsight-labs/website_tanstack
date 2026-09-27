# Hero posters

Pre-rendered stills of the landing Hero's 3D render (`src/site/three/office.ts`). They are
shown the moment the page paints and crossfade to the live canvas on its first frame
(`src/site/Hero.tsx`, `src/site/hero.css`).

Expected files (all four, or the poster is not used at all and the stage fades in as before):

| File                      | Theme | Stage mode (stage width) | Capture at (CSS px) | Export (px) |
| ------------------------- | ----- | ------------------------ | ------------------- | ----------- |
| `poster-light-wide.webp`  | light | wide (≥ 880 px)          | 1420 × 822          | 2130 × 1233 |
| `poster-dark-wide.webp`   | dark  | wide (≥ 880 px)          | 1420 × 822          | 2130 × 1233 |
| `poster-light-narrow.webp`| light | narrow (< 880 px)        | 780 × 496           | 1170 × 744  |
| `poster-dark-narrow.webp` | dark  | narrow (< 880 px)        | 780 × 496           | 1170 × 744  |

- Wide = the stage at a 1440 × 900 viewport (the sheet: viewport − 2 × 10 px inset, height
  `clamp(660px, 100svh − 78px, 940px)`). Narrow = the stage at an 800 px viewport
  (`height: max(260px, 62vw)`).
- Canvas only: no chips, no copy. The wide stage's left-side mask is applied by CSS, so
  capture the canvas unmasked.
- Capture the frame the live render first shows (use `/#hero-t=<ms>` to freeze the clock).
- WebP, quality ≈ 75. Keep each under ≈ 120 KB (it competes with the main chunk on 4G).
- The poster is drawn `background-size: cover`, centred.
