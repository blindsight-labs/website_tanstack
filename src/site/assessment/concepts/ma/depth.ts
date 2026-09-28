/* Mockup A · "Lens · Pull-back" — the berg's measures, shared by the render (lensScene.ts) and
   the depth ruler (MockupA.tsx). Pure maths, no three.js: safe to import anywhere.

   World units, y = 0 at the waterline. One unit reads as 10 m on the ruler. */
import { IN_VIEW } from "../../model";

/** peak to keel */
export const HB = 14;
/** the tip: 15% of the berg stands above the water */
export const TOP = 0.15 * HB;
export const KEEL = TOP - HB;
export const M_PER_UNIT = 10;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** How far the light reaches below the waterline for visibility v (0..1): the answers set it. */
export const litDepth = (v: number) => 0.2 + 2.4 * clamp01(v);

/** World y of each risk on the ruler. Risks in view (see ≥ 0.5) sit on the tip, the rest below
 *  the waterline, deeper the less they are seen. Half the depth comes from the risk's own
 *  visibility and half from its rank in its group, so equal answers never share one depth. */
export function riskYs(see: number[]): number[] {
  const order = see.map((s, i) => ({ s, i })).sort((a, b) => b.s - a.s || a.i - b.i);
  const up = order.filter((o) => o.s >= IN_VIEW);
  const down = order.filter((o) => o.s < IN_VIEW);
  const ys = see.map(() => 0);
  up.forEach((o, k) => {
    const value = clamp01((1 - o.s) / (1 - IN_VIEW)); // 0 = fully seen (high on the tip)
    const rank = up.length > 1 ? k / (up.length - 1) : 0.5;
    ys[o.i] = TOP * (0.85 - 0.7 * (0.5 * value + 0.5 * rank));
  });
  down.forEach((o, k) => {
    const value = clamp01((IN_VIEW - o.s) / IN_VIEW); // 1 = not seen at all (deepest)
    const rank = down.length > 1 ? k / (down.length - 1) : 0.5;
    ys[o.i] = KEEL * (0.1 + 0.82 * (0.5 * value + 0.5 * rank));
  });
  return ys;
}
