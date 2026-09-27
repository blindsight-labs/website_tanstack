/* Hero scene A for mockup 11: "The iris" (round 2).
 *
 * The full Blindsight mark (orbit radius = 1) in 10B's thin clear glass with fresnel
 * hairline edges. The hub (r 0.56) is a lens with an iris in it: six hairline glass
 * blades pivot on the hub's rim (blade i: pivot R·e(60°·i), edge circle radius RC centred
 * at P_i − RA·e(60°·i + β)); all turn by one β, each over its successor. The orbit, and
 * with it the whole mark, turns ψ = K_PSI·β: the ring drives the blades. β follows the
 * story on a critically damped spring, so a jump in tMs eases from what is on screen.
 *
 * The aperture is what reveals: the wall shader rebuilds the exact aperture (the same six
 * circles, projected onto the wall); only inside it does the true layer show, set larger
 * (a loupe, ~14px type). Outside, noise stays noise: a dithered picture CAUSED by the mark
 * (light from up-left: the glass's soft shadow, its bright edge caustics, and the lens's
 * focused spot, which shrinks and heats as the iris closes), corrupted.
 *
 *   01 See      the iris opens, the mark aims in; four shadow-AI rows resolve in the lens
 *               and are ink-bracketed (t 2500: the plain mark, four brackets in the hub).
 *   02 Secure   a hidden block decodes violet; the iris frames it, then closes steadily
 *               THROUGH it (t 6000: blade edges across the violet "previous"); the blades
 *               meet, cut, and reopen on "ignore / pr[stripped] / tructions".
 *   03 Govern   three click-stops to a calibrated stop; an engraved scale counts up round
 *               the orbit while ledger rows write in and the wall settles onto a grid; at
 *               the seal the orbit clicks onto a fixed index and a double rule closes it.
 */
import { THREE, createRenderer, type Theme } from "./core";

export const LOOP_MS = 11600;
/** A calm, representative still (reduced motion): governed, sealed. */
export const SETTLED_MS = 10000;
/** When the DOM audit-trail row should appear, seal (= the last click-stop) and clear. */
export const LOG_T = { in: 7300, seal: 9300, out: 11100 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 0, t1: 3800 },
  { n: "02", label: "Secure it", t0: 3800, t1: 7000 },
  { n: "03", label: "Govern it", t0: 7000, t1: 11200 },
] as const;

export type HeroLabel = { x: number; y: number; a: number; state: 0 | 1 | 2 };
export type HeroMode = "wide" | "narrow";
export type HeroOptions = { theme: Theme; bg: string; ink: string };
/** One outer node, for the page to label: stage px, the beat it stands for, and how
 *  "on" it is right now (0..1; 1 = the beat being shown). */
export type HeroNode = { x: number; y: number; beat: number; on: number };

export type HeroScene = {
  resize(width: number, height: number, mode: HeroMode): void;
  render(timeMs: number): void;
  labels(): HeroLabel[];
  /** is this point (stage px) on the mark? */
  hit(x: number, y: number): boolean;
  /** the three outer nodes, in stage px (for their labels) */
  nodes(): HeroNode[];
  /** the beat of the node under this point (stage px), or -1 */
  nodeAt(x: number, y: number): number;
  dispose(): void;
};

/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/** 0 hold/linear, 1 in-out, 2 accelerate and stop dead (the shutter), 3 click-stop */
function ease(kind: number, x: number) {
  if (kind === 1) return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  if (kind === 2) return x * x * x;
  if (kind === 3) return 1 + 2.6 * Math.pow(x - 1, 3) + 1.6 * Math.pow(x - 1, 2);
  return x;
}
type Key = readonly [number, number, number];
function keyed(keys: readonly Key[], t: number) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, k] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return v0 + (v1 - v0) * ease(k, seg(t, t0, t1));
    }
  }
  return keys[keys.length - 1][1];
}

/* ---------- the mark (orbit radius = 1) ---------- */
const HUB_R = 0.56; // a little larger than the SVG's 0.5, so the aperture reads
const NODE_R = 0.25;
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const NODE_X = NODE_A.map((a) => Math.cos(deg(a)));
const NODE_Y = NODE_A.map((a) => Math.sin(deg(a)));
const GAP = 20; // half-gap of the orbit at each node, degrees
const BAND = 0.22;
const ARM_W = 0.17;
const SLAB_D = 0.04; // slab core depth; + 2 bevels ≈ 0.11 thick
const BEVEL = 0.035;
const ARC_FACE = (SLAB_D - 0.006) / 2 + BEVEL; // the orbit arcs' front face
const MARK_R = 1 + NODE_R + 0.03; // outer reach, for hit testing
const LENS_K = 0.14; // the hub's convex bulge (normal tilt per unit radius)

/* ---------- the iris (in the hub) ---------- */
const NB = 6; // blades
const PIV_R = HUB_R; // blade pivots on the hub's rim
const BLADE_RC = 1.2 * HUB_R; // radius of each blade's curved edge
const BLADE_RA = 1.2 * HUB_R; // pivot → edge-circle centre
const CLIP_R = HUB_R - BEVEL; // the hub's flat face: the blades live inside it
const PLATE_Z = SLAB_D / 2 + BEVEL + 0.007; // just in front of the lens
const K_PSI = 0.8; // housing turn per unit blade swing (the orbit drives the blades)
const IRIS_W = 30; // spring stiffness (rad/s) of the blade swing
const dOfBeta = (b: number) => BLADE_RC - Math.sqrt(PIV_R * PIV_R + BLADE_RA * BLADE_RA - 2 * PIV_R * BLADE_RA * Math.cos(b));
const betaOf = (d: number) => {
  const q = BLADE_RC - d;
  return Math.acos(Math.max(-1, Math.min(1, (PIV_R * PIV_R + BLADE_RA * BLADE_RA - q * q) / (2 * PIV_R * BLADE_RA))));
};
const D_OPEN = 0.6; // > CLIP_R: the blades are gone, the plain mark
const D_SEC = 0.42; // framing the violet block
const D_SEAL = 0.5; // the calibrated stop
/** the aperture (inradius, mark units) over the loop */
// prettier-ignore
const AP_KEYS: Key[] = [
  [0, 0.14, 0], [300, 0.14, 0], [1900, D_OPEN, 1], // 01: opens wide
  [4500, D_OPEN, 0], [5300, D_SEC, 1], [5500, D_SEC, 0], // 02: stops down onto the violet block
  [6400, -0.05, 0], [6550, -0.05, 0], // closes steadily THROUGH it (t 6000: edges across "previous"), cuts
  [6900, 0.42, 1], [7050, 0.42, 0], // reopens on the stripped block
  [7160, 0.44, 3], [7200, 0.44, 0], [7310, 0.47, 3], [7350, 0.47, 0], [7460, 0.49, 3], // 03: click-stops
  [9300, 0.49, 0], [9410, D_SEAL, 3], // the seal: the last detent, onto the index
  [11150, D_SEAL, 0], [LOOP_MS, 0.14, 1],
];

