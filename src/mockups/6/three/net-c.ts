/* Mockup 6 · See / Secure / Govern, direction C: "the checkpoint", on the real office.
 *
 * The original tabletop office: a floor plan printed with zone brackets and a fine
 * grid; a clear glass server rack (agent:finance's tool calls typed on its glass),
 * a glass database, five glass desks (monitor, laptop, a chrome puck for the
 * person). A hairline only appears while data actually moves.
 *
 * The office has one way out. Past the plan's far edge the Blindsight mark stands
 * at the exit, raised 60° from the floor toward the viewer, its lower rim on the
 * floor, about a quarter of the scene wide: chrome bezel extrusion, solid nodes,
 * a clear glass hub in a thin chrome bezel, one 1 px outer silhouette. Every flow
 * that leaves runs as 2 px ink dashes (one calm, constant speed) up the lane, lifts
 * into the hub and passes THROUGH it. In the lens a dash opens into its mono row;
 * then the hub says one word. One act at a time; no violet (no injection here):
 *   SEE     m.keller → chatgpt.com (personal): FLAGGED; its track inks back to
 *           ws-sal-02 and the AI nobody registered prints up there. Then
 *           crm-assistant → export(customers): FLAGGED; ws-fin-02 prints.
 *   SECURE  the next export is masked in the lens ("[masked]") and leaves grey:
 *           MASKED. chatgpt.com's next send stops in the lens: BLOCKED.
 *   GOVERN  the checkpoint stays; flows pass clean; the hub reads LOGGED.
 * Chips: only after their event, one at a time, never on the mark.
 */
import { THREE, RoundedBoxGeometry, createRenderer, type Theme } from "./core";

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
 *  (0 flagged · 1 masked/blocked · 2 logged). Order: rack agent, crm-assistant, chatgpt.com. */
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

/* ---------- the mark, in its own units (orbit radius 1): one spec for every build ---------- */
const [HUB_R, NODE_R, BAND, ARM_W] = [0.5, 0.25, 0.2, 0.17];
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const DEPTH = 0.25 * BAND; // a watch bezel, not a slab
const BEVEL = 0.08 * BAND;
const BEZEL_W = 0.045; // the hub's thin chrome bezel

/* ---------- the checkpoint: at the exit past the plan's far edge, raised 60° from the
   floor toward the camera so its hub faces the viewer; its lower rim rests on the floor ---------- */
const RING = { x: 1.18, z: -4.2, s: 1.05, tilt: 60 }; // s = orbit radius (world)
const HUB_Y = (1 + BAND / 2 + BEVEL) * RING.s * Math.sin(deg(RING.tilt)) + 0.015;
const OUT_Z = -6.4; // the lane leaves the building here
/** where the lane lifts off the floor into the hub, and lands again behind the ring */
const RAMP_IN = -2.95;
const RAMP_OUT = -5.45;

/* ---------- traffic: 2 px ink dashes at one calm, constant speed (world units per ms) ---------- */
const V = 0.0011;
const DASH = { l: 0.18, w: 0.03, h: 0.014 };
/** the acts, one at a time: a dash reaches the hub at `at` and unfolds in the lens
 *  into its row; the row folds away as the hub's word (WORDS[word]) comes in; the
 *  dash leaves at `leave`, or is dropped in the lens. `mask` = when the row's data
 *  is masked (and the dash leaves grey). */
const ACTS = [
  { route: "gpt", at: 600, row: 0, word: 0, leave: 1700, mask: 0, drop: false, open: true },
  { route: "crm", at: 1900, row: 1, word: 1, leave: 3000, mask: 0, drop: false, open: true },
  { route: "crm", at: 3250, row: 1, word: 2, leave: 4150, mask: 3550, drop: false, open: true },
  // chatgpt.com's second send: already read in See; it stops in the lens, dropped
  { route: "gpt", at: 4700, row: 0, word: 3, leave: 0, mask: 0, drop: true, open: false },
] as const;
/** each row wraps to fit inside the hub's bezel, clear of the spokes and nodes */
const ROWS: string[][] = [
  ["m.keller →", "chatgpt.com", "(personal)"],
  ["crm-assistant", "→ export", "(customers)"],
  ["crm-assistant", "→ export", "([masked])"],
];
/** the hub's words: each holds until the next row opens or the next word lands,
 *  so a held beat always shows its verdict: [word, in, out] */
const WORDS: [string, number, number][] = [
  ["FLAGGED", 1500, 1900],
  ["FLAGGED", 2800, 3250],
  ["MASKED", 3950, 4750],
  ["BLOCKED", 4750, 5500],
  ["LOGGED", 5500, 1e9],
];
const LOGGED_AT = 5500;
/** once flagged, a flow's track inks back to its desk and the AI prints up there:
 *  [trace start, trace end, print start, print end]; index = FLAGGED order */
const TRACE: [number, number, number, number][] = [
  [2850, 3250, 3150, 3500], // crm-assistant
  [1550, 1950, 1850, 2200], // chatgpt.com
];
/** chips, only after their event and one at a time, anchored at the desks' people
 *  (never on the mark): [label index, in, out] */
