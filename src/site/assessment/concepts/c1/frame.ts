/* Concept 1 — "The Pull-back": the camera maths, shared by the render (scene.ts) and the DOM
   overlay (the depth ruler, the risk annotations, the horizon captions). Pure maths, no three.js,
   so the ruler still works when WebGL doesn't.

   The berg never moves. It stands in the world with its peak at y = 0 and its keel at y = KEEL.
   The camera is level (no tilt) at a fixed height CAM_Y, so the waterline is always a straight,
   crisp horizon. Scroll only dollies it back (and widens the lens a little); the framing uses a
   lens shift (setViewOffset), like a shift lens on a studio camera, never a tilt.

   The water is the one thing answers move: its level on the berg is set by how much the
   organization can see (the mean of a.see). */

export const PEAK = 0;
export const KEEL = -20;
/** the berg's half-width, with a little air (the underwater mass is ~16 units across) */
const HALF_W = 9;
/** 1 world unit = 10 m on the ruler */
export const M_PER_UNIT = 10;
/** the camera's (fixed) height: at the typical waterline, so the horizon stays edge-on */
export const CAM_Y = -2.8;
const FOV0 = 26;
const FOV1 = 32;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x: number) => {
  const u = clamp01(x);
  return u * u * (3 - 2 * u);
};

/** Fraction of the berg's height above the water, from visibility 0..1. */
export const waterFrac = (seen: number) => 0.09 + 0.17 * clamp01(seen);
/** World y of the water. */
export const waterY = (seen: number) => PEAK - waterFrac(seen) * (PEAK - KEEL);

/** World y where a risk's annotation sits: seen risks (≥ 0.5) on the tip, the rest below,
 *  deeper the less it is seen. */
export function riskY(see: number, water: number) {
  if (see >= 0.5) return water + (PEAK - water) * (0.18 + 0.62 * ((see - 0.5) / 0.5));
  return water + (KEEL - water) * (0.1 + 0.8 * ((0.5 - see) / 0.5));
}

export type Layout = {
  W: number;
  H: number;
  wide: boolean;
  /** the berg's axis, stage px: macro and whole */
  cx0: number;
  cx1: number;
  /** visible height (world units, at the berg's centre plane): macro and whole */
  Vh0: number;
  Vh1: number;
  /** the peak's distance from the frame top, as a fraction of the frame: macro and whole */
  s0: number;
  s1: number;
  /** the header window (desktop): its left edge, stage px */
  winLeft: number;
  /** x of the ruler's spine, stage px */
  spine: number;
};

/**
 * @param winLeft desktop: where the header window starts (right of the quiz card)
 * @param closeRight desktop: the right edge of the close panel's copy
 */
export function layoutFor(W: number, H: number, winLeft: number, closeRight: number): Layout {
  const wide = W >= 880; // the stage is the viewport less the sheet's 2 × 10px inset (CSS: 900px)
  if (wide) {
    const spine = W - 44;
    const rulerW = 236;
    const wl = Math.min(Math.max(winLeft, W * 0.42), W * 0.6);
    // macro: the summit fills the window (it may run off its edges; it is a macro)
    const winW = W - 16 - wl;
    const cx0 = wl + (winW - 110) * 0.5; // clear of the ruler's labels
    const ppu0 = Math.min(H / 5.3, (winW - 40) / 3.5);
    const Vh0 = H / ppu0;
    // whole: the berg between the close panel's copy and the ruler
    const left = Math.max(closeRight + 24, W * 0.3);
    const right = W - rulerW;
    const half = Math.max(120, (right - left) / 2);
    const cx1 = left + half;
    const ppu1 = Math.min((H * 0.72) / (PEAK - KEEL), half / HALF_W);
    const Vh1 = H / ppu1;
    const s1 = Math.max(0.2, (1 - (PEAK - KEEL) / Vh1) / 2 - 0.04);
    return { W, H, wide, cx0, cx1, Vh0, Vh1, s0: 0.1, s1, winLeft: wl, spine };
  }
  const spine = W - 34;
  const inner = Math.max(60, W - 34);
  const cx = inner / 2 + 4;
  const ppu0 = Math.min(H / 5.6, inner / 2.9);
  const Vh0 = H / ppu0;
  const half = inner / 2 - 6;
  const ppu1 = Math.min((H * 0.7) / (PEAK - KEEL), half / HALF_W);
  const Vh1 = H / ppu1;
  const s1 = Math.max(0.2, (1 - (PEAK - KEEL) / Vh1) / 2 - 0.02);
  return { W, H, wide, cx0: cx, cx1: cx, Vh0, Vh1, s0: 0.08, s1, winLeft: 0, spine };
}

export type Cam = {
  W: number;
  H: number;
  /** distance from the berg's centre plane (camera z) */
  D: number;
  /** vertical field of view, degrees */
  fov: number;
  /** visible height at z = 0, world units */
  Vh: number;
  /** zoom relative to the macro frame (1 = the header) */
  zoom: number;
  /** setViewOffset x / y, px */
  offX: number;
  offY: number;
  camY: number;
};

/** The camera at pull-back e (0 = macro on the summit, 1 = the whole berg). */
export function camAt(L: Layout, e: number): Cam {
  const Vh = L.Vh0 * Math.pow(L.Vh1 / L.Vh0, e); // log-zoom: every scroll px zooms alike
  const fov = lerp(FOV0, FOV1, e);
  const D = Vh / (2 * Math.tan(((fov / 2) * Math.PI) / 180));
  const s = lerp(L.s0, L.s1, e);
  const cx = lerp(L.cx0, L.cx1, e);
  const yc = PEAK + s * Vh - Vh / 2;
  return {
    W: L.W,
    H: L.H,
    D,
    fov,
    Vh,
    zoom: Vh / L.Vh0,
    offX: -(cx - L.W / 2),
    offY: ((CAM_Y - yc) * L.H) / Vh,
    camY: CAM_Y,
  };
}

/** Stage px of world y at the berg's centre plane (z = 0). */
export const screenY = (c: Cam, y: number) => c.H / 2 - ((y - c.camY) * c.H) / c.Vh - c.offY;
/** Stage px of world x at z = 0. */
export const screenX = (c: Cam, x: number) => c.W / 2 + (x * c.H) / c.Vh - c.offX;
/** px per world unit at z = 0 */
export const ppu = (c: Cam) => c.H / c.Vh;
