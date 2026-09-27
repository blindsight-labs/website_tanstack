/* Hero scene for mockup 12: "The rotating lens" (a microscope's objective nosepiece).
 *
 * The Blindsight mark (orbit radius = 1) in thin clear glass: one slab for hub + arms +
 * nodes, three arcs; every slab ringed by the same firm ~1 px ink rim (white on the dark
 * card) with a thin thickness step inside it. The whole mark is a TURRET: its three
 * nodes are three physically different tools, numbered: 01 SEE a reticle on clear glass,
 * 02 SECURE a notched chrome cutter ring, 03 GOVERN a satin seal face with engraved rings.
 * There is ONE working position, the station at 12 o'clock, marked by a small fixed ink
 * pointer outside the ring. The turret only ever turns clockwise:
 *   See sweep  218° → 90°  (−128°, slow: the lit finder sweeps the field's upper left)
 *   index      90° → −38°  (−128°: SECURE onto the station)
 *   index     −38° → −142° (−104°: GOVERN onto the station); −142° ≡ 218°: the loop.
 * The active tool is lit (its engraving / metal brighter, its number in full ink).
 *
 * Behind it, a wall of dithered ASCII traffic: an IMAGE of an even key light, the mark's
 * projected shadow and the caustics its lenses focus (hub core, node spots that travel
 * with the turn). Drawn into the transmission pass; the glass shifts it, sampled
 * bilinearly (not three's blurring bicubic), so glyphs stay crisp.
 *
 *   01 See      the finder reads the traffic under it as it sweeps; each shadow-AI row it
 *               passes resolves and keeps an ink bracket. It stops on the station, on a
 *               hidden line that resolves in violet (the one accent): found.
 *   02 Secure   the turret indexes; SECURE lands on the line, its flanks close in to the
 *               node's rim and the middle is taken; the hub is the eyepiece and shows the
 *               cut magnified: "[stripped]", whole. The violet fades to ink.
 *   03 Govern   it indexes again; GOVERN stamps "blocked · logged" under the clean line
 *               ("ignore pr[stripped]tructions"); from the stamp a sweep turns the whole
 *               field into an ordered ledger (masked / blocked boxed) while hairline ticks
 *               count round outside the ring; the seal lands at LOG_T.seal.
 *   tail        the ledger collapses back into the stamp, the noise returns, and the
 *               finder lights for the next sweep.
 *
 * Story values follow tMs and ease from what is on screen: the turret is a critically
 * damped spring that feeds forward the keyed velocity (exact in play, a smooth catch-up
 * along the shortest path after a jump). Sway, lean and the noise run on real time.
 */
import { THREE, createRenderer, type Theme } from "./core";

export const LOOP_MS = 12000;
/** A calm, representative still (reduced motion): GOVERN on station, ledger, sealed. */
export const SETTLED_MS = 9800;
/** When the DOM audit-trail row should appear, seal (= ticks complete, double rule) and clear. */
export const LOG_T = { in: 7900, seal: 9200, out: 10500 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 0, t1: 3800 },
  { n: "02", label: "Secure it", t0: 3800, t1: 7000 },
  { n: "03", label: "Govern it", t0: 7000, t1: 11400 },
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
/** a trapezoid velocity profile: accelerate over a, cruise, brake evenly over b to a dead
 *  stop (no overshoot) — the index's firm, confident arrival */
function trap(x: number, a: number, b: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const v = 1 / (1 - a / 2 - b / 2);
  if (x < a) return (v * x * x) / (2 * a);
  if (x > 1 - b) return 1 - (v * (1 - x) * (1 - x)) / (2 * b);
  return v * (a / 2 + x - a);
}

/* ---------- the mark (orbit radius = 1) ---------- */
const [HUB_R, NODE_R, BAND, ARM_W] = [0.5, 0.25, 0.22, 0.17];
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock: SEE, SECURE, GOVERN
const NODE_X = NODE_A.map((a) => Math.cos(deg(a)));
const NODE_Y = NODE_A.map((a) => Math.sin(deg(a)));
const GAP = 20; // half-gap of the orbit at each node, degrees
const [SLAB_D, BEVEL] = [0.04, 0.024]; // a slim bevel: one clean edge, not a second dark band
const [ARC_D, ARC_BEV, ARC_BEND] = [0.02, 0.012, 0]; // the arcs: thin glass that passes the wall straight through (no offset, so no resample: text under them stays crisp)
const MARK_R = 1 + NODE_R + 0.03;
const [RIM_W, SHADE_W] = [0.0048, 0.012]; // the ink rim (1 px) and the thin thickness step inside it
/* the glass: transmission thickness and the edge roll of the face normals, kept low so
   glyphs shift and bend but stay crisp */
const [GLASS_BEND, ROLL_ZONE, ROLL_SLOPE] = [0.1, 0.05, 0.2];

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
      const e = deg(NODE_A[i] + (da >= 0 ? GAP : -GAP));
      dr = Math.hypot(x - Math.cos(e), y - Math.sin(e)) - BAND / 2;
      break;
    }
  }
  return Math.min(d, dr);
}

/* ---------- the turret ---------- */
const TILT = 0.1; // rad: the top leans a little toward the camera
/** ψ, the turret's turn (tool k sits at NODE_A[k] + ψ): [time, ψ, how it gets there]
 *  (0 hold, 1 the finder's slow sweep, 2 an index). −142 ≡ 218 at the wrap. */
const PSI_KEYS: [number, number, number][] = [[0, 218, 0], [300, 218, 0], [3300, 90, 1], [3900, 90, 0], [4700, -38, 2], [7000, -38, 0], [7700, -142, 2], [LOOP_MS, -142, 0]];
const [SWEEP_A, SWEEP_B, IDX_A, IDX_B] = [0.12, 0.2, 0.3, 0.4]; // accel / brake fractions
const PSI_W = 10; // rad/s: the catch-up spring after a jump
function psiTarget(t: number) {
  for (let i = 1; i < PSI_KEYS.length; i++) {
    const [t1, a1, k] = PSI_KEYS[i];
    if (t <= t1) {
      const [t0, a0] = PSI_KEYS[i - 1];
      const x = seg(t, t0, t1);
      return a0 + (a1 - a0) * (k === 1 ? trap(x, SWEEP_A, SWEEP_B) : k === 2 ? trap(x, IDX_A, IDX_B) : x);
    }
  }
  return PSI_KEYS[PSI_KEYS.length - 1][1];
}
/** how lit each tool is (0..1) */
function litTarget(k: number, t: number) {
  if (k === 0) return t < 3900 ? 1 : t < 4200 ? 1 - smooth(seg(t, 3900, 4200)) : smooth(seg(t, 11500, 11900));
  if (k === 1) return smooth(seg(t, 4450, 4700)) * (1 - smooth(seg(t, 7000, 7250)));
  return smooth(seg(t, 7450, 7700)) * (1 - smooth(seg(t, 10800, 11200)));
}

/* ---------- the wall of glyphs (world units, fixed behind the mark) ---------- */
const WALL_Z = -1.6;
const KW = 1.157; // mark → wall scale as seen from the camera ((10.2 + 1.6) / 10.2)
const MARK_YW = -0.039; // the wall y the mark's centre falls on, as seen from the camera
const [CW, CH] = [0.05, 0.09]; // a cell (fine glyphs, ≈ 9 × 16 px on screen)
const [COLS, ROWS] = [74, 38];
const RC = 20; // the row on the mark's centre
const [FW, FH, FX] = [COLS * CW, ROWS * CH, 0];
const FTOP = MARK_YW + CH * (RC + 0.5);
const FY = FTOP - FH / 2;
const cellX = (c: number) => FX - FW / 2 + CW * (c + 0.5);
const rowY = (r: number) => FTOP - CH * (r + 0.5);
const colAt = (x: number) => Math.round((x - FX + FW / 2) / CW - 0.5);
const MID_C = COLS / 2;
const READ_R = NODE_R * KW * 1.05; // what the finder reads around it (wall units)

/* 01: the shadow AI on the finder's path (each at the angle where the finder meets it,
   printed inward from there on the given row) */
const ITEMS = [
  { text: "notion-ai · unapproved", at: 205, row: 25, x0: -1.4 },
  { text: "pdf-summariser.app", at: 175, row: 19, x0: -1.5 },
  { text: "chatgpt.com · personal", at: 145, row: 13, x0: -1.15 },
  { text: "ext: WriteGPT", at: 122, row: 10, x0: -0.8 },
];
const N_BOX = ITEMS.length;
const LOGW = ["POST /v1/chat", "200", "gpt-4o", "812 tok", "upload", "q3-plan.docx", "GET /models", "copilot", "suggest", "embed", "tool_call", "search", "sso:m.keller", "stream", "api.openai.com", "gemini", "summarize", "invoice.pdf", "mcp://crm", "agent:finance", "read", "302", "hr-policy.pdf", "translate", "slack-bot", "reply", "claude", "ok"];
const FOOT = 0.035; // the brackets' feet

