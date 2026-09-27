# Risks stills

Pre-rendered stills of the four risk cards (`src/site/Risks.tsx`). When a file exists it is
used as the card's image; a missing file falls back to rendering it at runtime
(`core.renderOnce`, VERSION-keyed in Risks.tsx). Re-export them whenever VERSION changes.

Expected files, `{id}-{theme}.webp` (export at 2×, the size renderOnce renders on a 2× screen):

| File                             | Card size (CSS px) | Export (px)  |
| -------------------------------- | ------------------ | ------------ |
| `prompt-leak-light.webp`         | 520 × 540          | 1040 × 1080  |
| `prompt-leak-dark.webp`          | 520 × 540          | 1040 × 1080  |
| `hidden-instruction-light.webp`  | 560 × 360          | 1120 × 720   |
| `hidden-instruction-dark.webp`   | 560 × 360          | 1120 × 720   |
| `poisoned-source-light.webp`     | 560 × 360          | 1120 × 720   |
| `poisoned-source-dark.webp`      | 560 × 360          | 1120 × 720   |
| `unregistered-ai-light.webp`     | 520 × 540          | 1040 × 1080  |
| `unregistered-ai-dark.webp`      | 520 × 540          | 1040 × 1080  |

The callout anchors for the static images come from `ANCHORS` in Risks.tsx
(`"theme:id": { u, v }`, 0..1 of the image). Until an entry is filled in, it is computed on
idle by building that card's scene without rendering it; in dev the computed value is logged
(`[risks] anchor`), ready to paste.
