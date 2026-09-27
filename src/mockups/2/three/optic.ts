/* Hero scene B for mockup 11: "The deploying optic".
 *
 * The Blindsight mark (orbit radius = 1) as a folding optical instrument over dithered
 * ASCII traffic. Parts live in mark coords inside pivots, so the deployed pose is the
 * logo: a glass lens hub in a chrome bezel; glass arm+node leaves on hairline chrome
 * pins (they fold back 96°; the clevis plates retract flush once locked); thin glass
 * arcs with chrome edges, stowed nested behind the hub, that spin 100° out and seat.
 * The wall is a dithered IMAGE of light: an even key light (no pool), the instrument's
 * projected shadow and the caustics its lenses focus (hub core, node spots that travel
 * with the turn). Drawn into the transmission pass: the glass shifts it, sampled
 * bilinearly (not three's blurring bicubic) so glyphs stay crisp.
 *   01 See     the aperture opens with the arcs; after the lock the disc resolves into a
 *              log, four shadow-AI rows ink-bracketed.
 *   02 Secure  the disc dims; a violet line in large type crosses the ring's top; the
 *              lens turns 90°, node 0 lands on it and extends a flat glass loupe: the
 *              cut chars show only inside it, whole, at ~2× ("[stripped]"), the flanks
 *              part around it ("ignore pr" … "tructions"); then the violet crumbles.
 *   03 Govern  a sweep out from the lens turns the WHOLE field into an ordered ledger
 *              (time, user, app, size, policy; masked/blocked boxed); the header rule
 *              doubles at LOG_T.seal. Then the fold: arcs, then arms; order collapses in.
 * Story values follow tMs and ease from what is on screen (the roll: a damped spring).
 */
import { THREE, createRenderer, type Theme } from "./core";

export const LOOP_MS = 12000;
/** A calm, representative still (reduced motion): deployed, governed, sealed. */
export const SETTLED_MS = 9800;
/** When the DOM audit-trail row should appear, seal (= the ledger's double rule) and clear. */
export const LOG_T = { in: 7750, seal: 9000, out: 10600 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 0, t1: 3800 },
  { n: "02", label: "Secure it", t0: 3800, t1: 7200 },
  { n: "03", label: "Govern it", t0: 7200, t1: 11400 },
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
/** hardware ease: a gentle start, arrives with speed and stops dead (no overshoot) */
const clack = (x: number) => x * x * (2 - x);
const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/* ---------- the mark (orbit radius = 1) ---------- */
const [HUB_R, NODE_R, BAND, ARM_W] = [0.5, 0.25, 0.22, 0.17];
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const NODE_X = NODE_A.map((a) => Math.cos(deg(a)));
const NODE_Y = NODE_A.map((a) => Math.sin(deg(a)));
const GAP = 20; // half-gap of the orbit at each node, degrees
const [SLAB_D, HUB_D, ARC_D] = [0.04, 0.07, 0.022]; // slab core depths: arms, the lens element, the thin arcs
const [BEVEL, ARC_BEV] = [0.035, 0.022]; // the arcs' bevel is their chrome edge
const HINGE_R = 0.6; // the hinge pins' radius (the arm leaves pivot here)
const [BEZEL_T, PIN_R, PLATE_L] = [0.032, 0.009, 0.15];
/* the glass: transmission thickness (how far it shifts what is behind) and the edge
   roll of the face normals. Kept low so glyphs shift and bend but stay crisp. */
const [GLASS_BEND, HUB_BEND] = [0.1, 0.15];
const [ROLL_ZONE, ROLL_SLOPE, HUB_ZONE, HUB_SLOPE] = [0.04, 0.2, 0.08, 0.22];

/* ---------- the deploy ---------- */
const FOLD_ANG = 96; // arms folded back behind the hub, degrees
const ARC_TURN = 100; // the arcs spin this far about the hub axis to deploy
const ARC_S0 = [0.47, 0.43, 0.39]; // stowed: nested radii behind the hub
const ARC_Z0 = [-0.14, -0.2, -0.26]; // … and stacked in depth
const ARC_ZT = -0.13; // the track: behind the arms' plane until the arcs seat
const DEP = { arm: 120, armStag: 80, armDur: 560, arc: 640, arcStag: 110, arcDur: 520, seat: 120 }; // locked by 1500
const FOLD = { arc: 10500, arcStag: 90, seat: 110, arcDur: 460, arm: 11240, armStag: 70, armDur: 480 }; // stowed by 11860

/* story targets (1 = deployed); before 6000 the deploy, after it the fold (reverse order) */
function armTarget(k: number, t: number) {
  const a = DEP.arm + DEP.armStag * k;
  const f = FOLD.arm + FOLD.armStag * (2 - k);
  return t < 6000 ? clack(seg(t, a, a + DEP.armDur)) : 1 - smooth(seg(t, f, f + FOLD.armDur));
}
function arcSpinTarget(k: number, t: number) {
  const a = DEP.arc + DEP.arcStag * k;
  const f = FOLD.arc + FOLD.arcStag * (2 - k) + FOLD.seat;
  return t < 6000 ? clack(seg(t, a, a + DEP.arcDur)) : 1 - smooth(seg(t, f, f + FOLD.arcDur));
}
function arcSeatTarget(k: number, t: number) {
  const a = DEP.arc + DEP.arcStag * k + DEP.arcDur;
  const f = FOLD.arc + FOLD.arcStag * (2 - k);
  return t < 6000 ? seg(t, a, a + DEP.seat) ** 2 : 1 - smooth(seg(t, f, f + FOLD.seat)); // ² : it accelerates into the seat, a firm lock
}
/** the clevis plates: out while the arm swings, retracted flush just after it locks */
function plateTarget(k: number, t: number) {
  const a = DEP.arm + DEP.armStag * k + DEP.armDur;
  const f = FOLD.arm + FOLD.armStag * (2 - k);
  return t < 6000 ? 1 - smooth(seg(t, a + 60, a + 300)) : smooth(seg(t, f - 260, f - 40));
}