/* ---------- the wall (world units, fixed behind the mark) ---------- */
const WALL_Z = -1.6;
const CAM_Z = 10.2;
const CAM_Y = 0.25;
const KP = (CAM_Z - WALL_Z) / (CAM_Z - PLATE_Z); // plate → wall scale as seen from the camera
const wallY = (y: number) => CAM_Y + (y - CAM_Y) * KP;
// the noise: fine glyphs (≈ 9 × 16 px on screen)
const CW = 0.05;
const CH = 0.09;
const COLS = 74;
const ROWS = 38;
const FW = COLS * CW;
const FH = ROWS * CH;
const FX = 0;
const FTOP = wallY(0) + CH * 20.5;
const FY = FTOP - FH / 2;
const cellX = (c: number) => FX - FW / 2 + CW * (c + 0.5);
const rowY = (r: number) => FTOP - CH * (r + 0.5);
// the true layer, seen through the lens: larger type (≈ 13 × 23 px cells, 14px glyphs)
const TCW = 0.07;
const TCH = 0.125;
const TCOLS = 30;
const TROWS = 16;
const TRC = 9; // the row just below the lens centre at rest
const TX0 = -TCOLS * TCW / 2; // world x of the grid's left edge
const TTOP = wallY(0) + TRC * TCH;
const tCellX = (c: number) => TX0 + TCW * (c + 0.5);
const tRowY = (r: number) => TTOP - TCH * (r + 0.5); // row TRC + k is centred at wallY(0) − (k + ½)·TCH
const tColAt = (x: number, len: number) => Math.round((x - TX0) / TCW - len / 2);

/* ---------- where the mark aims ---------- */
const P_START = { x: -0.28, y: 0.02 };
const SEC_K = -3; // the violet block's middle line
const P_SEC = { x: 0.12, y: CAM_Y + (tRowY(TRC + SEC_K) - CAM_Y) / KP };
// prettier-ignore
const PX_KEYS: Key[] = [
  [0, P_START.x, 0], [200, P_START.x, 0], [2100, 0, 1], [3800, 0, 0], [4400, P_SEC.x, 1],
  [6950, P_SEC.x, 0], [7600, 0, 1], [11150, 0, 0], [LOOP_MS, P_START.x, 1],
];
const PY_KEYS: Key[] = PX_KEYS.map(([t, x, k]) => [t, x === P_START.x ? P_START.y : x === 0 ? 0 : P_SEC.y, k] as const);

/* ---------- what the lens finds (true layers) ---------- */
/** 01: shadow AI, sized to sit inside the open hub */
const ITEMS = [{ k: -3, s: "notion-ai" }, { k: -1, s: "chatgpt.com" }, { k: 1, s: "pdf-summariser" }, { k: 3, s: "WriteGPT" }];
const FILL = ["api.openai.com POST", "copilot GET 200", "gemini POST", "claude.ai POST", "sharepoint sync", "slack.com/api", "okta auth ok", "teams GET 200"];
/** 02: the injected instruction, before and after the cut */
const INJ_PRE = ["ignore", "previous", "instructions"];
const INJ_POST = ["ignore", "pr[stripped]", "tructions"];
const T_CUT = 6440; // the blades have met
/** 03: the ledger, name · policy */
const LEDGER = [["chatgpt", "mask"], ["copilot", "allow"], ["notion-ai", "mask"], ["writegpt", "block"]].map(([n, p]) => n.padEnd(10) + p.padStart(5));
const N_LED = LEDGER.length;
const LED_K = [-2, -1, 0, 1];
const ledT0 = (k: number) => LOG_T.in + 80 + k * 470;
const N_TICK_STEP = 4; // degrees between engraved ticks

/* the noise and the dither */
const RAMP = " .:-=+*#%@";
const DENSE = "#%@*+=";
const SCR = "abcdefghijklmnopqrstuvwxyz0123456789:._-/";
const FRAGS = ["prompt", "upload", "gpt-4o", "token", "api/v1", "agent", "invoice.pdf", "copilot", "POST /chat", "summarize", "mcp://", "payroll.csv", "claims.xlsx", "tool_call"];
const N_FRAG = 9;
const LIGHT = new THREE.Vector3(-4, 3.3, 11); // the wall's light: the mark's shadow falls down-right

const gi = (ch: string) => {
  const k = ch.charCodeAt(0) - 32;
  return k > 0 && k < 95 ? k : 0;
};
const RAMP_G = [...RAMP].map(gi);
const DENSE_G = [...DENSE].map(gi);
const SCR_G = [...SCR].map(gi);

function hash3(a: number, b: number, c: number) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash3(ix, iy, seed);
  const b = hash3(ix + 1, iy, seed);
  const c = hash3(ix, iy + 1, seed);
  const d = hash3(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Signed distance to the mark's outline (mark units): hub, arms, nodes, three arcs. */
function logoSDF(x: number, y: number) {
  const r = Math.hypot(x, y);
  let d = r - HUB_R;
  for (let i = 0; i < 3; i++) {
    const nx = NODE_X[i];
    const ny = NODE_Y[i];
    d = Math.min(d, Math.hypot(x - nx, y - ny) - NODE_R);
    const t = clamp01(x * nx + y * ny);
    d = Math.min(d, Math.hypot(x - nx * t, y - ny * t) - ARM_W / 2);
  }
  let a = (Math.atan2(y, x) * 180) / Math.PI;
  if (a < 0) a += 360;
  let dr = Math.abs(r - 1) - BAND / 2;
  for (let i = 0; i < 3; i++) {
    const da = wrap180(a - NODE_A[i]);
    if (Math.abs(da) < GAP) {
      const e = deg(NODE_A[i] + (da >= 0 ? GAP : -GAP)); // the nearer arc end
      dr = Math.hypot(x - Math.cos(e), y - Math.sin(e)) - BAND / 2;
      break;
    }
  }
  return Math.min(d, dr);
}

/* ------------------------------------------------------------------ */
/* studio environment (per theme): narrow strips and black flags        */
/* ------------------------------------------------------------------ */
function heroEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: grey(dark ? 0.05 : 0.46) },
        hor: { value: grey(dark ? 0.018 : 0.3) },
        bot: { value: grey(dark ? 0.008 : 0.38) },
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: grey(v), side: THREE.DoubleSide }));
    const az = deg(azDeg);
    const el = deg(elDeg);
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // prettier-ignore
  const panels: [number, number, number, number, number][] = dark
    ? [[14, 1.6, 0, 76, 2.4], [1.8, 16, 52, 4, 4.0], [1.1, 16, -78, 4, 2.4], [1.0, 16, 160, 4, 3.0], [12, 3.2, 215, 12, 0.2], [24, 9, 180, 34, 0.28]]
    : [[14, 1.4, 0, 78, 2.0], [3.2, 16, -74, 0, 0.0], [2.2, 16, 122, 0, 0.0], [9, 1.3, 205, -6, 0.0], [1.8, 14, 58, 6, 2.6], [1.2, 14, -40, 8, 2.4], [1.0, 14, 165, 6, 2.2]];
  panels.forEach(([w, h, az, el, v]) => panel(w, h, az, el, v));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.01).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/* ------------------------------------------------------------------ */
/* geometry and textures                                               */
/* ------------------------------------------------------------------ */
/** Extruded slab; group 0 = the two flat faces, group 1 = sides and bevels. */
const extrude = (shape: THREE.Shape, depth: number, curveSegments: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
};

/** Hub + three arms + three nodes as ONE outline (a union, so no glass overlaps).
 *  Inset by the bevel, which grows it back to true size. */
