/* Hero scene B for mockup 10: "Glass over the signal" (after Octane.security).
 *
 * The Blindsight mark (src/assets/ICON_Blindsight.svg, orbit radius = 1), LARGE, as
 * thin clear glass slabs: one slab for hub + three arms + three nodes, three slab arcs
 * for the orbit (±20° gap at each node). Transmission 1, roughness 0; the faces are
 * "pillowed" by a normal map near every edge, so the glyphs behind bend along each
 * edge even face-on; the bevels catch the studio's strips; a fresnel edge light adds a
 * bright hairline. The renderer uses NO tone mapping here: tone mapping greyed the
 * transmitted card colour and turned the glass into an opaque-looking grey slab.
 *
 * Behind it, a dense wall of fine dithered ASCII (one opaque plane, one draw call,
 * rendered into the transmission target so the glass refracts it). Its shader reads a
 * per-cell state texture (glyph, opacity, violet, jitter) and a glyph atlas.
 *
 * The wall is a dithered IMAGE with one source: a radial falloff centred on the mark
 * plus the mark's own silhouette, cast from a light up-left (it turns, narrows and
 * widens with the mark). Chaos is that image corrupted (displaced, flickering, random
 * thresholds, word fragments); order is the same image, cleanly Bayer-dithered.
 *
 * The spin drives the decoding: the lens's gaze. The plane through the spin axis and
 * perpendicular to the pane (the direction the lens looks) meets the wall along a
 * vertical line at x = D·tan(yaw). As the mark turns through face-on, that line sweeps
 * the wall left to right (a hairline marks it); what it has swept stays changed. It is
 * mid-wall exactly when the pane is 25–45° off face-on, so the stills show the cause.
 * One full turn per loop, slow near face-on (the sweeps), brisk through edge-on.
 *
 *   01 See it     canonical face sweeps (−49° → +49°). Behind the gaze the noise
 *                 settles into the clean image and the lens clears: inside the hub a
 *                 list of the AI in use (ChatGPT, Copilot, unknown.app, agent:finance …),
 *                 above it "7 AI IN USE", below "3 shadow AI". Text sits only in zones no
 *                 glass edge crosses (inside the hub face; between the arms). At t 2500
 *                 the mark is ~30° off face-on and the right edge is still noise.
 *   02 Secure it  the mark creeps at ~50°. "ignore previous instructions" forms top
 *                 right, turns violet (the one accent), travels in and hits the ring's top
 *                 edge (a point on the spin axis); at the point of contact it breaks into
 *                 "[stripped]" and the violet flanks crumble.
 *   03 Govern it  the mirrored face sweeps (131° → 229°). The turn engraves the ledger row
 *                 by row (margin tick + hairline rule) between LOG_T.in and LOG_T.seal;
 *                 the gaze settles the image behind it onto a regular grid; the summary
 *                 becomes "all 7 logged". At t 9500 the mark is ~34° off face-on.
 *   tail          the wall dissolves back into noise, cell by cell.
 *
 * Story values follow tMs and ease from what is on screen (the spin through a
 * critically damped, shortest-path spring). Sway, lean, reflections and the noise run
 * on real time. nodes() returns [] (the spin moves the nodes too much for labels).
 */
import { THREE, createRenderer, type Theme } from "./core";

export const LOOP_MS = 11600;
/** A calm, representative still (reduced motion): governed, canonical, all logged. */
export const SETTLED_MS = 10000;
/** When the DOM audit-trail row should appear, seal (= the mark lands home) and clear. */
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

/* ---------- the mark (orbit radius = 1) ---------- */
const HUB_R = 0.5;
const NODE_R = 0.25;
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const NODE_X = NODE_A.map((a) => Math.cos(deg(a)));
const NODE_Y = NODE_A.map((a) => Math.sin(deg(a)));
const GAP = 20; // half-gap of the orbit at each node, degrees
const BAND = 0.22;
const ARM_W = 0.17;
const SLAB_D = 0.04; // slab core depth; + 2 bevels ≈ 0.11 thick
const BEVEL = 0.035;
const MARK_R = 1 + NODE_R + 0.03; // outer reach, for hit testing
const RING_TOP = 1 + BAND / 2; // the ring's outer edge at 12 o'clock: ON the spin axis

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

/* ---------- the turntable ---------- */
const TILT = 0.1; // rad: the top leans a little toward the camera
/** One turn per loop (yaw in degrees, 0 = canonical face-on, 180 = mirrored face-on):
 *  slow while a face sweeps the wall, brisk through edge-on. −60 ≡ 300 at the wrap. */