/* ---------- the roll (the lens turns about its own axis) ---------- */
const TILT = 0.1; // rad: the top leans a little toward the camera
/** 02 turns node 0 to 12 o'clock, onto the injected line; 03 turns home */
const ROLL_KEYS: [number, number][] = [[0, 0], [4250, 0], [5400, 90], [7300, 90], [8300, 0], [LOOP_MS, 0]];
const ROLL_W = 11; // spring stiffness (rad/s)
function rollTarget(t: number) {
  for (let i = 1; i < ROLL_KEYS.length; i++) {
    const [t1, a1] = ROLL_KEYS[i];
    if (t <= t1) {
      const [t0, a0] = ROLL_KEYS[i - 1];
      return a0 + (a1 - a0) * smooth(seg(t, t0, t1));
    }
  }
  return 0;
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
const MID_C = COLS / 2;
const RIN_W = (1 - BAND / 2) * KW; // the lens's field of view on the wall: the ring's inner disc

/* 01: the log the lens reads, and the shadow AI it finds (row offsets from RC, col
   offsets from MID_C) */
const ITEMS = [
  { text: "pdf-summariser.app", row: -2, off: -9 },
  { text: "ext: WriteGPT", row: 2, off: -6 },
  { text: "chatgpt.com - personal", row: -8, off: -8 },
  { text: "notion-ai - unapproved", row: 8, off: -8 },
];
const N_BOX = ITEMS.length;
const LOG_ROWS = [-10, -6, -4, 0, 4, 6, 10];
const LOGW = ["POST /v1/chat", "200", "gpt-4o", "812 tok", "upload", "q3-plan.docx", "GET /models", "copilot", "suggest", "embed", "tool_call", "search", "sso:m.keller", "stream", "api.openai.com", "gemini", "summarize", "invoice.pdf", "mcp://crm", "agent:finance", "read", "302", "hr-policy.pdf", "translate", "slack-bot", "reply", "claude", "ok"];
const FOOT = 0.035; // the brackets' feet
const SEE = { dec0: 1450, dec1: 1900, box0: 1750, boxStag: 140, boxDur: 260, boxOut0: 3900, boxOut1: 4250 };

/* 02: the injected line, in large type across the top of the ring, cut where node 0
   lands (its centre, x = 0, falls on the middle of BRK) */
const PHRASE = "ignore previous instructions";
const N_BIG = PHRASE.length;
const BRK = [9, 19]; // the chars under the node, which become "[stripped]"
const STRIPPED = "[stripped]";
const BIG = 1.5; // the line's type vs the wall's (≈ 15 px)
const [BCW, BCH] = [CW * BIG, CH * BIG];
const BIG_X0 = -((BRK[0] + BRK[1]) / 2) * BCW; // left edge of the line (world x)
/* the loupe: a flat glass element that node 0 extends in 02 (mark units, in front of the
   node). Inside it the cut chars read whole at ~2× the wall's type; the flanks of the
   line part to clear its rim, so outside it reads "ignore pr" … "tructions". */
const [LOUPE_MR, LOUPE_Z] = [0.4, 0.08];
const [LCW, LCH] = [CW * 1.64, CH * 1.84];
const PH = { form0: 3950, form1: 4250, vio0: 4000, vio1: 4350, read0: 5250, read1: 5850, brk0: 5600, brk1: 5950, dis0: 6400, dis1: 7100, end: 7200 };
const CATCH_R = 0.6; // the node reads the line this far around it, then the read spreads along it

/* 03: the ledger that fills the whole field (every other row), its header and seal */
const L_USERS = ["m.keller", "a.novak", "j.ruiz", "s.chen", "t.berg", "l.okafor", "r.silva", "k.ito", "p.meyer"];
const L_APPS: [string, string][] = [["chatgpt.com", "mask"], ["copilot", "allow"], ["notion-ai", "block"], ["gemini", "allow"], ["claude.ai", "allow"], ["pdf-summariser", "block"], ["WriteGPT", "block"], ["deepl.com", "mask"], ["perplexity", "allow"], ["mcp:crm-db", "mask"], ["agent:finance", "allow"], ["github-copilot", "allow"]];
const LED_C0 = 12; // first column
const LED_POL = 45; // policy column offset (time 8, user 9, app 14, size 6, gaps of 2)
const [LED_HEAD, LED_R0, LED_N] = [3, 5, 15]; // header row, first entry row, entries
const SEAL_TXT = "sealed"; // under the table's top rule, in the policy column
const [SEAL_ROW, SEAL_C] = [LED_HEAD + 1, LED_C0 + LED_POL];
const GOV = { sweep0: 7300, sweep1: 8800, reach: 2.8, txt0: 9050, txt1: 9350 };

/* the noise and the dither */
const RAMP = " .:-=+*#%@";
const DENSE = "#%@*+=";
const FADE = "%+:. ";
const SCR = "abcdefghijklmnopqrstuvwxyz0123456789:._-/";
const FRAGS = ["prompt", "upload", "gpt-4o", "token", "api/v1", "agent", "invoice.pdf", "copilot", "POST /chat", "summarize", "mcp://", "payroll.csv", "claims.xlsx", "tool_call"];
const N_FRAG = 7;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const LIGHT = new THREE.Vector3(-4, 5, 13); // the key light: casts the shadow, feeds the caustics

const gi = (ch: string) => {
  const k = ch.charCodeAt(0) - 32;
  return k > 0 && k < 95 ? k : 0;
};
const [RAMP_G, DENSE_G, FADE_G, SCR_G, PHRASE_G, STRIPPED_G] = [RAMP, DENSE, FADE, SCR, PHRASE, STRIPPED].map((s) => [...s].map(gi));

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

/* ---------- signed distances (mark units) ---------- */
/** the three arms + nodes: capsules from `start` out to where the (folded) node now
 *  projects; C[k] = cos of arm k's fold (1 = deployed) */
function armsSDF(x: number, y: number, C: ArrayLike<number>, start: number) {
  let d = Infinity;
  for (let k = 0; k < 3; k++) {
    const c = C[k];
    const nx = NODE_X[k];
    const ny = NODE_Y[k];
    const reach = HINGE_R + (1 - HINGE_R) * c;
    const tt = Math.min(reach, Math.max(start, x * nx + y * ny));
    d = Math.min(d, Math.hypot(x - nx * tt, y - ny * tt) - ARM_W / 2, Math.hypot(x - nx * reach, y - ny * reach) - NODE_R * (0.35 + 0.65 * c));
  }
  return d;
}
/** the three arcs at radius S[k], turned PHI[k] degrees about the hub axis */
function arcsSDF(x: number, y: number, S: ArrayLike<number>, PHI: ArrayLike<number>) {
  const r = Math.hypot(x, y);
  let a = (Math.atan2(y, x) * 180) / Math.PI;
  if (a < 0) a += 360;
  let d = Infinity;
  for (let k = 0; k < 3; k++) {
    const s = S[k];
    const a0 = NODE_A[k] + GAP + PHI[k];
    const span = (NODE_A[k + 1] ?? 360) - NODE_A[k] - 2 * GAP;
    const da = (((a - a0) % 360) + 360) % 360;
    const hb = (BAND / 2) * s;
    let dk: number;
    if (da <= span) dk = Math.abs(r - s) - hb;
    else {
      const e = deg(da - span < 360 - da ? a0 + span : a0);
      dk = Math.hypot(x - s * Math.cos(e), y - s * Math.sin(e)) - hb;
    }
    if (dk < d) d = dk;
  }
  return d;
}
const ONES = [1, 1, 1];
const ZEROS = [0, 0, 0];

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

/** The lens element: a disc, inset by the bevel. */
function hubShape() {
  const s = new THREE.Shape();
  s.absarc(0, 0, HUB_R - BEVEL, 0, TAU, false);
  return s;
}

/** One arm leaf + its node, in mark coords (so the cap UVs are mark x, y): a rounded
 *  root around the hinge pin, the bar, the node. */
function armShape(aDeg: number) {
  const a = deg(aDeg);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const hw = ARM_W / 2 - BEVEL;
  const nr = NODE_R - BEVEL;
  const aNode = Math.asin(hw / nr);
  const uNode = 1 - Math.sqrt(nr * nr - hw * hw);
  const px = (u: number, v: number) => ca * u - sa * v;
  const py = (u: number, v: number) => sa * u + ca * v;
  const s = new THREE.Shape();
  s.moveTo(px(HINGE_R, -hw), py(HINGE_R, -hw));
  s.lineTo(px(uNode, -hw), py(uNode, -hw));
  s.absarc(ca, sa, nr, a - (Math.PI - aNode), a + (Math.PI - aNode), false);
  s.lineTo(px(HINGE_R, hw), py(HINGE_R, hw));
  s.absarc(px(HINGE_R, 0), py(HINGE_R, 0), hw, a + Math.PI / 2, a + (3 * Math.PI) / 2, false);
  return s;
}

/** One orbit arc as a flat band with rounded ends. */
function arcShape(a0: number, a1: number, bev: number) {
  const hw = BAND / 2 - bev;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}

/** A tangent-space normal map for the flat faces (UVs = mark x, y, deployed pose):
 *  flat in the middle, a gentle roll toward every edge (wider on the lens element). */
function pillowNormals() {
  const N = 512;
  const S = 2.7; // covers mark coords -1.35 … 1.35
  const h = S / N;
  const d = new Float32Array(N * N);
  const hub = new Uint8Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x = -S / 2 + h * (i + 0.5);
      const y = -S / 2 + h * (j + 0.5);
      const dh = Math.hypot(x, y) - HUB_R;
      const dr = Math.min(armsSDF(x, y, ONES, HINGE_R), arcsSDF(x, y, ONES, ZEROS));
      d[j * N + i] = Math.min(dh, dr);
      hub[j * N + i] = dh < dr ? 1 : 0;
    }
  const out = new Uint8Array(N * N * 4);
  const edge = -BEVEL;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const id = j * N + i;
      const zone = hub[id] ? HUB_ZONE : ROLL_ZONE;
      const maxs = hub[id] ? HUB_SLOPE : ROLL_SLOPE;
      let nx = 0;
      let ny = 0;
      const q = (d[id] - (edge - zone)) / zone;
      if (q > 0 && d[id] < 0.02) {
        const gx = d[j * N + Math.min(i + 1, N - 1)] - d[j * N + Math.max(i - 1, 0)];
        const gy = d[Math.min(j + 1, N - 1) * N + i] - d[Math.max(j - 1, 0) * N + i];
        const gl = Math.hypot(gx, gy) || 1;
        const s = maxs * Math.pow(clamp01(q), 1.7);
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

/** The edge: a fresnel hairline where the surface turns away from the eye (bevels and
 *  sides), never on the faces. Bright on the dark card, ink on the pale one. */
function rimMaterial(color: THREE.Color, strength: number) {
  const c = color.clone().convertLinearToSRGB();
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { col: { value: new THREE.Vector3(c.r, c.g, c.b) }, k: { value: strength } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV;
      void main() { float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(col, smoothstep(0.55, 0.95, f) * k); }`,
  });
}

/** White mono glyphs (ASCII 32–126) on black, 16 × 6 cells; the shader reads .r. */
function glyphAtlas(weight: number) {
  const [GW, GH] = [48, 86]; // same ratio as a wall cell
  const c = document.createElement("canvas");
  [c.width, c.height] = [16 * GW, 6 * GH];
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  Object.assign(g, { fillStyle: "#fff", font: `${weight} 54px "IBM Plex Mono", ui-monospace, monospace`, textAlign: "center", textBaseline: "alphabetic" });
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
const FIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FIELD_FRAG = /* glsl */ `
  uniform sampler2D uState;
  uniform sampler2D uAtlas;
  uniform sampler2D uBig;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uVio;
  uniform vec4 uBox[${N_BOX}];
  uniform float uBoxK[${N_BOX}];
  uniform float uBoxA;
  uniform vec4 uBigL; // the injected line: centre y, left edge x, -, on
  uniform vec4 uLoupe; // the loupe on the wall: centre xy, radius now, on
  uniform float uSpread; // how far the line's flanks part around it
  uniform float uPolBox[${ROWS}]; // per texture row: the policy box (03)
  uniform vec2 uPolX;
  uniform vec4 uHead; // rules: y, x0, x1, drawn 0..1
  uniform vec4 uSeal;
  uniform float uLedA;
  uniform float uPerc; // 1: colours are sRGB and mixed perceptually (the pale card)
  uniform float uTint; // a faint grey behind the glass, so the transmission reads
  uniform vec2 uCen; // the mark's centre on the wall (field-local)
  varying vec2 vUv;
  float hair(float d, float hw, float px) { return 1.0 - smoothstep(hw - 0.5 * px, hw + 0.5 * px, d); }
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
    // 02: the injected line in large type. Inside the loupe (node 0's extended lens)
    // only the cut chars, whole, at the loupe's type; outside it the line's flanks part
    // by uSpread to clear its rim, and the chars under it are not drawn at all
    vec2 dl = p - uLoupe.xy;
    float on = step(0.001, uLoupe.w);
    float inL = step(length(dl), uLoupe.z) * on;
    float qx = p.x + (p.x < uLoupe.x ? uSpread : -uSpread);
    vec2 b = vec2((qx - uBigL.y) / ${F(BCW)}, (p.y - uBigL.x) / ${F(BCH)} + 0.5);
    vec2 lb = vec2(dl.x / ${F(LCW)} + ${F((BRK[1] - BRK[0]) / 2)}, dl.y / ${F(LCH)} + 0.5);
    vec2 bdx = dFdx(b) / vec2(16.0, 6.0);
    vec2 bdy = dFdy(b) / vec2(16.0, 6.0);
    vec2 ldx = dFdx(lb) / vec2(16.0, 6.0);
    vec2 ldy = dFdy(lb) / vec2(16.0, 6.0);
    vec4 sb = vec4(0.0);
    float aB = 0.0;
    if (uBigL.w > 0.001) {
      if (inL > 0.5) {
        if (lb.x >= 0.0 && lb.x < ${F(BRK[1] - BRK[0])} && lb.y >= 0.0 && lb.y < 1.0) {
          float cb = floor(lb.x);
          sb = texture2D(uBig, vec2((cb + ${F(BRK[0] + 0.5)}) / ${F(N_BIG)}, 0.5));
          aB = glyph(floor(sb.r * 255.0 + 0.5), vec2(lb.x - cb, lb.y), sb.a, ldx, ldy) * sb.g;
        }
      } else if (b.x >= 0.0 && b.x < ${F(N_BIG)} && b.y >= 0.0 && b.y < 1.0) {
        float cb = floor(b.x);
        float hide = on * step(${F(BRK[0])}, cb) * step(cb, ${F(BRK[1] - 1)});
        sb = texture2D(uBig, vec2((cb + 0.5) / ${F(N_BIG)}, 0.5));
        aB = glyph(floor(sb.r * 255.0 + 0.5), vec2(b.x - cb, b.y), sb.a, bdx, bdy) * sb.g * (1.0 - hide);
      }
    }
    // the fine glyphs make way (whole cells) for the line and inside the loupe
    vec2 cc = (cell + 0.5) * CELL - HALF;
    float strip = step(abs(cc.y - uBigL.x), ${F(BCH * 0.5 + CH * 0.4)}) * step(uBigL.y - uSpread - ${F(CW)}, cc.x) * step(cc.x, uBigL.y + uSpread + ${F(N_BIG * BCW + CW)});
    float lp = step(length(cc - uLoupe.xy), uLoupe.z + ${F(CW * 0.7)}) * on;
    a *= 1.0 - step(0.001, uBigL.w) * max(strip, lp);
    vec2 e = min(g, GRID - g);
    float fade = smoothstep(0.0, 2.5, e.x) * smoothstep(0.0, 1.6, e.y);
    float rc = length(p - uCen);
    vec3 bg = uBg * (1.0 - uTint * (1.0 - smoothstep(0.5, 2.0, rc)));
    vec3 c = mix(bg, mix(uInk, uVio, s.b), a * fade);
    c = mix(c, mix(uInk, uVio, sb.b), aB * fade);
    float hw = max(0.003, 0.55 * px);
    // 01: ink brackets around what the lens found
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
    // 03: the ledger's policy boxes (masked / blocked), header rule and seal
    float led = max(rule(uHead, p, hw, px), rule(uSeal, p, hw, px));
    float kb = uPolBox[int(cell.y)];
    if (kb > 0.001) {
      float yb = cell.y * CELL.y - HALF.y;
      float y0 = yb + ${F(0.1 * CH)};
      float y1 = yb + ${F(0.9 * CH)};
      float inx = step(uPolX.x - hw, p.x) * step(p.x, uPolX.y + hw);
      float iny = step(y0 - hw, p.y) * step(p.y, y1 + hw);
      float ex = max(hair(abs(p.x - uPolX.x), hw, px), hair(abs(p.x - uPolX.y), hw, px)) * iny;
      float ey = max(hair(abs(p.y - y0), hw, px), hair(abs(p.y - y1), hw, px)) * inx;
      led = max(led, max(ex, ey) * kb);
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
    ? { d0: 0.18, d1: 0.017, frag: 0.33, name: 0.74, log: 0.36, led: 0.62, pol: 0.4, scr: 0.39, phInk: 0.6, phVio: 1, stripped: 0.66, rule: 0.36, box: 0.62 }
    : { d0: 0.3, d1: 0.017, frag: 0.42, name: 0.72, log: 0.5, led: 0.64, pol: 0.48, scr: 0.5, phInk: 0.7, phVio: 1, stripped: 0.74, rule: 0.5, box: 0.7 };
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
  const boxK = new Float32Array(N_BOX);
  const polBox = new Float32Array(ROWS);
  const boxGeo = ITEMS.map((it) => {
    const y = rowY(RC + it.row) - FY;
    const c0 = MID_C + it.off;
    return new THREE.Vector4(cellX(c0) - CW / 2 - FX - 0.03, y - CH * 0.46, cellX(c0 + it.text.length - 1) + CW / 2 - FX + 0.03, y + CH * 0.46);
  });
  const ledX0 = cellX(LED_C0) - CW / 2 - FX;
  const ledX1 = cellX(LED_C0 + LED_POL + 5) + CW / 2 - FX;
  const headY = rowY(LED_HEAD) - CH / 2 - FY - 0.004;
  const head = new THREE.Vector4(headY, ledX0, ledX1, 0);
  const seal = new THREE.Vector4(headY - 0.016, ledX0, ledX1, 0); // the second rule: sealed
  const polX = new THREE.Vector2(cellX(LED_C0 + LED_POL) - CW / 2 - FX - 0.02, cellX(LED_C0 + LED_POL + 4) + CW / 2 - FX + 0.02);
  const bigL = new THREE.Vector4(1.1 - FY, BIG_X0 - FX, 0, 0);
  const loupe = new THREE.Vector4(0, 0, 0, 0);
  const spread = { value: 0 };
  // opaque, depth-writing, default render order: drawn into the transmission target,
  // so the glass refracts it
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: stateTex }, uAtlas: { value: atlas }, uBig: { value: bigTex },
      uBg: { value: colU(bg) }, uInk: { value: colU(ink) }, uVio: { value: colU(signalCol) },
      uPerc: { value: dark ? 0 : 1 }, uTint: { value: 0 }, uCen: { value: new THREE.Vector2(-FX, MARK_YW - FY) },
      uBox: { value: boxGeo }, uBoxK: { value: boxK }, uBoxA: { value: OP.box },
      uBigL: { value: bigL }, uLoupe: { value: loupe }, uSpread: spread,
      uPolBox: { value: polBox }, uPolX: { value: polX }, uHead: { value: head }, uSeal: { value: seal }, uLedA: { value: OP.rule },
    },
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), fieldMat);
  field.position.set(FX, FY, WALL_Z);
  scene.add(field);

  // per-cell constants
  // flicker phase, decode / sweep order, distance from the mark's centre on the wall, Bayer
  const [h0, hDec, dist, bay] = [new Float32Array(NC), new Float32Array(NC), new Float32Array(NC), new Float32Array(NC)];
  // 01/02: the log the lens reads; 03: the ledger over the whole field
  const [logG, logOp, ledG, ledOp] = [new Uint8Array(NC), new Float32Array(NC), new Uint8Array(NC), new Float32Array(NC)];
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
      dist[id] = Math.hypot(cellXs[c], rowYs[r] - MARK_YW);
    }
  const print = (G: Uint8Array, O: Float32Array, row: number, c0: number, s: string, op: number | ((i: number) => number)) => {
    for (let j = 0; j < s.length; j++) {
      const c = c0 + j;
      if (c < 0 || c >= COLS || row < 0 || row >= ROWS) continue;
      G[row * COLS + c] = gi(s[j]);
      O[row * COLS + c] = typeof op === "number" ? op : op(j);
    }
  };
  // the log: the found rows, and ordinary traffic on the other even rows, filling the chord
  ITEMS.forEach((it) => print(logG, logOp, RC + it.row, MID_C + it.off, it.text, OP.name));
  LOG_ROWS.forEach((ro) => {
    const y = ro * CH;
    const half = Math.sqrt(Math.max(0, RIN_W * RIN_W - y * y)) - 0.06;
    const cA = Math.ceil(MID_C - half / CW);
    const cB = Math.floor(MID_C + half / CW) - 1; // the cells that fit wholly inside the chord
    if (cB < cA) return;
    let s = " ".repeat(Math.floor(hash3(ro, 6, 9) * 3));
    let w = Math.floor(hash3(ro, 5, 9) * LOGW.length);
    for (;;) {
      const word = LOGW[w++ % LOGW.length];
      if (s.length + word.length > cB - cA + 1) break;
      s += word + "  ";
    }
    print(logG, logOp, RC + ro, cA, s, OP.log);
  });
  // the ledger: time, user, app, size, policy; masked and blocked get a box
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  const lpad = (s: string, n: number) => (" ".repeat(n) + s).slice(-n);
  const ledRow = (a: string, b: string, c: string, d: string, e: string) => pad(a, 8) + "  " + pad(b, 9) + "  " + pad(c, 14) + "  " + lpad(d, 6) + "  " + e;
  const colOp = (i: number, strong: boolean) => (i < 10 || (i >= 37 && i < LED_POL) ? OP.pol : i >= LED_POL ? (strong ? OP.led : OP.pol) : OP.led);
  print(ledG, ledOp, LED_HEAD, LED_C0, ledRow("time", "user", "app", "size", "policy"), OP.pol);
  const boxedRows: number[] = [];
  let sec = 9 * 3600 + 41 * 60 + 2;
  for (let i = 0; i < LED_N; i++) {
    const r = LED_R0 + 2 * i;
    const [app, pol] = L_APPS[Math.floor(hash3(i, 2, 5) * L_APPS.length)];
    const user = L_USERS[Math.floor(hash3(i, 3, 5) * L_USERS.length)];
    const kb = 2 + Math.floor(hash3(i, 4, 5) * 2400);
    const size = kb > 999 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
    sec += 2 + Math.floor(hash3(i, 6, 5) * 7);
    const hms = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map((v) => String(v).padStart(2, "0")).join(":");
    const strong = pol !== "allow";
    print(ledG, ledOp, r, LED_C0, ledRow(hms, user, app, size, pol), (j) => colOp(j, strong));
    if (strong) boxedRows.push(r);
  }
  for (let j = 0; j < SEAL_TXT.length; j++) {
    const id = SEAL_ROW * COLS + SEAL_C + j;
    ledG[id] = gi(SEAL_TXT[j]);
    ledOp[id] = OP.led;
    sealIdx[id] = j;
  }
  const polCX = (polX.x + polX.y) / 2 + FX;

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

  /* ---------- the instrument ---------- */
  const rig = new THREE.Group(); // tilt, sway, cursor lean
  const lens = new THREE.Group(); // the roll about the lens axis
  rig.add(lens);
  scene.add(rig);
  const pillow = pillowNormals();
  const glassSide = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: GLASS_BEND, ior: 1.46, dispersion: 0, clearcoat: 0,
    attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"), attenuationDistance: 60, specularIntensity: 1, envMapIntensity: dark ? 1.5 : 1.1,
  });
  const glassFace = glassSide.clone();
  glassFace.normalMap = pillow;
  glassFace.normalScale.set(0.8, 0.8);
  const glassMats = [glassFace, glassSide];
  const hubFace = glassFace.clone();
  hubFace.thickness = HUB_BEND;
  const hubSide = glassSide.clone();
  hubSide.thickness = HUB_BEND;
  const chrome = new THREE.MeshStandardMaterial({ color: dark ? 0xdcdde1 : 0xc4c6cb, metalness: 1, roughness: 0.06, envMapIntensity: dark ? 1.7 : 1.2 });
  const edge = rimMaterial(dark ? new THREE.Color(0xffffff) : ink, dark ? 0.8 : 0.5);

  // the hub: lens element + chrome bezel
  const hubGeo = extrude(hubShape(), HUB_D, 96);
  lens.add(new THREE.Mesh(hubGeo, [hubFace, hubSide]), new THREE.Mesh(hubGeo, edge));
  lens.add(new THREE.Mesh(new THREE.TorusGeometry(HUB_R, BEZEL_T, 14, 128), chrome));
  // the hinges: a hairline chrome pin through each arm's root; chrome clevis plates that
  // hold the arm while it swings and retract flush into the bezel once it locks
  const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(PIN_R, PIN_R, ARM_W + 0.03, 12), chrome, 3);
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(PLATE_L, 0.018, 0.07), chrome, 6);
  const [zAxis, one, pos, scl] = [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(), new THREE.Vector3()];
  const [mtx, qt] = [new THREE.Matrix4(), new THREE.Quaternion()];
  const plateK = new Float32Array(3).fill(-1);
  const setPlates = (k: number, f: number) => {
    const a = deg(NODE_A[k]);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    qt.setFromAxisAngle(zAxis, a);
    scl.set(Math.max(f, 1e-3), 1, Math.max(f, 1e-3));
    const rc = HUB_R + (PLATE_L / 2 - 0.012) * f;
    for (let n = 0; n < 2; n++) {
      const tOff = (n ? 1 : -1) * (ARM_W / 2 + 0.02);
      pos.set(ca * rc - sa * tOff, sa * rc + ca * tOff, 0);
      plates.setMatrixAt(k * 2 + n, mtx.compose(pos, qt, scl));
    }
    plates.instanceMatrix.needsUpdate = true;
  };
  // arm leaves, each in a pivot on its hinge (the geometry stays in mark coords)
  const armPivots: THREE.Group[] = [];
  const armAxes: THREE.Vector3[] = [];
  NODE_A.forEach((ad, k) => {
    const a = deg(ad);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    qt.setFromAxisAngle(zAxis, a);
    pos.set(ca * HINGE_R, sa * HINGE_R, 0);
    pins.setMatrixAt(k, mtx.compose(pos, qt, one));
    setPlates(k, 1);
    const g = extrude(armShape(ad), SLAB_D, 48);
    const pivot = new THREE.Group();
    pivot.position.set(ca * HINGE_R, sa * HINGE_R, 0);
    const inner = new THREE.Group();
    inner.position.set(-ca * HINGE_R, -sa * HINGE_R, 0);
    inner.add(new THREE.Mesh(g, glassMats), new THREE.Mesh(g, edge));
    pivot.add(inner);
    lens.add(pivot);
    armPivots.push(pivot);
    armAxes.push(new THREE.Vector3(-sa, ca, 0)); // the hinge axis: tangent to the hub
  });
  pins.instanceMatrix.needsUpdate = true;
  lens.add(pins, plates);
  // the orbit arcs: thin glass, chrome edges
  const arcGroups: THREE.Group[] = NODE_A.map((a, k) => {
    const g = extrude(arcShape(deg(a + GAP), deg((NODE_A[k + 1] ?? 360) - GAP), ARC_BEV), ARC_D, 72, ARC_BEV);
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(g, [glassFace, chrome]));
    lens.add(grp);
    return grp;
  });
  // the loupe node 0 extends in 02: flat glass (no edge roll, so what it shows stays
  // crisp) in a hairline chrome bezel, a little in front of the node
  const loupeG = new THREE.Group();
  loupeG.position.set(NODE_X[0], NODE_Y[0], LOUPE_Z);
  const lShape = new THREE.Shape();
  lShape.absarc(0, 0, LOUPE_MR - 0.012, 0, TAU, false);
  const lGeo = extrude(lShape, 0.01, 72, 0.012);
  const loupeGlass = glassSide.clone();
  loupeGlass.thickness = 0.02;
  loupeG.add(new THREE.Mesh(lGeo, loupeGlass), new THREE.Mesh(lGeo, edge), new THREE.Mesh(new THREE.TorusGeometry(LOUPE_MR, 0.012, 10, 96), chrome));
  loupeG.visible = false;
  lens.add(loupeG);
  // refraction shifts, never blurs: three samples the transmission target with a
  // B-spline bicubic (a ~1px blur that softens fine glyphs); sample it bilinearly
  const crispChunk = THREE.ShaderChunk.transmission_pars_fragment.replace(
    "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
    "return textureLod( transmissionSamplerMap, fragCoord.xy, lod );",
  );
  [glassSide, glassFace, hubFace, hubSide, loupeGlass].forEach((mat) => {
    mat.onBeforeCompile = (s) => {
      s.fragmentShader = s.fragmentShader.replace("#include <transmission_pars_fragment>", crispChunk);
    };
    mat.customProgramCacheKey = () => "crisp-transmission";
  });

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
  const [armK, arcSpin, arcSeat] = [new Float32Array(3), new Float32Array(3), new Float32Array(3)];
  // for the shadow: cos of each arm's fold, each arc's radius and turn (degrees)
  const [armC, arcS, arcPhi] = [new Float32Array(3), new Float32Array(3), new Float32Array(3)];
  // the caustics on the wall: x, y, 2σ², strength (hub, then the three nodes)
  const cau = new Float32Array(16);
  let aper = 0; // the aperture: 0 stowed … 1 locked
  let [roll, rollV] = [0, 0]; // degrees, degrees / ms
  let [decK, secDim, govR, sealK, sealTxtK, logOff] = [0, 0, 0, 0, 0, 0];
  let [phForm, phVio, phRead, phBrk, phDis, loupeK] = [0, 0, 0, 0, 0, 0];
  let lineY = 1.1; // the injected line's y on the wall: the ring's top (set in resize)
  const tmpV = new THREE.Vector3();
  // the shadow: the mark's plane and axes in world space (from lens.matrixWorld)
  const sh = { ox: 0, oy: 0, oz: 0, nx: 0, ny: 0, nz: 1, ux: 1, uy: 0, uz: 0, vx: 0, vy: 1, vz: 0, k: 0 };

  /** how much of the instrument's current silhouette shades this wall point (0..1) */
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
    let d = Math.hypot(u, v) - HUB_R - BEZEL_T;
    if (d > -0.05) d = Math.min(d, armsSDF(u, v, armC, HUB_R), arcsSDF(u, v, arcS, arcPhi));
    return 1 - smooth(clamp01((d + 0.03) / 0.08));
  }
  /** a lens-local point, projected from the key light onto the wall (into tmpV) */
  const castToWall = (x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(lens.matrixWorld);
    const s = (WALL_Z - LIGHT.z) / (tmpV.z - LIGHT.z);
    return tmpV.set(LIGHT.x + (tmpV.x - LIGHT.x) * s, LIGHT.y + (tmpV.y - LIGHT.y) * s, WALL_Z);
  };
  /** the wall's luminance → glyph density: an even key light (no pool, no halo), the
   *  instrument's shadow, the caustics its lenses focus. Dark card: density = light.
   *  Pale card: density = shade (ink), the caustics burn clean holes. */
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
    const R = RIN_W * aper;
    const dimLog = 1 - 0.55 * secDim;
    for (let r = 0; r < ROWS; r++) {
      const y = rowYs[r];
      for (let c = 0; c < COLS; c++) {
        const id = r * COLS + c;
        const x = cellXs[c];
        // 03: the ledger, swept out from the lens over the whole field
        const eg = govR > 0.01 ? govR - dist[id] - 0.18 * hDec[id] : -1;
        if (eg > 0) {
          const sI = sealIdx[id];
          const typed = sI === 255 || sealTxtK * (SEAL_TXT.length + 1) - sI >= 1;
          if (ledG[id] && typed) put(c, r, ledG[id], ledOp[id], 0, sI === 255 ? 128 : 204); // "sealed" sits a hair low, clear of the double rule
          else if (ledG[id] && sI !== 255 && sealTxtK * (SEAL_TXT.length + 1) - sI > 0) put(c, r, scr(c, r), OP.scr);
          else put(c, r, 0, 0);
          continue;
        }
        if (eg > -0.12) {
          put(c, r, scr(c, r), OP.scr); // the sweep's front
          continue;
        }
        if (dist[id] < R) {
          // inside the lens: first its clean image, then (after the lock) the log,
          // resolving from the centre out
          const u = (0.6 * dist[id]) / RIN_W + 0.4 * hDec[id];
          if (decK < u - 0.12) {
            const g = ditherG(toneAt(x, y), bay[id]);
            put(c, r, g, OP.d0 + OP.d1 * RAMP_G.indexOf(g));
          } else if (decK < u) put(c, r, scr(c, r), OP.scr);
          else if (logG[id] && logOff < 0.5) put(c, r, logG[id], logOp[id] * dimLog);
          else put(c, r, 0, 0);
          continue;
        }
        // traffic: the same image, lightly corrupted: a small drift, flickering
        // thresholds, a few word fragments
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

    // 02: the injected line. Node 0 reads it as it lands, the read spreads along the
    // line, then the node cuts what its glass covers
    bigL.w = phForm > 0.001 ? 1 : 0;
    if (bigL.w > 0) {
      const th = deg(roll);
      const nwx = KW * Math.cos(th);
      const nwy = MARK_YW + (lineY - MARK_YW) * Math.sin(th);
      const fl = Math.floor(now / 80);
      for (let j = 0; j < N_BIG; j++) {
        const hj = hash3(j, 3, 17);
        if (phForm < hj * 0.7 + 0.05 || PHRASE_G[j] === 0) {
          putBig(j, 0, 0, 0);
          continue;
        }
        const mid = j >= BRK[0] && j < BRK[1];
        const ub = mid ? phBrk * 1.5 - (Math.abs(j + 0.5 - (BRK[0] + BRK[1]) / 2) / 5) * 0.5 : 0;
        if (ub > 0.45) {
          putBig(j, STRIPPED_G[j - BRK[0]], OP.stripped * clamp01(phForm * 1.4 - 0.4), 0); // ink: no longer violet
          continue;
        }
        if (ub > 0) {
          putBig(j, scr(j, 99), OP.scr, phVio * (1 - ub * 2));
          continue;
        }
        const away = j < BRK[0] ? BRK[0] - 1 - j : j - BRK[1];
        const u = mid ? 0 : (phDis * 1.3 - (away / 9) * 0.7 - hj * 0.3) / 0.3;
        if (u >= 1) {
          putBig(j, 0, 0, 0);
          continue;
        }
        const xj = BIG_X0 + (j + 0.5) * BCW;
        const decoded = Math.hypot(xj - nwx, lineY - nwy) < CATCH_R - hj * 0.15 + phRead * 1.6;
        let g = decoded ? PHRASE_G[j] : DENSE_G[Math.floor(hash3(j, 5, fl) * DENSE_G.length)];
        let op = decoded ? OP.phInk + (OP.phVio - OP.phInk) * phVio : OP.frag + 0.1;
        if (u > 0) {
          g = FADE_G[Math.min(4, Math.floor(u * 5))];
          op *= 1 - u * 0.7;
        }
        putBig(j, g, op, phVio * (decoded ? 1 : 0.8), decoded ? 128 : 128 + Math.round((hash3(j, 7, fl) - 0.5) * 60));
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
    const lift = Math.sin((nowMs / 19000) * TAU) * 0.015;
    rig.rotation.set(tilt, yaw, 0);
    rig.position.y = lift;
    scene.environmentRotation.set(0, Math.sin((nowMs / 37000) * TAU) * 0.3, 0);

    /* the deploy: arms swing out on their hinges, then the arcs spin out and seat */
    let ap = 0;
    for (let k = 0; k < 3; k++) {
      armK[k] = trk(armK[k], armTarget(k, t), 0.07);
      arcSpin[k] = trk(arcSpin[k], arcSpinTarget(k, t), 0.07);
      arcSeat[k] = trk(arcSeat[k], arcSeatTarget(k, t), 0.35);
      const pk = trk(Math.max(0, plateK[k]), plateTarget(k, t), 0.12);
      if (Math.abs(pk - plateK[k]) > 1e-4) setPlates(k, pk);
      plateK[k] = pk;
      const beta = deg(FOLD_ANG) * (1 - armK[k]);
      armPivots[k].quaternion.setFromAxisAngle(armAxes[k], beta);
      armC[k] = Math.cos(beta);
      const sp = arcSpin[k];
      const s = ARC_S0[k] + (1 - ARC_S0[k]) * sp;
      const seat = arcSeat[k] * clamp01((sp - 0.9) / 0.1); // never seats before it is in place
      const g = arcGroups[k];
      g.rotation.z = -deg(ARC_TURN) * (1 - sp);
      g.scale.set(s, s, 1);
      g.position.z = (ARC_Z0[k] + (ARC_ZT - ARC_Z0[k]) * sp) * (1 - seat);
      arcS[k] = s;
      arcPhi[k] = -ARC_TURN * (1 - sp);
      ap += 0.85 * sp + 0.15 * seat;
    }
    aper = ap / 3;

    /* the roll: a critically damped, shortest-path follow of the story angle */
    const target = rollTarget(t);
    if (fSnap) {
      roll = target;
      rollV = 0;
    } else {
      const w = ROLL_W / 1000;
      const n = Math.ceil(fDt / 8);
      const h = fDt / n;
      let d = wrap180(target - roll);
      for (let i = 0; i < n; i++) {
        rollV += (w * w * d - 2 * w * rollV) * h;
        roll += rollV * h;
        d -= rollV * h;
      }
    }
    lens.rotation.z = deg(roll);
    rig.updateMatrixWorld(true);
    const m = lens.matrixWorld.elements;
    sh.ux = m[0]; sh.uy = m[1]; sh.uz = m[2]; sh.vx = m[4]; sh.vy = m[5]; sh.vz = m[6]; // prettier-ignore
    sh.nx = m[8]; sh.ny = m[9]; sh.nz = m[10]; sh.ox = m[12]; sh.oy = m[13]; sh.oz = m[14]; // prettier-ignore
    sh.k = sh.nx * (sh.ox - LIGHT.x) + sh.ny * (sh.oy - LIGHT.y) + sh.nz * (sh.oz - LIGHT.z);
    // the caustics: the hub focuses a bright core into its own shadow; each node a
    // small spot that travels with the turn (weaker while the arm is folded)
    const hc = castToWall(0, 0, 0);
    cau[0] = hc.x; cau[1] = hc.y; cau[2] = 2 * 0.13 * 0.13; cau[3] = 0.7; // prettier-ignore
    for (let k = 0; k < 3; k++) {
      const reach = HINGE_R + (1 - HINGE_R) * armC[k];
      const nc = castToWall(NODE_X[k] * reach, NODE_Y[k] * reach, -(1 - HINGE_R) * Math.sqrt(Math.max(0, 1 - armC[k] * armC[k])));
      const o = 4 + k * 4;
      cau[o] = nc.x; cau[o + 1] = nc.y; cau[o + 2] = 2 * 0.055 * 0.055; cau[o + 3] = 0.45 * clamp01(armC[k]) ** 2; // prettier-ignore
    }

    /* 01: the lens reads (after the lock) and brackets what it found */
    decK = trk(decK, seg(t, SEE.dec0, SEE.dec1), 0.06);
    const gate = smooth(clamp01((aper - 0.8) / 0.2));
    for (let k = 0; k < N_BOX; k++) {
      const b0 = SEE.box0 + SEE.boxStag * k;
      const tgt = smooth(seg(t, b0, b0 + SEE.boxDur)) * (1 - smooth(seg(t, SEE.boxOut0, SEE.boxOut1)));
      boxK[k] = Math.min(trk(boxK[k], tgt, 0.1), gate); // only a locked lens brackets
    }

    /* 02: the disc dims, the line forms, node 0 reads it, cuts, the violet crumbles */
    const live = t < PH.end ? 1 : 0;
    secDim = trk(secDim, live * smooth(seg(t, 3900, 4400)), 0.06);
    phForm = follow(phForm, live * smooth(seg(t, PH.form0, PH.form1)), 90);
    phVio = follow(phVio, live * smooth(seg(t, PH.vio0, PH.vio1)), 90);
    phRead = follow(phRead, smooth(seg(t, PH.read0, PH.read1)), 70);
    phBrk = follow(phBrk, seg(t, PH.brk0, PH.brk1), 60);
    phDis = follow(phDis, seg(t, PH.dis0, PH.dis1), 90);
    // the loupe: node 0 extends it as it comes onto the line (12 o'clock), and draws it
    // back after the crumble; its footprint on the wall is where the cut chars show
    const off12 = Math.hypot(Math.cos(deg(roll)), Math.sin(deg(roll)) - 1);
    const lt = live * (t >= PH.form0 ? 1 : 0) * smooth(clamp01(1 - off12 / 0.5)) * (1 - smooth(seg(t, PH.dis1 - 100, PH.end)));
    loupeK = trk(loupeK, lt, 0.08);
    loupeG.visible = loupeK > 0.002;
    loupeG.scale.setScalar(Math.max(loupeK, 1e-3));
    if (loupeG.visible) {
      loupeG.updateMatrixWorld();
      tmpV.set(0, 0, 0).applyMatrix4(loupeG.matrixWorld);
      const C = camera.position;
      const s = (WALL_Z - C.z) / (tmpV.z - C.z);
      loupe.set(C.x + (tmpV.x - C.x) * s - FX, C.y + (tmpV.y - C.y) * s - FY, LOUPE_MR * loupeK * s * 1.03, 1);
      spread.value = Math.max(0, loupe.z + 0.03 - ((BRK[1] - BRK[0]) / 2) * BCW);
    } else {
      loupe.w = 0;
      spread.value = 0;
    }

    /* 03: the sweep out from the lens, the seal; the fold pulls it back in */
    const gr = t < FOLD.arc ? smooth(seg(t, GOV.sweep0, GOV.sweep1)) : 1 - smooth(seg(t, FOLD.arc, FOLD.arc + 850));
    govR = trk(govR, GOV.reach * gr, 0.08);
    logOff = t >= FOLD.arc ? 1 : 0; // the ledger has covered it by then: the fold closes on blank, not on the old log
    sealK = trk(sealK, t < FOLD.arc ? smooth(seg(t, LOG_T.seal, LOG_T.seal + 260)) : 0, 0.1);
    sealTxtK = trk(sealTxtK, t < FOLD.arc ? seg(t, GOV.txt0, GOV.txt1) : 0, 0.08);
    head.w = clamp01((govR - 1.5) / 0.6);
    seal.w = Math.min(sealK, head.w);
    for (const r of boxedRows) polBox[ROWS - 1 - r] = smooth(clamp01((govR - Math.hypot(polCX, rowYs[r] - MARK_YW) - 0.25) / 0.25));

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
    // the ring's centreline at 12 o'clock, as seen from the camera: the injected line
    // runs there and node 0 lands on it in 02
    const C = camera.position;
    const py = Math.cos(TILT);
    const pz = Math.sin(TILT);
    lineY = C.y + ((py - C.y) * (C.z - WALL_Z)) / (C.z - pz);
    bigL.x = lineY - FY;
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
    // the lens turns its nodes about its axis: the page's labels step aside
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      // the instrument's footprint: the puck when stowed, the whole mark when deployed
      const c = toStage(0, 0, 0);
      const cx = c.x;
      const cy = c.y;
      const ex = toStage(0.66 + 0.62 * aper, 0, 0);
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
      stateTex.dispose();
      bigTex.dispose();
      pillow.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
