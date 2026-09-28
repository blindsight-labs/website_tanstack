/* Mockup 1 · "Lens · Pull-back" — the scene.

   One berg, built once and never moved: a faceted block of frosted ice with a sharp,
   off-centre summit above a hairline waterline, broad shoulders just under it and a long,
   fluted mass that tapers to a pointed keel. In front of it floats the Blindsight mark made
   physical: the orbit's three glass arcs and three chrome nodes rim a clear glass disc. That
   disc is the lens.

   The camera (the pull-back): it never tilts and never pans. It sits level, a little above the
   waterline, and only dollies straight back while its lens widens slightly; the framing is a
   lens shift (setViewOffset). The header frame (the tip) and the closing frame (the whole berg
   inside the lens) are joined as ONE zoom about the single screen point both frames agree on,
   which lands just above the summit: the tip barely moves while the rest of the berg rises into
   view from below and from the sides.

   How the reveal works (and why it is cheap): the water's murk is painted into the ice, its
   hairlines and the backdrop only in the final pass to the screen. For its glass materials
   three.js first renders the opaque scene into a texture that the glass refracts, and in that
   pass (no tone mapping, so no TONE_MAPPING define) the murk is left out. So wherever you look
   through the lens you see the berg as it is: sharp and lit. Outside it, below the reach of the
   light, the berg fades into the page.

   Every motion has a cause:
   - scroll → setProgress: the pull-back, and the lens travels from the tip's flank and grows
     until its aperture holds the whole berg;
   - answers → setLight: how much the organization already sees sets how far the light reaches
     below the waterline, and how murky the rest is;
   - the violet inlay on one node is the risk the lens is flagging (the page names it).

   Client-only: imported dynamically from Mockup1.tsx. Renders on demand. */
import { THREE, createRenderer, studioLights, type Theme } from "@/site/three/core";

import { HB, TOP, litDepth } from "./depth";

export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** Stage size (css px) and the screen rects the opening frame (the tip) and the closing frame
 *  (the whole lens) are fitted into. */
export type LensLayout = { W: number; H: number; r0: Rect; r1: Rect };
/** The berg's plane (z = 0) on screen: x_px = ox + x · s, y_px = oy − y · s. */
export type LensView = {
  s: number;
  ox: number;
  oy: number;
  /** 1 at the header's frame, growing as the camera pulls back */
  zoom: number;
  /** world y of the edge of the light (below the waterline) */
  lit: number;
};

export type LensScene = {
  resize(l: LensLayout): void;
  /** 0 = the tip, framed tight · 1 = the whole berg inside the lens */
  setProgress(p: number): void;
  /** 0..1: how much of its AI exposure the organization already sees */
  setLight(v: number, instant: boolean): void;
  /** stage px where the copy column ends: the water and the waterline stay right of it
   *  (null: no copy beside the render) */
  setMask(px: number | null): void;
  /** advance the light's easing; true while it is still moving */
  step(dtMs: number): boolean;
  render(): void;
  view(): LensView;
  /** stage px of the flagging node (its centre and radius) and of the lens's centre */
  flag(): { x: number; y: number; r: number; cx: number; cy: number };
  /** stage px of the edge of the light, at the berg's left flank */
  gauge(): { x: number; y: number };
  dispose(): void;
};

export type LensOptions = {
  theme: Theme;
  /** the page colour behind the render (the sheet's) */
  surface: string;
  ink: string;
  signal: string;
};

const TAU = Math.PI * 2;
const deg = (d: number) => (d * Math.PI) / 180;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const clamp01 = (x: number) => clamp(x, 0, 1);
const smooth01 = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** one confident move: slow out, slow in */
const smoother = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/* a long lens that widens a touch as it pulls back */
const FOV0 = 17;
const FOV1 = 22;

