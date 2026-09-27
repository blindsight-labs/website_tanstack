/* Mockup 5 · See / Secure / Govern, direction S3: "the checkpoint speaks".
 *
 * The hero, seen from above. The office is a clean plan: 1 px footprints of
 * rooms and desks at ~15% ink, each named in mono (m.keller, crm-assistant,
 * agent:finance, crm-db, user_7f3a…), and the 1 px paths between them. The
 * Blindsight mark lies flat around the office's one exit: a chrome watch-bezel
 * extrusion with a flat clear glass hub, one ink silhouette on its outer contour.
 * Every path ends through it. Anonymous ink dashes travel the paths at one slow,
 * constant speed. Inside the ring a dash UNFOLDS into its readable mono row, and
 * the hub prints the verdict inside its disc. One act at a time:
 *   SEE     agent:finance → browser.open(chatgpt.com · personal)  → FLAGGED
 *           crm-assistant → export(customers)                    → FLAGGED
 *   SECURE  crm-assistant → export([masked])                     → MASKED
 *           the mark turns a node onto the agent's lane; send_email(ext-sync.io)
 *           halts against its edge (the other lane keeps flowing) → BLOCKED
 *   GOVERN  the mark turns back; traffic passes clean; the hub reads LOGGED.
 * No violet in this scene. At most one label chip at a time (all return in Govern).
 * Scene times: See 300–3500, Secure 3500–5000, Govern 5000–7600, reset 9700–10400.
 */
import { THREE, createRenderer, type Theme } from "./core";

export const LOOP_MS = 10400;
/** A frame where everything has happened and nothing is moving (reduced motion). */
export const SETTLED_MS = 7600;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 5100, seal: 6300, out: 9700 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 600, t1: 3500 },
  { n: "02", label: "Secure it", t0: 3500, t1: 5000 },
  { n: "03", label: "Govern it", t0: 5000, t1: 9700 },
] as const;

/** A screen-space label for the page to draw: stage pixels, opacity, and state
 *  (0 flagged · 1 masked/blocked · 2 logged). Order: agent:finance, crm-assistant, chatgpt.com. */
export type HeroLabel = { x: number; y: number; a: number; state: 0 | 1 | 2 };

export type HeroMode = "wide" | "narrow";
export type HeroOptions = { theme: Theme; bg: string; ink: string };
export type HeroScene = {
  resize(width: number, height: number, mode: HeroMode): void;
  render(timeMs: number): void;
  labels(): HeroLabel[];
  dispose(): void;
};

/* ------------------------------------------------------------------ */
/* timing                                                              */
/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

const TAU = Math.PI * 2;
const deg = (a: number) => (a * Math.PI) / 180;
type P2 = [number, number];

/* ---------- the mark, in its own units (orbit radius 1), to the shared spec ---------- */
const [HUB_R, NODE_R, BAND, ARM_W] = [0.5, 0.25, 0.2, 0.17]; // stroke 0.2 ≈ 0.09 × D (D ≈ 2.2)
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const DEPTH = 0.25 * BAND; // a watch bezel, not a slab
const BEVEL = 0.08 * BAND; // 3 segments
const BEZEL_W = 0.035; // the hub's thin chrome bezel

/* ---------- where it lies: flat around the office's one exit (world units) ---------- */
const RING = { x: 1.4, z: -1.5, s: 2.1 }; // hub centre; s = orbit radius
const MARK_Y = (DEPTH / 2 + BEVEL) * RING.s + 0.001; // resting on the floor
const OUT_Z = -4.7; // the exit lane runs off the plan here
/** the mark's turn ψ (deg). At rest its spokes stay clear of the lanes and of the
 *  rows it prints; at PSI_BLOCK node 232 sits on the agent's lane (mark angle A_LANE) */
const PSI_REST = 30;
const PSI_BLOCK = 8;
const A_LANE = 240;
const TURNS: [number, number, number][] = [
  [4100, 4450, PSI_BLOCK],
  [5500, 5850, PSI_REST],
];
/** world (x, z) of a point on the mark at angle a (deg) and radius r, turned by ψ */
const markPt = (a: number, psi: number, r: number): P2 => [
  RING.x + Math.cos(deg(a + psi)) * r * RING.s,
  RING.z - Math.sin(deg(a + psi)) * r * RING.s,
];

/* ---------- traffic: one slow constant speed (world units per ms) ---------- */
const V = 0.0013;
const DASH = { l: 0.28, w: 0.06, h: 0.012 };
/** the rows a dash unfolds into: two lines above the hub, on the exit lane
 *  (distance past the hub of line 2 and line 1; type size, world) */
