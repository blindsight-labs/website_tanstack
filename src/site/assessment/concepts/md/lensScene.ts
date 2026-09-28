/* Mockup D · "Lens · Scale" — the scene.

   One berg, built once and never moved: faceted ice after the classic photo — a sharp, bright,
   off-centre summit above the waterline; below it a mass FIFTEEN times the tip's height, cut
   into a few big flat planes and long vertical flutes, broad shoulders in its upper quarter,
   tapering to an off-axis keel. The render is the page: the white sky above the waterline is
   the sheet the header sits on; the water below it starts as the page's light grey at the
   surface and darkens CONTINUOUSLY with depth to near-black at the keel (the copy over it reads
   the grey behind it and sets its own ink). The ice carries a whisper of cold blue-grey in its
   underwater mass and shadow side (never the water, never the page). In front floats the
   Blindsight mark made physical, intact: three glass orbit arcs with the mark's own fixed ±20°
   gaps at three chrome nodes round a clear glass disc. The disc is the lens.

   How the reveal works (and why it is cheap): the water's murk is painted into the ice only in
   the final pass to the screen. For its glass three.js first renders the opaque scene into a
   texture that the glass refracts, and that pass (no tone mapping, so no TONE_MAPPING define)
   leaves the murk out and adds the lens's light: a faint cool-violet cast on the ice. Through
   the glass the ice is lit against the dark; outside it, below the reach of the light, the berg
   sinks into water of its depth's grey. Deep ice is only seen where the lens holds it.

   Every motion has a cause:
   - scroll → setView(e, hb): the camera pulls back GEOMETRICALLY (its distance grows by the
     same factor for every screen of scroll, so each screen holds about twice the ice of the one
     before, and the whole berg only fits over the last stretch), on a shallow arc (the berg
     never moves), so the near ice, the far ice, the mark in front and the studio's bands of
     light on every facet all shift at their own rates — the parallax; the summit stays pinned
     near the top of the frame (a lens shift); the water's exposure falls as the frame reaches
     deeper; and the mark, calm (it never turns or opens), rides the summit and GROWS until its
     glass holds the whole berg;
   - answers → setLight: how much the organization already sees sets how far the light reaches
     below the waterline outside the glass;
   - scroll, too → the lens's light: it reaches the whole frame through the move, the frame
     outruns it over the last quarter (the keel comes into view in the murk), and as the close
     settles it sweeps down to the keel, so the page lands lit; the "Today" toggle at the close
     → setReveal takes it back to the answers' edge, the compare;
   - the violet inlay on one node is the risk the lens is flagging (the page names it).

   Client-only: imported dynamically from MockupD.tsx. Renders on demand. */
import { THREE, createRenderer, studioLights, type Theme } from "@/site/three/core";

export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** Stage size (css px) and the frames the move runs between. */
export type LensLayout = {
  W: number;
  H: number;
  /** the tip's frame when the move starts: the crown fills it, its base on the waterline at
   *  r0.y1 and its skirts running out of frame */
  r0: Rect;
  /** the whole lens's frame when the move ends */
  r1: Rect;
  /** the summit never rises above this stage y */
  top: number;
};

export type LensScene = {
  resize(l: LensLayout): void;
  /** e: 0 = the tip framed tight, the mark round its summit · 1 = the whole berg in the lens.
   *  hb: the header's bottom edge (stage y); the waterline is never above it. Returns the
   *  waterline's stage y (the page's white/water edge). */
  setView(e: number, hb: number): number;
  /** 0..1: how much of its AI exposure the organization already sees */
  setLight(v: number, instant: boolean): void;
  /** the lens's light at the close: on (With Blindsight: swept down to the keel by the scroll)
   *  or off (Today: back to the answers' edge, the compare). Only the last stretch of the move
   *  obeys it; before that the light follows the scroll. */
  setReveal(on: boolean, instant: boolean): void;
  /** how far the toggle has the lens's light on right now (0..1; 1 through the move) */
  reveal(): number;
  /** advance the easings; true while something is still moving */
  step(dtMs: number): boolean;
  render(): void;
  /** css px per world unit at the berg's plane: now, and when the move starts */
  scale(): { now: number; start: number };
  /** stage px of the flagging node (its centre and radius), of the lens's centre, and the
   *  radius that clears the whole ring (nodes included) */
  flag(): { x: number; y: number; r: number; cx: number; cy: number; ring: number };
  /** stage px of the edge of the light, at the berg's left flank */
  gauge(): { x: number; y: number };
  /** how far the light shown reaches below the waterline: the answers' edge, or the keel once
   *  the lens's light is on at the close — stage y (at the berg's axis) and world depth */
  reach(): { y: number; d: number };
  /** the grey of the water behind stage y (sRGB 0..1; the sky's above the waterline): what
   *  copy over it reads against */
  water(y: number): number;
  /** the stage y where the water darkens to grey v (the waterline if it is lighter than that) */
  waterY(v: number): number;
  dispose(): void;
};

export type LensOptions = {
  theme: Theme;
  /** the page above the waterline (the white sheet) */
  sky: string;
  /** the water at the surface (the page's light grey) */
  surf: string;
  /** the water at the keel (near-black) */
  deep: string;
  ink: string;
  signal: string;
  /** the lens's light: the light violet the ice inside the glass is cast in */
  lensLight: string;
};

const TAU = Math.PI * 2;
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

const FOV = 20; // a long lens: the pull-back reads as a zoom, not a fly-through

/* the berg (world units; y = 0 is the waterline) */
const TOP = 2.1; // the tip: summit above the waterline
const WL = 1 / 15; // share of the height above the water: the mass is 14× the tip
const HB = TOP / WL; // summit to keel, 31.5
/* The silhouette: SILHOUETTE.md's profile re-parameterised to the taller berg (t = depth from
   the summit / HB, r = half-width / HB). The tip keeps its proportions (base ≈ 2.5× its height);
   below the water the flare, the shoulders and the taper follow the table's shape with the
   shoulders in the upper quarter. Expected: width at the waterline (t 0.067) = 2 · 0.084 · 31.5
   ≈ 5.3; widest (t 0.22) = 2 · 0.312 · 31.5 ≈ 19.7 ≈ 0.62 · HB (3.7× the tip's base); overall
   ≈ 1.6 : 1 tall : wide. */
const PROFILE: [number, number][] = [
  [0, 0],
  [0.008, 0.009], // a real point: the first metres stand steep before the flanks open
  [0.02, 0.028],
  [0.045, 0.058],
  [WL, 0.084],
  // a short steep run straight down from the line, then the flare (no top face at the water)
  [0.08, 0.1],
  [0.1, 0.15],
  [0.135, 0.225],
  [0.175, 0.28],
  [0.22, 0.312], // widest
  [0.3, 0.3], // broad shoulders hold
  [0.4, 0.27],
  [0.5, 0.235],
  [0.6, 0.19],
  [0.72, 0.135],
  [0.86, 0.07],
  [1, 0],
];
/* the axis (x / HB): the summit right of the tip's centre (≈ 0.65 of the tip's height), the
   widest band −0.05·HB, the keel point −0.15·HB: an off-axis, jagged point */