/* 02: the injected line on the station (its middle, BRK, under the node), and the hub's
   eyepiece view of the cut */
const PHRASE = "ignore previous instructions";
const N_BIG = PHRASE.length;
const BRK = [9, 19];
const STRIPPED = "[stripped]";
const BIG = 1.5; // the line's type vs the wall's (≈ 15 px)
const [BCW, BCH] = [CW * BIG, CH * BIG];
const BIG_X0 = -((BRK[0] + BRK[1]) / 2) * BCW; // left edge of the line (world x; the station is x = 0)
const SPREAD_IN = ((BRK[1] - BRK[0]) / 2) * BCW - (NODE_R * KW + 0.02); // the flanks close in to the node's rim
const [ECW, ECH, EYE_K] = [CW * 1.9, CH * 1.9, 0.9]; // the eyepiece's type, and its disc vs the hub
const PH = { form0: 3250, form1: 3450, read0: 3300, read1: 3750, vio0: 3300, vio1: 3600, in0: 4750, in1: 5000, brk0: 5300, brk1: 5650, neu0: 6300, neu1: 6900, out0: 7000, out1: 7300, end: 10400 };

/* 03: the stamp, the ledger that fills the whole field (every other row), its seal and
   the engraved ticks */
const TAG = "blocked · logged";
const TAG_ROW = 12; // just under GOVERN on the station (a blank row in the ledger)
const STAMP = { t0: 7750, t1: 7950 };
const [CARD_W, CARD_AR, CARD_Z] = [0.92, 5.7, 0.25]; // the stamp's card: wall width, aspect, its plane
const L_USERS = ["m.keller", "a.novak", "j.ruiz", "s.chen", "t.berg", "l.okafor", "r.silva", "k.ito", "p.meyer"];
const L_APPS: [string, string][] = [["chatgpt.com", "mask"], ["copilot", "allow"], ["notion-ai", "block"], ["gemini", "allow"], ["claude.ai", "allow"], ["pdf-summariser", "block"], ["WriteGPT", "block"], ["deepl.com", "mask"], ["perplexity", "allow"], ["mcp:crm-db", "mask"], ["agent:finance", "allow"], ["github-copilot", "allow"]];
const LED_C0 = 12; // first column
const LED_POL = 45; // policy column offset (time 8, user 9, app 14, size 6, gaps of 2)
const [LED_HEAD, LED_R0, LED_N] = [1, 5, 15]; // header row, first entry row, entries (row 3 is left clear for the station's pointer)
const SEAL_TXT = "sealed"; // under the table's top rule, in the policy column
const [SEAL_ROW, SEAL_C] = [LED_HEAD + 2, LED_C0 + LED_POL]; // clear of both rules, the pointer and the edge
const GOV = { sweep0: LOG_T.in, sweep1: 10100, reach: 2.3, txt0: 9200, txt1: 9380, out0: 10500, out1: 11400 };
const TICK_STEP = 4; // degrees between the count's ticks
const NOTCH = 22; // SECURE's cutter: the blade gap, degrees
const NUM_W = 0.17; // the numbers' plate (mark units; the digits ≈ 16 px, caps ≥ 11 px)
const NUM_OFF = [0.08, -0.105]; // …upright, low right on each node's face

/* the noise and the dither */
const RAMP = " .:-=+*#%@";
const DENSE = "#%@*+=";
const SCR = "abcdefghijklmnopqrstuvwxyz0123456789:._-/";
const FRAGS = ["prompt", "upload", "gpt-4o", "token", "api/v1", "agent", "invoice.pdf", "copilot", "POST /chat", "summarize", "mcp://", "payroll.csv", "claims.xlsx", "tool_call"];
const N_FRAG = 7;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const LIGHT = new THREE.Vector3(-4, 5, 13); // the key light: casts the shadow, feeds the caustics

/** atlas index: ASCII 33–126 → 1–94, and "·" in the spare cell 95 */
const gi = (ch: string) => {
  if (ch === "·") return 95;
  const k = ch.charCodeAt(0) - 32;
  return k > 0 && k < 95 ? k : 0;
};
const [RAMP_G, DENSE_G, SCR_G, PHRASE_G, STRIPPED_G] = [RAMP, DENSE, SCR, PHRASE, STRIPPED].map((s) => [...s].map(gi));