const ROW = { d2: 1.18, d1: 1.46, em: 0.112 };
const ROWS: string[][] = [
  ["agent:finance →", "browser.open(chatgpt.com · personal)"],
  ["crm-assistant →", "export(customers)"],
  ["crm-assistant →", "export([masked])"],
  ["", "send_email(ext-sync.io)"],
];
/** the acts where a dash unfolds: it reaches the row point at `at`, is read, and
 *  folds back into a dash at `fold` (+ 250 ms) to carry on out */
const ACTS = [
  { route: "gpt", at: 850, fold: 2000, row: 0, maskAt: 0 },
  { route: "crm", at: 2350, fold: 3350, row: 1, maskAt: 0 },
  { route: "crm", at: 3600, fold: 4400, row: 1, maskAt: 3900 },
] as const;
/** send_email: halts at node 232's edge, its row shows in the ring, then it is dropped */
const BLOCK = { halt: 4500, rowIn: 4700, drop: 5400 };
/** the hub's words, inside its disc: [word, in, out] */
const WORDS: [string, number, number][] = [
  ["FLAGGED", 1300, 2000],
  ["FLAGGED", 2800, 3350],
  ["MASKED", 3950, 4400],
  ["BLOCKED", 4850, 5450],
  ["LOGGED", 5800, 1e9],
];
/** one chip at a time: [chip index, in, out]; all return with LOGGED */
const CHIPS: [number, number, number][] = [
  [2, 1000, 2250],
  [1, 2500, 4650],
  [0, 4700, 5900],
];
const LOGGED_AT = 5800;
const RESET: [number, number] = [9700, 10400];

/* ------------------------------------------------------------------ */
/* floor plan (world units; the floor is y = 0)                        */
/* ------------------------------------------------------------------ */
const PLAN = { x0: -8, z0: -6, w: 16, d: 12, px: 128 };
type Rect = { name: string; x: number; z: number; w: number; d: number; round?: boolean };
const ROOMS: Rect[] = [
  { name: "FINANCE", x: -2.625, z: -2.775, w: 2.25, d: 1.95 },
  { name: "SERVER ROOM", x: -2.625, z: -0.15, w: 2.25, d: 2.1 },
  { name: "SALES", x: -0.175, z: 2.3, w: 7.15, d: 1.2 },
];
/** desks and systems, each named for who or what is there */
const SPOTS: Rect[] = [
  { name: "m.keller", x: -3.1, z: -3.0, w: 1.0, d: 0.5 },
  { name: "crm-assistant", x: -2.2, z: -2.15, w: 1.3, d: 0.5 },
  { name: "agent:finance", x: -2.95, z: -0.3, w: 1.2, d: 0.6 },
  { name: "crm-db", x: -1.95, z: -0.3, w: 0.62, d: 0.62, round: true },
  { name: "user_7f3a", x: -2.4, z: 2.3, w: 1.1, d: 0.5 },
  { name: "ws-sal-02", x: 0.6, z: 2.3, w: 1.1, d: 0.5 },
  { name: "ws-sal-03", x: 2.4, z: 2.3, w: 1.1, d: 0.5 },
];
/** the chips' anchors, in the page's order: agent:finance, crm-assistant, chatgpt.com
 *  (the shadow AI is opened from m.keller's desk) */
const CHIP_AT: P2[] = [
  [-2.95, -0.6],
  [-2.2, -2.4],
  [-3.1, -3.25],
];

/* the plan's paths (drawn once, 1 px) and the routes dashes take along them */
const C: P2 = [RING.x, RING.z];
const OUT: P2 = [RING.x, OUT_Z];
const CORR_S = 1.3; // the south corridor
const J: P2 = [RING.x + ((CORR_S - RING.z) / -Math.sin(deg(A_LANE))) * Math.cos(deg(A_LANE)), CORR_S];
const SPINE = -1.25;
const PATHS: P2[][] = [
  [[-3.1, -2.75], [-3.1, RING.z], C, OUT], // m.keller, the north corridor, the exit
  [[-2.2, -1.9], [-2.2, RING.z]], // crm-assistant
  [[SPINE, CORR_S], [SPINE, RING.z]], // the spine
  [[-2.95, 0.0], [-2.95, CORR_S], [2.4, CORR_S]], // agent:finance, the south corridor
  [J, C], // the agent's lane
  ...[-2.4, 0.6, 2.4].map((x): P2[] => [[x, 2.05], [x, CORR_S]]), // the sales desks
];
const viaSpine = (x: number): P2[] => [[x, 2.05], [x, CORR_S], [SPINE, CORR_S], [SPINE, RING.z], C, OUT];
const ROUTES: Record<string, P2[]> = {
  gpt: [[-3.1, -2.75], [-3.1, RING.z], C, OUT],
  crm: [[-2.2, -1.9], [-2.2, RING.z], C, OUT],
  agent: [[-2.95, 0.0], [-2.95, CORR_S], J, C, OUT],
  sal1: viaSpine(-2.4),
  sal2: viaSpine(0.6),
  sal3: viaSpine(2.4),
};
/** ordinary traffic, by the time each dash reaches the hub. These walk the plan
 *  through See and Secure and reach the ring only once the acts are done (the
 *  first ones enter it on the free lane while send_email is held), then pass
 *  clean in Govern. The acts' own dashes are already crossing the ring at t = 0. */