function coreShape() {
  const hr = HUB_R - BEVEL;
  const nr = NODE_R - BEVEL;
  const hw = ARM_W / 2 - BEVEL;
  const aHub = Math.asin(hw / hr);
  const aNode = Math.asin(hw / nr);
  const uHub = Math.sqrt(hr * hr - hw * hw);
  const uNode = 1 - Math.sqrt(nr * nr - hw * hw);
  const s = new THREE.Shape();
  NODE_A.forEach((ad, i) => {
    const a = deg(ad);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = (u: number, v: number) => ca * u - sa * v;
    const py = (u: number, v: number) => sa * u + ca * v;
    if (i === 0) s.moveTo(px(uHub, -hw), py(uHub, -hw));
    else s.lineTo(px(uHub, -hw), py(uHub, -hw));
    s.lineTo(px(uNode, -hw), py(uNode, -hw));
    s.absarc(ca, sa, nr, a - (Math.PI - aNode), a + (Math.PI - aNode), false);
    s.lineTo(px(uHub, hw), py(uHub, hw));
    s.absarc(0, 0, hr, a + aHub, deg(NODE_A[i + 1] ?? 360) - aHub, false);
  });
  s.closePath();
  return s;
}

/** One orbit arc as a flat band with rounded ends. */
function arcShape(a0: number, a1: number) {
  const hw = BAND / 2 - BEVEL;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}

/** A tangent-space normal map for the glass faces (their UVs are mark x, y): a narrow,
 *  gentle roll-off at every edge (glyphs behind shift along it but do not smear) plus a
 *  soft convex bulge across the hub: the lens element. */