/* ------------------------------------------------------------------ */
/* the berg's silhouette                                               */
/* ------------------------------------------------------------------ */
/* t = 0 at the peak, 1 at the keel; WLT (= 0.15) at the waterline.
   The profile follows the shared silhouette spec (SILHOUETTE.md), in fractions of the height H:
   half-widths r(t) 0 · .07 · .15 · .19 (waterline) · .27 · .32 (widest) · .31 · .27 · .21 · .14
   · .07 · 0, the summit +0.10·H right of the axis, the widest centre −0.05·H, the keel point
   −0.12·H. Expected widths (H = 14): at t = 0.15, 0.38·H = 5.3 units; at t = 0.24,
   0.64·H = 9.0 units (1.7× the tip's base). Tall : wide ≈ 1.6 : 1; depth ≈ 0.75 × width.
   Left and right split each r(t) unevenly (a steeper summit flank on the right, a lower
   secondary shoulder on the left at t ≈ 0.09), so the berg is asymmetric by profile alone. */
const WLT = TOP / HB;
const ZS = 0.75; // depth ≈ 0.75 × width

type Knots = readonly (readonly [number, number])[];
/** The profile through its knots (fractions of the height, values scaled to world units).
 *  Above the water: straight runs, so the tip reads as big flat planes. Below it: a smooth
 *  (Catmull-Rom) run, so the knots leave no horizontal creases (round 2's terraces); the
 *  facets there come from the vertical fluting and the chips instead. */
const curve = (k: Knots) => (t: number) => {
  const u = clamp01(t);
  for (let i = 1; i < k.length; i++) {
    const [t1, v1] = k[i];
    if (u <= t1) {
      const [t0, v0] = k[i - 1];
      const s = (u - t0) / Math.max(1e-6, t1 - t0);
      if (t0 < WLT) return (v0 + (v1 - v0) * s) * HB;
      const vm = (k[i - 2] ?? k[i - 1])[1];
      const vp = (k[i + 1] ?? k[i])[1];
      const m0 = (v1 - vm) / 2;
      const m1 = (vp - v0) / 2;
      const s2 = s * s;
      const s3 = s2 * s;
      const v =
        (2 * s3 - 3 * s2 + 1) * v0 +
        (s3 - 2 * s2 + s) * m0 +
        (-2 * s3 + 3 * s2) * v1 +
        (s3 - s2) * m1;
      return Math.max(0, v) * HB;
    }
  }
  return k[k.length - 1][1] * HB;
};

/** half-width to the right of the axis */
const RIGHT = curve([
  [0, 0],
  [0.035, 0.028],
  [0.06, 0.058],
  [0.08, 0.085],
  [0.1, 0.13],
  [0.15, 0.19],
  [0.17, 0.245],
  [0.19, 0.29],
  [0.24, 0.335],
  [0.33, 0.32],
  [0.45, 0.26],
  [0.52, 0.235],
  [0.58, 0.2],
  [0.72, 0.13],
  [0.86, 0.075],
  [1, 0],
]);
/** half-width to the left: steep, a lower secondary shoulder (a ledge at t ≈ 0.09), the mass */
const LEFT = curve([
  [0, 0],
  [0.035, 0.024],
  [0.06, 0.035],
  [0.083, 0.045],
  [0.092, 0.11],
  [0.1, 0.15],
  [0.15, 0.19],
  [0.17, 0.25],
  [0.19, 0.3],
  [0.24, 0.35],
  [0.33, 0.335],
  [0.45, 0.28],
  [0.58, 0.22],
  [0.65, 0.19],
  [0.72, 0.15],
  [0.86, 0.065],
  [1, 0],
]);
/** the berg's axis: the summit right of centre, the broad mass left, the keel point further left */
const AXIS = curve([
  [0, 0.1],
  [0.035, 0.095],
  [0.06, 0.085],
  [0.1, 0.05],
  [0.15, 0],
  [0.19, -0.03],
  [0.24, -0.05],
  [0.33, -0.05],
  [0.45, -0.04],
  [0.58, -0.05],
  [0.72, -0.07],
  [0.86, -0.09],
  [1, -0.12],
]);