const AXIS: [number, number][] = [
  [0, 0.045],
  [0.03, 0.03],
  [WL, 0],
  [0.13, -0.03],
  [0.22, -0.05],
  [0.6, -0.08],
  [0.85, -0.12],
  [1, -0.15],
];
const ZS = 0.75; // depth ≈ 0.75 × width

/* the lens: the mark, orbit radius 1 in its own units (src/assets/ICON_Blindsight.svg) */
const TUBE = 0.06; // a thin glass ring (thinner than the SVG's band: at the close it must not outweigh the ice)
const GAP = 20; // the mark's half-gap at each node, degrees: fixed, the mark stays whole
const NODE_A = [0, 128, 232];
const NODE_R = 0.25;
const FLAG = 1; // the node that carries the signal (upper left)
const DISC_R = 1 - TUBE + 0.005;
/** share of the lens radius that is flat, clear glass (inside the bevel) */
const CLEAR = 0.86;
/** css px the summit keeps off the clear glass's edge */
const RIM_PX = 10;

/* the light: how far it reaches below the waterline for visibility v (0..1) */
const litDepth = (v: number) => 0.25 + 2.6 * v;
/* the lens's light, inside the glass: it reaches the whole frame through the move; over the
   last quarter the frame outruns it (it holds at HOLD_D while the keel comes into view in the
   murk), and as the close settles it sweeps down to the keel — scroll causes the light. Its
   edge is soft over LENS_BAND. */
const LENS_HOLD_E = 0.72;
const LENS_SWEEP_E = [0.86, 0.98];
const LENS_BAND = 2.5;

/* the camera's arc: a slight swing round the berg while it pulls back (radians) */
const YAW0 = deg(-7);
const YAW1 = deg(6);

/* the water: its grey runs from the surface's to the keel's along k(d), d the depth in world
   units. Two parts: a slow, even darkening with depth alone (BASE of the way by the keel), and
   the fall into the dark where the light ends — from LEAD above the edge of the light (which the
   answers set) over BAND below it. So the water stays light as far as the organization sees,
   goes dark past that, and keeps deepening to near-black at the keel; the answers move the
   depth at which the page turns dark. Mixed in sRGB (even steps to the eye), then taken to
   linear for the render. */
const KEEL_D = HB - TOP;
const WATER_LEAD = 0.3;
const WATER_BAND = 1.9;
const WATER_BASE = 0.3;
const waterK = (d: number, L: number) =>
  clamp01(
    (WATER_BASE * Math.max(0, d)) / KEEL_D +
      (1 - WATER_BASE) * smooth01((d - (L - WATER_LEAD)) / WATER_BAND),
  );
/* the page darkens with the pull-back once the header has left the frame (its copy is dark ink
   on the light sky): the sky band from the page grey to ≈ #3a3a3c, the water below it further */
const pullDark = (e: number) => smooth01((e - 0.42) / 0.58);
const skyDrift = (dark: boolean, e: number) => lerp(1, dark ? 0.6 : 0.24, pullDark(e));
const surfDrift = (dark: boolean, e: number) => lerp(1, dark ? 0.5 : 0.17, pullDark(e));

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */
/* the water's grey at world y (linear), and the murk below the waterline: a band the light
   reaches (w), then, below the edge of the light (x, soft over y), murk z that deepens to
   almost nothing seen at the keel. uL3Reveal: how much the glass reveals (the refracted pass) */
const MURK_GLSL = /* glsl */ `
uniform vec4 uL3Murk;
uniform vec3 uL3WS;
uniform vec3 uL3WD;
uniform vec4 uL3WK;
uniform vec2 uL3Reveal;
/* the lens's light inside the glass: 1 above its edge (uL3Reveal.x, world y), 0 below it,
   soft over uL3Reveal.y */
float l3Lit( float y ) { return smoothstep( uL3Reveal.x - uL3Reveal.y, uL3Reveal.x, y ); }
vec3 l3Water( float y ) {
  float d = max( 0.0, -y );
  float L = -uL3Murk.x;
  float t = smoothstep( L - uL3WK.x, L - uL3WK.x + uL3WK.y, d );
  float k = clamp( uL3WK.z * d / uL3WK.w + ( 1.0 - uL3WK.z ) * t, 0.0, 1.0 );
  vec3 c = mix( uL3WS, uL3WD, k );
  return pow( c, vec3( 2.2 ) );
}
float l3Murk( float y ) {
  float under = 1.0 - smoothstep( -0.04, 0.0, y );
  float lit = smoothstep( uL3Murk.x - uL3Murk.y, uL3Murk.x, y );
  float deep = clamp( ( uL3Murk.x - y ) / 11.0, 0.0, 1.0 );
  float below = mix( uL3Murk.z, 0.95, deep * deep );
  return under * mix( below, uL3Murk.w, lit );
}
`;

/* three's Khronos PBR Neutral at exposure 1: the refracted pass is rendered without tone
   mapping, so the ice tone-maps itself there and the lens (toneMapped: false) shows it exactly
   as it looks outside the lens */
const NEUTRAL_GLSL = /* glsl */ `
vec3 l3Neutral( vec3 color ) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  float x = min( color.r, min( color.g, color.b ) );
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < StartCompression ) return color;
  float d = 1.0 - StartCompression;
  float newPeak = 1.0 - d * d / ( peak + d - StartCompression );
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / ( Desaturation * ( peak - newPeak ) + 1.0 );
  return mix( color, vec3( newPeak ), g );
}
`;

const WORLD_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4( position, 1.0 );
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/* ------------------------------------------------------------------ */
/* the berg                                                            */
/* ------------------------------------------------------------------ */
/** A smooth curve through a table that never overshoots it (monotone cubic, Fritsch–Carlson),
 *  so the envelope is exactly the table's, without creases at its rows. */
function monotone(tab: [number, number][]) {
  const n = tab.length;
  const xs = tab.map((p) => p[0]);
  const ys = tab.map((p) => p[1]);
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) =>
    i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2,
  );
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    const t = Math.min(xs[n - 1], Math.max(xs[0], x));
    let i = 0;
    while (i < n - 2 && t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (t - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (
      (2 * u3 - 3 * u2 + 1) * ys[i] +
      (u3 - 2 * u2 + u) * h * m[i] +
      (-2 * u3 + 3 * u2) * ys[i + 1] +
      (u3 - u2) * h * m[i + 1]
    );
  };
}
const profileT = monotone(PROFILE);
const axisT = monotone(AXIS);
/** Half-width of the berg at t (0 = summit, 1 = keel), world units. */
const profile = (t: number) => Math.max(0, profileT(clamp01(t))) * HB;
/** The berg's axis at t: the summit right of the tip's centre, the keel point left. */
const axisX = (t: number) => axisT(clamp01(t)) * HB;

