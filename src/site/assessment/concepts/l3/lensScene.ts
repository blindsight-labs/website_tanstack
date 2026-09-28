/* Mockup 3 · "Lens · Aperture" — the scene.

   One berg, built once and never moved: faceted frosted ice, a sharp off-centre summit above
   the waterline and a broad, fluted mass below it that tapers to a pointed keel. The render is
   the page: the white sky above the waterline and the black sea below it are the exact colours
   of the sheets the copy sits on. In front floats the Blindsight mark made physical: three
   glass arcs and three chrome nodes round a clear glass disc. The disc is the aperture.

   How the reveal works (and why it is cheap): the sea's murk is painted into the ice only in
   the final pass to the screen. For its glass three.js first renders the opaque scene into a
   texture that the glass refracts, and that pass (no tone mapping, so no TONE_MAPPING define)
   leaves the murk out. Through the aperture the ice is lit against the black; outside it, below
   the reach of the light, the berg sinks into the sea.

   Every motion has a cause:
   - scroll → setView(e, y): the camera pulls straight back (the berg never moves), the
     waterline (the page's white/black edge, y) rises with the header, and the mark opens like
     an aperture: the orbit turns, its arcs slide apart (the gaps widen) and the clear disc grows
     from a small circle on the tip to one that holds the whole berg. One move, one e;
   - answers → setLight: how much the organization already sees sets how far the light reaches
     below the waterline outside the aperture;
   - the violet inlay on one node is the risk the aperture is flagging (the page names it).

   Client-only: imported dynamically from Mockup3.tsx. Renders on demand. */
import { THREE, createRenderer, studioLights, pixelRatio, type Theme } from "@/site/three/core";

export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** Stage size (css px) and the frames the move runs between. */
export type LensLayout = {
  W: number;
  H: number;
  /** the tip's frame when the move starts; its base sits on the waterline at r0.y1 */
  r0: Rect;
  /** how far the tip's skirts may run past r0's sides (1 = not at all) */
  spill: number;
  /** the whole open aperture's frame when the move ends */
  r1: Rect;
  /** the summit never rises above this stage y */
  top: number;
};

export type LensScene = {
  resize(l: LensLayout): void;
  /** stage y of the waterline when the move ends */
  endWaterline(): number;
  /** e: 0 = the tip framed tight, the aperture shut to the mark · 1 = the whole berg in the
   *  open aperture. y: the waterline's stage y (the page's white/black edge). */
  setView(e: number, y: number): void;
  /** 0..1: how much of its AI exposure the organization already sees */
  setLight(v: number, instant: boolean): void;
  /** advance the light's easing; true while it is still moving */
  step(dtMs: number): boolean;
  render(): void;
  /** css px per world unit at the berg's plane: now, and when the move starts */
  scale(): { now: number; start: number };
  /** stage px of the flagging node (its centre and radius), of the aperture's centre, and the
   *  radius that clears the whole ring (nodes included) */
  flag(): { x: number; y: number; r: number; cx: number; cy: number; ring: number };
  /** stage px of the edge of the light, at the berg's left flank */
  gauge(): { x: number; y: number };
  dispose(): void;
};