/* the lens: the mark, orbit radius 1 */
const TUBE = 0.07; // a thin glass ring
const GAP = 20; // half-gap of the orbit at each node, degrees
const NODE_A = [0, 128, 232];
const NODE_R = 0.25;
const FLAG = 1; // the node that carries the signal (upper left when the lens settles)
const DISC_R = 1 - TUBE + 0.005;
/** share of the lens radius that is flat, clear glass (inside the bevel) */
const CLEAR = 0.86;

/* where the lens starts: just under the waterline, over the tip's right flank */
const L0 = { x: 2.6, y: -1.25, r: 1.0 };
/* the opening frame: the summit framed tight (a macro: the skirt may run off its edges), the
   waterline, a band of water and the small lens */
const TIP_RECT: Rect = { x0: -1.9, x1: 3.6, y0: -2.3, y1: 2.8 };

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */
/* murk below the waterline: a thin lit band (w), then, below the edge of the light (x, soft
   over y), murk z that deepens to almost nothing seen at the keel */
/* the water: a quiet grey below the line, full width behind the berg (in every pass, so the
   lens shows it too). Only the waterline's hairline is kept off the copy column (x left of
   uL1Mask.x, in the berg's plane, fading over uL1Mask.y). */
const MURK_GLSL = /* glsl */ `
uniform vec4 uL1Murk;
uniform vec3 uL1Page;
uniform vec3 uL1Water;
uniform vec2 uL1Mask;
float l1Under( float y ) { return 1.0 - smoothstep( -0.03, 0.0, y ); }
float l1Mask( float x ) { return smoothstep( uL1Mask.x, uL1Mask.x + uL1Mask.y, x ); }
vec3 l1Bg( vec2 p ) { return mix( uL1Page, uL1Water, l1Under( p.y ) ); }
float l1Murk( float y ) {
  float under = l1Under( y );
  float lit = smoothstep( uL1Murk.x - uL1Murk.y, uL1Murk.x, y );
  float deep = clamp( ( uL1Murk.x - y ) / 11.0, 0.0, 1.0 );
  float below = mix( uL1Murk.z, 0.97, deep * deep );
  return under * mix( below, uL1Murk.w, lit );
}
`;

/* three's Khronos PBR Neutral at exposure 1: the refracted pass is rendered without tone
   mapping, so the ice tone-maps itself there and the lens (toneMapped: false) shows it exactly
   as it looks outside the lens */