const AMBIENT: [string, number[]][] = [
  ["sal1", [6320, 8000]],
  ["sal3", [6700, 8700]],
  ["sal2", [7100]],
  ["gpt", [7500, 9000]],
  ["crm", [7900]],
  ["agent", [8300]],
];
/* ------------------------------------------------------------------ */
/* studio environment (per theme)                                      */
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
        // light: a mid-grey studio, not a white one — near-white surroundings make
        // every grazing glass face mirror white (milky acrylic)
        top: { value: grey(dark ? 0.05 : 0.5) },
        hor: { value: grey(dark ? 0.018 : 0.32) },
        bot: { value: grey(dark ? 0.008 : 0.42) },
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
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  if (dark) {
    panel(18, 6, 0, 78, 2.6);
    panel(2.2, 16, 52, 4, 4.2);
    panel(1.4, 16, -78, 4, 2.6);
    panel(1.2, 16, 168, 4, 3.4);
    panel(12, 3.2, 215, 12, 0.22);
    panel(24, 9, 180, 34, 0.3);
    panel(10, 3, 20, -30, 0.12);
  } else {
    panel(18, 2, 0, 78, 2.2);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(9, 1.3, 205, -6, 0.0);
    panel(6, 1.1, 40, -26, 0.05);
    panel(2.2, 14, 58, 6, 2.6);
    panel(1.6, 14, -40, 8, 2.6);
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

/** The mark's own studio: black, with a few hard strips and nothing broad, so flat
 *  chrome reads as crisp black and white bands. The camera looks down from +z, so
 *  the mark's flat tops mirror the sky behind it (az 180°) at ~52–65° elevation:
 *  two strips there lay two bands across it; low strips catch the bevels. */
function stripEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.012, 0.012, 0.014);
  const strip = (w: number, h: number, azDeg: number, elDeg: number, v: number, dist = 14) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    const [az, el] = [deg(azDeg), deg(elDeg)];
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  strip(30, 0.9, 180, 56, 7);
  strip(30, 0.4, 180, 63.5, 4.5);
  strip(34, 1.6, 180, 22, 3);
  strip(34, 1.2, 0, 34, 2.2);
  strip(1.1, 18, 90, 18, 3.2);
  strip(1.1, 18, -90, 18, 3.2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/* ------------------------------------------------------------------ */
/* floor                                                               */
/* ------------------------------------------------------------------ */
const NC = 20;

const floorVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const floorFrag = /* glsl */ `
  uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uShade;
  uniform sampler2D uPlan; uniform sampler2D uHidden;
  uniform vec4 uRect;
  uniform float uScanX; uniform float uScan; uniform float uHidX; uniform float uHidAmt;
  uniform vec2 uScanDir;
  uniform float uInkAmt; uniform float uDotAmt; uniform float uShadeMax;
  uniform float uGridAmt; uniform float uScanLine; uniform float uScanWash;
  uniform vec4 uPool;
  uniform vec4 uCA[NC]; uniform vec4 uCB[NC];
  uniform vec4 uFade;
  varying vec3 vW;

  float sdRB(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = vW.xz;
    vec2 uv = (p - uRect.xy) / uRect.zw;
    float inRect = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
    float base = texture2D(uPlan, uv).r * inRect;
    float hid = texture2D(uHidden, uv).r * inRect;

    float fw = length(fwidth(p));
    vec2 g = (fract(p / 0.25 + 0.5) - 0.5) * 0.25;
    float dots = 1.0 - smoothstep(0.0095, 0.0095 + fw, length(g));
    dots *= 1.0 - smoothstep(0.014, 0.034, fw);

    // what the gate's cast line has already passed over (q: distance along the
    // gate's facing direction)
    float q = dot(p, uScanDir);
    float behind = smoothstep(uHidX + 0.02, uHidX - 0.4, q) * uHidAmt;

    // analytic contact shadows: rounded-rect SDF per caster
    float sh = 0.0;
    for (int i = 0; i < NC; i++) {
      vec4 a = uCA[i]; vec4 b = uCB[i];
      if (b.z > 0.0) {
        // b.w = 1: an annulus (centre a.xy, radius a.z, half-band a.w)
        float d = b.w > 0.5 ? abs(length(p - a.xy) - a.z) - a.w : sdRB(p - a.xy, a.zw, b.x);
        float core = 1.0 - smoothstep(-b.y * 0.45, b.y, d);
        float tail = exp(-max(d, 0.0) / (b.y * 2.2)) * 0.32;
        sh = max(sh, b.z * max(core, tail));
      }
    }

    vec2 gq = abs(fract(p / 0.5 + 0.5) - 0.5) * 0.5;
    vec2 gw = fwidth(p) * 0.9;
    float grid = max(1.0 - smoothstep(gw.x * 0.5, gw.x * 1.5, gq.x), 1.0 - smoothstep(gw.y * 0.5, gw.y * 1.5, gq.y));
    grid *= 1.0 - smoothstep(0.02, 0.05, fw);

    float pool = (1.0 - smoothstep(0.0, uPool.z, length(p - uPool.xy))) * uPool.w;
    vec3 bg = mix(uBg, vec3(1.0), pool);

    vec3 col = mix(bg, uShade, clamp(sh, 0.0, uShadeMax));
    float ink = clamp(base * uInkAmt + hid * behind * uInkAmt * 1.5 + dots * uDotAmt + grid * uGridAmt, 0.0, 1.0);
    col = mix(col, uInk, ink);

    float sd = q - uScanX;
    float lw = fwidth(sd);
    float line = 1.0 - smoothstep(lw * 0.5, lw * 2.0, abs(sd));
    float wash = sd < 0.0 ? exp(sd * 2.0) : 0.0;
    col = mix(col, uInk, (line * uScanLine + wash * uScanWash) * uScan);

    float r = length((p - uFade.xy) * vec2(0.82, 1.18));
    float f = 1.0 - smoothstep(uFade.z, uFade.w, r);
    gl_FragColor = vec4(mix(uBg, col, f), 1.0);
    #include <colorspace_fragment>
  }`;

async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.race([
    Promise.all([
      document.fonts.load('500 22px "IBM Plex Mono"'),
      document.fonts.load('400 22px "IBM Plex Mono"'),
    ]).catch(() => undefined),
    new Promise((r) => setTimeout(r, 1200)),
  ]);
}