function pillowNormals() {
  const N = 512;
  const S = 2.7; // covers mark coords -1.35 … 1.35
  const h = S / N;
  const d = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) d[j * N + i] = logoSDF(-S / 2 + h * (i + 0.5), -S / 2 + h * (j + 0.5));
  const out = new Uint8Array(N * N * 4);
  const ZONE = 0.045;
  const MAXS = 0.24;
  const edge = -BEVEL;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const id = j * N + i;
      const x = -S / 2 + h * (i + 0.5);
      const y = -S / 2 + h * (j + 0.5);
      let nx = 0;
      let ny = 0;
      const q = (d[id] - (edge - ZONE)) / ZONE;
      if (q > 0 && d[id] < 0.02) {
        const gx = d[j * N + Math.min(i + 1, N - 1)] - d[j * N + Math.max(i - 1, 0)];
        const gy = d[Math.min(j + 1, N - 1) * N + i] - d[Math.max(j - 1, 0) * N + i];
        const gl = Math.hypot(gx, gy) || 1;
        const s = MAXS * Math.pow(clamp01(q), 1.7);
        nx = (gx / gl) * s;
        ny = (gy / gl) * s;
      }
      const lens = LENS_K * clamp01((CLIP_R - Math.hypot(x, y)) / 0.06);
      nx += x * lens;
      ny += y * lens;
      const nl = Math.hypot(nx, ny, 1);
      out[id * 4] = Math.round(((nx / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 1] = Math.round(((ny / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 2] = Math.round(((1 / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 3] = 255;
    }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.repeat.set(1 / S, 1 / S);
  t.offset.set(0.5, 0.5);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** The glass edge: a fresnel hairline on bevels and sides, never on the faces. */
function rimMaterial(color: THREE.Color, strength: number, lo: number, hi: number) {
  const c = color.clone().convertLinearToSRGB();
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: { col: { value: new THREE.Vector3(c.r, c.g, c.b) }, k: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        gl_FragColor = vec4(col, smoothstep(${F(lo)}, ${F(hi)}, f) * k);
      }`,
  });
}

/** White mono glyphs (ASCII 32–126) on black, 16 × 6 cells; the shader reads .r. */
function glyphAtlas(weight: number) {
  const GW = 48;
  const GH = 86;
  const c = document.createElement("canvas");
  c.width = 16 * GW;
  c.height = 6 * GH;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#fff";
  g.font = `${weight} 54px "IBM Plex Mono", ui-monospace, monospace`;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  for (let i = 1; i < 95; i++) g.fillText(String.fromCharCode(32 + i), ((i % 16) + 0.5) * GW, Math.floor(i / 16) * GH + GH * 0.7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

async function fontReady() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`400 54px "IBM Plex Mono"`), document.fonts.load(`500 54px "IBM Plex Mono"`)]),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  } catch {
    /* the system mono will do */
  }
}

const F = (n: number) => n.toFixed(5);
/** three's transmission sample, without the bicubic blur: glyphs behind the glass shift
 *  with the refraction but stay sharp */
const CRISP_PARS = THREE.ShaderChunk.transmission_pars_fragment.replace(
  "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
  "return textureLod( transmissionSamplerMap, fragCoord.xy, 0.0 );",
);
const crisp = (fs: string) => fs.replace("#include <transmission_pars_fragment>", CRISP_PARS);

/* the blades: injected into a clear MeshPhysicalMaterial on one disc; only edges drawn */
const BLADE_PARS = /* glsl */ `
  uniform vec2 uBC[${NB}];
  uniform vec3 uEdgeCol; uniform float uEdgeA; uniform float uShadeA; uniform float uStep;
  varying vec2 vIris;
`;
const BLADE_CUT = /* glsl */ `
  float bPx = length(fwidth(vIris)); // before any discard: derivatives need the quad
  float bS[${NB}];
  for (int i = 0; i < ${NB}; i++) bS[i] = length(vIris - uBC[i]) - ${F(BLADE_RC)};
  float bCnt = 0.0; // how many blades overlap here
  for (int i = 0; i < ${NB}; i++) bCnt += step(0.0, bS[i]);
  int bOwn = -1; // the blade on top here: covering, and not under its predecessor
  for (int i = 0; i < ${NB}; i++) {
    int j = i == 0 ? ${NB - 1} : i - 1;
    if (bS[i] > 0.0 && bS[j] <= 0.0) { bOwn = i; break; }
  }
  if (bOwn < 0 || length(vIris) > ${F(CLIP_R)}) discard; // the aperture, and past the hub face
  int bUp = bOwn == 0 ? ${NB - 1} : bOwn - 1;
  float bEdge = 1.0 - smoothstep(0.7 * bPx, 1.7 * bPx, bS[bOwn]);
  float bShade = 1.0 - smoothstep(0.0, 0.035, -bS[bUp]);
`;
const BLADE_COL = /* glsl */ `
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeCol, clamp(uStep * bCnt + uShadeA * bShade, 0.0, 0.5));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeCol, bEdge * uEdgeA);
`;

const FIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FIELD_FRAG = /* glsl */ `
  uniform sampler2D uState; // the noise: glyph, opacity, violet, jitter
  uniform sampler2D uText; // the true layer (large type)
  uniform sampler2D uAtlas;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uVio;
  uniform float uPerc; // 1: colours are sRGB and mixed perceptually (the pale card)
  uniform vec3 uAp; // the lens centre on the wall (field-local), plate → wall scale
  uniform float uPsi; // the housing's turn
  uniform vec2 uBC[${NB}]; // the blades' edge circles (housing coords)
  uniform vec4 uBox[4];
  uniform float uBoxK[4];
  uniform float uBrkA;
  uniform vec4 uLed[${N_LED}];
  uniform float uRule[${N_LED}];
  uniform float uTick[${N_LED}];
  uniform float uLedA;
  uniform vec4 uSeal; // y, x0, x1, progress
  varying vec2 vUv;
  float hair(float d, float hw, float px) { return 1.0 - smoothstep(hw - 0.5 * px, hw + 0.5 * px, d); }
  float glyph(vec4 s, vec2 f, vec2 gdx, vec2 gdy) {
    float gi = floor(s.r * 255.0 + 0.5);
    if (gi < 0.5) return 0.0;
    vec2 ac = vec2(mod(gi, 16.0), floor(gi / 16.0));
    float fy = f.y + (s.a - 0.5) * 0.4;
    vec2 auv = vec2((ac.x + f.x) / 16.0, 1.0 - (ac.y + 1.0 - fy) / 6.0);
    return textureGrad(uAtlas, auv, gdx, gdy).r * s.g * step(0.0, fy) * step(fy, 1.0);
  }
  void main() {
    vec2 p = (vUv - 0.5) * vec2(${F(FW)}, ${F(FH)});
    float px = max(length(vec2(dFdx(p.x), dFdy(p.x))), 1e-5);
    // the noise
    vec2 GRID = vec2(${F(COLS)}, ${F(ROWS)});
    vec2 g = vUv * GRID;
    vec2 cell = min(floor(g), GRID - 1.0);
    vec4 sN = texture2D(uState, (cell + 0.5) / GRID);
    float aN = glyph(sN, g - cell, dFdx(g) / vec2(16.0, 6.0), dFdy(g) / vec2(16.0, 6.0));
    vec2 e = min(g, GRID - g);
    aN *= smoothstep(0.0, 2.5, e.x) * smoothstep(0.0, 1.6, e.y);
    // the true layer
    vec2 TGRID = vec2(${F(TCOLS)}, ${F(TROWS)});
    vec2 tg = (p - vec2(${F(TX0 - FX)}, ${F(TTOP - TROWS * TCH - FY)})) / vec2(${F(TCW)}, ${F(TCH)});
    vec2 tcell = clamp(floor(tg), vec2(0.0), TGRID - 1.0);
    vec4 sT = texture2D(uText, (tcell + 0.5) / TGRID);
    float inT = step(0.0, tg.x) * step(tg.x, TGRID.x) * step(0.0, tg.y) * step(tg.y, TGRID.y);
    float aT = glyph(sT, tg - tcell, dFdx(tg) / vec2(16.0, 6.0), dFdy(tg) / vec2(16.0, 6.0)) * inT;
    // the aperture: the same six circles, projected onto the wall
    vec2 d = (p - uAp.xy) / uAp.z;
    float cs = cos(uPsi);
    float sn = sin(uPsi);
    vec2 q = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y);
    float ed = length(q) - ${F(CLIP_R)};
    for (int i = 0; i < ${NB}; i++) ed = max(ed, length(q - uBC[i]) - ${F(BLADE_RC)});
    float pq = px / uAp.z;
    float m = 1.0 - smoothstep(-pq, pq, ed - 0.006);
    vec3 c = mix(uBg, mix(uInk, uVio, sN.b), aN * (1.0 - m));
    c = mix(c, mix(uInk, uVio, sT.b), aT * m);
    float hw = max(0.003, 0.55 * px);
    // 01: an ink bracket round each find, [ like this ], drawn out from its middle
    float br = 0.0;
    for (int k = 0; k < 4; k++) {
      vec4 B = uBox[k];
      float K = uBoxK[k];
      float dx = min(abs(p.x - B.x), abs(p.x - B.z));
      float dy = min(abs(p.y - B.y), abs(p.y - B.w));
      float v = hair(dx, hw, px) * step(abs(p.y - 0.5 * (B.y + B.w)), 0.5 * (B.w - B.y) * K + hw);
      float h = hair(dy, hw, px) * step(B.x - hw, p.x) * step(p.x, B.z + hw) * step(min(p.x - B.x, B.z - p.x), 0.04 * K);
      br = max(br, max(v, h) * step(0.001, K));
    }
    c = mix(c, uInk, br * uBrkA * m);
    // 03: the ledger: a hairline rule under each row, a tick in its margin, the seal
    float led = 0.0;
    for (int k = 0; k < ${N_LED}; k++) {
      vec4 L = uLed[k];
      float xr = L.y + uRule[k] * (L.z - L.y);
      float onR = hair(abs(p.y - L.x), hw, px) * step(L.y, p.x) * (1.0 - smoothstep(xr - px, xr, p.x)) * step(0.001, uRule[k]);
      float top = L.x + ${F(0.8 * TCH)};
      float bot = top - ${F(0.6 * TCH)} * uTick[k];
      float onT = hair(abs(p.x - L.w), hw * 1.2, px) * step(bot, p.y) * step(p.y, top) * step(0.001, uTick[k]);
      led = max(led, max(onR, onT));
    }
    float xs = uSeal.y + uSeal.w * (uSeal.z - uSeal.y);
    float onS = max(hair(abs(p.y - uSeal.x), hw, px), hair(abs(p.y - uSeal.x + 0.022), hw, px));
    led = max(led, onS * step(uSeal.y, p.x) * (1.0 - smoothstep(xs - px, xs, p.x)) * step(0.001, uSeal.w));
    c = mix(c, uInk, led * uLedA * m);
    if (uPerc > 0.5) c = sRGBTransferEOTF(vec4(c, 1.0)).rgb;
    gl_FragColor = linearToOutputTexel(vec4(c, 1.0));
  }`;

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  await fontReady();
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  // no tone mapping: seen through clear glass the card must stay the card's colour
  renderer.toneMapping = THREE.NoToneMapping;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.1 : 0.75);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");

  // opacities. Dark: pale ink mixed in linear light. Light: ink mixed perceptually (sRGB),
  // so text lands near #555–#6a6a6a and the dither at 0.3–0.45.
  // prettier-ignore
  const OP = dark
    ? { d0: 0.18, d1: 0.017, frag: 0.3, grid: 0.18, gridPlus: 0.31, fill: 0.32, item: 0.78, scr: 0.4, inj: 0.6, vio: 0.95, stripped: 0.64, led: 0.72, rule: 0.36, brk: 0.72 }
    : { d0: 0.3, d1: 0.017, frag: 0.4, grid: 0.3, gridPlus: 0.45, fill: 0.4, item: 0.68, scr: 0.5, inj: 0.64, vio: 1, stripped: 0.74, led: 0.66, rule: 0.5, brk: 0.8 };
  // the wall's light (luminance): lit base, the glass's shadow, its edge caustics, the lens's
  // focused spot. Density = dark ink where it is dark (pale card), bright ink where lit (dark card).
  const LUM = dark ? { base: 0.26, shadow: 0.2, rim: 0.3, caustic: 0.34 } : { base: 0.8, shadow: 0.5, rim: 0.28, caustic: 0.42 };
  const colU = (c: THREE.Color) => (dark ? c : c.clone().convertLinearToSRGB());

  /* ---------- the wall: noise grid and true-layer grid ---------- */
  const NC = COLS * ROWS;
  const TNC = TCOLS * TROWS;
  const data = new Uint8Array(NC * 4);
  const tData = new Uint8Array(TNC * 4);
  const mkState = (d: Uint8Array, w: number, h: number) => {
    const t = new THREE.DataTexture(d, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  };
  const stateTex = mkState(data, COLS, ROWS);
  const textTex = mkState(tData, TCOLS, TROWS);
  const atlas = glyphAtlas(dark ? 400 : 500);

  // the true layers: 0 See, 1 Secure, 2 Govern (glyph + opacity per text cell)
  const LG = [new Uint8Array(TNC), new Uint8Array(TNC), new Uint8Array(TNC)];
  const LO = [new Float32Array(TNC), new Float32Array(TNC), new Float32Array(TNC)];
  const LAYER_T0 = [BEATS[0].t0, BEATS[1].t0, BEATS[2].t0];
  const itemK = new Uint8Array(TNC); // 01: which find (1-based)
  const injPre = new Uint8Array(TNC); // 02: the glyph before the cut
  const injOn = new Uint8Array(TNC); // 02: part of the injected block
  const ledR = new Uint8Array(TNC); // 03: which ledger row (1-based)
  const print = (L: number, row: number, c0: number, s: string, op: number, tag?: Uint8Array, v = 1) => {
    for (let j = 0; j < s.length; j++) {
      const c = c0 + j;
      if (c < 0 || c >= TCOLS || row < 0 || row >= TROWS) continue;
      const id = row * TCOLS + c;
      LG[L][id] = gi(s[j]);
      LO[L][id] = op;
      if (tag) tag[id] = v;
    }
  };
  const secRows = (r: number) => Math.abs(r - (TRC + SEC_K)) <= 2;
  for (let r = 0; r < TROWS; r++) {
    if ((r - TRC) % 2 !== 0) continue;
    // approved traffic: a dim log line across the whole row
    let line = "";
    let n = Math.floor(hash3(r, 5, 9) * FILL.length);
    while (line.length < TCOLS + 20) line += FILL[n++ % FILL.length] + "  ";
    const s = line.slice(Math.floor(hash3(r, 6, 9) * 12)).slice(0, TCOLS);
    print(0, r, 0, s, OP.fill);
    if (!secRows(r)) print(1, r, 0, s, OP.fill);
  }
  const boxes = ITEMS.map((it, i) => {
    const r = TRC + it.k;
    const c0 = tColAt(0, it.s.length);
    print(0, r, c0, it.s, OP.fill, itemK, i + 1);
    if (!secRows(r)) print(1, r, c0, it.s, OP.fill, itemK, i + 1);
    return { x0: tCellX(c0) - TCW / 2 - 0.02, x1: tCellX(c0 + it.s.length - 1) + TCW / 2 + 0.02, y0: tRowY(r) - TCH / 2 + 0.012, y1: tRowY(r) + TCH / 2 - 0.004 };
  });
  const secX = P_SEC.x * KP;
  INJ_PRE.forEach((s, i) => {
    const r = TRC + SEC_K - 1 + i;
    const c0 = tColAt(secX, s.length);
    for (let j = 0; j < s.length; j++) {
      if (c0 + j < 0 || c0 + j >= TCOLS) continue;
      injPre[r * TCOLS + c0 + j] = gi(s[j]);
      injOn[r * TCOLS + c0 + j] = 1;
    }
  });
  INJ_POST.forEach((s, i) => {
    const r = TRC + SEC_K - 1 + i;
    print(1, r, tColAt(secX, s.length), s, i === 0 ? OP.inj : OP.stripped, injOn); // the layer's exit state
  });
  LEDGER.forEach((s, k) => print(2, TRC + LED_K[k], tColAt(0, s.length), s, OP.led, ledR, k + 1));

  const boxU = boxes.map((b) => new THREE.Vector4(b.x0 - FX, b.y0 - FY, b.x1 - FX, b.y1 - FY));
  const boxK = new Float32Array(4);
  const rule = new Float32Array(N_LED);
  const tick = new Float32Array(N_LED);
  const ledGeo = LEDGER.map((s, k) => {
    const c0 = tColAt(0, s.length);
    const x0 = tCellX(c0) - TCW / 2 - FX;
    const x1 = tCellX(c0 + s.length - 1) + TCW / 2 - FX;
    return new THREE.Vector4(tRowY(TRC + LED_K[k]) - TCH / 2 + 0.008 - FY, x0, x1, x0 - 0.04);
  });
  const sealU = new THREE.Vector4(ledGeo[N_LED - 1].x - 0.035, ledGeo[0].w, ledGeo[0].z, 0);

  const bladeCtr = Array.from({ length: NB }, () => new THREE.Vector2());
  // opaque, depth-writing: it is drawn into the transmission target, so the glass bends it
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      ...{ uState: { value: stateTex }, uText: { value: textTex }, uAtlas: { value: atlas }, uBg: { value: colU(bg) } },
      ...{ uInk: { value: colU(ink) }, uVio: { value: colU(signalCol) }, uPerc: { value: dark ? 0 : 1 } },
      ...{ uAp: { value: new THREE.Vector3(0, 0, 1) }, uPsi: { value: 0 }, uBC: { value: bladeCtr } },
      ...{ uBox: { value: boxU }, uBoxK: { value: boxK }, uBrkA: { value: OP.brk } },
      ...{ uLed: { value: ledGeo }, uRule: { value: rule }, uTick: { value: tick }, uLedA: { value: 0 }, uSeal: { value: sealU } },
    },
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), fieldMat);
  field.position.set(FX, FY, WALL_Z);
  scene.add(field);

  // per-cell constants and state
  const h0 = new Float32Array(NC);
  const hDec = new Float32Array(TNC);
  const tRes = new Float32Array(TNC); // how resolved each text cell is (eased: 1 inside the aperture)
  const fragBuf = new Uint8Array(NC);
  const cellXs = new Float32Array(COLS);
  const rowYs = new Float32Array(ROWS);
  for (let c = 0; c < COLS; c++) cellXs[c] = cellX(c);
  for (let r = 0; r < ROWS; r++) rowYs[r] = rowY(r);
  for (let id = 0; id < NC; id++) h0[id] = hash3(id % COLS, Math.floor(id / COLS), 7);
  for (let id = 0; id < TNC; id++) hDec[id] = hash3(id % TCOLS, Math.floor(id / TCOLS), 11);
  const putN = (c: number, r: number, g: number, op: number, jit = 128) => {
    const i = ((ROWS - 1 - r) * COLS + c) * 4;
    data[i] = g;
    data[i + 1] = op <= 0 ? 0 : op >= 1 ? 255 : Math.round(op * 255);
    data[i + 2] = 0;
    data[i + 3] = jit;
  };
  const putT = (c: number, r: number, g: number, op: number, vio = 0) => {
    const i = ((TROWS - 1 - r) * TCOLS + c) * 4;
    tData[i] = g;
    tData[i + 1] = op <= 0 ? 0 : op >= 1 ? 255 : Math.round(op * 255);
    tData[i + 2] = vio <= 0 ? 0 : vio >= 1 ? 255 : Math.round(vio * 255);
    tData[i + 3] = 128;
  };

  /* ---------- the mark: all thin clear glass ---------- */
  const rig = new THREE.Group(); // aim, tilt, sway, cursor lean
  const house = new THREE.Group(); // turns ψ: lens, arms, nodes, orbit, blades, scale
  rig.add(house);
  scene.add(rig);
  const pillow = pillowNormals();
  const glassSide = new THREE.MeshPhysicalMaterial({
    ...{ color: dark ? 0xffffff : 0xa9abb1, metalness: 0, roughness: 0, transmission: 1, thickness: 0.25, ior: 1.46, clearcoat: 0 },
    ...{ attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#e2e3e7"), attenuationDistance: dark ? 60 : 4, specularIntensity: 1, envMapIntensity: dark ? 1.5 : 1.1 },
  });
  // the sides and bevels read darker than the faces: the slab's thickness, at a glance
  const glassFace = glassSide.clone();
  glassFace.color.set(dark ? 0xffffff : 0xf4f5f7);
  glassFace.normalMap = pillow;
  for (const m of [glassSide, glassFace]) {
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = crisp(shader.fragmentShader);
    };
    m.customProgramCacheKey = () => "hero11a-crisp";
  }
  const glassMats = [glassFace, glassSide];
  // the edge: bright on the dark card; a firm ~1px ink rim on the pale one
  const edge = dark ? rimMaterial(new THREE.Color(0xffffff), 0.8, 0.55, 0.95) : rimMaterial(ink, 0.92, 0.42, 0.78);
  const coreGeo = extrude(coreShape(), SLAB_D, 48);
  house.add(new THREE.Mesh(coreGeo, glassMats), new THREE.Mesh(coreGeo, edge));
  NODE_A.forEach((a, i) => {
    // a hair thinner than the core, so the faces never coincide where an arc end meets a node
    const g = extrude(arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP)), SLAB_D - 0.006, 64);
    house.add(new THREE.Mesh(g, glassMats), new THREE.Mesh(g, edge));
  });

  // the blades: one disc of clear glass over the lens, cut analytically, edges only
  const bladeU = {
    uBC: { value: bladeCtr },
    uEdgeCol: { value: dark ? new THREE.Color(0xffffff) : ink.clone() },
    uEdgeA: { value: dark ? 0.85 : 0.9 },
    uShadeA: { value: dark ? 0.05 : 0.1 },
    uStep: { value: dark ? 0.035 : 0.05 },
  };
  const bladeMat = new THREE.MeshPhysicalMaterial({
    ...{ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.01, ior: 1.46 },
    ...{ attenuationColor: new THREE.Color(0xffffff), attenuationDistance: 80, specularIntensity: 0.7, envMapIntensity: dark ? 1.3 : 1 },
  });
  bladeMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, bladeU);
    shader.vertexShader = "varying vec2 vIris;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vIris = position.xy;");
    shader.fragmentShader = BLADE_PARS + crisp(shader.fragmentShader)
      .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n" + BLADE_CUT)
      .replace("#include <opaque_fragment>", "#include <opaque_fragment>\n" + BLADE_COL);
  };
  bladeMat.customProgramCacheKey = () => "hero11a-iris6";
  const blades = new THREE.Mesh(new THREE.CircleGeometry(CLIP_R + 0.004, 128), bladeMat);
  blades.position.z = PLATE_Z;
  house.add(blades);

  // the engraved scale: hairline ticks on the orbit's face, counted from the index
  // clockwise, placed so a major tick meets the fixed index at 12 o'clock at the seal
  const base = 90 - (K_PSI * betaOf(D_SEAL) * 180) / Math.PI;
  const tickList: { a: number; major: boolean; order: number }[] = [];
  for (let k = 0; k < 360 / N_TICK_STEP; k++) {
    const a = base + k * N_TICK_STEP;
    if (NODE_A.some((n) => Math.abs(wrap180(a - n)) < GAP + 5)) continue;
    tickList.push({ a, major: k % 5 === 0, order: (360 - k * N_TICK_STEP) % 360 });
  }
  tickList.sort((p, q) => p.order - q.order);
  const N_TICK = tickList.length;
  const inkLine = dark ? new THREE.Color("#f4f4f6") : ink.clone();
  const tickMat = new THREE.MeshBasicMaterial({ color: inkLine, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tickMat, N_TICK);
  const dummy = new THREE.Object3D();
  tickList.forEach((tk, i) => {
    const r0 = tk.major ? 0.935 : 0.975;
    const r1 = 1.065;
    const a = deg(tk.a);
    dummy.position.set((Math.cos(a) * (r0 + r1)) / 2, (Math.sin(a) * (r0 + r1)) / 2, ARC_FACE + 0.0015);
    dummy.rotation.set(0, 0, a);
    dummy.scale.set(r1 - r0, tk.major ? 0.0075 : 0.005, 0.002);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  });
  ticks.instanceMatrix.needsUpdate = true;
  ticks.count = 0;
  house.add(ticks);
  // the fixed index the scale clicks onto (on the rig: it does not turn)
  const idxMat = new THREE.MeshBasicMaterial({ color: inkLine, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const index = new THREE.Mesh(new THREE.BoxGeometry(0.0075, 0.07, 0.002), idxMat);
  index.position.set(0, 1 + BAND / 2 + 0.06, ARC_FACE);
  rig.add(index);

  /* ---------- cursor lean ---------- */
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    lean.tx = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
    lean.ty = clamp01((e.clientY - r.top) / r.height) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  /* ---------- per-frame state (all eased from what is on screen) ---------- */
  let [viewW, viewH, lastReal, lastField, fDt, fSnap] = [1, 1, -1, -1, 16, true];
  const follow = (cur: number, to: number, tau: number) => (fSnap ? to : cur + (to - cur) * (1 - Math.exp(-fDt / tau)));
  let [beta, betaV, dEff] = [0, 0, 0.14]; // the blade swing shown (rad), its speed, the aperture it gives
  let [poseX, poseY] = [P_START.x, P_START.y];
  let [phDec, phVio, nTick, tickA, idxA, ledA] = [0, 0, 0, 0, 0, 0];
  let ordR = 0; // 03: radius of the ordered (governed) wall round the lens
  const found = new Float32Array(4);
  const ledW = new Float32Array(N_LED);
  let [apWX, apWY, apWS, apWR] = [0, 0, 1, 0]; // the lens on the wall: centre, scale, inradius
  const tmpV = new THREE.Vector3();
  // the housing's plane and axes in world space (for the light on the wall)
  const sh = { ox: 0, oy: 0, oz: 0, nx: 0, ny: 0, nz: 1, ux: 1, uy: 0, uz: 0, vx: 0, vy: 1, vz: 0, k: 0 };

  /** the wall's luminance: the light from up-left, through / round the mark */
  function lumAt(x: number, y: number) {
    const dx = x - LIGHT.x;
    const dy = y - LIGHT.y;
    const dz = WALL_Z - LIGHT.z;
    const den = sh.nx * dx + sh.ny * dy + sh.nz * dz;
    if (Math.abs(den) < 1e-4) return LUM.base;
    const s = sh.k / den;
    const hx = LIGHT.x + dx * s - sh.ox;
    const hy = LIGHT.y + dy * s - sh.oy;
    const hz = LIGHT.z + dz * s - sh.oz;
    const u = hx * sh.ux + hy * sh.uy + hz * sh.uz;
    const v = hx * sh.vx + hy * sh.vy + hz * sh.vz;
    const r = Math.hypot(u, v);
    if (r > 1.45) return LUM.base;
    const d = logoSDF(u, v);
    let L = LUM.base - LUM.shadow * (1 - smooth(clamp01((d + 0.025) / 0.1))); // the glass's soft shadow
    L += LUM.rim * Math.exp(-(((d - 0.03) / 0.022) ** 2)); // its edges throw a bright line
    if (r < HUB_R && dEff > 0) {
      // the lens focuses what passes the aperture into a spot: smaller and hotter as it closes
      const rc = 0.28 * Math.min(dEff, CLIP_R) + 0.035;
      const heat = Math.min(2.4, 0.3 * (Math.min(dEff, CLIP_R) / rc) ** 2);
      L += LUM.caustic * heat * (1 - smooth(clamp01(r / rc)));
    }
    return L;
  }

  function placeFragments(now: number) {
    fragBuf.fill(0);
    for (let i = 0; i < N_FRAG; i++) {
      const per = 2600 + i * 170;
      const tt = now + i * 911;
      const ep = Math.floor(tt / per);
      const ph = (tt - ep * per) / per;
      if (ph > 0.82) continue;
      const word = FRAGS[Math.floor(hash3(i, ep, 3) * FRAGS.length)];
      const r = Math.floor(hash3(i, ep, 1) * ROWS);
      const c0 = Math.floor(hash3(i, ep, 2) * (COLS - 6)) - 4 + Math.floor(ph * 9);
      for (let j = 0; j < word.length; j++) {
        const c = c0 + j;
        if (c >= 0 && c < COLS) fragBuf[r * COLS + c] = gi(word[j]);
      }
    }
  }

  /** the dither's tone: dense = dark on the pale card, dense = bright on the dark card */
  const tone = (L: number) => clamp01(dark ? L : 1 - L);
  const ditherG = (T: number, b: number) => RAMP_G[Math.max(0, Math.min(9, Math.round(T * 9 + (b - 0.5) * 1.1)))];

  function writeWall(now: number) {
    placeFragments(now);
    const inR = apWR * 0.92; // well inside the aperture the noise is never seen
    const inR2 = inR > 0.05 ? inR * inR : -1;
    for (let r = 0; r < ROWS; r++) {
      const y = rowYs[r];
      const dy = y - apWY;
      for (let c = 0; c < COLS; c++) {
        const id = r * COLS + c;
        const x = cellXs[c];
        const dx = x - apWX;
        const d2 = dx * dx + dy * dy;
        if (d2 < inR2) {
          putN(c, r, 0, 0);
          continue;
        }
        const ro = ordR - h0[id] * 0.35;
        if (ro > 0 && d2 < ro * ro) {
          // governed: the same picture, settled onto a regular grid
          const T = tone(lumAt(x, y));
          const on = c % 2 === 0 && r % 2 === 0;
          if (on && T > 0.42) putN(c, r, RAMP_G[5], OP.gridPlus);
          else if (on && T > 0.12) putN(c, r, RAMP_G[1], OP.grid);
          else putN(c, r, 0, 0);
          continue;
        }
        // noise: the same picture, corrupted: jostled, random thresholds, flicker, fragments
        const step = Math.floor(now / 120 + h0[id] * 5);
        const qx = x + (vnoise(c / 6 - now * 0.00035, r / 3, 1) - 0.5) * 0.16;
        const qy = y + (vnoise(c / 6 + now * 0.00025, r / 3 - now * 0.0003, 2) - 0.5) * 0.12;
        let T = tone(lumAt(qx, qy)) + (vnoise(c / 2.5 + now * 0.0004, r / 1.5, 3) - 0.5) * 0.2;
        T += (hash3(c, r, step) - 0.5) * 0.24;
        const jit = 128 + Math.round((hash3(c, r, step + 7919) - 0.5) * 80);
        const fg = fragBuf[id];
        if (fg) putN(c, r, fg, OP.frag, jit);
        else {
          const g = ditherG(clamp01(T), hash3(c, r, step + 31));
          putN(c, r, g, OP.d0 + OP.d1 * RAMP_G.indexOf(g), jit);
        }
      }
    }
    stateTex.needsUpdate = true;
  }

  function writeText(now: number, t: number, dtF: number) {
    const scrStep = Math.floor(now / 70);
    const L = t < BEATS[1].t0 ? 0 : t < BEATS[2].t0 ? 1 : 2;
    const P = (L + 2) % 3;
    const age = t - LAYER_T0[L];
    const gL = LG[L];
    const oL = LO[L];
    const gP = LG[P];
    const oP = LO[P];
    const R = apWR * 1.12 + 0.02; // the aperture's corners reach past its inradius
    const R2 = apWR > 0.005 ? R * R : -1;
    const kRes = fSnap ? 1 : 1 - Math.exp(-dtF / 70);
    const stripped = t >= T_CUT && t < BEATS[2].t0;
    for (let r = 0; r < TROWS; r++) {
      const dy = tRowY(r) - apWY;
      for (let c = 0; c < TCOLS; c++) {
        const id = r * TCOLS + c;
        const dx = tCellX(c) - apWX;
        const rs = (tRes[id] += ((dx * dx + dy * dy < R2 ? 1 : 0) - tRes[id]) * kRes);
        const th = 0.2 + 0.55 * hDec[id];
        if (rs <= th) {
          putT(c, r, 0, 0);
          continue;
        }
        const scr = SCR_G[Math.floor(hash3(c, r, scrStep) * SCR_G.length)];
        let g = gL[id];
        let op = oL[id];
        let vio = 0;
        let scramble = false;
        if (L < 2 && itemK[id]) op = OP.fill + (OP.item - OP.fill) * found[itemK[id] - 1];
        if (L === 1 && injOn[id] && !stripped) {
          // hidden in the traffic (a dense bar), then decoding, then read and flagged violet
          const u = phDec * 1.5 - hDec[id] * 0.5;
          const pre = injPre[id];
          g = pre;
          if (u <= 0.02) {
            if (pre) g = DENSE_G[Math.floor(hash3(c, r, Math.floor(now / 90)) * DENSE_G.length)];
            op = OP.frag;
          } else if (u < 0.35) scramble = pre > 0;
          else {
            op = OP.inj + (OP.vio - OP.inj) * phVio;
            vio = phVio;
          }
        } else if (L === 2 && ledR[id]) {
          const u = ledW[ledR[id] - 1] * 1.4 - hDec[id] * 0.4;
          if (u <= 0) g = 0;
          else if (u < 0.6) scramble = g > 0;
        }
        // the change of layer at a beat: the old text holds, scrambles, gives way
        if (age < 420 && gP[id] !== gL[id]) {
          const tc = 40 + hDec[id] * 280;
          // prettier-ignore
          if (age < tc) { g = gP[id]; op = oP[id]; vio = 0; }
          else if (age < tc + 110 && (g || gP[id])) scramble = true;
        }
        if (scramble || (g && rs < th + 0.2)) putT(c, r, scr, OP.scr);
        else putT(c, r, g, op, vio);
      }
    }
    textTex.needsUpdate = true;
  }

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const nowMs = performance.now();
    const raw = lastReal < 0 ? Infinity : nowMs - lastReal;
    lastReal = nowMs;
    fSnap = raw > 250;
    fDt = fSnap ? 16 : raw;

    /* ambient (real time): a slow sway and a gentle lean to the cursor */
    const e = fSnap ? 1 : 1 - Math.pow(0.03, fDt / 1000);
    lean.x += (lean.tx - lean.x) * e;
    lean.y += (lean.ty - lean.y) * e;
    const yaw = Math.sin((nowMs / 31000) * TAU) * 0.035 + lean.x * 0.07;
    const tilt = 0.1 + Math.sin((nowMs / 23000) * TAU + 1.1) * 0.015 + lean.y * 0.05;
    const lift = Math.sin((nowMs / 19000) * TAU) * 0.015;
    scene.environmentRotation.set(0, Math.sin((nowMs / 37000) * TAU) * 0.3, 0);

    /* the aim */
    poseX = follow(poseX, keyed(PX_KEYS, t), 110);
    poseY = follow(poseY, keyed(PY_KEYS, t), 110);
    rig.position.set(poseX, poseY + lift, 0);
    rig.rotation.set(tilt, yaw, 0);

    /* the iris: the blades' swing follows the story on a critically damped spring;
       the housing's turn is locked to it */
    const bT = betaOf(keyed(AP_KEYS, t));
    if (fSnap) [beta, betaV] = [bT, 0];
    else {
      const w = IRIS_W / 1000;
      const n = Math.ceil(fDt / 8);
      const h = fDt / n;
      for (let i = 0; i < n; i++) {
        betaV += (w * w * (bT - beta) - 2 * w * betaV) * h;
        beta += betaV * h;
      }
    }
    dEff = dOfBeta(beta);
    const psi = K_PSI * beta;
    house.rotation.z = psi;
    for (let i = 0; i < NB; i++) {
      const ph = (i * TAU) / NB;
      bladeCtr[i].set(PIV_R * Math.cos(ph) - BLADE_RA * Math.cos(ph + beta), PIV_R * Math.sin(ph) - BLADE_RA * Math.sin(ph + beta));
    }
    rig.updateMatrixWorld(true);
    const m = house.matrixWorld.elements;
    // prettier-ignore
    { sh.ux = m[0]; sh.uy = m[1]; sh.uz = m[2]; sh.vx = m[4]; sh.vy = m[5]; sh.vz = m[6]; }
    // prettier-ignore
    { sh.nx = m[8]; sh.ny = m[9]; sh.nz = m[10]; sh.ox = m[12]; sh.oy = m[13]; sh.oz = m[14]; }
    sh.k = sh.nx * (sh.ox - LIGHT.x) + sh.ny * (sh.oy - LIGHT.y) + sh.nz * (sh.oz - LIGHT.z);

    /* the lens, projected from the camera onto the wall */
    const C = camera.position;
    apWS = (C.z - WALL_Z) / (C.z - (m[14] + m[10] * PLATE_Z));
    apWX = C.x + (m[12] + m[8] * PLATE_Z - C.x) * apWS;
    apWY = C.y + (m[13] + m[9] * PLATE_Z - C.y) * apWS;
    apWR = Math.max(0, Math.min(dEff, CLIP_R)) * apWS;
    (fieldMat.uniforms.uAp.value as THREE.Vector3).set(apWX - FX, apWY - FY, apWS);
    fieldMat.uniforms.uPsi.value = psi;

    /* 01: a find is bracketed once the aperture holds all of it */
    for (let k = 0; k < 4; k++) {
      const b = boxes[k];
      const yy = Math.max(Math.abs(b.y0 - apWY), Math.abs(b.y1 - apWY));
      const xx = Math.max(Math.abs(b.x0 - apWX), Math.abs(b.x1 - apWX));
      const inside = apWR > 0.1 && xx * xx + yy * yy < (apWR - 0.01) * (apWR - 0.01);
      found[k] = follow(found[k], t < 3900 && inside ? 1 : 0, 150);
      boxK[k] = smooth(clamp01(found[k] * 1.25 - 0.25));
    }

    /* 02 */
    phDec = follow(phDec, t >= 3950 && t < BEATS[2].t0 ? seg(t, 3950, 4350) : 0, 70);
    phVio = follow(phVio, t >= 4300 && t < T_CUT ? smooth(seg(t, 4300, 4550)) : 0, 90);

    /* 03: the ledger writes, the scale counts up, the wall settles, the seal */
    const gov = t >= BEATS[2].t0 && t < 11150;
    for (let k = 0; k < N_LED; k++) {
      const w0 = ledT0(k);
      ledW[k] = seg(t, w0, w0 + 260);
      tick[k] = t >= BEATS[2].t0 ? seg(t, w0, w0 + 120) : 0;
      rule[k] = t >= BEATS[2].t0 ? seg(t, w0 + 180, w0 + 480) : 0;
    }
    sealU.w = t >= BEATS[2].t0 ? seg(t, LOG_T.seal, LOG_T.seal + 180) : 0;
    ledA = follow(ledA, t >= BEATS[2].t0 ? 1 : 0, 120);
    fieldMat.uniforms.uLedA.value = OP.rule * ledA;
    ordR = follow(ordR, gov ? 0.8 + 3 * smooth(seg(t, LOG_T.in, LOG_T.seal)) : 0, 200);
    nTick = follow(nTick, t >= LOG_T.in ? N_TICK * seg(t, LOG_T.in, LOG_T.seal) : 0, 100);
    tickA = follow(tickA, t >= LOG_T.in && t < 11150 ? 1 : 0, 140);
    idxA = follow(idxA, t >= LOG_T.seal && t < 11150 ? 1 : 0, 90);
    ticks.count = Math.min(N_TICK, Math.floor(nTick + 0.001));
    ticks.visible = tickA > 0.01 && ticks.count > 0;
    tickMat.opacity = (dark ? 0.7 : 0.72) * tickA;
    idxMat.opacity = (dark ? 0.8 : 0.85) * idxA;
    index.visible = idxA > 0.01;

    // the wall: rewritten at ~30 Hz (the noise steps at 120 ms)
    if (fSnap || lastField < 0 || nowMs - lastField >= 32) {
      writeWall(nowMs);
      writeText(nowMs, t, lastField < 0 ? 16 : nowMs - lastField);
      lastField = nowMs;
    }
  }

  function resize(width: number, height: number, mode: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    if (mode === "wide") {
      camera.fov = 22;
      // the mark sits right of the copy: a lens shift, so perspective stays straight
      const dx = Math.round(viewW * 0.25);
      const dy = Math.round(viewH * 0.025);
      camera.aspect = (viewW + 2 * dx) / (viewH + 2 * dy);
      camera.setViewOffset(viewW + 2 * dx, viewH + 2 * dy, 0, 2 * dy, viewW, viewH);
      camera.position.set(0, CAM_Y, CAM_Z);
    } else {
      camera.fov = 24;
      camera.clearViewOffset();
      const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const hHalf = vHalf * camera.aspect;
      camera.position.set(0, 0.2, Math.max(1.6 / vHalf, 1.6 / hHalf));
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  /** a housing-local point → stage px (in tmpV.x / tmpV.y) */
  const toStage = (x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(house.matrixWorld).project(camera);
    tmpV.set(((tmpV.x + 1) / 2) * viewW, ((1 - tmpV.y) / 2) * viewH, 0);
    return tmpV;
  };

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels: () => [],
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      const { x: cx, y: cy } = toStage(0, 0, 0);
      const e = toStage(MARK_R, 0, 0);
      const rr = Math.max(1, Math.hypot(e.x - cx, e.y - cy));
      return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr * rr;
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      ticks.dispose();
      atlas.dispose();
      stateTex.dispose();
      textTex.dispose();
      pillow.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