const SPIN_KEYS: [number, number][] = [
  [0, -60],
  [400, -49],
  [3000, 49], // 01: the canonical face sweeps (≈ 38°/s); t 2500 → 30°
  [6300, 54], // 02: a slow creep, the gaze off the wall
  [7300, 131], // through edge-on
  [9900, 229], // 03: the mirrored face sweeps; t 9500 → 214° (34° off face-on)
  [LOOP_MS, 300],
];
const SPIN_W = 9; // spring stiffness (rad/s): critically damped follow of the story angle
function spinTarget(t: number) {
  for (let i = 1; i < SPIN_KEYS.length; i++) {
    const [t1, a1] = SPIN_KEYS[i];
    if (t <= t1) {
      const [t0, a0] = SPIN_KEYS[i - 1];
      return a0 + (a1 - a0) * seg(t, t0, t1);
    }
  }
  return 300;
}
const GAZE_ON = 2.2; // |x| of the gaze line beyond which it is off the wall

/* ---------- the wall of glyphs (world units, fixed behind the mark) ---------- */
const WALL_Z = -1.6; // clear of the mark's swing (r ≈ 1.3)
const KW = 1.157; // mark → wall scale as seen from the camera ((10.2 + 1.6) / 10.2)
const MARK_YW = -0.039; // the wall y the mark's centre falls on, as seen from the camera
const CW = 0.05; // cell width (fine glyphs, ≈ 9 × 16 px on screen)
const CH = 0.09;
const COLS = 74;
const ROWS = 38;
const RC = 20; // the row on the mark's centre
const FW = COLS * CW;
const FH = ROWS * CH;
const FX = 0;
const FTOP = MARK_YW + CH * (RC + 0.5);
const FY = FTOP - FH / 2;
const cellX = (c: number) => FX - FW / 2 + CW * (c + 0.5);
const rowY = (r: number) => FTOP - CH * (r + 0.5);
const MID_C = COLS / 2;
/** the wall image's radial falloff, centred on the mark (1 at the centre, 0 by r 2) */
const falloff = (x: number, y: number) => 1 - smooth(clamp01((Math.hypot(x, y - MARK_YW) - 0.3) / 1.7));

/** Half-width (wall units) of the text zone on a row that no glass edge crosses, for the
 *  canonical AND the mirrored mark (arms at 0/128/232 and 180/52/308), with a margin and
 *  room for the foreshortening of a still taken mid-turn. 0 = no clear zone. */
function zoneHalf(yRel: number) {
  const y0 = Math.abs(yRel) - CH / 2;
  const y1 = Math.abs(yRel) + CH / 2;
  const hubIn = (HUB_R - BEVEL) * KW - 0.03;
  const hubOut = (HUB_R + 0.01) * KW + 0.05;
  const ringIn = (1 - BAND / 2) * KW;
  let w = 0;
  if (y1 < hubIn) w = Math.sqrt(hubIn * hubIn - y1 * y1);
  else if (y0 > hubOut && y1 < ringIn - 0.02) {
    const arm = y0 / Math.tan(deg(52)) - ((ARM_W / 2) * KW) / Math.sin(deg(52)) - 0.04;
    const ring = Math.sqrt(ringIn * ringIn - y1 * y1) - 0.03;
    w = Math.max(0, Math.min(arm, ring));
  }
  return w * 0.8; // the stills are taken up to ~35° off face-on
}

/* the lens's list (inside the hub face; the longest name on the widest row) and the two
   summary lines (between the arms) */
const LIST = ["ChatGPT", "Copilot", "unknown.app", "agent:finance", "mcp:crm-db", "Gemini", "notion-ai"];
const N_ENT = LIST.length;
const LIST_R0 = RC - 3; // rows RC-3 … RC+3
const SUM_TOP = { row: RC - 9, text: "7 AI IN USE" };
const SUM_BOT = { row: RC + 9, text: "3 shadow AI", alt: "all 7 logged" };
const startCol = (s: string) => Math.round(MID_C - s.length / 2);

/* 02: the hidden instruction */
const PHRASE = "ignore previous instructions";
const PH_C0 = startCol(PHRASE);
const PH_IN = 16; // it starts this many columns to the right, on the top row
const BRK = [9, 19]; // the chars at the point of contact, which become "[stripped]"
const STRIPPED = "[stripped]";
const PH = { form0: 3900, form1: 4250, dec0: 4250, dec1: 4650, vio0: 4600, vio1: 4850, go0: 4850, go1: 5500, brk0: 5500, brk1: 5800, dis0: 6250, dis1: 7000 };