const NEUTRAL_GLSL = /* glsl */ `
vec3 l1Neutral( vec3 color ) {
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

/** share of the sphere's polar angle given to the tip: the summit gets more rows of facets */
const UT = 0.36;

function bergGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 7);
  // a vertex at each pole, so the summit and the keel each come to one sharp point
  geo.rotateZ(Math.atan2(1, (1 + Math.sqrt(5)) / 2));
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n1 = makeNoise(11);
  const n2 = makeNoise(29);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    const u = Math.acos(clamp(p.y, -1, 1)) / Math.PI;
    const t = u < UT ? (u / UT) * WLT : WLT + ((u - UT) / (1 - UT)) * (1 - WLT);
    const rho = Math.hypot(p.x, p.z);
    const dx = rho < 1e-6 ? 0 : p.x / rho;
    const dz = rho < 1e-6 ? 0 : p.z / rho;
    const theta = Math.atan2(dz, dx);
    const above = 1 - clamp01(t / WLT);
    const deep = clamp01((t - WLT) / 0.1);
    const y0 = TOP - t * HB;
    // below the water, vertical fluting: long shallow grooves (a triangle wave round the berg,
    // so the ridges are crisp), each groove its own depth, drifting only slightly with depth;
    // it fades out towards the keel so the keel closes to one clean point
    const keelFade = 1 - smooth01((t - 0.7) / 0.25);
    const lane = (theta / TAU) * 9 + 0.12 * Math.sin(0.3 * y0 + theta);
    const tri = Math.abs(lane - Math.floor(lane) - 0.5) * 4 - 1;
    const groove = 0.5 + 0.5 * n1(Math.cos(theta) * 2.2, 0.4, Math.sin(theta) * 2.2);
    const relief =
      1 +
      (0.03 + 0.05 * keelFade + 0.07 * above) * n1(p.x * 1.6, p.y * 1.6, p.z * 1.6) +
      0.05 * deep * keelFade * groove * tri;
    // the rows of the mesh broken up: a small, finer vertical jitter below the water (never
    // enough to fold a row over its neighbour)
    const y =
      y0 +
      0.24 * n2(p.x, p.y, p.z) * Math.sin(Math.PI * clamp01(t * 1.1)) +
      0.12 * deep * keelFade * n2(p.x * 3.1, p.y * 3.1, p.z * 3.1);
    const rx = dx >= 0 ? RIGHT(t) : LEFT(t);
    const rz = ZS * 0.5 * (RIGHT(t) + LEFT(t));
    pos.setXYZ(i, AXIS(t) + dx * rx * relief, Math.min(TOP, y), dz * rz * relief);
  }
  // chip it: seeded planes shear off whole sides, so the ice has big flat faces, a spire of
  // steep planes at the summit and a chiselled keel instead of a lathed shape
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cuts: { n: THREE.Vector3; p: THREE.Vector3; size: number }[] = [];
  const addCut = (tc: number, a: number, tilt: number, k: number, size: number) => {
    const rx = (Math.cos(a) >= 0 ? RIGHT(tc) : LEFT(tc)) * k;
    const rz = ZS * 0.5 * (RIGHT(tc) + LEFT(tc)) * k;
    cuts.push({
      // each chip is local, a patch of `size` round its point: an infinite plane would shave
      // the whole mass below it back to the tip's radius (round 1's shard / diamond), and a
      // depth band would leave horizontal creases (round 2's terraces)
      size,
      n: new THREE.Vector3(Math.cos(a), tilt, (Math.sin(a) / ZS) * 0.8).normalize(),
      p: new THREE.Vector3(AXIS(tc) + Math.cos(a) * rx, TOP - tc * HB, Math.sin(a) * rz),
    });
  };
  // (the tilts are kept steep enough that no plane reaches the summit or the keel point, and
  // every cut sits at ≥ 90% of the envelope, so the chips never move the silhouette by > ~8%;
  // their angles and sizes are uneven on purpose)
  const chips: [number, number, number, number, number, number, number, number][] = [
    // [count, t from, t span, tilt from, tilt span, envelope share, size from, size span]
    [4, 0.025, 0.06, 0.15, 0.22, 0.9, 0.9, 0.8], // the spire: big steep planes
    [5, 0.1, 0.045, 0.3, 0.4, 0.92, 1.2, 1.0], // the skirt above the water
    [9, 0.17, 0.32, -0.2, 0.6, 0.93, 1.3, 2.4], // the shoulders
    [4, 0.22, 0.4, -0.15, 0.4, 0.94, 4.2, 1.8], // a few large flat planes on the mass
    [7, 0.52, 0.32, -0.2, 0.4, 0.91, 1.4, 1.8], // the keel
  ];
  for (const [count, t0, ts, a0, as, k0, z0, zs] of chips)
    for (let i = 0; i < count; i++)
      addCut(
        t0 + rnd() * ts,
        (i / count) * TAU + rnd() * (TAU / count) * 0.8,
        a0 + rnd() * as,
        k0 + rnd() * (0.985 - k0),
        z0 + rnd() * zs,
      );
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const tv = clamp01((TOP - p.y) / HB);
    // never more than ~8% of the envelope at this depth (round 3: an unclamped shave carried
    // vertices across the berg into a slab)
    const maxShave = 0.08 * 0.5 * (RIGHT(tv) + LEFT(tv)) + 0.03;
    const ax = AXIS(tv);
    for (const c of cuts) {
      // only the side of the berg the chip faces
      if ((p.x - ax) * c.n.x + p.z * c.n.z <= 0) continue;
      const k = d.subVectors(p, c.p).dot(c.n);
      if (k <= 0) continue;
      const dist = d.length();
      if (dist >= c.size) continue;
      // a flat shave in the patch's core, easing to none at its rim
      const e = smooth01((c.size - dist) / (0.45 * c.size));
      p.addScaledVector(c.n, -Math.min(k, maxShave) * e);
    }
    pos.setXYZ(i, p.x, Math.min(TOP, p.y), p.z);
  }
  geo.computeVertexNormals(); // non-indexed: flat facets

  // the smallest circle (in the camera's plane) that holds the whole berg: where the lens ends
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  let cx = (bb.min.x + bb.max.x) / 2;
  let cy = (bb.min.y + bb.max.y) / 2;
  for (let it = 1; it <= 240; it++) {
    let far = -1;
    let fx = cx;
    let fy = cy;
    for (let i = 0; i < pos.count; i++) {
      const dd = Math.hypot(pos.getX(i) - cx, pos.getY(i) - cy);
      if (dd > far) {
        far = dd;
        fx = pos.getX(i);
        fy = pos.getY(i);
      }
    }
    cx += (fx - cx) / (it + 1);
    cy += (fy - cy) / (it + 1);
  }
  let R = 0;
  for (let i = 0; i < pos.count; i++)
    R = Math.max(R, Math.hypot(pos.getX(i) - cx, pos.getY(i) - cy));
  return { geo, cx, cy, R, maxZ: bb.max.z };
}

/** The studio, re-lit for ice and glass: a grey dome with black flags and narrow bright strips,
 *  so every facet catches a different band (crystal), never one flat grey (plastic). */
function bergEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: grey(dark ? 0.06 : 0.55) },
        hor: { value: grey(dark ? 0.02 : 0.3) },
        bot: { value: grey(dark ? 0.01 : 0.12) },
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
  );
  scene.add(dome);
  const panel = (w: number, h: number, azDeg: number, elDeg: number, v: number, dist = 14) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: grey(v), side: THREE.DoubleSide }),
    );
    const az = deg(azDeg);
    const el = deg(elDeg);
    m.position
      .set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      .multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
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
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.012).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
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
  const page = new THREE.Color().setStyle(opts.surface);
  const ink = new THREE.Color().setStyle(opts.ink);
  renderer.setClearColor(page, 1);

  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, dark);
  scene.environment = env;
  studioLights(scene, opts.theme);
  const camera = new THREE.PerspectiveCamera(FOV0, 1, 0.1, 400);

  const berg = bergGeometry();
  // the lens floats just in front of the berg's deepest bulge
  const LENS_Z = berg.maxZ + 1.1;
  // the end of the move: the lens holds the whole berg with water round it, set a little right
  // of and above the berg's centre, so the waterline crosses high in the glass and the tip
  // breaks the surface inside it. The berg's height ≈ 0.75 of the ring's diameter (never less
  // glass than it needs to hold all of it).
  const L1off = { x: 0.3, y: 0.2 };
  const L1 = {
    x: berg.cx + L1off.x,
    y: berg.cy + L1off.y,
    r: Math.max(HB / 1.5, (berg.R * 1.03 + Math.hypot(L1off.x, L1off.y)) / CLEAR),
  };

  // shared by every murky material; the values change, the objects do not
  const uMurk = { value: new THREE.Vector4(-litDepth(0.28), 0.45, 0.78, 0.1) };
  const uPage = { value: page.clone() };
  const uWater = { value: page.clone().lerp(ink, dark ? 0.045 : 0.06) };
  const uMask = { value: new THREE.Vector2(-1e4, 1) };
  const shared = { uL1Murk: uMurk, uL1Page: uPage, uL1Water: uWater, uL1Mask: uMask };

  /* ---- the backdrop: a dot field in the page colour, faint, fading out away from the berg.
     Its pitch is fixed in the world, so the dots grow denser as the camera pulls back ---- */
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 180),
    new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uInk: { value: ink.clone() },
        uAlpha: { value: dark ? 0.22 : 0.15 },
        uPitch: { value: 0.5 },
        uCenter: { value: new THREE.Vector2(berg.cx, berg.cy + 1.5) },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uInk; uniform float uAlpha; uniform float uPitch; uniform vec2 uCenter;
        varying vec3 vW;
        void main() {
          // where the eye's ray crosses the berg's plane (z = 0): the wall's water and murk line
          // up with the waterline there, from any camera distance
          vec2 pe = cameraPosition.xy + ( vW.xy - cameraPosition.xy ) * cameraPosition.z / ( cameraPosition.z - vW.z );
          vec2 f = fract( vW.xy / uPitch ) - 0.5;
          float px = 1.0 / max( fwidth( vW.x ), 1e-5 ); // device px per world unit
          float d = length( f ) * uPitch * px;
          float a = ( 1.0 - smoothstep( 0.9, 2.1, d ) ) * uAlpha;
          a *= 1.0 - smoothstep( 6.0, 15.0, distance( vW.xy, uCenter ) );
          #ifdef TONE_MAPPING
            a *= 1.0 - l1Murk( pe.y );
          #endif
          gl_FragColor = vec4( mix( l1Bg( pe ), uInk, a ), 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  back.position.set(berg.cx, -5, -10);
  scene.add(back);

  /* ---- the waterline: one hairline, one horizon. Behind the berg's front, so on the ice the
     waterline is where the murk begins; kept ~1.2 css px thick at every zoom ---- */
  const lineCol = page.clone().lerp(ink, dark ? 0.42 : 0.36);
  const waterline = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 1, 1, 1),
    new THREE.ShaderMaterial({
      uniforms: { ...shared, uCol: { value: lineCol } },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uCol;
        varying vec3 vW;
        void main() {
          // kept off the copy column
          float m = l1Mask( vW.x );
          if ( m < 0.01 ) discard;
          gl_FragColor = vec4( mix( uL1Page, uCol, m ), 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(waterline);

  /* ---- the berg: frosted ice, opaque, so the lens's glass can refract it ---- */
  const bergMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#7C7F88" : "#F2F3F6"),
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
  bergMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, shared);
    // under the water the ice takes a darker frosted tone, so the mass reads against the page
    sh.uniforms.uL1Tone = { value: dark ? 0.84 : 0.8 };
    sh.uniforms.uL1Line = { value: lineCol };
    sh.vertexShader =
      "varying vec3 vL1W;\n" +
      sh.vertexShader.replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n vL1W = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    sh.fragmentShader =
      "varying vec3 vL1W;\nuniform float uL1Tone;\nuniform vec3 uL1Line;\n" +
      MURK_GLSL +
      NEUTRAL_GLSL +
      sh.fragmentShader.replace(
        "#include <tonemapping_fragment>",
        /* glsl */ `#include <tonemapping_fragment>
        #ifndef TONE_MAPPING
          gl_FragColor.rgb = l1Neutral( gl_FragColor.rgb );
        #endif
        {
          // the ice below the line is darker, and the waterline rings it: the tip breaks the
          // surface (in both passes, so the lens shows it too)
          gl_FragColor.rgb *= mix( 1.0, uL1Tone, l1Under( vL1W.y ) );
          float fw = max( fwidth( vL1W.y ), 1e-5 );
          float ring = 1.0 - smoothstep( 0.0, fw * 1.3, abs( vL1W.y ) );
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uL1Line, ring * 0.75 );
        }
        #ifdef TONE_MAPPING
          gl_FragColor.rgb = mix( gl_FragColor.rgb, l1Bg( vL1W.xy ), l1Murk( vL1W.y ) );
        #endif`,
      );
  };
  const bergMesh = new THREE.Mesh(berg.geo, bergMat);
  scene.add(bergMesh);

  // the facets as quiet hairlines (opaque, so the lens sees them too)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(berg.geo, 26),
    new THREE.ShaderMaterial({
      uniforms: {
        ...shared,
        uCol: { value: page.clone().lerp(ink, dark ? 0.26 : 0.22) },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uCol;
        varying vec3 vW;
        void main() {
          vec3 c = uCol;
          #ifdef TONE_MAPPING
            c = mix( c, l1Bg( vW.xy ), l1Murk( vW.y ) );
          #endif
          gl_FragColor = vec4( c, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(edges);

  /* ---- the lens: the mark ---- */
  const lens = new THREE.Group();
  scene.add(lens);
  // the glass reflects the dark studio (black flags, narrow bright strips) in both themes
  const lensEnv = dark ? env : bergEnvironment(renderer, true);
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
  // satin chrome: the bright studio, softly blurred (never a black puck)
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#E6E8EC" : "#F1F2F5"),
    metalness: 1,
    roughness: 0.26,
    envMapIntensity: dark ? 1.25 : 1.15,
  });

  // the clear disc inside the orbit
  lens.add(new THREE.Mesh(puck(DISC_R, 0.09, 0.045), matDisc));
  // the orbit: three glass arcs with rounded ends, a gap at each node
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
  // the nodes: chrome discs on the orbit
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
  let prog = 0;
  let light = 0.28;
  let lightT = 0.28;
  let sNow = 100; // css px per world unit at the berg's plane
  let lensR = L0.r;
  /** the zoom: scale s0 → s1 about world point P, which stays on screen point Q */
  let Z = { s0: 100, s1: 30, Px: 0, Py: 0, Qx: 0, Qy: 0 };
  let CX = berg.cx;
  let CY = 0.6;
  let maskPx: number | null = null;

  type Fit = { s: number; wx: number; wy: number; sx: number; sy: number };
  const fit = (world: Rect, screen: Rect): Fit => ({
    s: Math.max(
      1,
      Math.min(
        (screen.x1 - screen.x0) / (world.x1 - world.x0),
        (screen.y1 - screen.y0) / (world.y1 - world.y0),
      ),
    ),
    wx: (world.x0 + world.x1) / 2,
    wy: (world.y0 + world.y1) / 2,
    sx: (screen.x0 + screen.x1) / 2,
    sy: (screen.y0 + screen.y1) / 2,
  });
  // the closing frame: the whole mark (the 0° node reaches furthest right)
  const LENS_RECT: Rect = {
    x0: L1.x - 1.13 * L1.r,
    x1: L1.x + 1.28 * L1.r,
    y0: L1.y - 1.13 * L1.r,
    y1: L1.y + 1.13 * L1.r,
  };

  /** the two frames as one zoom: screen = a + s·x (and b − s·y) at each end; the point both
   *  ends put in the same place is the zoom's centre */
  const frames = (l: LensLayout) => {
    const F0 = fit(TIP_RECT, l.r0);
    const F1 = fit(LENS_RECT, l.r1);
    const s0 = F0.s;
    const s1 = Math.min(F1.s, s0 / 1.25);
    const a0 = F0.sx - s0 * F0.wx;
    const a1 = F1.sx - s1 * F1.wx;
    const b0 = F0.sy + s0 * F0.wy;
    const b1 = F1.sy + s1 * F1.wy;
    const Px = (a1 - a0) / (s0 - s1);
    const Py = (b0 - b1) / (s0 - s1);
    Z = { s0, s1, Px, Py, Qx: a0 + s0 * Px, Qy: b0 - s0 * Py };
    // the camera's rail: level, a little above the water, near the zoom's centre (the lens
    // shift does the framing, so this only sets the parallax of the lens and the backdrop)
    CX = clamp(Px, berg.cx - 2.5, berg.cx + 2.5);
    CY = clamp(Py, 0.3, 1.4);
  };

  const applyLight = () => {
    uMurk.value.set(-litDepth(light), 0.45, 0.86 - 0.3 * light, 0.1);
  };

  const update = () => {
    const e = smoother(prog);
    // log-zoom: every scroll px pulls back alike
    const s = Z.s0 * Math.pow(Z.s1 / Z.s0, e);
    const fov = lerp(FOV0, FOV1, e);
    const D = H / (2 * s * Math.tan(deg(fov) / 2));
    camera.position.set(CX, CY, D);
    camera.rotation.set(0, 0, 0);
    camera.fov = fov;
    camera.aspect = W / H;
    camera.setViewOffset(
      W,
      H,
      W / 2 - Z.Qx + (Z.Px - CX) * s,
      H / 2 - Z.Qy - (Z.Py - CY) * s,
      W,
      H,
    );
    camera.updateMatrixWorld();
    sNow = s;

    // the lens: one move from the tip's flank to the whole berg; placed at its depth so that
    // it lands exactly where the frame says (sizes are in the berg's plane)
    const tx = lerp(L0.x, L1.x, e);
    const ty = lerp(L0.y, L1.y, e);
    const R = L0.r * Math.pow(L1.r / L0.r, e);
    const k = (D - LENS_Z) / D;
    lens.position.set(CX + (tx - CX) * k, CY + (ty - CY) * k, LENS_Z);
    lens.scale.setScalar(R * k);
    // it comes in turned and tilted, and settles face-on as it arrives
    const u = 1 - e;
    lens.rotation.set(0.12 * u, -0.34 * u, deg(-60) * u);
    inlay.scale.setScalar(Math.min(0.11, 5 / (R * s)));
    lens.updateMatrixWorld(true);
    lensR = R;

    // the waterline stays a hairline at every zoom, centred on the frame
    waterline.scale.y = 1.2 / s;
    waterline.position.set(Z.Px + (W / 2 - Z.Qx) / s, 0, 0);
    // the copy column's edge, in the berg's plane; the water fades in over ~90 css px
    uMask.value.set(maskPx == null ? -1e4 : (maskPx - (Z.Qx - Z.Px * s)) / s, 90 / s);
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
      frames(l);
      update();
    },
    setProgress(p) {
      prog = clamp01(p);
    },
    setMask(px) {
      maskPx = px;
    },
    setLight(v, instant) {
      lightT = clamp01(v);
      if (instant) {
        light = lightT;
        applyLight();
      }
    },
    step(dtMs) {
      const e = 1 - Math.exp(-Math.min(64, dtMs) / 220);
      light += (lightT - light) * e;
      const moving = Math.abs(lightT - light) > 0.0015;
      if (!moving) light = lightT;
      applyLight();
      update();
      return moving;
    },
    render() {
      renderer.render(scene, camera);
    },
    view() {
      return {
        s: sNow,
        ox: Z.Qx - Z.Px * sNow,
        oy: Z.Qy + Z.Py * sNow,
        zoom: Z.s0 / sNow,
        lit: -litDepth(light),
      };
    },
    flag() {
      v3.copy(FLAG_P).setZ(0.14);
      lens.localToWorld(v3);
      const q = toPx(v3);
      v3.set(0, 0, 0);
      lens.localToWorld(v3);
      const c = toPx(v3);
      return { x: q.x, y: q.y, r: NODE_R * lensR * sNow, cx: c.x, cy: c.y };
    },
    gauge() {
      const y = -litDepth(light);
      const t = (TOP - y) / HB;
      v3.set(AXIS(t) - LEFT(t) * 1.08 - 0.15, y, 0);
      return toPx(v3);
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
      if (lensEnv !== env) lensEnv.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