/* deterministic smooth noise on the unit sphere: a few seeded plane waves */
function makeNoise(seed: number) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const waves = Array.from({ length: 7 }, (_, i) => {
    const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const f = 1.6 + i * 0.9;
    return { v: v.multiplyScalar(f), ph: rnd() * TAU, a: 1 / (1 + i * 0.7) };
  });
  const norm = waves.reduce((a, w) => a + w.a, 0);
  return (x: number, y: number, z: number) =>
    waves.reduce((acc, w) => acc + Math.sin(w.v.x * x + w.v.y * y + w.v.z * z + w.ph) * w.a, 0) /
    norm;
}

/** A deterministic 0..1 hash of a position (duplicated vertices of one corner agree). */
const hash = (x: number, y: number, z: number, s: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.3) * 43758.5453;
  return v - Math.floor(v);
};

function bergGeometry() {
  // Turned so one of the icosahedron's own corners points straight up (and its opposite down):
  // the summit and the keel are real points, not the dome of an edge
  const geo = new THREE.IcosahedronGeometry(1, 5);
  geo.rotateX(-Math.atan2((1 + Math.sqrt(5)) / 2, 1));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n1 = makeNoise(11);
  const n2 = makeNoise(29);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    // break the icosphere's regular lattice (a quilted diamond pattern): jitter every corner
    // along the sphere, a third of an edge; the two poles stay put
    if (Math.abs(p.y) < 0.995) {
      const j = 0.06;
      p.x += (hash(p.x, p.y, p.z, 1) - 0.5) * j;
      p.y += (hash(p.x, p.y, p.z, 2) - 0.5) * j * 0.6;
      p.z += (hash(p.x, p.y, p.z, 3) - 0.5) * j;
      p.normalize();
    }
    // a quarter of the sphere goes to the tip, so the summit gets its share of facets
    const sph = (1 - p.y) / 2;
    const t = sph < 0.24 ? WL * (sph / 0.24) : WL + (1 - WL) * ((sph - 0.24) / 0.76);
    const rho = Math.hypot(p.x, p.z);
    const dx = rho < 1e-6 ? 0 : p.x / rho;
    const dz = rho < 1e-6 ? 0 : p.z / rho;
    const theta = Math.atan2(dz, dx);
    const tipness = 1 - clamp01(t / WL);
    const under = smooth01((t - WL) / 0.02);
    // relief: a little jagged near the summit, quiet below (the envelope stays the table's)
    const relief = 0.04 + 0.06 * tipness;
    let r = profile(t) * (1 + relief * n1(p.x * 1.5, p.y * 1.5, p.z * 1.5));
    // the vertical fluting of the photo: long grooves under the water, from the shoulders down
    // to the keel — sharp-bottomed (a crest curve, not a sine), with a finer second run between
    // them; the envelope moves under 4%
    const crest = Math.pow(Math.abs(Math.sin(5.5 * theta + 0.9 + 0.5 * t)), 0.7);
    const flute = under * (0.06 * (crest - 0.55) + 0.02 * Math.sin(13 * theta - 0.4 + 1.7 * t));
    // below the shoulders each flank breaks in a few irregular steps (no straight cone): a
    // notch is a sharp step in, then an easy lean back out, at different depths per side
    const right = smooth01(dx * 1.5 + 0.5);
    const step = (tc: number, depth: number) => {
      const u = (t - tc) / 0.05;
      return u < 0 ? depth * Math.exp(-u * u * 25) : depth * Math.exp(-u * 1.6);
    };
    // (the left flank breaks one step more, so its long run down to the keel is not a line)
    const notch =
      right * (step(0.36, 0.1) + step(0.52, 0.13) + step(0.68, 0.1) + step(0.84, 0.08)) +
      (1 - right) *
        (step(0.33, 0.1) + step(0.46, 0.12) + step(0.6, 0.1) + step(0.76, 0.1) + step(0.9, 0.08));
    r = r * (1 + flute) * (1 - notch * smooth01((t - 0.3) / 0.06)) + 0.02;
    // a lower, secondary shoulder on the tip's left flank (≈ 0.6 of the way down the tip)
    const shoulder =
      0.32 *
      Math.pow(Math.max(0, -dx), 1.3) *
      Math.exp(-Math.pow((t - 0.6 * WL) / (0.24 * WL), 2)) *
      (1 - under);
    const y =
      TOP -
      t * HB +
      0.22 * n2(p.x, p.y, p.z) * Math.sin(Math.PI * clamp01(t * 1.08)) * (0.4 + 0.6 * under) +
      shoulder;
    pos.setXYZ(i, axisX(t) + dx * r, Math.min(TOP, y), dz * r * ZS);
  }
  // chip it: seeded planes shear off whole sides, so the ice has big flat faces. Every cut sits
  // at ≥ 0.92 of the radius (the envelope moves < 8%); the cuts on the tip stand steep and the
  // ones under the water point level or down (an upward face reads as a shelf), so summit and
  // keel stay points.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Every cut is LOCAL: an infinite plane would keep shaving far above or below its depth (a
  // flank cut with a small tilt trims the whole mass below back to the tip's radius), so each
  // one acts only in a depth band round its tc, fading to nothing at the band's edges.
  const cuts: { n: THREE.Vector3; p: THREE.Vector3; tc: number; band: number }[] = [];
  // chips come in uneven sizes (the band each one acts in, as a share of the height)
  const addCut = (tc: number, a: number, tilt: number, k: number, size: number) => {
    const r = profile(tc) * k;
    cuts.push({
      n: new THREE.Vector3(Math.cos(a), tilt, (Math.sin(a) / ZS) * 0.8).normalize(),
      p: new THREE.Vector3(axisX(tc) + Math.cos(a) * r, TOP - tc * HB, Math.sin(a) * r * ZS),
      tc,
      band: size * (1 + Math.abs(tilt)),
    });
  };
  // a few large flat planes below the water: whole faces of the mass, sheared clean
  for (let i = 0; i < 6; i++)
    addCut(
      0.15 + rnd() * 0.5,
      (i / 6) * TAU + rnd() * 0.9,
      -0.12 - rnd() * 0.2,
      0.92 + rnd() * 0.03,
      0.1 + rnd() * 0.1,
    );
  for (let i = 0; i < 3; i++)
    addCut(
      0.012 + rnd() * 0.02,
      rnd() * TAU,
      0.15 + rnd() * 0.3,
      0.92 + rnd() * 0.05,
      0.012 + rnd() * 0.012,
    ); // summit
  for (let i = 0; i < 6; i++)
    addCut(
      0.028 + rnd() * 0.035,
      (i / 6) * TAU + rnd() * 0.7,
      0.2 + rnd() * 0.35,
      0.92 + rnd() * 0.05,
      0.015 + rnd() * 0.02,
    ); // the tip's flanks
  for (let i = 0; i < 9; i++)
    addCut(
      0.085 + rnd() * 0.2,
      (i / 9) * TAU + rnd() * 0.5,
      -0.3 + rnd() * 0.3,
      0.93 + rnd() * 0.05,
      0.05 + rnd() * 0.06,
    ); // shoulders
  for (let i = 0; i < 7; i++)
    addCut(
      0.55 + rnd() * 0.35,
      (i / 7) * TAU + rnd() * 0.8,
      -0.1 - rnd() * 0.3,
      0.92 + rnd() * 0.05,
      0.05 + rnd() * 0.08,
    ); // keel
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const tv = (TOP - p.y) / HB;
    // never more than ~8% of the envelope at this depth
    const maxShave = 0.08 * profile(tv) + 0.03;
    for (const c of cuts) {
      const w = 1 - smooth01((Math.abs(tv - c.tc) - 0.5 * c.band) / (0.5 * c.band));
      if (w <= 0) continue;
      const k = d.subVectors(p, c.p).dot(c.n);
      if (k > 0) p.addScaledVector(c.n, -Math.min(k, maxShave) * w);
    }
    pos.setXYZ(i, p.x, Math.min(TOP, p.y), p.z);
  }
  geo.computeVertexNormals(); // non-indexed: flat facets
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  // the circle (in the camera's plane) that holds the whole berg: where the lens ends
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  let R = 0;
  // the tip's width at the waterline, and the berg's left flank per depth (for the gauge)
  let tx0 = Infinity;
  let tx1 = -Infinity;
  const NB = 64;
  const lo = bb.min.y;
  const span = Math.max(1e-3, bb.max.y - lo);
  const minX = new Array<number>(NB).fill(Infinity);
  let peakX = 0;
  let peakY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    R = Math.max(R, Math.hypot(x - cx, y - cy));
    if (y > peakY) {
      peakY = y;
      peakX = x;
    }
    if (y > -0.05) {
      tx0 = Math.min(tx0, x);
      tx1 = Math.max(tx1, x);
    }
    const b = Math.min(NB - 1, Math.max(0, Math.floor(((y - lo) / span) * NB)));
    minX[b] = Math.min(minX[b], x);
  }
  for (let b = 0; b < NB; b++) if (!Number.isFinite(minX[b])) minX[b] = b > 0 ? minX[b - 1] : 0;
  const left = (y: number) => {
    const b = Math.min(NB - 1, Math.max(0, Math.floor(((y - lo) / span) * NB)));
    return Math.min(minX[b], minX[Math.max(0, b - 1)], minX[Math.min(NB - 1, b + 1)]);
  };
  return { geo, cx, cy, R, peak: bb.max.y, peakX, tx0, tx1, front: bb.max.z, left };
}