/* ---------- the mark's geometry: the logo's 2D outline, extruded as a watch bezel ---------- */
const extrude = (shape: THREE.Shape, depth: number, curveSegments: number, bev = BEVEL) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
};
function disc(r: number, hole = 0) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  if (hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}
/** one spoke: concave on the hub at its inner end, on its node at the outer */
function barShape(ad: number) {
  const a = deg(ad);
  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const hw = ARM_W / 2 - BEVEL;
  const [hr, nr] = [HUB_R + BEVEL, NODE_R + BEVEL];
  const [aIn, aOut] = [Math.asin(hw / hr), Math.asin(hw / nr)];
  const [uIn, uOut] = [Math.sqrt(hr * hr - hw * hw), 1 - Math.sqrt(nr * nr - hw * hw)];
  const px = (u: number, v: number) => ca * u - sa * v;
  const py = (u: number, v: number) => sa * u + ca * v;
  const s = new THREE.Shape();
  s.moveTo(px(uIn, -hw), py(uIn, -hw));
  s.lineTo(px(uOut, -hw), py(uOut, -hw));
  s.absarc(ca, sa, nr, a + Math.PI + aOut, a + Math.PI - aOut, true);
  s.lineTo(px(uIn, hw), py(uIn, hw));
  s.absarc(0, 0, hr, a + aIn, a - aIn, true);
  s.closePath();
  return s;
}
function arcShape(a0: number, a1: number, bev: number) {
  const hw = BAND / 2 - bev;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}

function dataTexture(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.flipY = false; // canvas row 0 = far edge of the plan (z0)
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  return t;
}