const CHIPS: [number, number, number][] = [
  [2, 2200, 3500],
  [1, 3500, 4750],
  [2, 4750, 5600],
  [1, 5600, 6600],
  [2, 6600, 8000],
  [0, 8000, 9700],
];
/** chips switch quickly and are otherwise fully on or fully off (no ghosts) */
const CHIP_FADE = 120;
/** ordinary traffic in Govern: [route, times each dash crosses the hub] */
const AMBIENT: [string, number[]][] = [
  ["sal01", [5700, 7900]],
  ["crm", [6300, 8500]], // crm-assistant still sends; the hub masks it as it crosses
  ["sal03", [6900, 9100]],
];
/** agent:finance's tool calls, typed onto the rack's glass: [line, at] */
const RACK_LINES: [string, number][] = [
  ["› erp.read", 350],
  ["  inv_0412", 650],
  ["› ledger", 1250],
  ["  18,240.00", 1550],
  ["› notify", 2400],
  ["  m.keller", 2700],
];
const RESET: [number, number] = [9700, 10400];

/* ------------------------------------------------------------------ */
/* floor plan (world units; the floor is y = 0)                        */
/* ------------------------------------------------------------------ */
const PLAN = { x0: -8, z0: -6, w: 16, d: 12, px: 128 };
const ZONES: { name: string; x0: number; x1: number; z0: number; z1: number }[] = [
  { name: "SERVER ROOM", x0: -3.75, x1: -0.7, z0: -3.2, z1: -0.45 },
  { name: "FINANCE", x0: -0.3, x1: 3.0, z0: -3.2, z1: -0.45 },
  { name: "SALES", x0: -1.45, x1: 4.05, z0: 0.35, z1: 2.4 },
];
const RACK = { x: -2.55, z: -2.15, name: "rack-01", agent: "agent:finance" };
const DB = { x: -1.2, z: -1.3, name: "crm-db" };
const DESKS = [
  { id: "ws-fin-01", x: 0.4, z: -2.45 },
  { id: "ws-fin-02", x: 1.95, z: -1.25 },
  { id: "ws-sal-01", x: -0.55, z: 1.5 },
  { id: "ws-sal-02", x: 1.4, z: 1.2 },
  { id: "ws-sal-03", x: 3.35, z: 0.95 },
];
/** the two AIs nobody registered, by desk index */
const FLAGGED = [
  { desk: 1, label: "crm-assistant" },
  { desk: 3, label: "chatgpt.com" },
];
/** desk footprint */
const DESK = { w: 1.24, d: 0.68, top: 0.5 };
/** the ways out, as [x, y, z]: every route ends up the lane (x = RING.x), lifts off
 *  the floor into the hub, passes THROUGH it, lands behind the ring and leaves the
 *  plan. chatgpt.com leaves from behind ws-sal-02; crm-assistant pulls from crm-db
 *  past ws-fin-02; the sales corridor joins the lane behind ws-sal-02. */
type P3 = [number, number, number];
const FY = 0.014; // dashes ride just above the floor
const HUB: P3 = [RING.x, HUB_Y, RING.z];
const EXIT_LEG: P3[] = [[RING.x, FY, RAMP_IN], HUB, [RING.x, FY, RAMP_OUT], [RING.x, FY, OUT_Z]];
const fl = (x: number, z: number): P3 => [x, FY, z];
const ROUTES: Record<string, P3[]> = {
  gpt: [fl(RING.x, 0.8), ...EXIT_LEG],
  crm: [fl(DB.x + 0.48, -1.28), fl(RING.x, -1.28), ...EXIT_LEG],
  sal01: [fl(-0.55, 1.1), fl(-0.55, 0.3), fl(RING.x, 0.3), ...EXIT_LEG],
  sal03: [fl(3.35, 0.55), fl(3.35, 0.3), fl(RING.x, 0.3), ...EXIT_LEG],
};

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

/** The mark's own studio, calm: a dark grey room, a few soft strips, nothing broad.
 *  The camera sits at az ≈ 38°, el ≈ 33°, so the mark's flat tops mirror the sky
 *  behind it (az ≈ 218°) at ≈ 30–38°: one soft strip there lays one quiet band
 *  across the chrome; low strips toward the camera and the sides catch the bevels. */
function stripEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.28, 0.28, 0.29);
  const strip = (w: number, h: number, azDeg: number, elDeg: number, v: number, dist = 14) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    const [az, el] = [deg(azDeg), deg(elDeg)];
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // the mark faces the camera (az ≈ 38°), so its flats mirror the room behind the
  // camera at ≈ 15–40° elevation. One broad soft-box fills that whole window, so
  // every arc, spoke and node reads as the same bright chrome all the way round;
  // two thin black flags across it give the crisp bands; small strips catch bevels.
  strip(16, 9, 38, 27, 1.5);
  strip(16, 0.28, 38, 23, 0.02, 13.9);
  strip(16, 0.18, 38, 32, 0.02, 13.9);
  strip(1.1, 16, 108, 16, 2);
  strip(1.1, 16, -32, 16, 2);
  strip(10, 3, 38, 72, 1.1);
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

    // what the scan has already passed over
    float behind = smoothstep(uHidX + 0.02, uHidX - 0.4, p.x) * uHidAmt;

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

    float sd = p.x - uScanX;
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
  const brackets = (g: CanvasRenderingContext2D, x0: number, x1: number, z0: number, z1: number, L: number) => {
    g.beginPath();
    g.moveTo(x0, z0 + L);
    g.lineTo(x0, z0);
    g.lineTo(x0 + L, z0);
    g.moveTo(x1 - L, z0);
    g.lineTo(x1, z0);
    g.lineTo(x1, z0 + L);
    g.moveTo(x1, z1 - L);
    g.lineTo(x1, z1);
    g.lineTo(x1 - L, z1);
    g.moveTo(x0 + L, z1);
    g.lineTo(x0, z1);
    g.lineTo(x0, z1 - L);
    g.stroke();
  };

  /* base plan: what the company already knows about */
  const base = mk();
  {
    const g = base.g;
    g.globalAlpha = 0.55;
    g.lineWidth = 2;
    for (let x = -7; x <= 7; x++)
      for (let z = -5; z <= 5; z++) {
        const cx = X(x);
        const cz = Z(z);
        g.beginPath();
        g.moveTo(cx - 7, cz);
        g.lineTo(cx + 7, cz);
        g.moveTo(cx, cz - 7);
        g.lineTo(cx, cz + 7);
        g.stroke();
      }
    g.globalAlpha = 1;
    g.lineWidth = 3;
    for (const zn of ZONES) {
      brackets(g, X(zn.x0), X(zn.x1), Z(zn.z0), Z(zn.z1), 0.34 * PLAN.px);
      mono(g, 22);
      g.fillText(zn.name, X(zn.x0) + 0.16 * PLAN.px, Z(zn.z0) + 0.14 * PLAN.px);
    }
    // asset names, printed in front of each object
    mono(g, 17, 400);
    for (const d of DESKS) g.fillText(d.id, X(d.x - DESK.w / 2), Z(d.z + DESK.d / 2 + 0.52));
    g.fillText(RACK.name, X(RACK.x - 0.39), Z(RACK.z + 0.5));
    g.fillText(DB.name, X(DB.x - 0.42), Z(DB.z + 0.58));
  }

  // the shader's second (scan-revealed) layer is unused here: nothing is scanned
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

  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 0.8);
  key.position.set(-3, 8, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const target = new THREE.Vector3(0.45, 0.4, -0.4);
  const cam = { az: 0.66, el: 0.58, dist: 21 };

  /* ---------- materials ---------- */
  const glass = (extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 1.0,
      ior: 1.5,
      attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"),
      attenuationDistance: 40,
      specularIntensity: 1,
      envMapIntensity: 1,
      ...extra,
    });
  // thin optical thickness everywhere: what sits inside stays legible
  const matCabinet = glass({ thickness: 0.12 });
  const matSheet = glass({ thickness: 0.08 });
  const matDisc = glass({ thickness: 0.12 });
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#e6e8ec" : "#f3f4f6"),
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1,
  });
  // satin metal-grey for furniture and hardware (lighter on white: a mid-grey
  // metal mirroring the grey studio prints as near-black)
  const matSatin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#8a8c92" : "#cfd1d6"),
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1,
  });
  const clipPlanes = FLAGGED.map(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
  const matGun = FLAGGED.map(
    (_, i) =>
      new THREE.MeshPhysicalMaterial({
        // raw, unpolished: the registered core is mirror chrome, this is not
        color: new THREE.Color(dark ? "#85878C" : "#A3A6AD"),
        metalness: 1,
        roughness: 0.42,
        clippingPlanes: [clipPlanes[i]],
        side: THREE.DoubleSide,
      }),
  );
  // monitors: graphite glass in light mode, so every desk has one dark anchor
  // on the white page (all-clear glass read as fog)
  const matScreen = dark ? matSheet : glass({ thickness: 0.2, attenuationColor: new THREE.Color("#3a3b40"), attenuationDistance: 0.14 });
  const textGrey = new THREE.Color(dark ? "#6f727b" : "#b4b7bd");
  const matScreenInk = new THREE.MeshBasicMaterial({ color: textGrey, toneMapped: false });
  const matScreenText = new THREE.MeshBasicMaterial({ color: new THREE.Color(dark ? "#6f727b" : "#c9ccd2"), toneMapped: false });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF"); // crm-assistant's flow only
  const inkCol = ink.clone();
  const maskCol = new THREE.Color().copy(bg).lerp(ink, dark ? 0.45 : 0.4);
  const matWire = FLAGGED.map(
    () => new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false }),
  );
  // the mark: crisp but calm chrome in its own studio (flats 0.08, bevels 0.14), and
  // a flat clear glass hub. ExtrudeGeometry groups: 0 = the flat faces, 1 = sides/bevels
  const markEnv = stripEnvironment(renderer);
  const markChrome = (roughness: number) =>
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness, envMap: markEnv, envMapIntensity: 1 });
  const chromeParts = [markChrome(0.08), markChrome(0.14)];
  const hubGlass = glass({ roughness: 0.02, thickness: 0.05, envMap: markEnv });

  /* ---------- floor ---------- */
  const tex = planTextures();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uPlan: { value: tex.base },
    uHidden: { value: tex.hidden },
    uRect: { value: new THREE.Vector4(PLAN.x0, PLAN.z0, PLAN.w, PLAN.d) },
    uScanX: { value: -99 },
    uScan: { value: 0 },
    uHidX: { value: -99 },
    uHidAmt: { value: 1 },
    uInkAmt: { value: dark ? 0.22 : 0.17 },
    uDotAmt: { value: dark ? 0.16 : 0.13 },
    uShadeMax: { value: dark ? 0.9 : 0.5 },
    uGridAmt: { value: dark ? 0.04 : 0.1 },
    uPool: { value: new THREE.Vector4(0.4, -0.4, 7.5, dark ? 0.045 : 0) },
    uScanLine: { value: dark ? 0.6 : 0.32 },
    uScanWash: { value: dark ? 0.05 : 0.0 },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    // widened a little toward the exit, so the checkpoint and its shadow stay on the floor
    uFade: { value: new THREE.Vector4(0.3, -0.9, 5.2, 9.0) },
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

  /* ---------- people: low machined chrome pucks, one per desk ---------- */
  const puckProfile: THREE.Vector2[] = [];
  {
    const R = 0.2;
    const H = 0.09;
    const b = 0.03;
    puckProfile.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      puckProfile.push(new THREE.Vector2(R - b + Math.cos(a) * b, b + Math.sin(a) * b));
    }
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      puckProfile.push(new THREE.Vector2(R - b + Math.cos(a) * b, H - b + Math.sin(a) * b));
    }
    puckProfile.push(new THREE.Vector2(0, H));
  }
  const people = new THREE.InstancedMesh(new THREE.LatheGeometry(puckProfile, 64), matChrome, DESKS.length);
  {
    const m = new THREE.Matrix4();
    DESKS.forEach((d, i) => {
      m.makeTranslation(d.x + 0.12, 0, d.z + DESK.d / 2 + 0.3);
      people.setMatrixAt(i, m);
    });
    people.instanceMatrix.needsUpdate = true;
  }
  scene.add(people);

  /* ---------- desks: glass top on two satin panel legs, a glass monitor, a
     satin laptop. One set of geometry, repeated. ---------- */
  const topGeo = new RoundedBoxGeometry(DESK.w, 0.045, DESK.d, 2, 0.02);
  const legGeo = new RoundedBoxGeometry(0.03, DESK.top, DESK.d - 0.08, 2, 0.012);
  const monGeo = new RoundedBoxGeometry(0.66, 0.4, 0.024, 2, 0.01);
  const neckGeo = new RoundedBoxGeometry(0.035, 0.12, 0.03, 2, 0.01);
  const footGeo = new RoundedBoxGeometry(0.2, 0.014, 0.12, 2, 0.006);
  const lapGeo = new RoundedBoxGeometry(0.38, 0.016, 0.14, 2, 0.007);
  const barGeo = new THREE.PlaneGeometry(1, 1);
  const TOP = DESK.top + 0.0225;
  DESKS.forEach((d) => {
    const g = new THREE.Group();
    g.position.set(d.x, 0, d.z);
    add(g, topGeo, matSheet, 0, DESK.top, 0);
    // glass panel legs: satin slabs printed as dark grey blocks on the white page
    add(g, legGeo, matSheet, -DESK.w / 2 + 0.06, DESK.top / 2, 0);
    add(g, legGeo, matSheet, DESK.w / 2 - 0.06, DESK.top / 2, 0);
    const mz = -DESK.d / 2 + 0.13;
    add(g, footGeo, matChrome, 0, TOP + 0.007, mz);
    add(g, neckGeo, matChrome, 0, TOP + 0.07, mz - 0.01);
    add(g, monGeo, matScreen, 0, TOP + 0.12 + 0.2, mz);
    // a few printed lines on the screen: it is a workstation, not a pane of glass
    [
      [-0.2, 0.1, 0.26, 0.022],
      [-0.2, 0.04, 0.4, 0.012],
      [-0.2, 0.0, 0.34, 0.012],
      [-0.2, -0.04, 0.38, 0.012],
    ].forEach(([x, y, w, h]) => {
      const bar = add(g, barGeo, matScreenText, x + w / 2, TOP + 0.32 + y, mz + 0.0135);
      bar.scale.set(w, h, 1);
    });
    add(g, lapGeo, matSatin, -0.12, TOP + 0.008, 0.1);
    scene.add(g);
  });

  /* ---------- the server rack: a clear glass cabinet of satin blades; the
     registered agent works in the open slot (its tool calls on the glass) ---------- */
  const rack = new THREE.Group();
  rack.position.set(RACK.x, 0, RACK.z);
  add(rack, new RoundedBoxGeometry(0.78, 1.6, 0.66, 4, 0.05), matCabinet, 0, 0.8, 0);
  // glass blades with a thin chrome bezel: solid satin blades stacked into a
  // dark grey tower
  const bladeGeo = new RoundedBoxGeometry(0.64, 0.07, 0.52, 2, 0.02);
  const bezelGeo = new RoundedBoxGeometry(0.62, 0.024, 0.012, 2, 0.005);
  const ledGeo = new THREE.PlaneGeometry(0.1, 0.01);
  [0.16, 0.31, 0.46, 1.14, 1.29, 1.44].forEach((y) => {
    add(rack, bladeGeo, matSheet, 0, y, 0);
    add(rack, bezelGeo, matChrome, 0, y, 0.262);
    add(rack, ledGeo, matScreenInk, 0.2, y + 0.024, 0.2645);
  });
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    const hx = Math.cos(ang) * 0.17;
    const hy = Math.sin(ang) * 0.17;
    if (i === 0) hexShape.moveTo(hx, hy);
    else hexShape.lineTo(hx, hy);
  }
  hexShape.closePath();
  // in the open slot, on the front glass: agent:finance's tool calls, typed as it works
  const texs: THREE.Texture[] = [];
  const rackLines = RACK_LINES.map(([s], i) => {
    const c = Object.assign(document.createElement("canvas"), { width: 512, height: 64 });
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.font = `500 44px "IBM Plex Mono", ui-monospace, monospace`;
    g.textBaseline = "middle";
    g.fillText(s, 8, 34);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    texs.push(tx);
    const mat = new THREE.MeshBasicMaterial({ map: tx, color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const m = add(rack, new THREE.PlaneGeometry(0.64, 0.08), mat, 0, 1.04 - i * 0.088, 0.334);
    m.visible = false;
    return { m, mat };
  });
  scene.add(rack);

  /* ---------- the database: three glass discs on satin spacers ---------- */
  const discProfile: THREE.Vector2[] = [];
  {
    const R = 0.42;
    const H = 0.15;
    const b = 0.035;
    discProfile.push(new THREE.Vector2(0, 0));
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2);
      discProfile.push(new THREE.Vector2(R - b + Math.cos(a) * b, b + Math.sin(a) * b));
    }
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2);
      discProfile.push(new THREE.Vector2(R - b + Math.cos(a) * b, H - b + Math.sin(a) * b));
    }
    discProfile.push(new THREE.Vector2(0, H));
  }
  const discGeo = new THREE.LatheGeometry(discProfile, 72);
  const spacerGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.03, 48);
  const db = new THREE.Group();
  db.position.set(DB.x, 0, DB.z);
  for (let i = 0; i < 3; i++) {
    add(db, discGeo, matDisc, 0, i * 0.19, 0);
    if (i < 2) add(db, spacerGeo, matChrome, 0, i * 0.19 + 0.17, 0);
  }
  scene.add(db);

  /* ---------- the AIs nobody registered: the same hex as the rack's agent, in
     raw unpolished metal ("the same kind of thing, but nobody registered it"),
     standing on the desk and printing up out of it, wireframe first ---------- */
  const aiGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.026,
    bevelSegments: 3,
    curveSegments: 1,
  });
  aiGeo.center();
  aiGeo.scale(1.25, 1.25, 1.25);
  aiGeo.computeVertexNormals();
  const aiWireGeo = new THREE.EdgesGeometry(aiGeo, 30);
  const aiH = 0.25 * 1.25 + 0.03; // hex height + bevel
  const ais = FLAGGED.map((f, i) => {
    const d = DESKS[f.desk];
    const x = d.x + 0.36;
    const z = d.z + 0.1;
    const body = new THREE.Mesh(aiGeo, matGun[i]);
    body.position.set(x, TOP + 0.03 + aiH / 2, z);
    body.rotation.y = cam.az - 0.25;
    const wire = new THREE.LineSegments(aiWireGeo, matWire[i]);
    wire.position.copy(body.position);
    wire.rotation.y = body.rotation.y;
    // a small satin foot, so it stands rather than floats
    const foot = add(scene, new RoundedBoxGeometry(0.2, 0.03, 0.12, 2, 0.01), matSatin, x, TOP + 0.015, z);
    foot.rotation.y = body.rotation.y;
    scene.add(body, wire);
    return { body, wire, foot, x, z };
  });

  /* ---------- routes: arc length along a 3D path; a hairline track per route (only
     while data moves) and an ink trace over it once the hub has flagged the flow ---------- */
  const trackGeo = new THREE.BoxGeometry(1, 0.002, 0.014).translate(0.5, 0, 0);
  const inkMat = () => new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const UP = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  // +x along the segment, its width kept level (the ramp's line doesn't twist)
  const alongQ = (d: THREE.Vector3) => {
    const z = d.clone().cross(UP).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(basis.makeBasis(d, z.clone().cross(d), z));
  };
  type Route = { pts: THREE.Vector3[]; cum: number[]; qs: THREE.Quaternion[]; len: number; sHub: number; segs: THREE.Mesh[]; mat: THREE.MeshBasicMaterial };
  const segMeshes = (r: { pts: THREE.Vector3[]; qs: THREE.Quaternion[] }, mat: THREE.Material, lift: number) =>
    r.qs.map((q, j) => {
      const m = new THREE.Mesh(trackGeo, mat);
      m.position.copy(r.pts[j]).setY(r.pts[j].y <= FY ? lift : r.pts[j].y);
      m.quaternion.copy(q);
      m.scale.x = r.pts[j].distanceTo(r.pts[j + 1]);
      m.visible = false;
      scene.add(m);
      return m;
    });
  const route = (raw: P3[]): Route => {
    const pts = raw.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const cum = [0];
    const qs: THREE.Quaternion[] = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const d = pts[j + 1].clone().sub(pts[j]);
      cum.push(cum[j] + d.length());
      qs.push(alongQ(d.normalize()));
    }
    const mat = inkMat();
    const base = { pts, qs };
    return { pts, cum, qs, len: cum[cum.length - 1], sHub: cum[raw.indexOf(HUB)], segs: segMeshes(base, mat, 0.004), mat };
  };
  /** the point at arc length s (into out); returns the segment index */
  const at = (r: Route, s: number, out: THREE.Vector3) => {
    let j = 0;
    while (j < r.qs.length - 1 && s > r.cum[j + 1]) j++;
    out.lerpVectors(r.pts[j], r.pts[j + 1], clamp01((s - r.cum[j]) / (r.cum[j + 1] - r.cum[j])));
    return j;
  };
  const R: Record<string, Route> = {};
  for (const k of Object.keys(ROUTES)) R[k] = route(ROUTES[k]);

  /* ---------- trips: every dash is a trip at one constant speed ---------- */
  type Trip = { r: Route; t0: number; act?: number; mask?: number; end: number };
  const S = RING.s;
  const wordIn = (i: number) => WORDS[ACTS[i].word][1];
  /** act i's dash, unfolded into its row in the lens (0 … 1) */
  const unfold = (i: number, t: number) =>
    ACTS[i].open ? smooth(seg(t, ACTS[i].at, ACTS[i].at + 250)) * (1 - smooth(seg(t, wordIn(i) - 250, wordIn(i)))) : 0;
  /** act i's row text */
  const rowIn = (i: number, t: number) =>
    // full ink the whole time it is being judged; it only fades as the verdict lands
    ACTS[i].open ? smooth(seg(t, ACTS[i].at + 150, ACTS[i].at + 280)) * (1 - smooth(seg(t, wordIn(i) - 60, wordIn(i) + 60))) : 0;
  const trips: Trip[] = ACTS.map((a, i) => {
    const r = R[a.route];
    const t0 = a.at - r.sHub / V;
    const end = a.drop ? wordIn(i) + 400 : a.leave + (r.len - r.sHub) / V;
    return { r, t0, act: i, mask: a.mask || undefined, end };
  });
  for (const [k, hs] of AMBIENT)
    for (const h of hs) {
      const r = R[k];
      trips.push({ r, t0: h - r.sHub / V, mask: k === "crm" ? h : undefined, end: h + (r.len - r.sHub) / V });
    }

  const MAXD = 24;
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), MAXD);
  dashes.frustumCulled = false;
  for (let i = 0; i < MAXD; i++) dashes.setColorAt(i, inkCol);
  dashes.count = 0;
  scene.add(dashes);
  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const tmpC = new THREE.Color();
  const drawTraffic = (t: number, live: number) => {
    let n = 0;
    const amt = new Map<Route, number>();
    for (const p of trips) {
      const r = p.r;
      const on = smooth(seg(t, p.t0 - 250, p.t0)) * (1 - smooth(seg(t, p.end, p.end + 400)));
      amt.set(r, Math.max(amt.get(r) ?? 0, on));
      let s = (t - p.t0) * V;
      let k = 1;
      if (p.act !== undefined) {
        const a = ACTS[p.act];
        if (t > a.at) s = a.drop || t < a.leave ? r.sHub : r.sHub + (t - a.leave) * V;
        k *= 1 - unfold(p.act, t); // the dash opens into its row, and closes back out of it
        if (a.drop) k *= 1 - smooth(seg(t, wordIn(p.act) + 100, wordIn(p.act) + 400)); // dropped in the lens
      }
      if (s <= 0 || s >= r.len || n >= MAXD) continue;
      k *= smooth(clamp01(s / 0.3)) * smooth(clamp01((r.len - s) / 0.6)) * live;
      if (k < 0.01) continue;
      const m = p.mask !== undefined ? smooth(seg(t, p.mask, p.mask + 150)) : 0;
      const j = at(r, s, tmpP);
      // masked data leaves shorter and grey
      tmpS.set(DASH.l * (1 - 0.4 * m) * k, DASH.h, DASH.w * Math.max(k, 0.5));
      dashes.setMatrixAt(n, tmpM.compose(tmpP, r.qs[j], tmpS));
      dashes.setColorAt(n, tmpC.copy(inkCol).lerp(maskCol, m));
      n++;
    }
    dashes.count = n;
    dashes.instanceMatrix.needsUpdate = true;
    if (dashes.instanceColor) dashes.instanceColor.needsUpdate = true;
    for (const r of Object.values(R)) {
      const a = (amt.get(r) ?? 0) * live;
      r.mat.opacity = a * (dark ? 0.35 : 0.28);
      r.segs.forEach((m) => (m.visible = a > 0.002));
    }
  };

  // the flagged flows' traces (FLAGGED order: crm-assistant, chatgpt.com)
  const matTrace = inkMat();
  const traces = [R.crm, R.gpt].map((r, i) => ({ r, tm: TRACE[i], segs: segMeshes(r, matTrace, 0.005) }));
  const drawTraces = (t: number) => {
    for (const tr of traces) {
      const from = tr.r.sHub;
      const back = from * (1 - inOutCubic(seg(t, tr.tm[0], tr.tm[1])));
      tr.segs.forEach((m, j) => {
        const a0 = Math.max(tr.r.cum[j], back);
        const a1 = Math.min(tr.r.cum[j + 1], from);
        m.visible = t >= tr.tm[0] && a1 - a0 > 0.001;
        if (!m.visible) return;
        at(tr.r, a0 + 1e-4, tmpP);
        m.position.copy(tmpP).setY(tmpP.y <= FY + 1e-4 ? 0.005 : tmpP.y);
        m.scale.x = a1 - a0;
      });
    }
  };
  /* ---------- the checkpoint: one rigid group at the exit, raised 60° from the floor
     toward the camera, its lower rim on the floor. Chrome orbit, spokes and solid
     nodes; a clear glass hub in a thin chrome bezel; one 1 px outer silhouette. ---------- */
  const markRig = new THREE.Group();
  markRig.position.set(...HUB);
  markRig.rotation.order = "YXZ";
  markRig.rotation.set(-deg(90 - RING.tilt), cam.az, 0); // face the camera, lean back 30°
  scene.add(markRig);
  const mark = new THREE.Group();
  mark.scale.setScalar(S);
  markRig.add(mark);
  NODE_A.forEach((a, i) => {
    const shp = arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP), BEVEL);
    mark.add(new THREE.Mesh(extrude(shp, DEPTH, 64), chromeParts));
    mark.add(new THREE.Mesh(extrude(barShape(a), DEPTH, 40), chromeParts));
    const n = new THREE.Mesh(extrude(disc(NODE_R - BEVEL), DEPTH, 64), chromeParts);
    n.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0);
    mark.add(n);
  });
  const BZ_BEV = 0.008;
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BZ_BEV, HUB_R - BEZEL_W + BZ_BEV), DEPTH, 96, BZ_BEV), chromeParts));
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BEZEL_W - 0.006), DEPTH * 0.6, 96, 0.004), hubGlass));
  const ZT = DEPTH / 2 + BEVEL + 0.003; // just in front of the faces
  // the glass's one cue: a faint diagonal specular strip
  const spec = new THREE.Mesh(
    new THREE.PlaneGeometry((HUB_R - BEZEL_W) * 1.5, 0.05),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.04, depthWrite: false, toneMapped: false }),
  );
  spec.position.set(-0.06, 0.1, ZT);
  spec.rotation.z = deg(35);
  mark.add(spec);
  const silMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.7 : 0.85, depthWrite: false, toneMapped: false });
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

  /* ---------- the lens: text in the mark's own plane (it faces the viewer), drawn
     over the chrome. A dash crossing the hub opens into its row, magnified on a
     strip of page colour; then the hub says one word. ---------- */
  const lensText = (w: number, h: number, draw: (g: CanvasRenderingContext2D, pxw: number, cw: number, ch: number) => void, order: number) => {
    const cw = 1024;
    const ch = Math.round((cw * h) / w);
    const c = Object.assign(document.createElement("canvas"), { width: cw, height: ch });
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    draw(g, cw / w, cw, ch);
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 8;
    texs.push(tx);
    const mat = new THREE.MeshBasicMaterial({ map: tx, color: ink, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.z = ZT * S + 0.01;
    m.renderOrder = order;
    m.visible = false;
    markRig.add(m);
    return { m, mat };
  };
  const ROW_EM = 0.14; // world: ≈ 11 px, three short lines that fit inside the hub
  const ROW_LH = ROW_EM * 1.22;
  const ROW_W = 1.4;
  const ROW_H = 3 * ROW_LH + 0.1;
  const rows = ROWS.map((lines) =>
    lensText(ROW_W, ROW_H, (g, pxw, cw, ch) => {
      g.font = `400 ${Math.round(ROW_EM * pxw)}px "IBM Plex Mono", ui-monospace, monospace`;
      lines.forEach((l, i) => g.fillText(l, cw / 2, ch / 2 + (i - 1) * ROW_LH * pxw));
    }, 12),
  );
  const rowWidth = (i: number) => Math.max(...ROWS[i].map((l) => l.length)) * 0.6 * ROW_EM + 0.1;
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(1, ROW_H),
    new THREE.MeshBasicMaterial({ color: bg, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false }),
  );
  strip.position.z = ZT * S + 0.008;
  strip.renderOrder = 11;
  markRig.add(strip);
  const WORD_EM = 0.185; // world: ≈ 14–15 px
  const words = WORDS.map(([w, a, b]) => ({
    ...lensText(1.4, 0.3, (g, pxw, cw, ch) => {
      g.font = `500 ${Math.round(WORD_EM * pxw)}px "IBM Plex Mono", ui-monospace, monospace`;
      (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(WORD_EM * pxw * 0.08)}px`;
      g.fillText(w, cw / 2, ch / 2);
    }, 13),
    a,
    b,
  }));

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

    const live = alive * smooth(seg(t, 0, 300)); // traffic already on its way fades in at the wrap

    /* contact shadows: the office, and the checkpoint (a soft footprint under the
       raised ring, and a firm touch where its rim meets the floor) */
    nCaster = 0;
    for (const d of DESKS) {
      caster(d.x, d.z, DESK.w / 2, DESK.d / 2, 0.03, 0.34, dark ? 0.4 : 0.1);
      caster(d.x + 0.12, d.z + DESK.d / 2 + 0.3, 0.2, 0.2, 0.2, 0.12, dark ? 0.65 : 0.22);
    }
    caster(RACK.x, RACK.z, 0.39, 0.33, 0.05, 0.3, dark ? 0.6 : 0.16);
    caster(DB.x, DB.z, 0.42, 0.42, 0.42, 0.22, dark ? 0.55 : 0.16);
    const ks = dark ? 0.5 : 0.16;
    caster(RING.x, RING.z, 0.8, 0.8, 0.8, 0.35, ks * 0.3);
    const lean = Math.cos(deg(RING.tilt)) * (1 + BAND / 2) * S; // the rim's contact, toward the camera
    caster(RING.x + Math.sin(cam.az) * lean, RING.z + Math.cos(cam.az) * lean, 0.18, 0.18, 0.18, 0.08, ks);
    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;

    /* agent:finance at work: its tool calls type onto the rack's glass */
    rackLines.forEach((l, i) => {
      const v = smooth(seg(t, RACK_LINES[i][1], RACK_LINES[i][1] + 150)) * alive;
      l.mat.opacity = v * 0.85;
      l.m.visible = v > 0.002;
    });

    /* the unregistered AIs: once the hub has flagged a flow, its track inks back to
       the desk it came from and the AI prints up there */
    FLAGGED.forEach((_, i) => {
      const a = ais[i];
      const tm = TRACE[i];
      const printed = smooth(seg(t, tm[2], tm[3])) * alive;
      const wireIn = Math.sin(Math.PI * seg(t, tm[2] - 150, tm[3] + 250)) * 0.8;
      const wireOut = Math.sin(Math.PI * seg(t, RESET[0], RESET[0] + 600)) * 0.7;
      clipPlanes[i].constant = TOP + 0.03 + printed * aiH + 0.0001;
      a.body.visible = printed > 0.001;
      a.foot.visible = printed > 0.001;
      matWire[i].opacity = Math.max(wireIn, wireOut) * (dark ? 0.7 : 0.55);
      a.wire.visible = matWire[i].opacity > 0.001;
    });

    /* traffic, and the flagged flows' traces (they clear once LOGGED) */
    drawTraffic(t, live);
    matTrace.opacity = (dark ? 0.7 : 0.58) * (1 - smooth(seg(t, LOGGED_AT, LOGGED_AT + 600))) * alive;
    drawTraces(t);

    /* the lens: the dash in the hub opens into its row on a strip of page colour */
    let act = -1;
    let u = 0;
    ACTS.forEach((_, i) => {
      const v = unfold(i, t);
      if (v > u) [u, act] = [v, i];
    });
    strip.visible = u > 0.002;
    if (act >= 0) {
      strip.scale.set(lerp(2 * (HUB_R - BEZEL_W) * S, rowWidth(ACTS[act].row), u), lerp(0.4, 1, u), 1);
      (strip.material as THREE.MeshBasicMaterial).opacity = 0.9 * u * alive;
    }
    const k = [0, 0, 0];
    ACTS.forEach((a, i) => {
      const r = rowIn(i, t);
      const m = a.mask ? smooth(seg(t, a.mask, a.mask + 180)) : 0;
      k[a.row] = Math.max(k[a.row], r * (1 - m));
      if (a.mask) k[2] = Math.max(k[2], r * m); // "customers" → "[masked]"
    });
    rows.forEach((r, i) => {
      r.mat.opacity = k[i] * alive;
      r.m.visible = k[i] > 0.002;
    });
    /* …then the hub says one word */
    for (const w of words) {
      const v = smooth(seg(t, w.a, w.a + 120)) * (1 - smooth(seg(t, w.b - 100, w.b))) * alive;
      w.mat.opacity = v;
      w.m.visible = v > 0.002;
    }

    /* the page's chips: only after their event, one at a time, never on the mark */
    labelState.forEach((L, i) => {
      let a = 0;
      for (const [c, t0, t1] of CHIPS) if (c === i) a = Math.max(a, smooth(seg(t, t0, t0 + CHIP_FADE)) * (1 - smooth(seg(t, t1 - CHIP_FADE, t1))));
      L.a = a * alive;
    });
    labelState[0].state = 2;
    labelState[1].state = t >= LOGGED_AT ? 2 : t >= WORDS[2][1] ? 1 : 0;
    labelState[2].state = t >= LOGGED_AT ? 2 : t >= WORDS[3][1] ? 1 : 0;
  }

  // chips sit over the rack, and over the flagged desks' people (clear of the mark)
  const labelPos = [
    new THREE.Vector3(RACK.x, 1.74, RACK.z),
    ...FLAGGED.map((f) => {
      const d = DESKS[f.desk];
      return new THREE.Vector3(d.x + 0.12, 0.1, d.z + DESK.d / 2 + 0.3);
    }),
  ];
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