/* ------------------------------------------------------------------ */
/* the studios                                                         */
/* ------------------------------------------------------------------ */
const grey = (v: number) => new THREE.Color(v, v, v);
/** a studio dome: three greys, top / horizon / below */
function studioDome(scene: THREE.Scene, top: number, hor: number, bot: number) {
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(40, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: grey(top) },
          hor: { value: grey(hor) },
          bot: { value: grey(bot) },
        },
        vertexShader: /* glsl */ `
        varying vec3 vD;
        void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vD;
        void main() {
          float y = vD.y;
          vec3 c = y >= 0.0 ? mix(hor, top, smoothstep(0.0, 0.6, y)) : mix(hor, bot, smoothstep(0.0, 0.3, -y));
          gl_FragColor = vec4(c, 1.0);
        }`,
      }),
    ),
  );
}
/** a studio panel (a flag when its value ≈ 0, a strip light when > 1) facing the centre */
function studioPanel(
  scene: THREE.Scene,
  w: number,
  h: number,
  azDeg: number,
  elDeg: number,
  col: THREE.Color,
  dist = 14,
) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }),
  );
  const az = deg(azDeg);
  const el = deg(elDeg);
  m.position
    .set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
    .multiplyScalar(dist);
  m.lookAt(0, 0, 0);
  scene.add(m);
}
function bakeEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, sigma: number) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, sigma).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/** The studio for the glass ring and disc: near-black, with two long, wide strips (one high,
 *  one low) and a faint broad fill. A torus reflecting narrow vertical panels shows them as a
 *  row of ribs (tyre tread); long strips run along the arc as one continuous highlight. In the
 *  dark theme the low strip carries a touch of the lens's violet (a hint on the chrome and the
 *  glass, no bloom). */
function lensEnvironment(renderer: THREE.WebGLRenderer, dark: boolean, violet: THREE.Color) {
  const scene = new THREE.Scene();
  studioDome(scene, 0.05, 0.02, 0.01);
  studioPanel(scene, 44, 3.6, 0, 72, grey(3.2)); // the long overhead strip: the arc's top highlight
  const low = grey(1.5);
  if (dark) low.lerp(violet, 0.2).multiplyScalar(1.5 / Math.max(1e-3, low.r, low.g, low.b));
  studioPanel(scene, 40, 2.4, -35, -14, low); // a long low strip, front-left: its second line
  studioPanel(scene, 24, 10, 25, 8, grey(0.28)); // a broad faint fill: the glass reads as a body
  return bakeEnvironment(renderer, scene, 0.03);
}

/** The studio, re-lit for ice: a grey dome with black flags and narrow bright strips, so every
 *  facet catches a different band (crystal), never one flat grey (plastic). */
function bergEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  studioDome(scene, dark ? 0.06 : 0.55, dark ? 0.02 : 0.3, dark ? 0.01 : 0.12);
  const panel = (w: number, h: number, azDeg: number, elDeg: number, v: number) =>
    studioPanel(scene, w, h, azDeg, elDeg, grey(v));
  if (dark) {
    panel(18, 5, 0, 78, 2.4);
    panel(2.2, 16, 52, 4, 4.2);
    panel(1.4, 16, -78, 4, 2.8);
    panel(1.2, 16, 168, 4, 3.2);
    panel(1.0, 16, -20, 10, 1.6);
    panel(12, 3.2, 215, 12, 0.2);
  } else {
    panel(18, 2, 0, 78, 2.4);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(2.6, 16, 20, 0, 0.02);
    panel(9, 1.3, 205, -6, 0.0);
    panel(2.2, 14, 58, 6, 2.8);
    panel(1.6, 14, -40, 8, 2.8);
    panel(1.0, 14, -8, 12, 1.8);
  }
  return bakeEnvironment(renderer, scene, 0.012);
}