export type LensOptions = {
  theme: Theme;
  /** the page above the waterline (the white sheet) */
  sky: string;
  /** the page below it (the black sheet) */
  sea: string;
  ink: string;
  signal: string;
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
const HB = 14; // summit to keel
const WL = 0.15; // share of the height above the water
const TOP = WL * HB;
/* The silhouette, from the spec table (t = depth from the summit / HB, r = half-width / HB).
   Expected: width at the waterline (t 0.15) = 2 · 0.19 · 14 ≈ 5.3; widest (t 0.24) =
   2 · 0.32 · 14 ≈ 9.0 (≈ 1.7× the tip); overall ≈ 1.6 : 1 tall : wide. */
const PROFILE: [number, number][] = [
  [0, 0],
  [0.018, 0.02], // a real point: the first metres stand steep before the flanks open
  [0.04, 0.07],
  [0.1, 0.15],
  [0.15, 0.19],
  // the flare, ~10% past the table: rendered (chips, perspective) it lands at ≈ 1.7× the tip
  [0.19, 0.3],
  [0.24, 0.35],
  [0.33, 0.34],
  [0.45, 0.27],
  [0.58, 0.21],
  [0.72, 0.14],
  [0.86, 0.07],
  [1, 0],
];
/* the axis: the summit +0.10·HB right, the widest band −0.05·HB, the keel point −0.12·HB */
const AXIS: [number, number][] = [
  [0, 0.1],
  [0.15, 0],
  [0.24, -0.05],
  [0.6, -0.08],
  [0.85, -0.13],
  [1, -0.17], // the keel point, pushed further left
];
const ZS = 0.75; // depth ≈ 0.75 × width

/* the aperture: the mark, orbit radius 1 in its own units */
const LENS_Z = 5.5; // just in front of the berg's deepest bulge
const TUBE = 0.1;
const NODE_A = [0, 128, 232];
const NODE_R = 0.25;
const FLAG = 1; // the node that carries the signal (upper left once the aperture is open)
const GAP0 = 20; // the mark's half-gap at each node, degrees
const GAP1 = 37; // opened
const ROT0 = -52; // the orbit's turn, degrees
const ROT1 = 22;
/** the parts grow slower than the opening: about the same size on screen all the way */
const HW_EXP = 0.58;
const ARC_RS = 16; // round the tube
const ARC_TS = 72; // along the arc

/* the light: how far it reaches below the waterline for visibility v (0..1) */
const litDepth = (v: number) => 0.25 + 2.6 * v;

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */
/* murk below the waterline: a band the light reaches (w), then, below the edge of the light
   (x, soft over y), murk z that deepens to almost nothing seen at the keel */
const MURK_GLSL = /* glsl */ `
uniform vec4 uL3Murk;
uniform vec3 uL3Sea;
float l3Murk( float y ) {
  float under = 1.0 - smoothstep( -0.04, 0.0, y );
  float lit = smoothstep( uL3Murk.x - uL3Murk.y, uL3Murk.x, y );
  float deep = clamp( ( uL3Murk.x - y ) / 11.0, 0.0, 1.0 );
  float below = mix( uL3Murk.z, 0.985, deep * deep );
  return under * mix( below, uL3Murk.w, lit );
}
`;

/* three's Khronos PBR Neutral at exposure 1: the refracted pass is rendered without tone
   mapping, so the ice tone-maps itself there and the aperture (toneMapped: false) shows it
   exactly as it looks outside the aperture */
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
  // ~700 facets. Turned so one of the icosahedron's own corners points straight up (and its
  // opposite down): the summit and the keel are real points, not the dome of an edge
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
    const under = smooth01((t - WL) / 0.05);
    // relief: a little jagged near the summit, quiet below (the envelope stays the table's)
    const relief = 0.04 + 0.06 * tipness;
    let r = profile(t) * (1 + relief * n1(p.x * 1.5, p.y * 1.5, p.z * 1.5));
    // five long, shallow grooves under the water, from the shoulders down to the keel
    const flute = under * 0.03 * Math.sin(5 * theta + 0.9 + 0.6 * t);
    // below the shoulders each flank breaks in a few irregular steps (no straight cone): a
    // notch is a sharp step in, then an easy lean back out, at different depths per side
    const right = smooth01(dx * 1.5 + 0.5);
    const step = (tc: number, depth: number) => {
      const u = (t - tc) / 0.05;
      return u < 0 ? depth * Math.exp(-u * u * 25) : depth * Math.exp(-u * 1.6);
    };
    const notch =
      right * (step(0.5, 0.1) + step(0.66, 0.13) + step(0.81, 0.09)) +
      (1 - right) * (step(0.56, 0.12) + step(0.74, 0.1) + step(0.9, 0.08));
    r = r * (1 + flute) * (1 - notch * smooth01((t - 0.42) / 0.06)) + 0.02;
    // a lower, secondary shoulder on the tip's left flank (t ≈ 0.09)
    const shoulder =
      0.32 *
      Math.pow(Math.max(0, -dx), 1.3) *
      Math.exp(-Math.pow((t - 0.09) / 0.035, 2)) *
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
  // ones on the keel stay shallow, so summit and keel stay points.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Every cut is LOCAL: an infinite plane would keep shaving far above or below its depth (a
  // flank cut with a small tilt trims the whole mass below back to the tip's radius), so each
  // one acts only in a depth band round its tc, fading to nothing at the band's edges.
  const cuts: { n: THREE.Vector3; p: THREE.Vector3; tc: number; band: number }[] = [];
  // chips come in uneven sizes (the band each one acts in)
  const addCut = (tc: number, a: number, tilt: number, k: number, size = 0.04 + rnd() * 0.08) => {
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
      0.26 + rnd() * 0.42,
      (i / 6) * TAU + rnd() * 0.9,
      -0.12 + rnd() * 0.24,
      0.92 + rnd() * 0.03,
      0.16 + rnd() * 0.12,
    );
  for (let i = 0; i < 3; i++)
    addCut(0.035 + rnd() * 0.04, rnd() * TAU, 0.15 + rnd() * 0.3, 0.92 + rnd() * 0.05); // summit
  for (let i = 0; i < 6; i++)
    addCut(
      0.06 + rnd() * 0.07,
      (i / 6) * TAU + rnd() * 0.7,
      0.2 + rnd() * 0.35,
      0.92 + rnd() * 0.05,
    ); // the tip's flanks
  for (let i = 0; i < 9; i++)
    addCut(
      0.18 + rnd() * 0.3,
      (i / 9) * TAU + rnd() * 0.5,
      -0.25 + rnd() * 0.6,
      0.93 + rnd() * 0.05,
    ); // shoulders
  for (let i = 0; i < 7; i++)
    addCut(0.5 + rnd() * 0.3, (i / 7) * TAU + rnd() * 0.8, -0.1 - rnd() * 0.3, 0.92 + rnd() * 0.05); // keel
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
  // the circle (in the camera's plane) that holds the whole berg: where the aperture ends
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
  return { geo, cx, cy, R, peak: bb.max.y, peakX, tx0, tx1, left };
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

/** A torus arc whose radius and length change as the aperture opens (see shapeArc). */
function arcGeometry() {
  const g = new THREE.BufferGeometry();
  const n = (ARC_RS + 1) * (ARC_TS + 1);
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const idx: number[] = [];
  for (let j = 1; j <= ARC_RS; j++)
    for (let i = 1; i <= ARC_TS; i++) {
      const a = (ARC_TS + 1) * j + i - 1;
      const b = (ARC_TS + 1) * (j - 1) + i - 1;
      const c = (ARC_TS + 1) * (j - 1) + i;
      const e = (ARC_TS + 1) * j + i;
      idx.push(a, b, e, b, c, e);
    }
  g.setIndex(idx);
  return g;
}

/** Orbit radius rho, tube radius tube, arc length phi (radians), from angle 0. */
function shapeArc(g: THREE.BufferGeometry, rho: number, tube: number, phi: number) {
  const pa = g.attributes.position as THREE.BufferAttribute;
  const na = g.attributes.normal as THREE.BufferAttribute;
  const P = pa.array as Float32Array;
  const Q = na.array as Float32Array;
  let k = 0;
  for (let j = 0; j <= ARC_RS; j++) {
    const v = (j / ARC_RS) * TAU;
    const cv = Math.cos(v);
    const sv = Math.sin(v);
    for (let i = 0; i <= ARC_TS; i++) {
      const u = (i / ARC_TS) * phi;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      P[k] = (rho + tube * cv) * cu;
      P[k + 1] = (rho + tube * cv) * su;
      P[k + 2] = tube * sv;
      Q[k] = cv * cu;
      Q[k + 1] = cv * su;
      Q[k + 2] = sv;
      k += 3;
    }
  }
  pa.needsUpdate = true;
  na.needsUpdate = true;
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
  renderer.setPixelRatio(pixelRatio(1.75));
  const sky = new THREE.Color().setStyle(opts.sky);
  const sea = new THREE.Color().setStyle(opts.sea);
  const ink = new THREE.Color().setStyle(opts.ink);
  const pale = new THREE.Color("#f4f4f6");
  renderer.setClearColor(sky, 1);

  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, dark);
  scene.environment = env;
  studioLights(scene, opts.theme);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 500);

  const berg = bergGeometry();
  const peak = Math.max(0.5, berg.peak);
  const tipC = (berg.tx0 + berg.tx1) / 2;
  const tipHalf = Math.max(0.5, (berg.tx1 - berg.tx0) / 2);
  // where the aperture starts: a small circle round the summit, dipping under the water. The
  // summit stays inside the clear glass for the whole move (see update), so the orbit's rim
  // never crosses it: the tip's silhouette stays clean at every frame
  const P = { x: berg.peakX, y: peak };
  const L0 = { x: P.x, y: 0.5 * peak, r: 0.8 * peak };
  const RIM_M = 0.12 * peak; // the summit's clearance inside the rim
  // where it ends: centred on the berg, its clear glass holding all of it (the front bulge sits
  // nearer the camera, so it looks ~8% larger than its outline)
  const hwEnd = (r: number) => L0.r * Math.pow(r / L0.r, HW_EXP);
  const r1 = berg.R * 1.08 + RIM_M;
  const L1 = { x: berg.cx, y: berg.cy, r: r1 + TUBE * hwEnd(r1) * 1.2 };
  const hw1 = hwEnd(L1.r);

  // shared by every murky material; the values change, the objects do not
  const uMurk = { value: new THREE.Vector4(-litDepth(0.28), 0.55, 0.9, 0.3) };
  const uSea = { value: sea.clone() };

  /* ---- the page: the sky above the waterline, the sea below. The edge is where the eye's ray
     crosses the waterline at the berg's plane (z = 0), so the backdrop's edge and the berg's
     waterline read as one horizon at every distance (and match the page's edge in the DOM) */
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 320),
    new THREE.ShaderMaterial({
      uniforms: {
        uSky: { value: sky.clone() },
        uSeaCol: { value: sea.clone() },
        uLine: { value: ink.clone() },
        uLineA: { value: dark ? 0.3 : 0 },
      },
      vertexShader: WORLD_VERT,
      fragmentShader: /* glsl */ `
        uniform vec3 uSky; uniform vec3 uSeaCol; uniform vec3 uLine; uniform float uLineA;
        varying vec3 vW;
        void main() {
          float k = cameraPosition.z / ( cameraPosition.z - vW.z );
          float y0 = cameraPosition.y + ( vW.y - cameraPosition.y ) * k;
          float fw = max( fwidth( y0 ), 1e-5 );
          vec3 col = mix( uSeaCol, uSky, smoothstep( -0.5 * fw, 0.5 * fw, y0 ) );
          // dark theme: the two greys are close, so the horizon is also a hairline
          col = mix( col, uLine, ( 1.0 - smoothstep( 0.0, fw * 1.2, abs( y0 ) ) ) * uLineA );
          gl_FragColor = vec4( col, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  back.position.z = -12;
  scene.add(back);

  /* ---- the berg: frosted ice, opaque, so the aperture's glass can refract it ---- */
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
  const lineCol = dark ? pale.clone() : ink.clone();
  bergMat.onBeforeCompile = (sh) => {
    sh.uniforms.uL3Murk = uMurk;
    sh.uniforms.uL3Sea = uSea;
    sh.uniforms.uL3Line = { value: lineCol };
    sh.vertexShader =
      "varying vec3 vL3W;\n" +
      sh.vertexShader.replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n vL3W = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    sh.fragmentShader =
      "varying vec3 vL3W;\nuniform vec3 uL3Line;\n" +
      MURK_GLSL +
      NEUTRAL_GLSL +
      sh.fragmentShader.replace(
        "#include <tonemapping_fragment>",
        /* glsl */ `#include <tonemapping_fragment>
        {
          float yy = vL3W.y;
          // the deeper the ice, the less light reaches it (depth, not glow)
          float dim = 1.0 - 0.4 * smoothstep( 0.0, 11.0, -yy );
          // a key from the upper right: the faces turned away from it fall to a mid grey (the
          // tip's shadow side is what separates white ice from the white sheet). The camera
          // never turns, so the view-space normal is the world's.
          float away = smoothstep( -0.15, 0.75, -normal.x * 0.9 - normal.y * 0.35 );
          dim *= 1.0 - away * ( yy > 0.0 ? 0.52 : 0.22 );
          #ifdef TONE_MAPPING
            gl_FragColor.rgb = mix( gl_FragColor.rgb * dim, uL3Sea, l3Murk( yy ) );
          #else
            gl_FragColor.rgb = l3Neutral( gl_FragColor.rgb ) * dim;
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

  // only the major ridges as quiet hairlines (≥ 28° between faces; opaque, so the aperture
  // sees them too). Anything busier reads as a wireframe.
  // Under the water only the long ridges stay: short edges read as white scratches.
  const edgeGeo = new THREE.EdgesGeometry(berg.geo, 28);
  {
    const src = edgeGeo.attributes.position as THREE.BufferAttribute;
    const keep: number[] = [];
    for (let i = 0; i < src.count; i += 2) {
      const ax = src.getX(i);
      const ay = src.getY(i);
      const az = src.getZ(i);
      const bx = src.getX(i + 1);
      const by = src.getY(i + 1);
      const bz = src.getZ(i + 1);
      const len = Math.hypot(bx - ax, by - ay, bz - az);
      if (Math.max(ay, by) > -0.1 || len > 0.15 * HB) keep.push(ax, ay, az, bx, by, bz);
    }
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(keep, 3));
  }
  const edges = new THREE.LineSegments(
    edgeGeo,
    new THREE.ShaderMaterial({
      uniforms: {
        uL3Murk: uMurk,
        uL3Sea: uSea,
        uCol: { value: sky.clone().lerp(ink, dark ? 0.14 : 0.13) },
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
            c = mix( c, uL3Sea, l3Murk( vW.y ) );
          #endif
          gl_FragColor = vec4( c, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(edges);

  /* ---- the aperture: the mark ---- */
  const lens = new THREE.Group();
  scene.add(lens);
  // glass that shows the refracted pass as is (it is tone-mapped already, see NEUTRAL_GLSL)
  const glass = (thickness: number) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness,
      ior: 1.5,
      specularIntensity: 1,
      envMapIntensity: dark ? 1.2 : 1,
      toneMapped: false,
    });
  const matArc = glass(0.3);
  const matDisc = glass(0.12);
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#E6E8EC" : "#ECEEF2"),
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 1.1,
  });

  // the clear disc inside the orbit: the aperture itself
  const disc = new THREE.Mesh(puck(1, 0.09, 0.045, 128), matDisc);
  lens.add(disc);
  // the orbit: three glass arcs with rounded ends, a gap at each node that widens as it opens
  const capGeo = new THREE.SphereGeometry(TUBE, 24, 12);
  const arcs = NODE_A.map(() => {
    const m = new THREE.Mesh(arcGeometry(), matArc);
    m.frustumCulled = false;
    lens.add(m);
    return m;
  });
  const caps = NODE_A.flatMap(() =>
    [0, 1].map(() => {
      const m = new THREE.Mesh(capGeo, matArc);
      lens.add(m);
      return m;
    }),
  );
  // the nodes: chrome discs on the orbit, in the middle of each gap
  const nodeGeo = puck(NODE_R, 0.22, 0.08);
  const nodes = NODE_A.map(() => {
    const m = new THREE.Mesh(nodeGeo, matChrome);
    lens.add(m);
    return m;
  });
  // the page's one violet: a small inlay on the flagging node, kept ~5 css px at every size
  const inlay = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setStyle(opts.signal),
      toneMapped: false,
    }),
  );
  lens.add(inlay);

  /** open the mark to e: the orbit at radius rho (its own units), the gaps at their width */
  let shapedE = -1;
  let shapedRho = -1;
  let rhoNow = 1;
  const shape = (e: number, rho: number) => {
    if (Math.abs(e - shapedE) < 1e-5 && Math.abs(rho - shapedRho) < 1e-5) return;
    shapedE = e;
    shapedRho = rho;
    rhoNow = rho;
    const g = lerp(GAP0, GAP1, smooth01(e));
    NODE_A.forEach((a, i) => {
      const a0 = a + g;
      const a1 = (NODE_A[i + 1] ?? 360) - g;
      shapeArc(arcs[i].geometry, rho, TUBE, deg(a1 - a0));
      arcs[i].rotation.z = deg(a0);
      caps[i * 2].position.set(Math.cos(deg(a0)) * rho, Math.sin(deg(a0)) * rho, 0);
      caps[i * 2 + 1].position.set(Math.cos(deg(a1)) * rho, Math.sin(deg(a1)) * rho, 0);
      nodes[i].position.set(Math.cos(deg(a)) * rho, Math.sin(deg(a)) * rho, 0.03);
    });
    const dr = rho - TUBE + 0.005;
    disc.scale.set(dr, dr, 1);
    inlay.position.set(Math.cos(deg(NODE_A[FLAG])) * rho, Math.sin(deg(NODE_A[FLAG])) * rho, 0.142);
  };

  /* ---- state ---- */
  let W = 1;
  let H = 1;
  type Fit = { s: number; xa: number; X: number; Y: number };
  let F0: Fit = { s: 100, xa: 0, X: 0, Y: 0 };
  let F1: Fit = F0;
  let topM = 0;
  let E = 0;
  let Y = 0;
  let light = 0.28;
  let lightT = 0.28;
  let sNow = 100; // css px per world unit at the berg's plane
  let hwNow = L0.r;

  const applyLight = () => {
    uMurk.value.set(-litDepth(light), 0.55, 0.93 - 0.16 * light, 0.3);
  };

  /** The camera: level at the waterline's height (the water is seen edge-on, one horizon),
   *  looking straight ahead; world (xa, 0, 0) lands on stage (X, y) by a lens shift. */
  const place = (s: number, xa: number, X: number, y: number) => {
    const f = H / (2 * Math.tan(deg(FOV) / 2));
    const cz = f / s;
    const FW = W + 2 * Math.abs(X - W / 2);
    const FH = H + 2 * Math.abs(y - H / 2);
    camera.position.set(xa, 0, cz);
    camera.rotation.set(0, 0, 0);
    camera.fov = (2 * Math.atan(FH / (2 * f)) * 180) / Math.PI;
    camera.aspect = FW / FH;
    camera.setViewOffset(FW, FH, FW / 2 - X, FH / 2 - y, W, H);
    camera.updateMatrixWorld();
    return cz;
  };

  /** The aperture at e (world, the berg's plane): one move from a small circle round the summit
   *  to the whole berg. Its centre may not sink so far that the summit would leave the clear
   *  glass: the rim passes above the summit, never across it. */
  const aperture = (e: number) => {
    const tx = lerp(L0.x, L1.x, e);
    const R = L0.r * Math.pow(L1.r / L0.r, e);
    const hw = L0.r * Math.pow(R / L0.r, HW_EXP);
    // inside the rim and clear of a node that may sit at its top
    const inner = R - 1.05 * NODE_R * hw - RIM_M;
    const dxp = P.x - tx;
    const ty = Math.max(
      lerp(L0.y, L1.y, e),
      P.y - Math.sqrt(Math.max(0, inner * inner - dxp * dxp)),
    );
    return { tx, ty, R, hw, ringTop: ty + R + NODE_R * hw };
  };

  const update = () => {
    const e = E;
    // the pull-back: every scroll px zooms alike (log), but the summit never leaves the frame
    const { tx, ty, R, hw, ringTop } = aperture(e);

    let s = F0.s * Math.pow(F1.s / F0.s, e);
    const cap = (Y - topM) / Math.max(peak, ringTop);
    if (cap < s) s = Math.max(cap, Math.min(s, F1.s));
    const xa = lerp(F0.xa, F1.xa, e);
    const X = lerp(F0.X, F1.X, e);
    const cz = place(s, xa, X, Y);
    sNow = s;
    // the backdrop follows the view (its edge is computed in the world, so it never slides)
    back.position.x = xa + (W / 2 - X) / s;
    back.position.y = (Y - H / 2) / s;

    // placed at its depth so that it lands exactly where the frame says
    const lz = Math.min(LENS_Z, cz * 0.45);
    const k = (cz - lz) / cz;
    lens.position.set(xa + (tx - xa) * k, ty * k, lz);
    lens.scale.setScalar(hw * k);
    // it starts turned and tilted like the mark in a hand, and settles face-on as it opens
    const u = 1 - e;
    lens.rotation.set(0.1 * u, -0.2 * u, deg(lerp(ROT0, ROT1, e)));
    shape(e, R / hw);
    inlay.scale.setScalar(Math.min(0.11, 5 / (hw * s)));
    lens.updateMatrixWorld(true);
    hwNow = hw;
  };

  const fit = (l: LensLayout) => {
    // the start: the tip, its base on the waterline at r0.y1, its summit ~3/4 up the frame
    const r0 = l.r0;
    // (the small aperture round the summit rides a little higher than the summit: it fits too)
    const a0 = aperture(0);
    const s0 = Math.max(
      1,
      Math.min(
        (0.9 * (r0.y1 - r0.y0)) / Math.max(peak / 0.8, a0.ringTop),
        (l.spill * (r0.x1 - r0.x0)) / Math.max(1, 2 * tipHalf),
      ),
    );
    const xa0 = tipC + 0.12 * tipHalf;
    F0 = { s: s0, xa: xa0, X: (r0.x0 + r0.x1) / 2, Y: r0.y1 };
    // the end: the whole open mark (orbit, and the nodes that sit on it) inside r1
    const r1 = l.r1;
    const a1 = aperture(1);
    const ext = a1.R + (NODE_R + 0.02) * hw1;
    const s1 = Math.max(0.5, Math.min((r1.x1 - r1.x0) / (2 * ext), (r1.y1 - r1.y0) / (2 * ext)));
    const sx = (r1.x0 + r1.x1) / 2;
    const sy = (r1.y0 + r1.y1) / 2;
    // stage y of the waterline when the aperture's centre (below it) sits at sy
    F1 = { s: Math.min(s1, s0), xa: a1.tx, X: sx, Y: sy + a1.ty * Math.min(s1, s0) };
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
    endWaterline() {
      return F1.Y;
    },
    setView(e, y) {
      E = clamp01(e);
      Y = Math.min(4 * H, Math.max(-H, y));
      update();
    },
    setLight(v, instant) {
      lightT = clamp01(v);
      if (instant) {
        light = lightT;
        applyLight();
      }
    },
    step(dtMs) {
      const k = 1 - Math.exp(-Math.min(64, dtMs) / 220);
      light += (lightT - light) * k;
      const moving = Math.abs(lightT - light) > 0.0015;
      if (!moving) light = lightT;
      applyLight();
      return moving;
    },
    render() {
      renderer.render(scene, camera);
    },
    scale() {
      return { now: sNow, start: F0.s };
    },
    flag() {
      const a = deg(NODE_A[FLAG]);
      v3.set(Math.cos(a) * rhoNow, Math.sin(a) * rhoNow, 0.14);
      lens.localToWorld(v3);
      const q = toPx(v3);
      v3.set(0, 0, 0);
      lens.localToWorld(v3);
      const c = toPx(v3);
      return {
        x: q.x,
        y: q.y,
        r: NODE_R * hwNow * sNow,
        cx: c.x,
        cy: c.y,
        ring: (rhoNow + NODE_R) * hwNow * sNow,
      };
    },
    gauge() {
      const y = -litDepth(light);
      v3.set(berg.left(y) - 0.25, y, 0);
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
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