function planTextures() {
  const W = PLAN.w * PLAN.px;
  const H = PLAN.d * PLAN.px;
  const X = (x: number) => (x - PLAN.x0) * PLAN.px;
  const Z = (z: number) => (z - PLAN.z0) * PLAN.px;
  const mk = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.lineCap = "square";
    return { c, g };
  };
  const mono = (g: CanvasRenderingContext2D, px: number, weight = 500) => {
    g.font = `${weight} ${px}px "IBM Plex Mono", ui-monospace, monospace`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(px * 0.14)}px`;
    g.textBaseline = "top";
  };
  /* base plan: 1 px footprints of rooms, desks and systems, each named in mono */
  const base = mk();
  {
    const g = base.g;
    g.lineWidth = 2;
    for (const r of ROOMS) {
      g.strokeRect(X(r.x - r.w / 2), Z(r.z - r.d / 2), r.w * PLAN.px, r.d * PLAN.px);
      mono(g, 19);
      g.textAlign = "left";
      g.fillText(r.name, X(r.x - r.w / 2) + 0.12 * PLAN.px, Z(r.z - r.d / 2) + 0.1 * PLAN.px);
    }
    for (const s of SPOTS) {
      g.beginPath();
      if (s.round) g.arc(X(s.x), Z(s.z), (s.w / 2) * PLAN.px, 0, TAU);
      else g.rect(X(s.x - s.w / 2), Z(s.z - s.d / 2), s.w * PLAN.px, s.d * PLAN.px);
      g.stroke();
      mono(g, 15, 400);
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(s.name, X(s.x), Z(s.z));
    }
  }

  // the shader's second layer is unused here (nothing is revealed by a scan)
  const hidden = mk();
  hidden.c.width = hidden.c.height = 4;
  return { base: dataTexture(base.c), hidden: dataTexture(hidden.c) };
}

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  await fontsReady();

  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.localClippingEnabled = true;
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;

  // no lights: the chrome is lit by its studio alone (no broad fills)

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  // seen from above (≈ 62°), square on: the plan reads as a plan, the mark as the hero's
  const target = new THREE.Vector3(0.1, 0, -0.2);
  const cam = { az: 0, el: 1.08, dist: 21 };

  /* ---------- materials ---------- */
  // the mark: crisp chrome in its own strip-and-flag studio, a flat clear glass hub
  const markEnv = stripEnvironment(renderer);
  const chrome = (roughness: number) =>
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness, envMap: markEnv, envMapIntensity: 1 });
  // ExtrudeGeometry groups: 0 = the flat faces, 1 = the sides and bevels
  const chromeParts = [chrome(0.08), chrome(0.14)];
  const hubGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.02, transmission: 1, ior: 1.5, thickness: 0.05,
    envMap: markEnv, specularIntensity: 1,
  }); // prettier-ignore
  const inkCol = ink.clone();
  const maskCol = new THREE.Color().copy(bg).lerp(ink, dark ? 0.45 : 0.4);

  /* ---------- floor ---------- */
  const tex = planTextures();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uPlan: { value: tex.base },
    uHidden: { value: tex.hidden },
    uRect: { value: new THREE.Vector4(PLAN.x0, PLAN.z0, PLAN.w, PLAN.d) },
    // no scan line, no printed grid in this direction: those uniforms stay at 0
    uScanX: { value: -99 },
    uScan: { value: 0 },
    uHidX: { value: -99 },
    uHidAmt: { value: 0 },
    uScanDir: { value: new THREE.Vector2(0, 1) },
    uInkAmt: { value: dark ? 0.2 : 0.16 }, // footprints at ~15% ink
    uDotAmt: { value: 0 },
    uShadeMax: { value: dark ? 0.9 : 0.5 },
    uGridAmt: { value: 0 },
    uPool: { value: new THREE.Vector4(0.4, -0.4, 7.5, dark ? 0.045 : 0) },
    uScanLine: { value: 0 },
    uScanWash: { value: 0 },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    // centred between the office and the exit, so the checkpoint's shadow and the
    // lane out stay on the floor
    uFade: { value: new THREE.Vector4(0.0, -0.4, 6.2, 10.0) },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: floorVert,
      fragmentShader: `#define NC ${NC}\n` + floorFrag,
      toneMapped: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  let nCaster = 0;
  /** a soft contact shadow; ring = 1 makes it an annulus (hw = radius, hd = half-band) */
  const caster = (x: number, z: number, hw: number, hd: number, r: number, soft: number, k: number, ring = 0) => {
    if (nCaster >= NC) return;
    floorU.uCA.value[nCaster].set(x + 0.05, z + 0.07, hw, hd);
    floorU.uCB.value[nCaster].set(r, soft, k, ring);
    nCaster++;
  };
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  /* ---------- the plan's paths: 1 px ink lines on the floor ---------- */
  const segGeo = new THREE.BoxGeometry(1, 0.002, 0.012).translate(0.5, 0, 0);
  const inkMat = (opacity: number) =>
    new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const matPath = inkMat(dark ? 0.28 : 0.22);
  PATHS.forEach((p) =>
    p.slice(1).forEach((b, i) => {
      const a = p[i];
      const m = add(scene, segGeo, matPath, a[0], 0.004, a[1]);
      m.rotation.y = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      m.scale.x = Math.hypot(b[0] - a[0], b[1] - a[1]);
    }),
  );

  /* ---------- routes: arc length along a path; sHub = where it crosses the hub ---------- */
  type Route = { pts: P2[]; cum: number[]; ang: number[]; len: number; sHub: number };
  const route = (pts: P2[]): Route => {
    const cum = [0];
    const ang: number[] = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const [[ax, az], [bx, bz]] = [pts[j], pts[j + 1]];
      cum.push(cum[j] + Math.hypot(bx - ax, bz - az));
      ang.push(Math.atan2(-(bz - az), bx - ax));
    }
    return { pts, cum, ang, len: cum[cum.length - 1], sHub: cum[pts.indexOf(C)] };
  };
  /** [x, z, heading] at arc length s */
  const at = (r: Route, s: number): [number, number, number] => {
    let j = 0;
    while (j < r.ang.length - 1 && s > r.cum[j + 1]) j++;
    const k = clamp01((s - r.cum[j]) / (r.cum[j + 1] - r.cum[j]));
    return [lerp(r.pts[j][0], r.pts[j + 1][0], k), lerp(r.pts[j][1], r.pts[j + 1][1], k), r.ang[j]];
  };
  const R: Record<string, Route> = {};
  for (const k of Object.keys(ROUTES)) R[k] = route(ROUTES[k]);

  /* ---------- trips: every dash is a trip along a route at one constant speed ---------- */
  type Trip = { r: Route; t0: number; act?: number; halt?: number; maskAt?: number };
  const S = RING.s;
  const sRow = (r: Route) => r.sHub + ROW.d2;
  const foldEnd = (i: number) => ACTS[i].fold + 250;
  const trips: Trip[] = ACTS.map((a, i) => ({
    r: R[a.route],
    t0: a.at - sRow(R[a.route]) / V,
    act: i,
    maskAt: a.maskAt || undefined,
  }));
  // send_email: halts with its nose at node 232's edge, on the agent's lane
  const haltS = R.agent.sHub - S * (1 + NODE_R + BEVEL) - 0.03 - DASH.l / 2;
  trips.push({ r: R.agent, t0: BLOCK.halt - haltS / V, halt: haltS });
  for (const [k, hs] of AMBIENT) for (const h of hs) trips.push({ r: R[k], t0: h - R[k].sHub / V });

  /** how far act i's dash has unfolded into its row (0 dash … 1 row) */
  const unfold = (i: number, t: number) => smooth(seg(t, ACTS[i].at, ACTS[i].at + 250)) * (1 - smooth(seg(t, ACTS[i].fold, foldEnd(i))));
  /** how far act i's row text is in */
  const rowIn = (i: number, t: number) => smooth(seg(t, ACTS[i].at + 150, ACTS[i].at + 400)) * (1 - smooth(seg(t, ACTS[i].fold - 150, ACTS[i].fold + 100)));

  const MAXD = 32;
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAXD);
  dashes.frustumCulled = false;
  for (let i = 0; i < MAXD; i++) dashes.setColorAt(i, inkCol);
  dashes.count = 0;
  scene.add(dashes);
  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();
  const tmpC = new THREE.Color();
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const drawDashes = (t: number, live: number) => {
    let n = 0;
    for (const p of trips) {
      let s = (t - p.t0) * V;
      let len = 1;
      if (p.act !== undefined) {
        const a = ACTS[p.act];
        if (t > a.at) s = t < foldEnd(p.act) ? sRow(p.r) : sRow(p.r) + (t - foldEnd(p.act)) * V;
        len = 1 - unfold(p.act, t); // the dash collapses into its row, and grows back out of it
      }
      if (p.halt !== undefined) s = Math.min(s, p.halt);
      if (s <= 0 || s >= p.r.len || n >= MAXD) continue;
      let k = smooth(clamp01(s / 0.3)) * smooth(clamp01((p.r.len - s) / 0.6)) * live;
      if (p.halt !== undefined) k *= 1 - smooth(seg(t, BLOCK.drop, BLOCK.drop + 300));
      if (k * len < 0.01) continue;
      const m = p.maskAt !== undefined ? smooth(seg(t, p.maskAt, p.maskAt + 150)) : 0;
      const [x, z, ang] = at(p.r, s);
      tmpP.set(x, 0.013, z);
      tmpQ.setFromAxisAngle(Y_AXIS, ang);
      // a masked dash leaves shorter and grey
      tmpS.set(DASH.l * (1 - 0.45 * m) * k * len, DASH.h, DASH.w * k);
      dashes.setMatrixAt(n, tmpM.compose(tmpP, tmpQ, tmpS));
      dashes.setColorAt(n, tmpC.copy(inkCol).lerp(maskCol, m));
      n++;
    }
    dashes.count = n;
    dashes.instanceMatrix.needsUpdate = true;
    if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
  };

  /* ---------- rows: inside the ring, above the hub, a dash unfolds into its line ---------- */
  const ROW_W = 2.8;
  const ROW_H = 0.7;
  const ROW_Z = RING.z - (ROW.d1 + ROW.d2) / 2;
  const texs: THREE.Texture[] = [];
  const flatText = (w: number, h: number, draw: (g: CanvasRenderingContext2D, cw: number, ch: number) => void) => {
    const cw = 1024;
    const ch = Math.round((cw * h) / w);
    const c = Object.assign(document.createElement("canvas"), { width: cw, height: ch });
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    draw(g, cw, ch);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    texs.push(tx);
    const mat = new THREE.MeshBasicMaterial({ map: tx, color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.rotation.x = -Math.PI / 2; // flat on the floor, reading upright from the camera
    m.visible = false;
    scene.add(m);
    return { m, mat };
  };
  const rows = ROWS.map((lines) =>
    flatText(ROW_W, ROW_H, (g, cw, ch) => {
      const pxw = cw / ROW_W;
      g.font = `400 ${Math.round(ROW.em * pxw)}px "IBM Plex Mono", ui-monospace, monospace`;
      if (lines[0]) g.fillText(lines[0], cw / 2, ch / 2 - ((ROW.d1 - ROW.d2) / 2) * pxw);
      g.fillText(lines[1], cw / 2, ch / 2 + ((ROW.d1 - ROW.d2) / 2) * pxw);
    }),
  );
  rows.forEach((r) => r.m.position.set(RING.x, 0.006, ROW_Z));
  /** the long line's width, for the dash's unfolding */
  const rowWidth = (i: number) => ROWS[i][1].length * 0.6 * ROW.em;
  const bar = add(scene, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: ink, toneMapped: false }), RING.x, 0.013, RING.z - ROW.d2);
  bar.visible = false;
  const setRow = (i: number, k: number) => {
    rows[i].mat.opacity = clamp01(k);
    rows[i].m.visible = k > 0.002;
  };

  /* ---------- the checkpoint: the mark lying flat around the exit, one rigid group ---------- */
  const markRig = new THREE.Group(); // its turn ψ, about the hub
  markRig.position.set(RING.x, MARK_Y, RING.z);
  scene.add(markRig);
  const mark = new THREE.Group();
  mark.rotation.x = -Math.PI / 2; // top face up; the logo reads unmirrored from above
  mark.scale.setScalar(S);
  markRig.add(mark);
  NODE_A.forEach((a, i) => {
    const shp = arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP), BEVEL);
    mark.add(new THREE.Mesh(extrude(shp, DEPTH, 64), chromeParts));
    mark.add(new THREE.Mesh(extrude(barShape(a), DEPTH, 40), chromeParts));
    // nodes: solid discs, flush with the ring's top face
    const n = new THREE.Mesh(extrude(disc(NODE_R - BEVEL), DEPTH, 64), chromeParts);
    n.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0);
    mark.add(n);
  });
  // the hub: a flat clear glass disc inside a thin chrome bezel
  const BZ_BEV = 0.008;
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BZ_BEV, HUB_R - BEZEL_W + BZ_BEV), DEPTH, 96, BZ_BEV), chromeParts));
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BEZEL_W - 0.006), DEPTH * 0.6, 96, 0.004), hubGlass));
  // one 1 px ink silhouette, on the outer contour only
  const silMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.7 : 0.85, depthWrite: false, toneMapped: false });
  const ZT = DEPTH / 2 + BEVEL + 0.003;
  const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) =>
    Array.from({ length: n + 1 }, (_, k) => {
      const u = a0 + ((a1 - a0) * k) / n;
      return new THREE.Vector3(cx + Math.cos(u) * r, cy + Math.sin(u) * r, ZT);
    });
  const line = (pts: THREE.Vector3[]) => mark.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), silMat));
  NODE_A.forEach((a, i) => {
    const [a0, a1, hw] = [deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP), BAND / 2];
    line([
      ...arcPts(Math.cos(a0), Math.sin(a0), hw, a0 - Math.PI / 2, a0, 8),
      ...arcPts(0, 0, 1 + hw, a0, a1, 72),
      ...arcPts(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI / 2, 8),
    ]);
    line(arcPts(Math.cos(deg(a)), Math.sin(deg(a)), NODE_R, deg(a - 80), deg(a + 80), 32));
  });

  /* ---------- the hub's word: small mono caps printed inside the hub disc ---------- */
  const WORD_EM = 0.2;
  const words = WORDS.map(([w, a, b]) => {
    const x = flatText(1.5, 0.36, (g, cw, ch) => {
      const pxw = cw / 1.5;
      g.font = `500 ${Math.round(WORD_EM * pxw)}px "IBM Plex Mono", ui-monospace, monospace`;
      (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(WORD_EM * pxw * 0.12)}px`;
      g.fillText(w, cw / 2, ch / 2);
    });
    // on the glass's top face, inside the bezel
    x.m.position.set(RING.x, MARK_Y + (DEPTH * 0.3 + 0.004) * S + 0.003, RING.z);
    return { ...x, a, b };
  });

  /** the mark's turn at time t (deg): each move eases from where the last one left it */
  const psiAt = (t: number) => {
    let a = PSI_REST;
    for (const [t0, t1, to] of TURNS) a = lerp(a, to, inOutCubic(seg(t, t0, t1)));
    return a;
  };

  /* ---------- per-frame ---------- */
  let viewW = 1;
  let viewH = 1;
  let mode: HeroMode = "wide";

  function placeCamera(loopT: number) {
    const ph = (loopT / LOOP_MS) * Math.PI * 2;
    const az = cam.az + Math.sin(ph) * 0.03;
    const el = cam.el + Math.sin(ph + 1.2) * 0.012;
    camera.position.set(
      target.x + Math.sin(az) * Math.cos(el) * cam.dist,
      target.y + Math.sin(el) * cam.dist,
      target.z + Math.cos(az) * Math.cos(el) * cam.dist,
    );
    camera.lookAt(target);
  }

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    placeCamera(t);
    const reset = seg(t, RESET[0], RESET[1]);
    const alive = 1 - smooth(reset);

    const live = alive * smooth(seg(t, 0, 300)); // traffic already on the paths fades in at the wrap

    /* the checkpoint: one rigid group; it only turns (eased) to aim a node */
    const psi = psiAt(t);
    markRig.rotation.y = deg(psi);

    /* contact shadows: the mark's orbit, hub and nodes */
    nCaster = 0;
    const ks = dark ? 0.5 : 0.12;
    caster(RING.x, RING.z, S, (BAND / 2) * S, 0, 0.08, ks, 1);
    caster(RING.x, RING.z, HUB_R * S, HUB_R * S, HUB_R * S, 0.08, ks * 0.6);
    NODE_A.forEach((a) => {
      const [x, z] = markPt(a, psi, 1);
      caster(x, z, NODE_R * S, NODE_R * S, NODE_R * S, 0.07, ks);
    });
    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;

    /* traffic; an act's dash stretches into a bar across its row, and the bar
       thins away as the text comes in (and back, when it folds) */
    drawDashes(t, live);
    let barOn = false;
    ACTS.forEach((a, i) => {
      const u = unfold(i, t);
      if (u < 0.002 || barOn) return;
      barOn = true;
      bar.scale.set(lerp(DASH.w, rowWidth(a.row), u), DASH.h, DASH.w * (1 - rowIn(i, t)) * live + 0.0001);
    });
    bar.visible = barOn;
    const k = [0, 0, 0, 0];
    ACTS.forEach((a, i) => {
      const r = rowIn(i, t);
      const m = a.maskAt ? smooth(seg(t, a.maskAt, a.maskAt + 180)) : 0;
      k[a.row] = Math.max(k[a.row], r * (1 - m));
      if (a.maskAt) k[2] = Math.max(k[2], r * m); // "customers" → "[masked]"
    });
    // send_email's row: shown while it is held at the node
    k[3] = smooth(seg(t, BLOCK.rowIn, BLOCK.rowIn + 250)) * (1 - smooth(seg(t, BLOCK.drop, BLOCK.drop + 250)));
    k.forEach((v, i) => setRow(i, v * alive));

    /* the hub's word, inside its disc, one at a time */
    for (const w of words) {
      const v = smooth(seg(t, w.a, w.a + 150)) * (1 - smooth(seg(t, w.b - 120, w.b))) * alive;
      w.mat.opacity = v;
      w.m.visible = v > 0.002;
    }

    /* the page's chips: only the current act's, then all of them with LOGGED */
    const back = smooth(seg(t, LOGGED_AT, LOGGED_AT + 300));
    labelState.forEach((L, i) => {
      let a = back;
      for (const [c, t0, t1] of CHIPS) if (c === i) a = Math.max(a, smooth(seg(t, t0, t0 + 200)) * (1 - smooth(seg(t, t1 - 200, t1))));
      L.a = a * alive;
    });
    labelState[0].state = t >= LOGGED_AT ? 2 : 0;
    labelState[1].state = t >= LOGGED_AT ? 2 : t >= WORDS[2][1] ? 1 : 0;
    labelState[2].state = t >= LOGGED_AT ? 2 : t >= WORDS[3][1] ? 1 : 0;
  }

  const labelPos = CHIP_AT.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const labelState: HeroLabel[] = labelPos.map(() => ({ x: 0, y: 0, a: 0, state: 0 }));
  const proj = new THREE.Vector3();

  function resize(width: number, height: number, m: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    mode = m;
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    if (mode === "wide") {
      camera.fov = 22;
      cam.dist = 21.5;
      // lens shift (not a pan): the office sits right of the copy
      const dx = Math.round(viewW * 0.235);
      const dy = Math.round(viewH * 0.03);
      camera.aspect = (viewW + 2 * dx) / (viewH + 2 * dy);
      camera.setViewOffset(viewW + 2 * dx, viewH + 2 * dy, 0, 2 * dy, viewW, viewH);
    } else {
      camera.fov = 24;
      const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const hHalf = vHalf * camera.aspect;
      cam.dist = Math.max(2.9 / vHalf, 4.4 / hHalf);
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels() {
      labelPos.forEach((p, i) => {
        proj.copy(p).project(camera);
        labelState[i].x = ((proj.x + 1) / 2) * viewW;
        labelState[i].y = ((1 - proj.y) / 2) * viewH;
      });
      return labelState;
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      tex.base.dispose();
      tex.hidden.dispose();
      texs.forEach((x) => x.dispose());
      markEnv.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