/* the noise and the dither */
const RAMP = " .:-=+*#%@";
const DENSE = "#%@*+=";
const FADE = "%+:. ";
const SCR = "abcdefghijklmnopqrstuvwxyz0123456789:._-/";
const FRAGS = ["prompt", "upload", "gpt-4o", "token", "api/v1", "agent", "invoice.pdf", "copilot", "POST /chat", "sk-...", "summarize", "mcp://", "ext:", "payroll.csv", "user:m.k", "claims.xlsx", "embed", "tool_call"];
const N_FRAG = 16;
const DEC = 0.45; // world width of the decode band behind the gaze line
const RESET_T = BEATS[2].t1;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const LIGHT = new THREE.Vector3(-2.2, 2.8, 14); // casts the mark's dithered shadow

const gi = (ch: string) => {
  const k = ch.charCodeAt(0) - 32;
  return k > 0 && k < 95 ? k : 0;
};
const RAMP_G = [...RAMP].map(gi);
const DENSE_G = [...DENSE].map(gi);
const FADE_G = [...FADE].map(gi);
const SCR_G = [...SCR].map(gi);
const PHRASE_G = [...PHRASE].map(gi);
const STRIPPED_G = [...STRIPPED].map(gi);

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
  if (dark) {
    panel(14, 1.6, 0, 76, 2.4);
    panel(1.8, 16, 52, 4, 4.0);
    panel(1.1, 16, -78, 4, 2.4);
    panel(1.0, 16, 160, 4, 3.0); // a back strip: the turned glass catches it
    panel(12, 3.2, 215, 12, 0.2);
    panel(24, 9, 180, 34, 0.28);
  } else {
    panel(14, 1.4, 0, 78, 2.0);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(9, 1.3, 205, -6, 0.0);
    panel(1.8, 14, 58, 6, 2.6);
    panel(1.2, 14, -40, 8, 2.4);
    panel(1.0, 14, 165, 6, 2.2);
  }
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
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments,
  });
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

/** A tangent-space normal map for the flat faces (their UVs are mark x, y): flat in the
 *  middle, rolling off towards every edge like a pillowed slab, so the glass bends what
 *  is behind it along each edge even when it faces the camera. */
function pillowNormals() {
  const N = 512;
  const S = 2.7; // covers mark coords -1.35 … 1.35
  const h = S / N;
  const d = new Float32Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) d[j * N + i] = logoSDF(-S / 2 + h * (i + 0.5), -S / 2 + h * (j + 0.5));
  const out = new Uint8Array(N * N * 4);
  const ZONE = 0.07; // width of the roll-off, inside the face's edge
  const MAXS = 0.6; // slope at the face's edge (it meets the bevel)
  const edge = -BEVEL;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const id = j * N + i;
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

/** The edge: a fresnel hairline where the surface turns away from the eye (bevels and
 *  sides), never on the faces. Bright on the dark card, ink on the pale one. */