/** A rounded disc (lathe profile), facing +z. */
function puck(r: number, depth: number, bevel: number, segs = 96) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, -depth / 2)];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    pts.push(new THREE.Vector2(r - bevel + Math.cos(a) * bevel, Math.sin(a) * (depth / 2)));
  }
  pts.push(new THREE.Vector2(0, depth / 2));
  const g = new THREE.LatheGeometry(pts, segs);
  g.rotateX(Math.PI / 2);
  return g;
}

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createLensScene(
  canvas: HTMLCanvasElement,
  opts: LensOptions,
): Promise<LensScene> {
  const dark = opts.theme === "dark";
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const sky = new THREE.Color().setStyle(opts.sky);
  const ink = new THREE.Color().setStyle(opts.ink);
  const pale = new THREE.Color("#f4f4f6");
  const violet = new THREE.Color().setStyle(opts.lensLight);
  renderer.setClearColor(sky, 1);
  // the water's two greys, kept in sRGB (the curve between them runs in sRGB, see MURK_GLSL);
  // the DOM reads the same numbers back through water()
  const srgb = (css: string) => {
    const c = new THREE.Color().setStyle(css).convertLinearToSRGB();
    return new THREE.Vector3(c.r, c.g, c.b);
  };
  const surfS = srgb(opts.surf);
  const deepS = srgb(opts.deep);
  const skyV = srgb(opts.sky).y;
  const surfV = surfS.y;
  const deepV = deepS.y;

  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, dark);
  scene.environment = env;
  studioLights(scene, opts.theme);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 800);

  const berg = bergGeometry();
  const peak = Math.max(0.5, berg.peak);
  const tipC = (berg.tx0 + berg.tx1) / 2;
  const tipHalf = Math.max(0.5, (berg.tx1 - berg.tx0) / 2);
  // the lens floats just in front of the berg's deepest bulge (the shoulders)
  const LENS_Z = berg.front + 1.6;
  // where the lens starts: the mark worn on the summit, its foot just above the waterline. The
  // summit stays inside the clear glass for the whole move (see aperture), so the rim never
  // crosses it: the tip's silhouette stays clean at every frame
  const P = { x: berg.peakX, y: peak };
  const L0 = { x: P.x - 0.04 * peak, y: 0.68 * peak, r: 0.44 * peak };
  // where it ends: centred on the berg, its flat clear glass holding all of it (the front
  // bulge sits nearer the camera, so it looks a little larger than its outline)
  const L1 = { x: berg.cx, y: berg.cy, r: (berg.R * 1.04 + 0.3) / CLEAR };

  // shared by every murky material; the values change, the objects do not
  const uMurk = { value: new THREE.Vector4(-litDepth(0.28), 0.85, 0.9, 0.3) };
  const uWS = { value: surfS.clone() }; // the surface's grey, less the exposure step (update)
  const uWD = { value: deepS.clone() };
  const uWK = { value: new THREE.Vector4(WATER_LEAD, WATER_BAND, WATER_BASE, KEEL_D) };
  const uReveal = { value: new THREE.Vector2(-1e3, LENS_BAND) };
  const waterUniforms = {
    uL3Murk: uMurk,
    uL3WS: uWS,
    uL3WD: uWD,
    uL3WK: uWK,
    uL3Reveal: uReveal,
  };
  // the sky's grey and the horizon's hairline, both following the pull-back (update)
  const uSky = { value: sky.clone() };
  const uLine = { value: ink.clone() };
  // the lens's light: a faint cast of the light violet on the ice seen through the glass
  // (a multiplier, linear: white ice goes to ≈ #f5f3ff; the grey ice of the dark theme a touch
  // further, being the only light thing on the page)
  const uLens = { value: new THREE.Vector3(1, 1, 1) };
  {
    const mx = Math.max(violet.r, violet.g, violet.b, 1e-3);
    const k = dark ? 0.18 : 0.09;
    uLens.value.set(
      1 - k * (1 - violet.r / mx),
      1 - k * (1 - violet.g / mx),
      1 - k * (1 - violet.b / mx),
    );
  }

  /* ---- the page: the sky above the waterline, the water below, darkening with depth. The
     edge is where the eye's ray crosses the waterline at the berg's plane (z = 0), and the
     water's grey is read at that plane too, so the horizon and the depth of every grey hold at
     any distance and any swing of the camera (and match the copy's ink in the DOM) */
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 700),
    new THREE.ShaderMaterial({
      uniforms: {
        ...waterUniforms,
        uSky,
        uLine,
        // the horizon is also a hairline: light, a fine dark line over the light grey water;
        // dark, the two greys are close
        uLineA: { value: dark ? 0.3 : 0.16 },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uSky; uniform vec3 uLine; uniform float uLineA;
        varying vec3 vW;
        void main() {
          float k = cameraPosition.z / ( cameraPosition.z - vW.z );
          float y0 = cameraPosition.y + ( vW.y - cameraPosition.y ) * k;
          float fw = max( fwidth( y0 ), 1e-5 );
          vec3 col = mix( l3Water( y0 ), uSky, smoothstep( -0.5 * fw, 0.5 * fw, y0 ) );
          col = mix( col, uLine, ( 1.0 - smoothstep( 0.0, fw * 1.2, abs( y0 ) ) ) * uLineA );
          gl_FragColor = vec4( col, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(back);

  /* ---- the berg: frosted ice, opaque, so the lens's glass can refract it ---- */
  const bergMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#818388" : "#F2F3F6"),
    roughness: dark ? 0.4 : 0.44,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    flatShading: true,
    envMapIntensity: dark ? 1.35 : 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const lineCol = dark ? pale.clone() : ink.clone();
  // the whisper of cold in the ice (a multiplier, linear): toward #dfe6ee at its strongest,
  // never saturated. Dark: a touch more, the ice being the only light thing on the page.
  const tint = dark ? new THREE.Vector3(0.935, 0.962, 1) : new THREE.Vector3(0.93, 0.962, 1);
  const DIM_D = (0.8 * KEEL_D).toFixed(1);
  bergMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, waterUniforms);
    sh.uniforms.uL3Line = { value: lineCol };
    sh.uniforms.uL3Tint = { value: tint };
    sh.uniforms.uL3Lens = uLens;
    sh.vertexShader =
      "varying vec3 vL3W;\n" +
      sh.vertexShader.replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n vL3W = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    sh.fragmentShader =
      "varying vec3 vL3W;\nuniform vec3 uL3Line;\nuniform vec3 uL3Tint;\nuniform vec3 uL3Lens;\n" +
      MURK_GLSL +
      NEUTRAL_GLSL +
      sh.fragmentShader.replace(
        "#include <tonemapping_fragment>",
        /* glsl */ `#include <tonemapping_fragment>
        {
          float yy = vL3W.y;
          float under = 1.0 - smoothstep( -0.3, 0.0, yy );
          // the deeper the ice, the less light reaches it (depth, not glow)
          float depthK = smoothstep( 0.0, ${DIM_D}, -yy );
          // the tip: a real shadow side. The key comes from the upper left and the front, so
          // the right flank falls to ≈ #cfd3d8, the left flank a little, the top stays white;
          // under water it is where the flutes read
          float away = smoothstep( -0.2, 0.8, 0.55 * abs( normal.x ) + 0.45 * normal.x - 0.3 * normal.y );
          float awayK = away * ( yy > 0.0 ? 0.18 : 0.22 );
          // the faces that turn edge-on to the eye fall a step: the summit's upper edge and its
          // lit flank hold against the light sky
          float rim = 1.0 - smoothstep( 0.2, 0.62, normal.z );
          float rimK = rim * mix( 0.1, 0.3, 1.0 - under );
          float dim = ( 1.0 - 0.45 * depthK ) * ( 1.0 - awayK ) * ( 1.0 - rimK );
          // through the glass the lens's light reaches the deep ice (half the depth's dimming)
          // and the facets keep their contrast at the close's small scale: the shadow side and
          // the edge-on faces a step deeper, so the flutes read and the mass is not one gem
          float dimL = ( 1.0 - 0.25 * depthK ) * ( 1.0 - awayK * 1.5 ) * ( 1.0 - rimK * 1.3 );
          // the cold: the underwater mass (more on its shadow side), a trace on the tip's shadow
          float cold = under * ( 0.6 + 0.4 * away ) + ( 1.0 - under ) * away * 0.4;
          gl_FragColor.rgb *= mix( vec3( 1.0 ), uL3Tint, cold );
          #ifdef TONE_MAPPING
            gl_FragColor.rgb = mix( gl_FragColor.rgb * dim, l3Water( yy ), l3Murk( yy ) );
          #else
            // through the glass: the ice lit in the lens's light (a faint cool violet) as far
            // down as that light reaches; below its edge the murk sits on it here as outside
            vec3 base = l3Neutral( gl_FragColor.rgb );
            vec3 seen = base * dimL * uL3Lens;
            gl_FragColor.rgb = mix( mix( base * dim, l3Water( yy ), l3Murk( yy ) ), seen, l3Lit( yy ) );
          #endif
          // the waterline, drawn round the ice as one hairline
          float fw = max( fwidth( yy ), 1e-4 );
          float wl = 1.0 - smoothstep( 0.0, fw * 1.4, abs( yy ) );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uL3Line, wl * 0.5 );
        }`,
      );
  };
  const bergMesh = new THREE.Mesh(berg.geo, bergMat);
  scene.add(bergMesh);

  // only the major ridges as quiet hairlines (≥ 28° between faces; opaque, so the lens sees
  // them too). Anything busier reads as a wireframe.
  // Under the water only the long ridges stay: short edges read as white scratches.
  // The tip takes its ridges from a finer threshold (its summit's ridges define its edge
  // against the light sky) and draws them a step darker.
  const edgeGeo = new THREE.EdgesGeometry(berg.geo, 28);
  {
    const tipGeo = new THREE.EdgesGeometry(berg.geo, 16);
    const keep: number[] = [];
    const sift = (g: THREE.BufferGeometry, tip: boolean) => {
      const src = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < src.count; i += 2) {
        const ax = src.getX(i);
        const ay = src.getY(i);
        const az = src.getZ(i);
        const bx = src.getX(i + 1);
        const by = src.getY(i + 1);
        const bz = src.getZ(i + 1);
        const above = Math.max(ay, by) > -0.1;
        const len = Math.hypot(bx - ax, by - ay, bz - az);
        if (tip ? above : !above && len > 0.15 * HB) keep.push(ax, ay, az, bx, by, bz);
      }
    };
    sift(tipGeo, true);
    sift(edgeGeo, false);
    tipGeo.dispose();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
  }
  const edges = new THREE.LineSegments(
    edgeGeo,
    new THREE.ShaderMaterial({
      uniforms: {
        ...waterUniforms,
        uCol: { value: sky.clone().lerp(ink, dark ? 0.14 : 0.13) },
        // (a step darker: the summit's upper edge must hold against the sky)
        uColTip: { value: sky.clone().lerp(ink, dark ? 0.46 : 0.44) },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uCol;
        uniform vec3 uColTip;
        varying vec3 vW;
        void main() {
          vec3 c = vW.y > -0.1 ? uColTip : uCol;
          vec3 m = mix( c, l3Water( vW.y ), l3Murk( vW.y ) );
          #ifdef TONE_MAPPING
            c = m;
          #else
            c = mix( m, c, l3Lit( vW.y ) );
          #endif
          gl_FragColor = vec4( c, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(edges);

  /* ---- the lens: the mark, whole. Built once at orbit radius 1 and scaled as one piece, so
     its proportions (arcs, gaps, nodes, disc) are the mark's at every size ---- */
  const lens = new THREE.Group();
  scene.add(lens);
  // the glass reflects its own near-black studio (two long strips) in both themes
  const lensEnv = lensEnvironment(renderer, dark, violet);
  // clear glass that shows the refracted pass as is (it is tone-mapped already, see
  // NEUTRAL_GLSL): thin and colourless, its only darks the studio's flags caught in its
  // reflections, so on the white page its edges still read crisp
  const glass = (thickness: number) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness,
      ior: 1.5,
      specularIntensity: 1,
      envMap: lensEnv,
      envMapIntensity: dark ? 1.2 : 1.1,
      toneMapped: false,
    });
  const matArc = glass(0.26);
  const matDisc = glass(0.12);
  // satin chrome: the bright studio, softly blurred (never a black puck). Dark: its reflections
  // carry a hint of the lens's violet
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#E5E4EB" : "#F1F2F5"),
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: dark ? 1.25 : 1.15,
  });

  // the clear disc inside the orbit: the lens itself
  lens.add(new THREE.Mesh(puck(DISC_R, 0.09, 0.045, 128), matDisc));
  // the orbit: three glass arcs with rounded ends, the mark's gap at each node
  const capGeo = new THREE.SphereGeometry(TUBE, 24, 12);
  NODE_A.forEach((a, i) => {
    const a0 = a + GAP;
    const a1 = (NODE_A[i + 1] ?? 360) - GAP;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1, TUBE, 20, 120, deg(a1 - a0)), matArc);
    arc.rotation.z = deg(a0);
    lens.add(arc);
    for (const e of [a0, a1]) {
      const cap = new THREE.Mesh(capGeo, matArc);
      cap.position.set(Math.cos(deg(e)), Math.sin(deg(e)), 0);
      lens.add(cap);
    }
  });
  // the nodes: chrome discs on the orbit, in the middle of each gap
  const nodeGeo = puck(NODE_R, 0.22, 0.08);
  NODE_A.forEach((a) => {
    const n = new THREE.Mesh(nodeGeo, matChrome);
    n.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0.03);
    lens.add(n);
  });
  // the page's one violet: a small inlay on the flagging node, kept ~5 css px at every size
  const FLAG_P = new THREE.Vector3(Math.cos(deg(NODE_A[FLAG])), Math.sin(deg(NODE_A[FLAG])), 0.142);
  const inlay = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setStyle(opts.signal),
      toneMapped: false,
    }),
  );
  inlay.position.copy(FLAG_P);
  lens.add(inlay);

  /* ---- state ---- */
  let W = 1;
  let H = 1;
  type Fit = { s: number; xa: number; X: number; Y: number };
  let F0: Fit = { s: 100, xa: 0, X: 0, Y: 0 };
  let F1: Fit = F0;
  let yS0 = 0; // the summit's stage y when the move starts
  let yS1 = 0; // and where it rests, near the top, once the header has gone
  let topM = 0;
  let E = 0;
  let HBY = 0; // the header's bottom edge (stage y)
  let Y = 0; // the waterline (stage y)
  let light = 0.28;
  let lightT = 0.28;
  let reveal = 1;
  let revealT = 1;
  let revealNow = 1; // how far the toggle has the lens's light on (1 through the move)
  let lensD = 1e3; // the lens's light's reach now, world depth below the waterline
  let sNow = 100; // css px per world unit at the berg's plane
  let Rnow = L0.r; // the lens's radius, world units at the berg's plane
  let surfNow = surfV; // the surface's grey now (sRGB), after the exposure step
  let skyNow = skyV; // the sky's grey now (sRGB)
  const skyS = srgb(opts.sky);

  const applyLight = () => {
    // below the light the ice keeps faint facets (ice in shadow, not a smoky silhouette)
    uMurk.value.set(-litDepth(light), 0.85, 0.72 - 0.12 * light, 0.3);
  };
  const applyReveal = () => {
    // the light's reach by the scroll: the whole frame, then a hold while the frame outruns it,
    // then the sweep to the keel as the close settles (scroll-linked, so it replays)
    const HOLD_D = 0.66 * KEEL_D;
    const byScroll =
      E < LENS_HOLD_E
        ? 1e3
        : lerp(
            HOLD_D,
            KEEL_D + 1,
            smooth01((E - LENS_SWEEP_E[0]) / (LENS_SWEEP_E[1] - LENS_SWEEP_E[0])),
          );
    // the toggle ("Today": back to the answers' edge) counts only at the close, so scrolling
    // back up always finds the light on
    const w = smooth01((E - 0.84) / 0.12);
    revealNow = 1 - (1 - reveal) * w;
    lensD = lerp(litDepth(light), byScroll, revealNow);
    uReveal.value.set(-lensD, LENS_BAND);
  };

  /** The camera: level at the waterline's height (the water is seen edge-on, one horizon), on
   *  an arc round the berg's axis (yaw), at distance cz from world (xa, 0, 0), which lands on
   *  stage (X, y) by a lens shift. */
  const place = (s: number, xa: number, X: number, y: number, yaw: number) => {
    const f = H / (2 * Math.tan(deg(FOV) / 2));
    const cz = f / s;
    const FW = W + 2 * Math.abs(X - W / 2);
    const FH = H + 2 * Math.abs(y - H / 2);
    camera.position.set(xa + Math.sin(yaw) * cz, 0, Math.cos(yaw) * cz);
    camera.rotation.set(0, yaw, 0);
    camera.fov = (2 * Math.atan(FH / (2 * f)) * 180) / Math.PI;
    camera.aspect = FW / FH;
    camera.setViewOffset(FW, FH, FW / 2 - X, FH / 2 - y, W, H);
    camera.updateMatrixWorld();
    return cz;
  };
  const tilt = new THREE.Euler();
  const tiltQ = new THREE.Quaternion();

  /** The lens at e (world, the berg's plane), at scale s (css px per unit): one move from the
   *  mark on the summit to the whole berg; its radius grows geometrically, like the pull-back.
   *  Its centre may not sink so far that the summit would leave the flat clear glass: the rim
   *  passes above the summit, never across it. */
  const aperture = (e: number, s: number) => {
    const tx = lerp(L0.x, L1.x, e);
    const R = L0.r * Math.pow(L1.r / L0.r, e);
    const inner = CLEAR * R - RIM_PX / s;
    const dxp = P.x - tx;
    const ty = Math.max(
      lerp(L0.y, L1.y, e),
      P.y - Math.sqrt(Math.max(0, inner * inner - dxp * dxp)),
    );
    return { tx, ty, R, ringTop: ty + R * (1 + TUBE) };
  };

  const update = () => {
    const e = E;
    // the pull-back: the camera's distance grows by the same factor for every step of e (the
    // page hands e in linearly with the scroll), so every screen holds about twice the ice
    let s = F0.s * Math.pow(F1.s / F0.s, e);
    let ap = aperture(e, s);
    // the waterline: the summit drifts from its header position up to where it rests, near the
    // top, over the first third of the move and holds there while the frame reaches deeper
    // below (the berg never moves: it is the frame that widens under the summit). It never
    // rises past the header's edge, so the header's copy always sits on the white.
    const yS = lerp(yS0, yS1, smooth01(e / 0.3));
    Y = Math.max(HBY, yS + peak * s);
    // (and the ring's top never leaves the frame)
    const cap = (Y - topM) / Math.max(peak, ap.ringTop);
    if (cap < s) {
      s = Math.max(cap, Math.min(s, F1.s));
      ap = aperture(e, s);
      Y = Math.max(HBY, yS + peak * s);
    }
    Y = Math.min(4 * H, Math.max(-H, Y));
    const { tx, ty, R } = ap;
    const xa = lerp(F0.xa, F1.xa, e);
    const X = lerp(F0.X, F1.X, e);
    // the swing: the camera comes round from the berg's left to its right as it pulls back, so
    // the near ice and the far ice, the mark in front of it and the studio's bands of light on
    // every facet all move at their own rates (the parallax); the berg itself never moves
    const cz = place(s, xa, X, Y, lerp(YAW0, YAW1, e));
    sNow = s;
    // the page darkens as the frame reaches deeper: the sky band from the page grey to a deep
    // grey, the water's surface further (the horizon's hairline turns pale on the dark sky)
    const drift = surfDrift(dark, e);
    uWS.value.copy(surfS).multiplyScalar(drift);
    surfNow = surfV * drift;
    const sd = skyDrift(dark, e);
    uSky.value.setRGB(skyS.x * sd, skyS.y * sd, skyS.z * sd, THREE.SRGBColorSpace);
    skyNow = skyV * sd;
    if (!dark) uLine.value.copy(ink).lerp(pale, pullDark(e));
    // the ring at the close: on the dark theme's black its reflections come up a little so the
    // thin glass still reads; on the light theme they come down, so the tube's dark studio
    // never outweighs the ice it holds
    matArc.envMapIntensity = matDisc.envMapIntensity = dark
      ? lerp(1.2, 1.35, pullDark(e))
      : lerp(1.1, 0.8, pullDark(e));
    // the backdrop spans the view, far behind the berg (its greys are computed in the world at
    // the berg's plane, so it never slides against the ice)
    back.position.set(0, 0, -(cz + 12));
    camera.localToWorld(back.position);
    back.quaternion.copy(camera.quaternion);

    // the mark, in front of the camera at its depth so that it lands exactly where the frame
    // says (sizes are in the berg's plane); it faces the camera, so it turns with the swing
    const lz = Math.min(LENS_Z, cz * 0.6);
    const k = (cz - lz) / cz;
    lens.position.set((tx - xa) * k, ty * k, -(cz - lz));
    camera.localToWorld(lens.position);
    lens.scale.setScalar(R * k);
    // calm: it never turns. It starts a touch tilted, like a mark worn on the summit, and
    // settles face-on as the camera pulls back; the nodes catch the light as the camera moves
    const u = 1 - e;
    tilt.set(0.06 * u, -0.12 * u, 0);
    lens.quaternion.copy(camera.quaternion).multiply(tiltQ.setFromEuler(tilt));
    inlay.scale.setScalar(Math.min(0.11, 5 / (R * s)));
    lens.updateMatrixWorld(true);
    Rnow = R;
    applyReveal();
  };

  const fit = (l: LensLayout) => {
    // the start: the crown. The tip fills the frame's height, its base on the waterline at
    // r0.y1, its skirts running out of frame on both sides (a macro on the summit: the scale
    // readout starts at 1 : 1 here and reaches ≈ 1 : 20 on the whole berg); the mark hugs the
    // peak and fits too — its right node stops 24 px short of the ruler, so the camera aims
    // right of the tip's centre as far as that needs
    const r0 = l.r0;
    const X0 = (r0.x0 + r0.x1) / 2;
    let s0 = Math.max(1, (0.88 * (r0.y1 - r0.y0)) / peak);
    const a0 = aperture(0, s0);
    s0 = Math.max(1, Math.min(s0, (r0.y1 - r0.y0 - 8) / a0.ringTop));
    const ringRight = L0.x + (1 + NODE_R + 0.03) * L0.r;
    const xa0 = Math.max(tipC + 0.12 * tipHalf, ringRight - (r0.x1 - 24 - X0) / s0);
    F0 = { s: s0, xa: xa0, X: X0, Y: r0.y1 };
    // the end: the whole mark (the orbit, and the nodes that sit on it) inside r1; the 0° node
    // reaches furthest right, so the ring sits a little left of the frame's centre
    const r1 = l.r1;
    const R1 = L1.r;
    const extL = R1 * (1 + TUBE);
    const extR = R1 * (1 + NODE_R + 0.03);
    const extV = R1 * Math.max(1 + TUBE, Math.sin(deg(128)) + NODE_R + 0.03);
    const s1 = Math.max(
      0.5,
      Math.min((r1.x1 - r1.x0) / (extL + extR), (r1.y1 - r1.y0) / (2 * extV)),
    );
    const sEnd = Math.min(s1, s0);
    const sx = (r1.x0 + r1.x1) / 2 - ((extR - extL) / 2) * sEnd;
    const sy = (r1.y0 + r1.y1) / 2;
    // stage y of the waterline when the lens's centre (below it) sits at sy
    F1 = { s: sEnd, xa: L1.x, X: sx, Y: sy + L1.y * sEnd };
    yS0 = F0.Y - peak * F0.s;
    yS1 = F1.Y - peak * F1.s;
    topM = l.top;
  };

  const v3 = new THREE.Vector3();
  const toPx = (v: THREE.Vector3) => {
    v.project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };

  applyLight();

  return {
    resize(l) {
      W = Math.max(1, l.W);
      H = Math.max(1, l.H);
      renderer.setSize(W, H, false);
      fit(l);
      update();
    },
    setView(e, hb) {
      E = clamp01(e);
      HBY = hb;
      update();
      return Y;
    },
    setLight(v, instant) {
      lightT = clamp01(v);
      if (instant) {
        light = lightT;
        applyLight();
      }
    },
    setReveal(on, instant) {
      revealT = on ? 1 : 0;
      if (instant) {
        reveal = revealT;
        applyReveal();
      }
    },
    reveal() {
      return revealNow;
    },
    step(dtMs) {
      const k = 1 - Math.exp(-Math.min(64, dtMs) / 220);
      light += (lightT - light) * k;
      reveal += (revealT - reveal) * k * 0.8;
      const movingL = Math.abs(lightT - light) > 0.0015;
      const movingR = Math.abs(revealT - reveal) > 0.002;
      if (!movingL) light = lightT;
      if (!movingR) reveal = revealT;
      applyLight();
      applyReveal();
      return movingL || movingR;
    },
    render() {
      renderer.render(scene, camera);
    },
    scale() {
      return { now: sNow, start: F0.s };
    },
    flag() {
      v3.copy(FLAG_P).setZ(0.14);
      lens.localToWorld(v3);
      const q = toPx(v3);
      v3.set(0, 0, 0);
      lens.localToWorld(v3);
      const c = toPx(v3);
      return {
        x: q.x,
        y: q.y,
        r: NODE_R * Rnow * sNow,
        cx: c.x,
        cy: c.y,
        ring: (1 + NODE_R) * Rnow * sNow,
      };
    },
    gauge() {
      const y = -litDepth(light);
      v3.set(berg.left(y) - 0.25, y, 0);
      return toPx(v3);
    },
    reach() {
      // the answers' edge through the move; at the close the lens's light, sweeping to the keel
      // (and back to the answers' edge on "Today")
      const d = lerp(litDepth(light), Math.min(lensD, KEEL_D - 0.6), smooth01((E - 0.84) / 0.06));
      v3.set(berg.cx, -d, 0);
      return { y: toPx(v3).y, d };
    },
    water(y) {
      const d = (y - Y) / sNow;
      if (d <= 0) return skyNow;
      return lerp(surfNow, deepV, waterK(d, litDepth(light)));
    },
    waterY(v) {
      const k = (v - surfNow) / (deepV - surfNow);
      if (k <= 0) return Y;
      if (k >= 1) return Y + KEEL_D * sNow;
      // k(d) climbs monotonically: bisect for the depth
      const L = litDepth(light);
      let lo = 0;
      let hi = KEEL_D;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        if (waterK(mid, L) < k) lo = mid;
        else hi = mid;
      }
      return Y + ((lo + hi) / 2) * sNow;
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      capGeo.dispose();
      nodeGeo.dispose();
      env.dispose();
      lensEnv.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