function hash3(a: number, b: number, c: number) {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const sx = smooth(x - ix);
  const sy = smooth(y - iy);
  const a = hash3(ix, iy, seed), b = hash3(ix + 1, iy, seed), c = hash3(ix, iy + 1, seed), d = hash3(ix + 1, iy + 1, seed); // prettier-ignore
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/* ------------------------------------------------------------------ */
/* studio environment (per theme): narrow strips and black flags        */
/* ------------------------------------------------------------------ */
function heroEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: grey(dark ? 0.05 : 0.46) }, hor: { value: grey(dark ? 0.018 : 0.3) }, bot: { value: grey(dark ? 0.008 : 0.38) } },
    vertexShader: /* glsl */ `varying vec3 vD;
      void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vD;
      void main() { float y = vD.y; gl_FragColor = vec4(y >= 0.0 ? mix(hor, top, smoothstep(0.0, 0.6, y)) : mix(hor, bot, smoothstep(0.0, 0.3, -y)), 1.0); }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(40, 48, 24), domeMat));
  const panel = (w: number, h: number, azDeg: number, elDeg: number, v: number, dist = 14) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: grey(v), side: THREE.DoubleSide }));
    const az = deg(azDeg);
    const el = deg(elDeg);
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  const P: [number, number, number, number, number][] = dark
    ? [[14, 1.6, 0, 76, 2.4], [1.8, 16, 52, 4, 4.0], [1.1, 16, -78, 4, 2.4], [1.0, 16, 160, 4, 3.0], [12, 3.2, 215, 12, 0.2], [24, 9, 180, 34, 0.28]]
    : [[14, 1.4, 0, 78, 2.0], [3.2, 16, -74, 0, 0.0], [2.2, 16, 122, 0, 0.0], [9, 1.3, 205, -6, 0.0], [1.8, 14, 58, 6, 2.6], [1.2, 14, -40, 8, 2.4], [1.0, 14, 165, 6, 2.2]];
  P.forEach(([w, h, az, el, v]) => panel(w, h, az, el, v));
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
const extrude = (shape: THREE.Shape, depth: number, curveSegments: number, bev = BEVEL) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
};

/** Hub + three arms + three nodes as ONE outline, inset by the bevel. */
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

/** One orbit arc as a flat band with rounded ends, inset by the bevel. */
function arcShape(a0: number, a1: number, bev: number) {
  const hw = BAND / 2 - bev;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}

/** The rim: a flat ribbon along a slab's true outline (its shape grown by the bevel),
 *  from o0 to o1 outward of the inset shape, just in front of the face; mitred, so it is
 *  a constant line at any turn. */
function outlineRibbon(shape: THREE.Shape, o0: number, o1: number, z: number) {
  const raw = shape.getPoints(28);
  const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-6);
  if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const sgn = THREE.ShapeUtils.isClockWise(pts) ? -1 : 1;
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const l2 = Math.hypot(c.x - b.x, c.y - b.y) || 1;
    const n1x = (sgn * (b.y - a.y)) / l1, n1y = (-sgn * (b.x - a.x)) / l1; // prettier-ignore
    const n2x = (sgn * (c.y - b.y)) / l2, n2y = (-sgn * (c.x - b.x)) / l2; // prettier-ignore
    const ml = Math.hypot(n1x + n2x, n1y + n2y) || 1;
    const mx = (n1x + n2x) / ml;
    const my = (n1y + n2y) / ml;
    const k = 1 / Math.max(0.5, mx * n1x + my * n1y); // the mitre
    pos.push(b.x + mx * o0 * k, b.y + my * o0 * k, z, b.x + mx * o1 * k, b.y + my * o1 * k, z);
    const j = i * 2;
    const jn = ((i + 1) % n) * 2;
    idx.push(j, j + 1, jn, jn, j + 1, jn + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

/** A tangent-space normal map for the core's faces (UVs = mark x, y): flat, with a gentle
 *  roll toward every edge. */
function pillowNormals() {
  const N = 512;
  const S = 2.7; // covers mark coords -1.35 … 1.35
  const h = S / N;
  const d = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) d[j * N + i] = logoSDF(-S / 2 + h * (i + 0.5), -S / 2 + h * (j + 0.5));
  const out = new Uint8Array(N * N * 4);
  const edge = -BEVEL;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const id = j * N + i;
      let nx = 0;
      let ny = 0;
      const q = (d[id] - (edge - ROLL_ZONE)) / ROLL_ZONE;
      if (q > 0 && d[id] < 0.02) {
        const gx = d[j * N + Math.min(i + 1, N - 1)] - d[j * N + Math.max(i - 1, 0)];
        const gy = d[Math.min(j + 1, N - 1) * N + i] - d[Math.max(j - 1, 0) * N + i];
        const gl = Math.hypot(gx, gy) || 1;
        const s = ROLL_SLOPE * Math.pow(clamp01(q), 1.7);
        nx = (gx / gl) * s;
        ny = (gy / gl) * s;
      }
      const nl = Math.hypot(nx, ny, 1);
      out[id * 4] = Math.round(((nx / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 1] = Math.round(((ny / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 2] = Math.round(((1 / nl) * 0.5 + 0.5) * 255);
      out[id * 4 + 3] = 255;
    }
  const t = new THREE.DataTexture(out, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.repeat.set(1 / S, 1 / S);
  t.offset.set(0.5, 0.5);
  Object.assign(t, { magFilter: THREE.LinearFilter, minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: true, anisotropy: 4 });
  t.needsUpdate = true;
  return t;
}

/** White mono glyphs (ASCII 33–126, and "·") on black, 16 × 6 cells; the shader reads .r. */
function glyphAtlas(weight: number) {
  const [GW, GH] = [48, 86]; // same ratio as a wall cell
  const c = document.createElement("canvas");
  [c.width, c.height] = [16 * GW, 6 * GH];
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  Object.assign(g, { fillStyle: "#fff", font: `${weight} 54px "IBM Plex Mono", ui-monospace, monospace`, textAlign: "center", textBaseline: "alphabetic" });
  for (let i = 1; i < 96; i++) g.fillText(i === 95 ? "·" : String.fromCharCode(32 + i), ((i % 16) + 0.5) * GW, Math.floor(i / 16) * GH + GH * 0.7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The tools' numbers, "01" "02" "03", white on clear, three 3:2 cells in a row. */
function numberAtlas() {
  const c = document.createElement("canvas");
  [c.width, c.height] = [288, 64];
  const g = c.getContext("2d")!;
  Object.assign(g, { fillStyle: "#fff", font: `600 44px "IBM Plex Mono", ui-monospace, monospace`, textAlign: "center", textBaseline: "middle" });
  ["01", "02", "03"].forEach((s, i) => g.fillText(s, 48 + 96 * i, 34));
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

/** An engraving across a node's face: SEE's reticle and GOVERN's ring hairlines (white
 *  lines on clear), or GOVERN's satin seal face (grooves on a white base, tinted by the
 *  metal). */
function engraving(kind: "reticle" | "rings" | "seal") {
  const seal = kind === "seal";
  const N = 256;
  const c = document.createElement("canvas");
  [c.width, c.height] = [N, N];
  const g = c.getContext("2d")!;
  const m = N / 2;
  if (seal) {
    g.fillStyle = "#fff";
    g.fillRect(0, 0, N, N);
    g.strokeStyle = "#6c6d72";
    [26, 50, 74, 98, 118].forEach((r, i) => {
      g.lineWidth = i === 4 ? 2 : 3;
      g.beginPath();
      g.arc(m, m, r, 0, TAU);
      g.stroke();
    });
  } else if (kind === "rings") {
    g.strokeStyle = "#fff";
    g.lineWidth = 2.2;
    [26, 50, 74, 98].forEach((r) => {
      g.beginPath();
      g.arc(m, m, r, 0, TAU);
      g.stroke();
    });
  } else {
    g.strokeStyle = "#fff";
    g.lineWidth = 2.4;
    g.beginPath();
    for (const s of [-1, 1]) {
      g.moveTo(m + s * 20, m);
      g.lineTo(m + s * 112, m);
      g.moveTo(m, m + s * 20);
      g.lineTo(m, m + s * 112);
      for (let d = 36; d <= 108; d += 18) {
        const k = d % 36 === 0 ? 7 : 4;
        g.moveTo(m + s * d, m - k);
        g.lineTo(m + s * d, m + k);
        g.moveTo(m - k, m + s * d);
        g.lineTo(m + k, m + s * d);
      }
    }
    g.stroke();
    g.beginPath();
    g.arc(m, m, 12, 0, TAU);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  return t;
}

/** The stamp's card: "blocked · logged" in ink, in a hairline box, on the page's colour. */
function stampCard(bg: string, ink: string) {
  const c = document.createElement("canvas");
  [c.width, c.height] = [640, Math.round(640 / CARD_AR)];
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.strokeRect(10, 14, c.width - 20, c.height - 28);
  Object.assign(g, { fillStyle: ink, font: `500 52px "IBM Plex Mono", ui-monospace, monospace`, textAlign: "center", textBaseline: "middle" });
  g.fillText(TAG, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
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
const FIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FIELD_FRAG = /* glsl */ `
  uniform sampler2D uState;
  uniform sampler2D uAtlas;
  uniform sampler2D uAtlasB; // bold, for the injected line and the eyepiece
  uniform sampler2D uBig;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uVio;
  uniform vec4 uBox[${N_BOX}];
  uniform float uBoxK[${N_BOX}];
  uniform float uBoxA;
  uniform vec4 uBigL; // the injected line: centre y, left edge x, station x, on
  uniform float uSpread; // its flanks' shift toward the station (< 0: closing in)
  uniform float uHide; // 1: its middle is not drawn (taken by the SECURE node)
  uniform vec4 uEye; // the hub's eyepiece view: centre xy, radius, on
  uniform vec3 uGov; // the ledger sweep: centre xy, radius
  uniform vec4 uTag; // the stamp's box (x0, y0, x1, y1)
  uniform float uTagK;
  uniform float uPolBox[${ROWS}]; // per texture row: the policy box (03)
  uniform vec2 uPolX;
  uniform vec4 uHead; // rules: y, x0, x1, drawn 0..1
  uniform vec4 uSeal;
  uniform float uLedA;
  uniform float uPerc; // 1: colours are sRGB and mixed perceptually (the pale card)
  varying vec2 vUv;
  float hair(float d, float hw, float px) { return 1.0 - smoothstep(hw - 0.5 * px, hw + 0.5 * px, d); }
  // the line's glyphs: bold, drawn a little wider in their cell (tighter tracking), and
  // their coverage hardened so strokes are solid colour, not a pale anti-aliased wash
  float glyphB(float gi, vec2 f, vec2 gdx, vec2 gdy) {
    if (gi < 0.5) return 0.0;
    vec2 ac = vec2(mod(gi, 16.0), floor(gi / 16.0));
    float fx = 0.5 + (f.x - 0.5) * 0.86;
    vec2 auv = vec2((ac.x + fx) / 16.0, 1.0 - (ac.y + 1.0 - f.y) / 6.0);
    return smoothstep(0.16, 0.56, textureGrad(uAtlasB, auv, vec2(gdx.x * 0.86, gdx.y), vec2(gdy.x * 0.86, gdy.y)).r);
  }
  float glyph(float gi, vec2 f, float jit, vec2 gdx, vec2 gdy) {
    if (gi < 0.5) return 0.0;
    vec2 ac = vec2(mod(gi, 16.0), floor(gi / 16.0));
    float fy = f.y + (jit - 0.5) * 0.4;
    vec2 auv = vec2((ac.x + f.x) / 16.0, 1.0 - (ac.y + 1.0 - fy) / 6.0);
    return textureGrad(uAtlas, auv, gdx, gdy).r * step(0.0, fy) * step(fy, 1.0);
  }
  float rule(vec4 R, vec2 p, float hw, float px) {
    float xr = R.y + R.w * (R.z - R.y);
    return hair(abs(p.y - R.x), hw, px) * step(R.y, p.x) * (1.0 - smoothstep(xr - px, xr, p.x)) * step(0.001, R.w);
  }
  float frame(vec4 B, vec2 p, float hw, float px) {
    float inx = step(B.x - hw, p.x) * step(p.x, B.z + hw);
    float iny = step(B.y - hw, p.y) * step(p.y, B.w + hw);
    return max(max(hair(abs(p.x - B.x), hw, px), hair(abs(p.x - B.z), hw, px)) * iny, max(hair(abs(p.y - B.y), hw, px), hair(abs(p.y - B.w), hw, px)) * inx);
  }
  void main() {
    vec2 GRID = vec2(${F(COLS)}, ${F(ROWS)});
    vec2 CELL = vec2(${F(CW)}, ${F(CH)});
    vec2 HALF = 0.5 * vec2(${F(FW)}, ${F(FH)});
    vec2 g = vUv * GRID;
    vec2 gdx = dFdx(g) / vec2(16.0, 6.0);
    vec2 gdy = dFdy(g) / vec2(16.0, 6.0);
    vec2 p = vUv * 2.0 * HALF - HALF;
    float px = max(length(vec2(dFdx(p.x), dFdy(p.x))), 1e-5);
    vec2 cell = min(floor(g), GRID - 1.0);
    vec4 s = texture2D(uState, (cell + 0.5) / GRID);
    float a = glyph(floor(s.r * 255.0 + 0.5), g - cell, s.a, gdx, gdy) * s.g;
    // 02: the line on the station, and the hub's eyepiece view of its middle
    vec2 de = p - uEye.xy;
    float onE = step(0.001, uEye.w);
    float inE = step(length(de), uEye.z) * onE;
    float qx = p.x + (p.x < uBigL.z ? uSpread : -uSpread);
    vec2 b = vec2((qx - uBigL.y) / ${F(BCW)}, (p.y - uBigL.x) / ${F(BCH)} + 0.5);
    vec2 lb = vec2(de.x / ${F(ECW)} + ${F((BRK[1] - BRK[0]) / 2)}, de.y / ${F(ECH)} + 0.5);
    vec2 bdx = dFdx(b) / vec2(16.0, 6.0);
    vec2 bdy = dFdy(b) / vec2(16.0, 6.0);
    vec2 ldx = dFdx(lb) / vec2(16.0, 6.0);
    vec2 ldy = dFdy(lb) / vec2(16.0, 6.0);
    float swept = step(abs(uBigL.x - uGov.y), uGov.z) * step(0.01, uGov.z); // the ledger takes whole rows
    vec4 sb = vec4(0.0);
    float aB = 0.0;
    if (uBigL.w > 0.001) {
      if (inE > 0.5) {
        if (lb.x >= 0.0 && lb.x < ${F(BRK[1] - BRK[0])} && lb.y >= 0.0 && lb.y < 1.0) {
          float cb = floor(lb.x);
          sb = texture2D(uBig, vec2((cb + ${F(BRK[0] + 0.5)}) / ${F(N_BIG)}, 0.5));
          aB = glyphB(floor(sb.r * 255.0 + 0.5), vec2(lb.x - cb, lb.y), ldx, ldy) * sb.g;
        }
      } else if (swept < 0.5 && b.x >= 0.0 && b.x < ${F(N_BIG)} && b.y >= 0.0 && b.y < 1.0) {
        float cb = floor(b.x);
        float hide = uHide * step(${F(BRK[0])}, cb) * step(cb, ${F(BRK[1] - 1)});
        sb = texture2D(uBig, vec2((cb + 0.5) / ${F(N_BIG)}, 0.5));
        aB = glyphB(floor(sb.r * 255.0 + 0.5), vec2(b.x - cb, b.y), bdx, bdy) * sb.g * (1.0 - hide);
      }
    }
    // the fine glyphs make way (whole cells) for the line and inside the eyepiece
    vec2 cc = (cell + 0.5) * CELL - HALF;
    float strip = step(abs(cc.y - uBigL.x), ${F(BCH * 0.5 + CH * 0.4)}) * step(uBigL.y - ${F(CW)}, cc.x) * step(cc.x, uBigL.y + ${F(N_BIG * BCW + CW)});
    strip *= step(0.001, uBigL.w) * (1.0 - step(abs(cc.y - uGov.y), uGov.z) * step(0.01, uGov.z));
    float ey = step(length(cc - uEye.xy), uEye.z + ${F(CW * 0.7)}) * onE * step(0.001, uBigL.w);
    a *= 1.0 - max(strip, ey);
    vec2 e = min(g, GRID - g);
    float fade = smoothstep(0.0, 2.5, e.x) * smoothstep(0.0, 1.6, e.y);
    vec3 c = mix(uBg, mix(uInk, uVio, s.b), a * fade);
    c = mix(c, mix(uInk, uVio, sb.b), aB * fade);
    float hw = max(0.003, 0.55 * px);
    // 01: ink brackets on what the finder found
    float br = 0.0;
    for (int k = 0; k < ${N_BOX}; k++) {
      vec4 B = uBox[k];
      float kk = uBoxK[k];
      if (kk > 0.001) {
        float yc = 0.5 * (B.y + B.w);
        float hh = 0.5 * (B.w - B.y) * min(1.0, kk * 1.8);
        float inY = 1.0 - smoothstep(hh - 0.5 * px, hh + 0.5 * px, abs(p.y - yc));
        float v = max(hair(abs(p.x - B.x), hw, px), hair(abs(p.x - B.z), hw, px)) * inY;
        float foot = ${F(FOOT)} * clamp(kk * 2.0 - 0.8, 0.0, 1.0);
        float fy2 = max(hair(abs(p.y - B.y), hw, px), hair(abs(p.y - B.w), hw, px));
        float fx = min(1.0, step(B.x, p.x) * step(p.x, B.x + foot) + step(B.z - foot, p.x) * step(p.x, B.z));
        br = max(br, max(v, fy2 * fx * step(0.001, foot)));
      }
    }
    c = mix(c, uInk, br * uBoxA * fade);
    // 03: the stamp's box, the ledger's policy boxes, header rule and seal
    float led = max(rule(uHead, p, hw, px), rule(uSeal, p, hw, px));
    if (uTagK > 0.001) led = max(led, frame(uTag, p, hw, px) * uTagK);
    float kb = uPolBox[int(cell.y)];
    if (kb > 0.001) {
      float yb = cell.y * CELL.y - HALF.y;
      led = max(led, frame(vec4(uPolX.x, yb + ${F(0.1 * CH)}, uPolX.y, yb + ${F(0.9 * CH)}), p, hw, px) * kb);
    }
    c = mix(c, uInk, led * uLedA * fade);
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
  const env = heroEnvironment(renderer, dark);
  Object.assign(scene, { background: bg, environment: env });
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.1 : 0.75);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");

  // opacities of the printed glyphs. Dark: pale ink mixed in linear light. Light: ink
  // mixed perceptually (sRGB), so the dither reads as 0.3–0.45 ink and resolved text
  // lands near #555–#6a6a6a.
  const OP = dark
    ? { d0: 0.18, d1: 0.017, frag: 0.33, name: 0.74, log: 0.4, led: 0.62, pol: 0.4, scr: 0.39, phInk: 0.6, phVio: 1, stripped: 0.66, rule: 0.36, box: 0.62 }
    : { d0: 0.3, d1: 0.017, frag: 0.42, name: 0.72, log: 0.52, led: 0.64, pol: 0.48, scr: 0.5, phInk: 0.7, phVio: 1, stripped: 0.74, rule: 0.5, box: 0.7 };
  const colU = (c: THREE.Color) => (dark ? c : c.clone().convertLinearToSRGB());

  /* ---------- the wall of glyphs ---------- */
  const NC = COLS * ROWS;
  const data = new Uint8Array(NC * 4);
  const stateTex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  const bigData = new Uint8Array(N_BIG * 4);
  const bigTex = new THREE.DataTexture(bigData, N_BIG, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  for (const tx of [stateTex, bigTex]) {
    tx.minFilter = tx.magFilter = THREE.NearestFilter;
    tx.generateMipmaps = false;
    tx.needsUpdate = true;
  }
  const atlas = glyphAtlas(dark ? 400 : 500);
  const atlasB = glyphAtlas(700);
  const boxK = new Float32Array(N_BOX);
  const polBox = new Float32Array(ROWS);
  const itemC0 = ITEMS.map((it) => colAt(it.x0));
  const boxGeo = ITEMS.map((it, i) => {
    const y = rowY(it.row) - FY;
    return new THREE.Vector4(cellX(itemC0[i]) - CW / 2 - FX - 0.03, y - CH * 0.46, cellX(itemC0[i] + [...it.text].length - 1) + CW / 2 - FX + 0.03, y + CH * 0.46);
  });
  const itemCen = boxGeo.map((B) => new THREE.Vector2((B.x + B.z) / 2 + FX, (B.y + B.w) / 2 + FY));
  const ledX0 = cellX(LED_C0) - CW / 2 - FX;
  const ledX1 = cellX(LED_C0 + LED_POL + 5) + CW / 2 - FX;
  const headY = rowY(LED_HEAD) - CH / 2 - FY - 0.004;
  const head = new THREE.Vector4(headY, ledX0, ledX1, 0);
  const seal = new THREE.Vector4(headY - 0.016, ledX0, ledX1, 0); // the second rule: sealed
  const polX = new THREE.Vector2(cellX(LED_C0 + LED_POL) - CW / 2 - FX - 0.02, cellX(LED_C0 + LED_POL + 4) + CW / 2 - FX + 0.02);
  const tagC0 = Math.round(MID_C - [...TAG].length / 2);
  const tagBox = [cellX(tagC0) - CW / 2 - 0.04, rowY(TAG_ROW) - CH * 0.78, cellX(tagC0 + [...TAG].length - 1) + CW / 2 + 0.04, rowY(TAG_ROW) + CH * 0.78];
  const stampX = (tagBox[0] + tagBox[2]) / 2; // world (cellX / rowY are world)
  const [cardC0, cardC1] = [tagC0 - 2, tagC0 + [...TAG].length + 1]; // the stamp's clear card
  const stampY = rowY(TAG_ROW);
  const [bigL, eye, tag] = [new THREE.Vector4(1.1 - FY, BIG_X0 - FX, -FX, 0), new THREE.Vector4(0, 0, 0, 0), new THREE.Vector4()];
  const gov = new THREE.Vector3(stampX - FX, stampY - FY, 0);
  const [spread, hideMid, tagK] = [{ value: 0 }, { value: 0 }, { value: 0 }];
  // opaque, depth-writing, default render order: drawn into the transmission target,
  // so the glass refracts it
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: stateTex }, uAtlas: { value: atlas }, uAtlasB: { value: atlasB }, uBig: { value: bigTex },
      uBg: { value: colU(bg) }, uInk: { value: colU(ink) }, uVio: { value: colU(signalCol) }, uPerc: { value: dark ? 0 : 1 },
      uBox: { value: boxGeo }, uBoxK: { value: boxK }, uBoxA: { value: OP.box },
      uBigL: { value: bigL }, uSpread: spread, uHide: hideMid, uEye: { value: eye }, uGov: { value: gov }, uTag: { value: tag }, uTagK: tagK,
      uPolBox: { value: polBox }, uPolX: { value: polX }, uHead: { value: head }, uSeal: { value: seal }, uLedA: { value: OP.rule },
    },
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), fieldMat);
  field.position.set(FX, FY, WALL_Z);
  scene.add(field);

  // flicker phase, decode / sweep order, Bayer
  const [h0, hDec, bay] = [new Float32Array(NC), new Float32Array(NC), new Float32Array(NC)];
  // the traffic the finder reads, the shadow AI (item index per cell), the stamp, the ledger
  const [logG, itemG, tagG, ledG] = [new Uint8Array(NC), new Uint8Array(NC), new Uint8Array(NC), new Uint8Array(NC)];
  const itemIdx = new Uint8Array(NC).fill(255);
  const ledOp = new Float32Array(NC);
  const sealIdx = new Uint8Array(NC).fill(255); // the "sealed" word types in at the seal
  const fragBuf = new Uint8Array(NC);
  const [cellXs, rowYs] = [new Float32Array(COLS), new Float32Array(ROWS)];
  for (let c = 0; c < COLS; c++) cellXs[c] = cellX(c);
  for (let r = 0; r < ROWS; r++) rowYs[r] = rowY(r);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      h0[id] = hash3(c, r, 7);
      hDec[id] = hash3(c, r, 11);
      bay[id] = BAYER[(r % 4) * 4 + (c % 4)];
    }
  const print = (G: Uint8Array, row: number, c0: number, s: string, each?: (id: number, j: number) => void) => {
    [...s].forEach((ch, j) => {
      const c = c0 + j;
      if (c < 0 || c >= COLS || row < 0 || row >= ROWS) return;
      G[row * COLS + c] = gi(ch);
      each?.(row * COLS + c, j);
    });
  };
  // the traffic, as it reads under the finder: every other row, words across the field
  for (let r = 1; r < ROWS; r += 2) {
    let s = " ".repeat(Math.floor(hash3(r, 6, 9) * 4));
    let w = Math.floor(hash3(r, 5, 9) * LOGW.length);
    while (s.length < COLS) s += LOGW[w++ % LOGW.length] + "  ";
    print(logG, r, 0, s.slice(0, COLS));
  }
  ITEMS.forEach((it, i) => print(itemG, it.row, itemC0[i], it.text, (id) => (itemIdx[id] = i)));
  print(tagG, TAG_ROW, tagC0, TAG);
  // the ledger: time, user, app, size, policy; masked and blocked get a box
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  const lpad = (s: string, n: number) => (" ".repeat(n) + s).slice(-n);
  const ledRow = (a: string, b: string, c: string, d: string, e: string) => pad(a, 8) + "  " + pad(b, 9) + "  " + pad(c, 14) + "  " + lpad(d, 6) + "  " + e;
  const colOp = (i: number, strong: boolean) => (i < 10 || (i >= 37 && i < LED_POL) ? OP.pol : i >= LED_POL ? (strong ? OP.led : OP.pol) : OP.led);
  print(ledG, LED_HEAD, LED_C0, ledRow("time", "user", "app", "size", "policy"), (id) => (ledOp[id] = OP.pol));
  const boxedRows: number[] = [];
  let sec = 9 * 3600 + 41 * 60 + 2;
  for (let i = 0; i < LED_N; i++) {
    const r = LED_R0 + 2 * i;
    // the stamped row: the document the injected line came in
    const doc = r === TAG_ROW + 3; // the first entry under the stamp's card: the stripped document
    const [app, pol] = doc ? ["doc:q3-brief", "block"] : L_APPS[Math.floor(hash3(i, 2, 5) * L_APPS.length)];
    const user = doc ? "m.keller" : L_USERS[Math.floor(hash3(i, 3, 5) * L_USERS.length)];
    const kb = 2 + Math.floor(hash3(i, 4, 5) * 2400);
    const size = kb > 999 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    sec += 2 + Math.floor(hash3(i, 6, 5) * 7);
    const hms = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map((v) => String(v).padStart(2, "0")).join(":");
    const strong = pol !== "allow";
    print(ledG, r, LED_C0, ledRow(hms, user, app, size, pol), (id, j) => (ledOp[id] = colOp(j, strong)));
    if (strong) boxedRows.push(r);
  }
  print(ledG, SEAL_ROW, SEAL_C, SEAL_TXT, (id, j) => {
    ledOp[id] = OP.led;
    sealIdx[id] = j;
  });

  const put = (c: number, r: number, g: number, op: number, vio = 0, sh = 128) => {
    const i = ((ROWS - 1 - r) * COLS + c) * 4;
    data[i] = g;
    data[i + 1] = op <= 0 ? 0 : op >= 1 ? 255 : Math.round(op * 255);
    data[i + 2] = vio <= 0 ? 0 : vio >= 1 ? 255 : Math.round(vio * 255);
    data[i + 3] = sh;
  };
  const putBig = (j: number, g: number, op: number, vio: number, sh = 128) => {
    const i = j * 4;
    bigData[i] = g;
    bigData[i + 1] = Math.round(clamp01(op) * 255);
    bigData[i + 2] = Math.round(clamp01(vio) * 255);
    bigData[i + 3] = sh;
  };

  /* ---------- the turret ---------- */
  const rig = new THREE.Group(); // tilt, sway, cursor lean (and the fixed index)
  const lens = new THREE.Group(); // the turret: turns ψ about its axis
  rig.add(lens);
  scene.add(rig);
  const pillow = pillowNormals();
  const glassSide = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: GLASS_BEND, ior: 1.46, dispersion: 0, clearcoat: 0,
    attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"), attenuationDistance: 60, specularIntensity: 0.8, envMapIntensity: dark ? 1.3 : 1.0,
  });
  const glassFace = glassSide.clone();
  glassFace.normalMap = pillow;
  glassFace.normalScale.set(0.8, 0.8);
  // refraction shifts, never blurs: three samples the transmission target with a
  // B-spline bicubic (a ~1 px blur that softens fine glyphs); sample it bilinearly
  const crispChunk = THREE.ShaderChunk.transmission_pars_fragment.replace(
    "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
    "return textureLod( transmissionSamplerMap, fragCoord.xy, lod );",
  );
  const arcGlass = glassSide.clone();
  arcGlass.thickness = ARC_BEND;
  arcGlass.ior = 1.2;
  [glassSide, glassFace, arcGlass].forEach((mat) => {
    mat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace("#include <transmission_pars_fragment>", crispChunk);
    };
    mat.customProgramCacheKey = () => "crisp-transmission";
  });
  // the rim: a firm ~1 px ink line (white on the dark card) round every slab, and a faint
  // thickness step inside it; the same on hub, nodes and arcs
  const lineCol = dark ? new THREE.Color(0xffffff) : ink.clone();
  const flat = (opacity: number, color = lineCol) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const rimMat = flat(dark ? 0.88 : 0.85);
  const shadeMat = flat(dark ? 0.08 : 0.07);
  const addSlab = (shape: THREE.Shape, depth: number, mats: THREE.Material[], segs: number, bev = BEVEL) => {
    const zf = depth / 2 + bev + 0.003;
    lens.add(
      new THREE.Mesh(extrude(shape, depth, segs, bev), mats),
      new THREE.Mesh(outlineRibbon(shape, bev - RIM_W, bev, zf), rimMat),
      new THREE.Mesh(outlineRibbon(shape, bev - RIM_W - SHADE_W, bev - RIM_W, zf), shadeMat),
    );
    return zf;
  };
  const ZF = addSlab(coreShape(), SLAB_D, [glassFace, glassSide], 48);
  NODE_A.forEach((a, i) => addSlab(arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP), ARC_BEV), ARC_D, [arcGlass, arcGlass], 64, ARC_BEV));
  // the three tools, physically different (all keep the node's round silhouette):
  //   01 SEE     a reticle engraved on clear glass (fine crosshair, centre ring, ticks)
  //   02 SECURE  a chrome cutter ring with a precise notch, facing out along its spoke
  //   03 GOVERN  a flat satin seal face with engraved concentric rings (opaque metal)
  // and each one's number in ink, kept upright as the turret turns; the active tool is
  // lit: its engraving / metal brighter, its number in full ink
  const numTex = numberAtlas();
  const [reticleTex, ringsTex, sealTex] = [engraving("reticle"), engraving("rings"), engraving("seal")];
  const reticleMat = flat(0.4);
  reticleMat.map = reticleTex;
  const reticle = new THREE.Mesh(new THREE.PlaneGeometry(2 * (NODE_R - 0.028), 2 * (NODE_R - 0.028)), reticleMat);
  reticle.position.set(NODE_X[0], NODE_Y[0], ZF + 0.002);
  reticle.rotation.z = deg(NODE_A[0]);
  const cutterMat = new THREE.MeshStandardMaterial({ color: dark ? 0xdcdde1 : 0xc4c6cb, metalness: 1, roughness: 0.07, envMapIntensity: 1, transparent: true, depthWrite: false });
  const cutter = new THREE.Mesh(new THREE.TorusGeometry(NODE_R - 0.03, 0.0105, 10, 120, TAU - deg(NOTCH)), cutterMat);
  cutter.position.set(NODE_X[1], NODE_Y[1], ZF - 0.003);
  cutter.rotation.z = deg(NODE_A[1] + NOTCH / 2); // the gap centred on the node's outward spoke
  sealTex.colorSpace = THREE.SRGBColorSpace;
  // idle, GOVERN is clear glass with its rings as faint hairlines; only on the station
  // does the satin face come up under them (and it eases back to glass as it leaves)
  const sealMat = new THREE.MeshStandardMaterial({ color: dark ? 0x8a8c92 : 0xa9abb1, map: sealTex, metalness: 0.55, roughness: 0.42, envMapIntensity: 1, transparent: true, opacity: 0, depthWrite: false });
  const sealFace = new THREE.Mesh(new THREE.CircleGeometry(NODE_R - 0.026, 96), sealMat);
  sealFace.position.set(NODE_X[2], NODE_Y[2], ZF + 0.001);
  const ringsMat = flat(0.2);
  ringsMat.map = ringsTex;
  const rings = new THREE.Mesh(new THREE.PlaneGeometry(2 * (NODE_R - 0.028), 2 * (NODE_R - 0.028)), ringsMat);
  rings.position.set(NODE_X[2], NODE_Y[2], ZF + 0.002);
  lens.add(reticle, cutter, sealFace, rings);
  const tools = NODE_A.map((a, k) => {
    const ng = new THREE.PlaneGeometry(NUM_W, NUM_W / 1.5);
    const uv = ng.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setX(i, (k + uv.getX(i)) / 3);
    const num = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ map: numTex, color: lineCol, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
    lens.add(num);
    return { num, lit: 0 };
  });
  // the fixed pointer at the station: a small ink triangle just outside the ring at 12
  // o'clock, on the rig (it does not turn); it sits in a band the ledger leaves clear
  const ptr = new THREE.Shape();
  ptr.moveTo(0, MARK_R - 0.005);
  ptr.lineTo(0.026, MARK_R + 0.042);
  ptr.lineTo(-0.026, MARK_R + 0.042);
  ptr.closePath();
  const pointer = new THREE.Mesh(new THREE.ShapeGeometry(ptr), flat(dark ? 0.9 : 0.88));
  pointer.position.z = 0.02;
  rig.add(pointer);
  // the count: 1 px mid-grey hairlines just OUTSIDE the ring's rim, counted clockwise from
  // the station (where GOVERN sits once it has indexed: local angle NODE_A[2])
  const tickList: { a: number; major: boolean }[] = [];
  for (let k = 0; k < 360 / TICK_STEP; k++) {
    const a = NODE_A[2] - k * TICK_STEP;
    if (NODE_A.some((n) => Math.abs(wrap180(a - n)) < 16)) continue;
    tickList.push({ a, major: k % 5 === 0 });
  }
  const N_TICK = tickList.length;
  const tickMat = flat(0, bg.clone().lerp(ink, 0.5));
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), tickMat, N_TICK);
  const dummy = new THREE.Object3D();
  tickList.forEach((tk, i) => {
    const [r0, r1] = [1 + BAND / 2 + 0.02, 1 + BAND / 2 + (tk.major ? 0.085 : 0.055)];
    const a = deg(tk.a);
    dummy.position.set((Math.cos(a) * (r0 + r1)) / 2, (Math.sin(a) * (r0 + r1)) / 2, 0.01);
    dummy.rotation.set(0, 0, a);
    dummy.scale.set(r1 - r0, 0.0048, 0.001);
    dummy.updateMatrix();
    ticks.setMatrixAt(i, dummy.matrix);
  });
  ticks.instanceMatrix.needsUpdate = true;
  ticks.count = 0;
  lens.add(ticks);

  // the stamp: an opaque card in the page's colour, in front of the glass (so no arm or
  // rim can cut it), placed to sit exactly over its spot on the wall (set in resize)
  const cardMat = new THREE.MeshBasicMaterial({ map: stampCard(opts.bg, opts.ink), transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(CARD_W, CARD_W / CARD_AR), cardMat);
  card.renderOrder = 10;
  card.visible = false;
  scene.add(card);
  let cardS = 1;

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
  let [viewW, viewH, lastReal, lastWrite, fDt] = [1, 1, -1, -1, 16];
  let fSnap = true;
  const follow = (cur: number, to: number, tau: number) => (fSnap ? to : cur + (to - cur) * (1 - Math.exp(-fDt / tau)));
  /** exact while the story moves at its own pace; eased (never snapped) after a jump */
  const trk = (cur: number, to: number, lim: number) => {
    if (fSnap) return to;
    const d = to - cur;
    if (Math.abs(d) <= lim * (fDt / 16)) return to;
    return cur + d * (1 - Math.exp(-fDt / 150));
  };
  let [psi, psiV] = [PSI_KEYS[0][1], 0]; // the turret, degrees (and degrees / ms)
  const itemK = new Float32Array(N_BOX);
  // the caustics on the wall: x, y, 2σ², strength (hub, then the three nodes)
  const cau = new Float32Array(16);
  const seeW = new THREE.Vector2(); // the finder on the wall (through the camera)
  let [seeRead, govR, sealK, sealTxtK, tickN, tickA] = [0, 0, 0, 0, 0, 0];
  let [phForm, phVio, phRead, phBrk, phIn, eyeK, stampK] = [0, 0, 0, 0, 0, 0, 0];
  let lineY = 1.1; // the station's y on the wall (set in resize)
  const tmpV = new THREE.Vector3();
  // the shadow: the mark's plane and axes in world space (from lens.matrixWorld)
  const sh = { ox: 0, oy: 0, oz: 0, nx: 0, ny: 0, nz: 1, ux: 1, uy: 0, uz: 0, vx: 0, vy: 1, vz: 0, k: 0 };

  /** how much of the mark's silhouette shades this wall point (0..1) */
  function shadowAt(x: number, y: number) {
    // (hot path: plain locals, no destructuring allocations)
    const dx = x - LIGHT.x, dy = y - LIGHT.y, dz = WALL_Z - LIGHT.z; // prettier-ignore
    const den = sh.nx * dx + sh.ny * dy + sh.nz * dz;
    if (Math.abs(den) < 1e-4) return 0;
    const s = sh.k / den;
    const hx = LIGHT.x + dx * s - sh.ox, hy = LIGHT.y + dy * s - sh.oy, hz = LIGHT.z + dz * s - sh.oz; // prettier-ignore
    const u = hx * sh.ux + hy * sh.uy + hz * sh.uz;
    const v = hx * sh.vx + hy * sh.vy + hz * sh.vz;
    if (u * u + v * v > 1.9) return 0;
    return 1 - smooth(clamp01((logoSDF(u, v) + 0.03) / 0.08));
  }
  /** a lens-local point, projected onto the wall from a source (into tmpV) */
  const castToWall = (x: number, y: number, z: number, from: THREE.Vector3) => {
    tmpV.set(x, y, z).applyMatrix4(lens.matrixWorld);
    const s = (WALL_Z - from.z) / (tmpV.z - from.z);
    return tmpV.set(from.x + (tmpV.x - from.x) * s, from.y + (tmpV.y - from.y) * s, WALL_Z);
  };
  /** the wall's luminance → glyph density: an even key light (no pool, no halo), the
   *  mark's shadow, the caustics its lenses focus. Dark card: density = light. Pale card:
   *  density = shade (ink), the caustics burn clean holes. */
  function toneAt(x: number, y: number) {
    let ca = 0;
    for (let i = 0; i < 4; i++) {
      const dx = x - cau[i * 4];
      const dy = y - cau[i * 4 + 1];
      ca += cau[i * 4 + 3] * Math.exp(-(dx * dx + dy * dy) / cau[i * 4 + 2]);
    }
    const s = shadowAt(x, y);
    return clamp01(dark ? 0.22 * (1 - 0.85 * s) + 0.62 * ca : 0.1 + 0.5 * s - 0.6 * ca);
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

  const ditherG = (T: number, b: number) => RAMP_G[Math.max(0, Math.min(9, Math.round(T * 9 + (b - 0.5) * 1.1)))];
  let scrStep = 0;
  const scr = (c: number, r: number) => SCR_G[Math.floor(hash3(c, r, scrStep) * SCR_G.length)];

  function writeField(now: number) {
    placeFragments(now);
    scrStep = Math.floor(now / 70);
    const nTxt = SEAL_TXT.length + 1;
    for (let r = 0; r < ROWS; r++) {
      const y = rowYs[r];
      for (let c = 0; c < COLS; c++) {
        const id = r * COLS + c;
        const x = cellXs[c];
        // 03: the stamp, on its own clear card (nothing of the ledger runs through it):
        // it stays, the origin of the ledger
        if (stampK > 0.001 && r >= TAG_ROW - 1 && r <= TAG_ROW + 1 && c >= cardC0 && c <= cardC1) {
          put(c, r, 0, 0); // the card itself is drawn in front of the glass
          continue;
        }
        // 03: the ledger, revealed WHOLE ROWS at a time outward from the stamp's row: a
        // row is either traffic or resolved ledger, nothing in between
        if (govR > 0.01 && Math.abs(y - stampY) <= govR) {
          const sI = sealIdx[id];
          const typed = sI === 255 || sealTxtK * nTxt - sI >= 1;
          put(c, r, ledG[id] && typed ? ledG[id] : 0, ledOp[id]);
          continue;
        }
        // 01: what the finder found stays resolved
        const ii = itemIdx[id];
        if (ii !== 255 && itemK[ii] > 0.001) {
          const u = itemK[ii] * 1.3 - hDec[id] * 0.3;
          if (u > 0.99) put(c, r, itemG[id], OP.name);
          else if (u > 0) put(c, r, scr(c, r), OP.scr);
          if (u > 0) continue;
        }
        // 01: the finder reads the traffic under it
        if (seeRead > 0.001 && Math.hypot(x - seeW.x, y - seeW.y) < READ_R) {
          put(c, r, logG[id], OP.log * seeRead);
          continue;
        }
        // traffic: the image, lightly corrupted: a small drift, flickering thresholds,
        // a few word fragments
        const step = Math.floor(now / 120 + h0[id] * 5);
        const qx = x + (vnoise(c / 7 - now * 0.00035, r / 3, 1) - 0.5) * 0.22;
        const qy = y + (vnoise(c / 7 + now * 0.00025, r / 3 - now * 0.0003, 2) - 0.5) * 0.16;
        const T = toneAt(qx, qy) + (vnoise(c / 2.5 + now * 0.0004, r / 1.5, 3) - 0.5) * 0.14 + (hash3(c, r, step) - 0.5) * 0.14;
        const jit = 128 + Math.round((hash3(c, r, step + 7919) - 0.5) * 60);
        const fg = fragBuf[id];
        if (fg) put(c, r, fg, OP.frag, 0, jit);
        else {
          const g = ditherG(clamp01(T), hash3(c, r, step + 31));
          put(c, r, g, OP.d0 + OP.d1 * RAMP_G.indexOf(g), 0, jit);
        }
      }
    }

    // 02: the line on the station. It resolves outward from the finder (violet: found);
    // SECURE takes its middle, which the eyepiece shows scrambling into "[stripped]";
    // then the violet fades to ink and the line is clean
    bigL.w = phForm > 0.001 ? 1 : 0;
    if (bigL.w > 0) {
      const fl = Math.floor(now / 80);
      for (let j = 0; j < N_BIG; j++) {
        const hj = hash3(j, 3, 17);
        const mid = j >= BRK[0] && j < BRK[1];
        const ub = mid ? phBrk * 1.5 - (Math.abs(j + 0.5 - (BRK[0] + BRK[1]) / 2) / 5) * 0.5 : 0;
        // (the cut is tested BEFORE the phrase's spaces: "[stripped]" has a letter where
        // "previous instructions" has its space — skipping spaces first blanked that "p")
        if (phForm < hj * 0.7 + 0.05 || (ub <= 0 && PHRASE_G[j] === 0)) {
          putBig(j, 0, 0, 0);
          continue;
        }
        if (ub > 0.45) {
          putBig(j, STRIPPED_G[j - BRK[0]], OP.stripped, 0); // ink: no longer violet
          continue;
        }
        if (ub > 0) {
          putBig(j, scr(j, 99), OP.scr, phVio * (1 - ub * 2));
          continue;
        }
        const xj = BIG_X0 + (j + 0.5) * BCW;
        const decoded = Math.abs(xj) < 0.12 + phRead * 1.3 - hj * 0.15;
        const g = decoded ? PHRASE_G[j] : DENSE_G[Math.floor(hash3(j, 5, fl) * DENSE_G.length)];
        // the payload (the middle) is the subject; the line's far ends fade away gracefully
        const far = 1 - 0.7 * smooth(clamp01((Math.abs(xj) - 0.9) / 0.16)); // only the outer ~20% of each flank
        const op = (decoded ? OP.phInk + (OP.phVio - OP.phInk) * phVio : OP.frag) * far;
        putBig(j, g, op, decoded ? phVio : 0, decoded ? 128 : 128 + Math.round((hash3(j, 7, fl) - 0.5) * 60));
      }
      bigTex.needsUpdate = true;
    }
    stateTex.needsUpdate = true;
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
    const tilt = TILT + Math.sin((nowMs / 23000) * TAU + 1.1) * 0.015 + lean.y * 0.05;
    rig.rotation.set(tilt, yaw, 0);
    rig.position.y = Math.sin((nowMs / 19000) * TAU) * 0.015;
    scene.environmentRotation.set(0, Math.sin((nowMs / 37000) * TAU) * 0.3, 0);

    /* the turret: a critically damped spring on the keyed angle that feeds forward the
       keyed velocity, so it tracks exactly in play and, after a jump, catches up along
       the shortest path (every station step is < 180°, so that is forward) */
    const target = psiTarget(t);
    if (fSnap) {
      psi = target;
      psiV = 0;
    } else {
      const tv = wrap180(psiTarget(Math.min(LOOP_MS, t + 1)) - psiTarget(Math.max(0, t - 1))) / 2;
      const w = PSI_W / 1000;
      const n = Math.ceil(fDt / 8);
      const h = fDt / n;
      let d = wrap180(target - psi);
      for (let i = 0; i < n; i++) {
        psiV += (w * w * d - 2 * w * (psiV - tv)) * h;
        psi += psiV * h;
        d = wrap180(target - psi);
      }
    }
    psi = target - wrap180(target - psi); // stay in this loop's range (−142 ≡ 218 at the wrap)
    lens.rotation.z = deg(psi);
    rig.updateMatrixWorld(true);
    const m = lens.matrixWorld.elements;
    sh.ux = m[0]; sh.uy = m[1]; sh.uz = m[2]; sh.vx = m[4]; sh.vy = m[5]; sh.vz = m[6]; // prettier-ignore
    sh.nx = m[8]; sh.ny = m[9]; sh.nz = m[10]; sh.ox = m[12]; sh.oy = m[13]; sh.oz = m[14]; // prettier-ignore
    sh.k = sh.nx * (sh.ox - LIGHT.x) + sh.ny * (sh.oy - LIGHT.y) + sh.nz * (sh.oz - LIGHT.z);
    // the caustics: the hub focuses a bright core into its own shadow; each node a small
    // spot that travels with the turn
    const hc = castToWall(0, 0, 0, LIGHT);
    cau[0] = hc.x; cau[1] = hc.y; cau[2] = 2 * 0.13 * 0.13; cau[3] = 0.7; // prettier-ignore
    for (let k = 0; k < 3; k++) {
      const nc = castToWall(NODE_X[k], NODE_Y[k], 0, LIGHT);
      const o = 4 + k * 4;
      cau[o] = nc.x; cau[o + 1] = nc.y; cau[o + 2] = 2 * 0.055 * 0.055; cau[o + 3] = 0.45; // prettier-ignore
    }
    const C = camera.position;
    const sw = castToWall(NODE_X[0], NODE_Y[0], 0, C);
    seeW.set(sw.x, sw.y);

    /* the tools: the active one lit (engraving / metal brighter, its number in full ink);
       the numbers stay upright, low right on each face */
    const cp = Math.cos(-deg(psi));
    const sp = Math.sin(-deg(psi));
    tools.forEach((tl, k) => {
      tl.lit = trk(tl.lit, litTarget(k, t), 0.08);
      (tl.num.material as THREE.MeshBasicMaterial).opacity = 0.45 + 0.55 * tl.lit;
      tl.num.rotation.z = -deg(psi);
      tl.num.position.set(NODE_X[k] + NUM_OFF[0] * cp - NUM_OFF[1] * sp, NODE_Y[k] + NUM_OFF[0] * sp + NUM_OFF[1] * cp, ZF + 0.005);
    });
    // idle tools stay glass-weight; the one on the station takes its full weight
    reticleMat.opacity = 0.2 + 0.75 * tools[0].lit;
    cutterMat.opacity = 0.28 + 0.72 * tools[1].lit;
    cutterMat.envMapIntensity = (dark ? 1.0 : 0.8) + 0.7 * tools[1].lit;
    sealMat.opacity = smooth(tools[2].lit);
    sealFace.visible = sealMat.opacity > 0.004;
    ringsMat.opacity = 0.2 + 0.1 * tools[2].lit;

    /* 01: the finder reads under itself while it sweeps; each shadow-AI row it passes
       resolves and keeps its bracket (ψ only decreases through the loop) */
    seeRead = trk(seeRead, t < 3300 ? smooth(seg(t, 100, 400)) : 1 - smooth(seg(t, 3300, 3600)), 0.08);
    ITEMS.forEach((it, i) => {
      const found = t < PH.end && psi <= it.at + 4 && t > 150 ? 1 : 0;
      itemK[i] = trk(itemK[i], found, 0.08);
      const cover = govR > 0.01 && govR >= Math.abs(itemCen[i].y - stampY) ? 1 : 0; // its row has turned to ledger
      boxK[i] = Math.min(itemK[i], 1 - cover);
    });

    /* 02: the line forms on the station and resolves under the finder; SECURE takes its
       middle (the flanks close to its rim), the eyepiece shows the cut; violet fades */
    const live = t >= PH.form0 && t < PH.end ? 1 : 0;
    phForm = follow(phForm, live * smooth(seg(t, PH.form0, PH.form1)), 90);
    phRead = follow(phRead, smooth(seg(t, PH.read0, PH.read1)), 70);
    phVio = follow(phVio, smooth(seg(t, PH.vio0, PH.vio1)) * (1 - smooth(seg(t, PH.neu0, PH.neu1))), 90);
    phBrk = follow(phBrk, seg(t, PH.brk0, PH.brk1), 60);
    phIn = trk(phIn, smooth(seg(t, PH.in0, PH.in1)) * (1 - smooth(seg(t, PH.out0, PH.out1))), 0.08);
    eyeK = trk(eyeK, phIn, 0.08);
    spread.value = -SPREAD_IN * phIn;
    hideMid.value = phIn; // the middle fades as the flanks close onto the node's rim
    const hw = castToWall(0, 0, 0, C);
    const hs = (WALL_Z - C.z) / (sh.oz - C.z);
    eye.set(hw.x - FX, hw.y - FY, HUB_R * EYE_K * hs * smooth(eyeK), eyeK > 0.02 ? 1 : 0);

    /* 03: GOVERN stamps the clean line; from the stamp the ledger sweeps out; the ticks
       count round the ring; the seal; the fold back into noise */
    stampK = trk(stampK, t < 11150 ? seg(t, STAMP.t0, STAMP.t1) : 0, 0.1); // it goes last, as the ledger collapses into it
    const press = 1 + 0.35 * (1 - smooth(stampK)); // the box lands: a small press, no bounce
    const [tx0, ty0, tx1, ty1] = tagBox;
    const tcx = (tx0 + tx1) / 2;
    const tcy = (ty0 + ty1) / 2;
    tag.set(tcx + (tx0 - tcx) * press - FX, tcy + (ty0 - tcy) * press - FY, tcx + (tx1 - tcx) * press - FX, tcy + (ty1 - tcy) * press - FY);
    // an even pace outward, so at t 9500 the front is still visible in the field's lower right
    const gr = t < GOV.out0 ? seg(t, GOV.sweep0, GOV.sweep1) : Math.min(seg(t, GOV.sweep0, GOV.sweep1), 1 - smooth(seg(t, GOV.out0, GOV.out1)));
    govR = trk(govR, GOV.reach * gr, 0.08);
    gov.z = govR;
    tagK.value = 0; // (the stamp's box is on its card, in front of the glass)
    card.visible = stampK > 0.001;
    card.scale.setScalar(cardS * press);
    cardMat.opacity = clamp01(stampK * 1.6);
    sealK = trk(sealK, t < GOV.out0 ? smooth(seg(t, LOG_T.seal, LOG_T.seal + 260)) : 0, 0.1);
    sealTxtK = trk(sealTxtK, t < GOV.out0 ? seg(t, GOV.txt0, GOV.txt1) : 0, 0.08);
    head.w = clamp01((govR - Math.abs(rowY(LED_HEAD) - stampY)) / 0.3); // drawn as the header row arrives
    seal.w = Math.min(sealK, head.w);
    for (const r of boxedRows) polBox[ROWS - 1 - r] = govR > 0.01 && govR >= Math.abs(rowYs[r] - stampY) ? 1 : 0;
    tickN = trk(tickN, t >= LOG_T.in && t < GOV.out0 ? N_TICK * seg(t, LOG_T.in, LOG_T.seal) : 0, N_TICK);
    tickA = trk(tickA, t >= LOG_T.in && t < GOV.out0 ? 1 : 0, 0.06);
    ticks.count = Math.min(N_TICK, Math.floor(tickN + 0.001));
    ticks.visible = tickA > 0.01 && ticks.count > 0;
    tickMat.opacity = (dark ? 0.72 : 0.7) * tickA;

    // the glyph state: a few dozen times a second is plenty for discrete cells
    if (fSnap || lastWrite < 0 || nowMs - lastWrite >= 30) {
      writeField(nowMs);
      lastWrite = nowMs;
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
      camera.position.set(0, 0.25, 10.2);
    } else {
      camera.fov = 24;
      camera.clearViewOffset();
      const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const hHalf = vHalf * camera.aspect;
      camera.position.set(0, 0.2, Math.max(1.55 / vHalf, 1.55 / hHalf));
    }
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // the station (the ring's centreline at 12 o'clock) as seen from the camera: the
    // injected line runs there
    const C = camera.position;
    lineY = C.y + ((Math.cos(TILT) - C.y) * (C.z - WALL_Z)) / (C.z - Math.sin(TILT));
    bigL.x = lineY - FY;
    // the stamp's card: on a plane in front of the mark, over its wall spot as seen
    cardS = (CARD_Z - C.z) / (WALL_Z - C.z);
    card.position.set(C.x + (stampX - C.x) * cardS, C.y + (stampY - C.y) * cardS, CARD_Z);
    lastWrite = -1;
  }

  /** a lens-local point → stage px (in tmpV.x / tmpV.y) */
  const toStage = (x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(lens.matrixWorld).project(camera);
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
    // the turret carries its own numbered tools round: the page's labels step aside
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      const c = toStage(0, 0, 0);
      const cx = c.x;
      const cy = c.y;
      const ex = toStage(MARK_R, 0, 0);
      return Math.hypot(x - cx, y - cy) <= Math.max(1, Math.hypot(ex.x - cx, ex.y - cy));
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      atlas.dispose();
      atlasB.dispose();
      [numTex, reticleTex, ringsTex, sealTex, cardMat.map].forEach((x) => x?.dispose());
      stateTex.dispose();
      bigTex.dispose();
      pillow.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