function rimMaterial(color: THREE.Color, strength: number) {
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
        gl_FragColor = vec4(col, smoothstep(0.55, 0.95, f) * k);
      }`,
  });
}

/** White mono glyphs (ASCII 32–126) on black, 16 × 6 cells; the shader reads .r. */
function glyphAtlas(weight: number) {
  const GW = 48;
  const GH = 86; // same ratio as a wall cell
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
const FIELD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FIELD_FRAG = /* glsl */ `
  uniform sampler2D uState;
  uniform sampler2D uAtlas;
  uniform vec3 uBg;
  uniform vec3 uInk;
  uniform vec3 uVio;
  uniform vec3 uLine;
  uniform float uLineA;
  uniform vec4 uLed[${N_ENT}];
  uniform float uRule[${N_ENT}];
  uniform float uTick[${N_ENT}];
  uniform float uLedA;
  uniform float uPerc; // 1: colours are sRGB and mixed perceptually (the pale card)
  uniform float uTint; // a faint grey behind the glass, so the transmission reads
  uniform vec2 uCen; // the mark's centre on the wall (field-local)
  varying vec2 vUv;
  float hair(float d, float hw, float px) { return 1.0 - smoothstep(hw - 0.5 * px, hw + 0.5 * px, d); }
  void main() {
    vec2 GRID = vec2(${F(COLS)}, ${F(ROWS)});
    vec2 g = vUv * GRID;
    // gradients of the continuous cell coordinate: no seams where fract() jumps
    vec2 gdx = dFdx(g) / vec2(16.0, 6.0);
    vec2 gdy = dFdy(g) / vec2(16.0, 6.0);
    vec2 p = (vUv - 0.5) * vec2(${F(FW)}, ${F(FH)});
    float px = max(length(vec2(dFdx(p.x), dFdy(p.x))), 1e-5);
    vec2 cell = min(floor(g), GRID - 1.0);
    vec2 f = g - cell;
    vec4 s = texture2D(uState, (cell + 0.5) / GRID);
    float gi = floor(s.r * 255.0 + 0.5);
    float a = 0.0;
    if (gi > 0.5) {
      vec2 ac = vec2(mod(gi, 16.0), floor(gi / 16.0));
      float fy = f.y + (s.a - 0.5) * 0.4;
      vec2 auv = vec2((ac.x + f.x) / 16.0, 1.0 - (ac.y + 1.0 - fy) / 6.0);
      a = textureGrad(uAtlas, auv, gdx, gdy).r * s.g * step(0.0, fy) * step(fy, 1.0);
    }
    vec2 e = min(g, GRID - g);
    float fade = smoothstep(0.0, 2.5, e.x) * smoothstep(0.0, 1.6, e.y);
    float rc = length(p - uCen);
    vec3 bg = uBg * (1.0 - uTint * (1.0 - smoothstep(0.5, 2.0, rc)));
    vec3 c = mix(bg, mix(uInk, uVio, s.b), a * fade);
    // the gaze: where the plane perpendicular to the pane meets the wall
    float hw = max(0.003, 0.55 * px);
    c = mix(c, uInk, hair(abs(dot(uLine.xy, p) + uLine.z), hw, px) * uLineA * fade);
    // the ledger: a hairline rule under each listed AI, a tick in its margin
    float led = 0.0;
    for (int k = 0; k < ${N_ENT}; k++) {
      vec4 L = uLed[k];
      float xr = L.y + uRule[k] * (L.z - L.y);
      float onR = hair(abs(p.y - L.x), hw, px) * step(L.y, p.x) * (1.0 - smoothstep(xr - px, xr, p.x)) * step(0.001, uRule[k]);
      float top = L.x + ${F(0.8 * CH)};
      float bot = top - ${F(0.6 * CH)} * uTick[k];
      float onT = hair(abs(p.x - L.w), hw * 1.2, px) * step(bot, p.y) * step(p.y, top) * step(0.001, uTick[k]);
      led = max(led, max(onR, onT));
    }
    c = mix(c, uInk, led * uLedA);
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
  // (Neutral tone mapping greyed it to ~#ECEDEF, and the pane read as an opaque slab)
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

  // opacities of the printed glyphs. Dark (the approved look): pale ink mixed in linear
  // light. Light: ink mixed perceptually (sRGB), so 0.3–0.45 reads as real grey ink and
  // the list lands near #555–#6a6a6a instead of washing out to #ccc.
  const OP = dark
    ? { d0: 0.18, d1: 0.017, frag: 0.33, grid: 0.18, gridPlus: 0.31, name: 0.68, sum: 0.46, scr: 0.39, phInk: 0.5, phVio: 0.95, stripped: 0.57, line: 0.33, rule: 0.33 }
    : { d0: 0.3, d1: 0.017, frag: 0.42, grid: 0.3, gridPlus: 0.45, name: 0.8, sum: 0.66, scr: 0.5, phInk: 0.62, phVio: 1, stripped: 0.72, line: 0.45, rule: 0.5 };
  const colU = (c: THREE.Color) => (dark ? c : c.clone().convertLinearToSRGB());

  /* ---------- the wall of glyphs ---------- */
  const NC = COLS * ROWS;
  const data = new Uint8Array(NC * 4);
  const stateTex = new THREE.DataTexture(data, COLS, ROWS, THREE.RGBAFormat, THREE.UnsignedByteType);
  stateTex.minFilter = THREE.NearestFilter;
  stateTex.magFilter = THREE.NearestFilter;
  stateTex.generateMipmaps = false;
  stateTex.needsUpdate = true;
  const atlas = glyphAtlas(dark ? 400 : 500);
  const rule = new Float32Array(N_ENT);
  const tick = new Float32Array(N_ENT);
  const ledGeo = LIST.map((name, k) => {
    const r = LIST_R0 + k;
    const c0 = startCol(name);
    const x0 = cellX(c0) - CW / 2 - FX;
    const x1 = cellX(c0 + name.length - 1) + CW / 2 - FX;
    return new THREE.Vector4(rowY(r) - CH / 2 - FY, x0, x1, x0 - 0.035);
  });
  // opaque, depth-writing, default render order: it is drawn into the transmission
  // target, so the glass refracts it
  const fieldMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: stateTex },
      uAtlas: { value: atlas },
      uBg: { value: colU(bg) },
      uInk: { value: colU(ink) },
      uVio: { value: colU(signalCol) },
      uPerc: { value: dark ? 0 : 1 },
      uTint: { value: dark ? 0 : 0.045 },
      uCen: { value: new THREE.Vector2(-FX, MARK_YW - FY) },
      uLine: { value: new THREE.Vector3(1, 0, 100) },
      uLineA: { value: 0 },
      uLed: { value: ledGeo },
      uRule: { value: rule },
      uTick: { value: tick },
      uLedA: { value: 0 },
    },
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(FW, FH), fieldMat);
  field.position.set(FX, FY, WALL_Z);
  scene.add(field);

  // per-cell constants
  const h0 = new Float32Array(NC); // reset order
  const hDec = new Float32Array(NC); // decode order
  const win = new Uint8Array(NC); // a clear zone: clean once the gaze has passed
  const txtG = new Uint8Array(NC); // the text found there
  const txtOp = new Float32Array(NC);
  const altG = new Uint8Array(NC); // the bottom summary once governed
  const altRow = new Uint8Array(NC);
  const bay = new Float32Array(NC);
  const radial = new Float32Array(NC); // the image's radial falloff, centred on the mark
  const fragBuf = new Uint8Array(NC);
  const cellXs = new Float32Array(COLS);
  const rowYs = new Float32Array(ROWS);
  for (let c = 0; c < COLS; c++) cellXs[c] = cellX(c);
  for (let r = 0; r < ROWS; r++) rowYs[r] = rowY(r);
  for (let r = 0; r < ROWS; r++) {
    const zh = zoneHalf(rowYs[r] - MARK_YW);
    for (let c = 0; c < COLS; c++) {
      const id = r * COLS + c;
      h0[id] = hash3(c, r, 7);
      hDec[id] = hash3(c, r, 11);
      bay[id] = BAYER[(r % 4) * 4 + (c % 4)];
      win[id] = zh > 0 && Math.abs(cellXs[c]) + CW / 2 <= zh ? 1 : 0;
      radial[id] = falloff(cellXs[c], rowYs[r]);
    }
  }
  const printRow = (row: number, s: string, op: number, alt = false) => {
    const c0 = startCol(s);
    for (let j = 0; j < s.length; j++) {
      const id = row * COLS + c0 + j;
      if (alt) {
        altG[id] = gi(s[j]);
        altRow[id] = 1;
      } else {
        txtG[id] = gi(s[j]);
        txtOp[id] = op;
      }
    }
  };
  LIST.forEach((name, k) => printRow(LIST_R0 + k, name, OP.name));
  printRow(SUM_TOP.row, SUM_TOP.text, OP.sum);
  printRow(SUM_BOT.row, SUM_BOT.text, OP.sum);
  printRow(SUM_BOT.row, SUM_BOT.alt, OP.sum, true);
  for (let c = 0; c < COLS; c++) altRow[SUM_BOT.row * COLS + c] = 1;

  const put = (c: number, r: number, g: number, op: number, vio = 0, sh = 128) => {
    const i = ((ROWS - 1 - r) * COLS + c) * 4;
    data[i] = g;
    data[i + 1] = op <= 0 ? 0 : op >= 1 ? 255 : Math.round(op * 255);
    data[i + 2] = vio <= 0 ? 0 : vio >= 1 ? 255 : Math.round(vio * 255);
    data[i + 3] = sh;
  };

  /* ---------- the mark ---------- */
  const rig = new THREE.Group(); // tilt, sway, cursor lean
  const spin = new THREE.Group(); // the turntable
  rig.add(spin);
  scene.add(rig);
  const pillow = pillowNormals();
  const glassSide = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.4,
    ior: 1.48,
    dispersion: 0.02,
    clearcoat: 0,
    attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"),
    attenuationDistance: 60,
    specularIntensity: 1,
    envMapIntensity: dark ? 1.5 : 1.1,
  });
  const glassFace = glassSide.clone();
  glassFace.normalMap = pillow;
  const glassMats = [glassFace, glassSide];
  // the edge: bright on the dark card; a ~1px ink hairline at 0.5 on the pale one
  const edge = rimMaterial(dark ? new THREE.Color(0xffffff) : ink, dark ? 0.8 : 0.5);
  const coreGeo = extrude(coreShape(), SLAB_D, 48);
  spin.add(new THREE.Mesh(coreGeo, glassMats), new THREE.Mesh(coreGeo, edge));
  NODE_A.forEach((a, i) => {
    // a hair thinner than the core, so the faces never coincide where an arc end meets a node
    const g = extrude(arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP)), SLAB_D - 0.006, 64);
    spin.add(new THREE.Mesh(g, glassMats), new THREE.Mesh(g, edge));
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
  let viewW = 1;
  let viewH = 1;
  let lastReal = -1;
  let fDt = 16;
  let fSnap = true;
  const follow = (cur: number, to: number, tau: number) => (fSnap ? to : cur + (to - cur) * (1 - Math.exp(-fDt / tau)));
  let th = 0; // the turntable angle shown, degrees
  let thV = 0; // its velocity, degrees / ms
  let lineK = 0;
  let resetK = 0;
  let sumK = 0;
  let phForm = 0;
  let phDec = 0;
  let phVio = 0;
  let phGo = 0;
  let phBrk = 0;
  let phDis = 0;
  let stopRow = 5; // the row that rests on the ring's top edge (set in resize)
  const xSee = new Float32Array(ROWS); // per row: the gaze line's x (what lies left of it is swept)
  const xGov = new Float32Array(ROWS);
  let nX = 0;
  let nY = 0;
  let nZ = 1;
  const tmpV = new THREE.Vector3();
  // the shadow: the mark's plane and axes in world space (from spin.matrixWorld)
  const sh = { ox: 0, oy: 0, oz: 0, nx: 0, ny: 0, nz: 1, ux: 1, uy: 0, uz: 0, vx: 0, vy: 1, vz: 0, k: 0 };

  /** the gaze: the plane through the spin axis, perpendicular to the pane (normal = the
   *  pane's own x axis), meets the wall along a line; its x per row. x = D·tan(yaw). */
  function gaze(out: Float32Array) {
    nX = sh.ux;
    nY = sh.uy;
    nZ = sh.uz;
    const k = nZ * (WALL_Z - sh.oz);
    for (let r = 0; r < ROWS; r++) out[r] = sh.ox - (nY * (rowYs[r] - sh.oy) + k) / nX;
  }

  /** how much of the mark's dithered shadow covers this wall point (0..1) */
  function shadowAt(x: number, y: number) {
    const dx = x - LIGHT.x;
    const dy = y - LIGHT.y;
    const dz = WALL_Z - LIGHT.z;
    const den = sh.nx * dx + sh.ny * dy + sh.nz * dz;
    if (Math.abs(den) < 1e-4) return 0;
    const s = sh.k / den;
    const hx = LIGHT.x + dx * s - sh.ox;
    const hy = LIGHT.y + dy * s - sh.oy;
    const hz = LIGHT.z + dz * s - sh.oz;
    const u = hx * sh.ux + hy * sh.uy + hz * sh.uz;
    const v = hx * sh.vx + hy * sh.vy + hz * sh.vz;
    if (u * u + v * v > 1.9) return 0;
    const d = logoSDF(u, v);
    return 1 - smooth(clamp01((d + 0.03) / 0.08));
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
      const c0 = Math.floor(hash3(i, ep, 2) * (COLS - 6)) - 4 + Math.floor(ph * 9); // drifts right, a cell at a time
      for (let j = 0; j < word.length; j++) {
        const c = c0 + j;
        if (c >= 0 && c < COLS) fragBuf[r * COLS + c] = gi(word[j]);
      }
    }
  }

  /** the wall's source image: a radial falloff centred on the mark + the mark's shadow */
  const image = (x: number, y: number) => 0.1 + 0.4 * falloff(x, y) + 0.42 * shadowAt(x, y);
  const ditherG = (T: number, b: number) => RAMP_G[Math.max(0, Math.min(9, Math.round(T * 9 + (b - 0.5) * 1.1)))];

  function writeField(now: number) {
    placeFragments(now);
    const scrStep = Math.floor(now / 70);
    const rk = resetK / 0.97;
    for (let r = 0; r < ROWS; r++) {
      const xs = xSee[r];
      const xg = xGov[r];
      const y = rowYs[r];
      for (let c = 0; c < COLS; c++) {
        const id = r * COLS + c;
        const x = cellXs[c];
        const dS = xs - x;
        if (h0[id] < rk || dS <= 0) {
          // chaos: the same image, corrupted: displaced by drifting noise, random
          // thresholds, flicker, jitter, word fragments
          const step = Math.floor(now / 120 + h0[id] * 5);
          const qx = x + (vnoise(c / 7 - now * 0.00035, r / 3, 1) - 0.5) * 0.9;
          const qy = y + (vnoise(c / 7 + now * 0.00025, r / 3 - now * 0.0003, 2) - 0.5) * 0.6;
          let T = image(qx, qy) + (vnoise(c / 2.5 + now * 0.0004, r / 1.5, 3) - 0.5) * 0.35;
          T += (hash3(c, r, step) - 0.5) * 0.3;
          const jit = 128 + Math.round((hash3(c, r, step + 7919) - 0.5) * 80);
          const fg = fragBuf[id];
          if (fg) put(c, r, fg, OP.frag, 0, jit);
          else {
            const g = ditherG(clamp01(T), hash3(c, r, step + 31));
            put(c, r, g, OP.d0 + OP.d1 * RAMP_G.indexOf(g), 0, jit);
          }
          continue;
        }
        if (win[id]) {
          // the lens has cleared this zone; only the found text is printed in it
          const alt = altRow[id] && sumK > 0;
          const g0 = txtG[id];
          if (!g0 && !(alt && altG[id])) {
            put(c, r, 0, 0);
            continue;
          }
          const scr = SCR_G[Math.floor(hash3(c, r, scrStep) * SCR_G.length)];
          if (dS < DEC && hDec[id] > dS / DEC) put(c, r, scr, OP.scr);
          else if (alt) {
            const u = sumK * 1.4 - hDec[id] * 0.4;
            if (u >= 0.55) put(c, r, altG[id], OP.sum);
            else if (u > 0) put(c, r, scr, OP.scr);
            else put(c, r, g0, txtOp[id]);
          } else put(c, r, g0, txtOp[id]);
          continue;
        }
        // ordered: the image, cleanly dithered
        const T = clamp01(0.1 + 0.4 * radial[id] + 0.42 * shadowAt(x, y));
        if (x < xg) {
          // governed: the same image, settled onto a regular ledger grid
          const on = c % 2 === 0 && r % 2 === 0;
          if (on && T > 0.42) put(c, r, RAMP_G[5], OP.gridPlus);
          else if (on && T > 0.12) put(c, r, RAMP_G[1], OP.grid);
          else put(c, r, 0, 0);
        } else {
          const g = ditherG(T, bay[id]);
          put(c, r, g, OP.d0 + OP.d1 * RAMP_G.indexOf(g));
        }
      }
    }

    // 02: the hidden instruction: forms, is flagged, travels in, hits the ring, breaks
    if (phForm > 0.001) {
      const e = phGo * phGo; // it accelerates toward the ring and stops dead on it
      const pr = Math.round(1 + (stopRow - 1) * e);
      const c0 = PH_C0 + Math.round(PH_IN * (1 - e));
      // a clean strip for it to travel in
      for (let c = Math.max(0, c0 - 1); c <= Math.min(COLS - 1, c0 + PHRASE.length); c++)
        if (h0[pr * COLS + c] >= rk) put(c, pr, 0, 0);
      for (let j = 0; j < PHRASE.length; j++) {
        const c = c0 + j;
        if (c < 0 || c >= COLS || h0[pr * COLS + c] < rk) continue;
        const hj = hash3(j, 3, 17);
        if (phForm < hj * 0.7 + 0.05) continue;
        const mid = j >= BRK[0] && j < BRK[1];
        if (mid && phBrk > 0) {
          // at the point of contact: broken into "[stripped]"
          const u = phBrk * 1.5 - (Math.abs(j + 0.5 - (BRK[0] + BRK[1]) / 2) / 5) * 0.5;
          if (u > 0.45) {
            put(c, pr, STRIPPED_G[j - BRK[0]], OP.stripped);
            continue;
          }
          if (u > 0) {
            put(c, pr, SCR_G[Math.floor(hash3(c, j, scrStep) * SCR_G.length)], OP.scr, phVio * (1 - u * 2));
            continue;
          }
        }
        // the violet flanks crumble outward from the break
        const away = j < BRK[0] ? BRK[0] - 1 - j : j - BRK[1];
        const u = mid ? 0 : (phDis * 1.3 - (away / 9) * 0.7 - hj * 0.3) / 0.3;
        if (u >= 1) continue; // a clean gap
        const decoded = phDec * 1.3 - j / PHRASE.length - hj * 0.3 > 0;
        let g = decoded ? PHRASE_G[j] : DENSE_G[Math.floor(hash3(c, j, Math.floor(now / 80)) * DENSE_G.length)];
        let op = decoded ? OP.phInk + (OP.phVio - OP.phInk) * phVio : OP.frag;
        if (u > 0) {
          g = FADE_G[Math.min(4, Math.floor(u * 5))];
          op *= 1 - u * 0.7;
        }
        put(c, pr, g, op, decoded ? phVio : 0, decoded ? 128 : 128 + Math.round((hash3(c, j, Math.floor(now / 120)) - 0.5) * 80));
      }
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

    /* the turntable: a critically damped, shortest-path follow of the story angle */
    const target = spinTarget(t);
    if (fSnap) {
      th = target;
      thV = 0;
    } else {
      const w = SPIN_W / 1000;
      const n = Math.ceil(fDt / 8);
      const h = fDt / n;
      let d = wrap180(target - th);
      for (let i = 0; i < n; i++) {
        thV += (w * w * d - 2 * w * thV) * h;
        th += thV * h;
        d -= thV * h;
      }
    }
    th = target - wrap180(target - th); // stay in this loop's range (360 ≡ 0 at the wrap)
    spin.rotation.y = -deg(th);
    rig.updateMatrixWorld(true);
    const m = spin.matrixWorld.elements;
    sh.ux = m[0];
    sh.uy = m[1];
    sh.uz = m[2];
    sh.vx = m[4];
    sh.vy = m[5];
    sh.vz = m[6];
    sh.nx = m[8];
    sh.ny = m[9];
    sh.nz = m[10];
    sh.ox = m[12];
    sh.oy = m[13];
    sh.oz = m[14];
    sh.k = sh.nx * (sh.ox - LIGHT.x) + sh.ny * (sh.oy - LIGHT.y) + sh.nz * (sh.oz - LIGHT.z);

    /* the gaze (sway and lean included): the canonical face sweeps for 01, the mirrored
       face for 03; what a sweep has passed stays swept until the tail */
    const see = th > -80 && th < 80;
    const gov = th > 100 && th < 260;
    if (th <= -80) xSee.fill(-Infinity);
    else if (th >= 80) xSee.fill(Infinity);
    else gaze(xSee);
    if (th <= 100) xGov.fill(-Infinity);
    else if (th >= 260) xGov.fill(Infinity);
    else gaze(xGov);
    const xMid = see ? xSee[RC] : gov ? xGov[RC] : Infinity;
    lineK = follow(lineK, Math.abs(xMid) < GAZE_ON ? 1 : 0, 120);
    if (see || gov) {
      const L = Math.hypot(nX, nY) || 1;
      const c0 = nX * (FX - sh.ox) + nY * (FY - sh.oy) + nZ * (WALL_Z - sh.oz);
      (fieldMat.uniforms.uLine.value as THREE.Vector3).set(nX / L, nY / L, c0 / L);
    }
    fieldMat.uniforms.uLineA.value = OP.line * lineK;

    /* 02 */
    phForm = follow(phForm, t < RESET_T ? smooth(seg(t, PH.form0, PH.form1)) : 0, 90);
    phDec = follow(phDec, seg(t, PH.dec0, PH.dec1), 70);
    phVio = follow(phVio, smooth(seg(t, PH.vio0, PH.vio1)), 90);
    phGo = follow(phGo, seg(t, PH.go0, PH.go1), 40);
    phBrk = follow(phBrk, seg(t, PH.brk0, PH.brk1), 60);
    phDis = follow(phDis, seg(t, PH.dis0, PH.dis1), 90);

    /* 03: the ledger is written by the mirrored face's sweep, one row at a time,
       complete at LOG_T.seal (206°) */
    const led = th > 100 ? clamp01((th - 135) / 70) : 0;
    for (let i = 0; i < N_ENT; i++) {
      const pk = clamp01(((led - i / (N_ENT + 2)) * (N_ENT + 2)) / 3);
      tick[i] = clamp01(pk / 0.25);
      rule[i] = clamp01((pk - 0.12) / 0.88);
    }
    sumK = clamp01((led - 0.8) / 0.2);

    /* tail: back to noise */
    resetK = follow(resetK, t >= RESET_T ? smooth(seg(t, RESET_T, RESET_T + 300)) : 0, 60);
    fieldMat.uniforms.uLedA.value = OP.rule * (1 - clamp01(resetK / 0.97));

    writeField(nowMs);
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
    // the row that rests on the ring's top edge, as seen from the camera
    const C = camera.position;
    const py = RING_TOP * Math.cos(TILT);
    const pz = RING_TOP * Math.sin(TILT);
    const yWall = C.y + ((py - C.y) * (C.z - WALL_Z)) / (C.z - pz);
    // the row whose glyphs sit ON the edge: their lower half behind the band's rim
    stopRow = Math.max(2, Math.min(SUM_TOP.row - 3, Math.round((FTOP - yWall) / CH)));
  }

  /** a turntable-local point → stage px (in tmpV.x / tmpV.y) */
  const toStage = (x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(spin.matrixWorld).project(camera);
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
    // the turntable carries the nodes round and behind: the page's labels step aside
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      // the mark's silhouette as an ellipse: full height, width following the turn
      const c = toStage(0, 0, 0);
      const cx = c.x;
      const cy = c.y;
      const ex = toStage(MARK_R, 0, 0);
      const rxRaw = Math.hypot(ex.x - cx, ex.y - cy);
      const ey = toStage(0, MARK_R, 0);
      const ry = Math.max(1, Math.hypot(ey.x - cx, ey.y - cy));
      const rx = Math.max(rxRaw, 0.35 * ry);
      const u = (x - cx) / rx;
      const v = (y - cy) / ry;
      return u * u + v * v <= 1;
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
      pillow.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
