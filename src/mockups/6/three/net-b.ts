/* The office scene for the See / Secure / Govern section, driven by its step clock.
 *
 * A product-photography tabletop: a floor plan printed with zone brackets and a fine
 * grid, a clear glass rack (the registered agent's chrome hex core inside), a glass
 * database, five glass desks with monitors and chrome pucks.
 *
 * Variant b, "the floor becomes the log". The Blindsight mark (one rigid chrome
 * piece, a clear glass hub) works the office row by row above the desks, its gap
 * aimed along the way. At each finding it aims node 0 at the log, a margin strip
 * along the tabletop's front edge, projects a hairline from what it found to that
 * row's start, and the row is written out: event, leader, one verdict in the margin.
 *
 * Storyboard (scene ms; the section plays 300 → 7600, see BEATS):
 *   SEE      Beside the rack (its tool calls show on the glass): agent:finance ·
 *            invoice_0412.pdf ... LOGGED. Over ws-fin-02: crm-assistant →
 *            export(customers) ... FLAGGED. Over ws-sal-02: chatgpt.com (personal) ·
 *            m.keller ... FLAGGED. Each flow shows once its source is found.
 *   SECURE   Back to each desk; its hairline again, and the verdict is rewritten in
 *            place: MASKED, then BLOCKED. Each flow stops.
 *   GOVERN   The camera tilts down 7° so the strip reads as the log's rows; from the
 *            rack, the seal: sealed · 3 findings ... LOGGED. The mark rests over
 *            clear floor, the hub reading LOGGED; no chips.
 * One act at a time; finished rows dim slightly until the log is sealed. No violet.
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
 *  (0 found/unregistered · 1 contained · 2 governed). Order: rack, then FLAGGED. */
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
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

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
/** desk footprint and the fence around it (half sizes) */
const DESK = { w: 1.24, d: 0.68, top: 0.5 };
// walls stay below the contained core, so the thing being contained stays in view
const FENCE_H = { x: 0.84, z: 0.6, h: 0.68 };

/* ------------------------------------------------------------------ */
/* the log: a margin strip along the tabletop's front edge, its rows   */
/* running along the camera's horizontal so they read level            */
/* ------------------------------------------------------------------ */
const VIEW_AZ = 0.66; // the section camera's azimuth (see cam.az)
/** strip axes on the floor: u along the rows (screen right), v toward the camera */
const SU: [number, number] = [Math.cos(VIEW_AZ), -Math.sin(VIEW_AZ)];
const SV: [number, number] = [Math.sin(VIEW_AZ), Math.cos(VIEW_AZ)];
const stripToWorld = (u: number, v: number): [number, number] => [u * SU[0] + v * SV[0], u * SU[1] + v * SV[1]];
const LOG = { u0: -2.6, v0: 4.6, row: 0.3, em: 0.2, vem: 0.17, px: 300 };
/** the texture's rect in strip coordinates: u, v, width, depth */
const LOG_RECT = [LOG.u0 - 0.25, LOG.v0 - 0.3, 5.5, 1.35] as const;
type Line = { text: string; verdict: string; fix: string };
const LINES: Line[] = [
  { text: "agent:finance · invoice_0412.pdf", verdict: "LOGGED", fix: "" },
  { text: "crm-assistant → export(customers)", verdict: "FLAGGED", fix: "MASKED" },
  { text: "chatgpt.com (personal) · m.keller", verdict: "FLAGGED", fix: "BLOCKED" },
  { text: "sealed · 3 findings", verdict: "LOGGED", fix: "" },
];
const rowV = (i: number) => LOG.v0 + i * LOG.row;
/** the verdicts share one right margin; a fix replaces its verdict in place */
const VX = LOG.u0 + 33 * 0.6 * LOG.em + 0.3;
const CW = 0.6 * LOG.vem;
const LAY = LINES.map((l) => ({ end: LOG.u0 + l.text.length * 0.6 * LOG.em, vEnd: VX + l.verdict.length * CW, fEnd: VX + l.fix.length * CW }));

/* ------------------------------------------------------------------ */
/* the mark (logo units: orbit radius 1, from ICON_Blindsight.svg)     */
/* ------------------------------------------------------------------ */
const S = 1.0; // world size of the orbit radius: the hub reads a verdict at ≥ 14 px
const [HUB_R, HUB_GLASS, NODE_R, ARM_W] = [0.5, 0.44, 0.25, 0.168];
const [RING_IN, RING_OUT, RING_CUT] = [0.89, 1.11, 0.36]; // stroke 0.22 ≈ 0.09·D
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise seen from above
const [DEPTH, BEVEL] = [0.024, 0.016]; // ≈ 0.25 × stroke in all: a watch bezel
const HALF = DEPTH / 2 + BEVEL;
const WORD_R = 0.42; // the verdict tab's half-width
const Y_HOVER = 1.35; // above every monitor
/** where it works from: beside the rack, over each flagged desk; where it rests */
const AT = {
  rack: [-1.0, -2.15] as [number, number],
  crm: [1.95, -1.25] as [number, number],
  gpt: [1.4, 1.2] as [number, number],
  park: [-3.0, 0.8] as [number, number],
};
const WORDS = ["LOGGED", "FLAGGED", "MASKED", "BLOCKED"];

type Pose = number[]; // x, y, z, heading
type Key = { t: number; v: Pose; q: boolean };
const wrapPi = (a: number) => {
  const r = (a + Math.PI) % (Math.PI * 2);
  return (r < 0 ? r + Math.PI * 2 : r) - Math.PI;
};
const deg = (d: number) => (d * Math.PI) / 180;
const easeQ = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/** One act at a time. Each: node 0 aims at its row and projects a hairline from
 *  under itself to the row's start (lead), then the row is written out (type);
 *  a fix rewrites the verdict in place. The chip and the hub word follow. */
type Act = {
  row: number;
  fix: boolean;
  lead: [number, number]; // hairline: projected from t0 to t1
  type: [number, number]; // writing: t0 to t1
  from: [number, number]; // the hairline's start on the floor
  chip: number;
  word: number;
};

const SCRIPT = (() => {
  const keys: Key[] = [];
  const acts: Act[] = [];
  let cur: Pose = [AT.rack[0], Y_HOVER, AT.rack[1], 0];
  keys.push({ t: 0, v: cur.slice(), q: false });
  const key = (t: number, v: Pose, q = false) => {
    keys.push({ t, v: v.slice(), q });
    cur = v.slice();
  };
  const hold = (t: number) => key(t, cur);
  /** the gap aims first: turn until node 0 (or the nearest node) faces (tx, tz) */
  const aim = (t0: number, t1: number, tx: number, tz: number, lead0 = false) => {
    const ang = Math.atan2(-(tz - cur[2]), tx - cur[0]);
    let bd = Infinity;
    for (const a of lead0 ? [0] : NODE_A) {
      const d = wrapPi(ang - deg(a) - cur[3]);
      if (Math.abs(d) < Math.abs(bd)) bd = d;
    }
    hold(t0);
    key(t1, [cur[0], cur[1], cur[2], cur[3] + bd]);
  };
  const glide = (t0: number, t1: number, at: [number, number]) => {
    aim(t0, t0 + 90, at[0], at[1]);
    hold(t0 + 90);
    key(t1, [at[0], Y_HOVER, at[1], cur[3]], true);
  };
  /** an act: aim node 0 at the row's start, project the hairline, write */
  const act = (t0: number, row: number, fix: boolean, chip: number, word: number) => {
    const [rx, rz] = stripToWorld(LOG.u0 - 0.12, rowV(row));
    aim(t0, t0 + 100, rx, rz, true);
    const from: [number, number] = [cur[0] + Math.cos(cur[3]) * S, cur[2] - Math.sin(cur[3]) * S];
    const u0 = fix ? VX : LOG.u0;
    const u1 = fix ? LAY[row].fEnd : LAY[row].vEnd;
    const typeMs = 90 + (u1 - u0) * 55; // an even hand
    acts.push({ row, fix, lead: [t0 + 100, t0 + 250], type: [t0 + 250, t0 + 250 + typeMs], from, chip, word });
    return t0 + 250 + typeMs;
  };

  /* SEE: row by row: the back row (the rack's agent, then crm-assistant), the front row */
  let t = act(300, 0, false, 0, 0);
  glide(t + 40, t + 340, AT.crm);
  t = act(t + 340, 1, false, 1, 1);
  glide(t + 40, t + 340, AT.gpt);
  act(t + 340, 2, false, 2, 1);
  /* SECURE: back to each: the verdict is rewritten in place */
  glide(3500, 3800, AT.crm);
  t = act(3800, 1, true, 1, 2);
  glide(t + 60, t + 360, AT.gpt);
  act(t + 360, 2, true, 2, 3);
  /* GOVERN: home to the rack, the seal, then rest over clear floor */
  glide(5000, 5500, AT.rack);
  t = act(5520, 3, false, -1, 0);
  glide(t + 250, t + 700, AT.park);
  return { keys, acts };
})();
const ACTS = SCRIPT.acts;
const SEALED = ACTS[5].type[1];

/** time → the mark's pose */
function poseAt(t: number, out: Pose) {
  const K = SCRIPT.keys;
  let i = 0;
  while (i < K.length - 1 && t >= K[i + 1].t) i++;
  const a = K[i];
  const b = K[Math.min(i + 1, K.length - 1)];
  const x = b.t > a.t ? clamp01((t - a.t) / (b.t - a.t)) : 0;
  const k = b.q ? easeQ(x) : inOutCubic(x);
  for (let j = 0; j < 4; j++) out[j] = lerp(a.v[j], b.v[j], k);
  return out;
}

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

/* ------------------------------------------------------------------ */
/* floor                                                               */
/* ------------------------------------------------------------------ */
const NC = 20;
const NB = 8; // log bands: 4 rows' text, 2 first verdicts, 2 fixes

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
  uniform float uHidAmt;
  uniform vec4 uRev[3];
  uniform sampler2D uLog; uniform vec4 uLogRect; uniform vec2 uLogU; uniform vec2 uLogV;
  uniform vec4 uBand[NB]; uniform vec4 uBandX[NB]; uniform vec3 uBandC[NB];
  uniform float uInkAmt; uniform float uDotAmt; uniform float uShadeMax;
  uniform float uGridAmt;
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
    // what has been found: each mark spreads out from its desk as the finding is made
    float behind = 0.0;
    for (int i = 0; i < 3; i++) {
      vec4 r = uRev[i];
      if (r.z > 0.0) behind = max(behind, 1.0 - smoothstep(r.z - 0.15, r.z, length(p - r.xy)));
    }
    behind *= uHidAmt;

    // analytic contact shadows: rounded-rect SDF per caster
    float sh = 0.0;
    for (int i = 0; i < NC; i++) {
      vec4 a = uCA[i]; vec4 b = uCB[i];
      if (b.z > 0.0) {
        float d = sdRB(p - a.xy, a.zw, b.x);
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

    // the log, in the strip's own axes (u along a row, v toward the camera): each
    // band shows up to its writing point; finished rows are dimmed
    vec2 q = vec2(dot(p, uLogU), dot(p, uLogV));
    vec2 lv = (q - uLogRect.xy) / uLogRect.zw;
    vec3 L = texture2D(uLog, lv).rgb * step(0.0, lv.x) * step(lv.x, 1.0) * step(0.0, lv.y) * step(lv.y, 1.0);
    float logInk = 0.0;
    for (int i = 0; i < NB; i++) {
      vec4 b = uBand[i]; vec4 bx = uBandX[i];
      if (b.w > 0.0 && q.y > b.x && q.y < b.y && q.x > bx.x && q.x < bx.y) {
        float rev = 1.0 - smoothstep(b.z - 0.004, b.z + 0.004, q.x);
        logInk = max(logInk, dot(L, uBandC[i]) * rev * b.w);
      }
    }
    col = mix(col, uInk, logInk);

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

  /* hidden plan: what the scan finds */
  const hidden = mk();
  {
    const g = hidden.g;
    // the registered agent: solid brackets, calm (its name is a screen-space chip)
    g.lineWidth = 3;
    brackets(g, X(RACK.x - 0.62), X(RACK.x + 0.62), Z(RACK.z - 0.55), Z(RACK.z + 0.42), 0.16 * PLAN.px);
    // the two nobody registered: a dashed square (the fence later draws over it)
    g.lineWidth = 4;
    for (const f of FLAGGED) {
      const d = DESKS[f.desk];
      g.setLineDash([16, 10]);
      g.strokeRect(X(d.x - FENCE_H.x), Z(d.z - FENCE_H.z), FENCE_H.x * 2 * PLAN.px, FENCE_H.z * 2 * PLAN.px);
      g.setLineDash([]);
    }
  }
  return { base: dataTexture(base.c), hidden: dataTexture(hidden.c) };
}

/** The log strip at 300 px per unit, in strip coordinates (canvas x = u, y = v).
 *  Channels: r = each row's text, leader and final LOGGED; g = the first verdict
 *  FLAGGED; b = the verdict that replaces it (MASKED, BLOCKED). */
function logTexture() {
  const [ru, rv, rw, rd] = LOG_RECT;
  const W = Math.round(rw * LOG.px);
  const H = Math.round(rd * LOG.px);
  const X = (u: number) => (u - ru) * LOG.px;
  const Y = (v: number) => (v - rv) * LOG.px;
  const layer = (draw: (g: CanvasRenderingContext2D) => void) => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    g.fillStyle = "#fff";
    g.strokeStyle = "#fff";
    g.textBaseline = "middle";
    draw(g);
    return g.getImageData(0, 0, W, H).data;
  };
  const mono = (g: CanvasRenderingContext2D, em: number) => {
    g.font = `500 ${Math.round(em * LOG.px)}px "IBM Plex Mono", ui-monospace, monospace`;
  };
  const text = layer((g) =>
    LINES.forEach((l, i) => {
      const y = Y(rowV(i));
      mono(g, LOG.em);
      g.fillText(l.text, X(LOG.u0), y);
      g.lineWidth = 2; // the hairline leader to the margin
      g.beginPath();
      g.moveTo(X(LAY[i].end + 0.08), y);
      g.lineTo(X(VX - 0.08), y);
      g.stroke();
      mono(g, LOG.vem);
      if (!l.fix) g.fillText(l.verdict, X(VX), y);
    }),
  );
  const first = layer((g) => {
    mono(g, LOG.vem);
    LINES.forEach((l, i) => l.fix && g.fillText(l.verdict, X(VX), Y(rowV(i))));
  });
  const fixes = layer((g) => {
    mono(g, LOG.vem);
    LINES.forEach((l, i) => l.fix && g.fillText(l.fix, X(VX), Y(rowV(i))));
  });
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = text[i * 4];
    data[i * 4 + 1] = first[i * 4];
    data[i * 4 + 2] = fixes[i * 4];
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

/** the mark's own studio: black, with thin hard strips where its flat chrome mirrors,
 *  so it reads as crisp black and white bands (the office keeps the grey studio) */
function markEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        // a black studio: the chrome mirrors black flags and hard white strips, so it
        // reads as crisp black and white bands, never flat grey
        top: { value: grey(0.03) },
        hor: { value: grey(0.04) },
        bot: { value: grey(0.02) },
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
  // thin strips where the flat top mirrors: opposite the section's camera
  // (azimuth ~218°, elevation ~33°) and near the zenith for the top-down view
  for (const el of [24, 29, 34, 39, 44]) panel(16, 0.5, 218, el, 5);
  for (const el of [72, 78, 84]) panel(16, 0.5, 180, el, 5);
  // tall strips on the horizon: highlights running round the bevels
  panel(1.1, 16, 110, 4, 3.5);
  panel(1.1, 16, 290, 4, 3.5);
  panel(0.7, 16, 20, 4, 2.5);
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

/* ------------------------------------------------------------------ */
/* the mark's parts                                                    */
/* ------------------------------------------------------------------ */
/** the logo's body as one outline: a thin bezel round the hub, three full-width
 *  arms, three solid node discs; the glass sits in the bezel's opening */
function bodyShape() {
  const s = new THREE.Shape();
  const w = ARM_W / 2;
  const ah = Math.asin(w / HUB_R);
  const an = Math.asin(w / NODE_R);
  const sN = 1 - Math.sqrt(NODE_R * NODE_R - w * w);
  const A = NODE_A.map(deg);
  A.forEach((a, k) => {
    const [c, sn] = [Math.cos(a), Math.sin(a)];
    s.absarc(0, 0, HUB_R, (k ? A[k - 1] : A[2] - Math.PI * 2) + ah, a - ah, false);
    s.lineTo(sN * c + w * sn, sN * sn - w * c);
    s.absarc(c, sn, NODE_R, a - Math.PI + an, a + Math.PI - an, false);
  });
  s.closePath();
  s.holes.push(new THREE.Path().absarc(0, 0, HUB_GLASS, 0, Math.PI * 2, true));
  return s;
}

/** the orbit's cut angles: where its outer and inner edges meet the cut round a node */
const CUT_O = Math.acos((RING_OUT * RING_OUT + 1 - RING_CUT * RING_CUT) / (2 * RING_OUT));
const CUT_I = Math.acos((RING_IN * RING_IN + 1 - RING_CUT * RING_CUT) / (2 * RING_IN));

/** one orbit arc between node k and the next, its ends cut concentric with the nodes */
function bandShape(k: number) {
  const a0 = deg(NODE_A[k]);
  const a1 = deg(NODE_A[k + 1] ?? 360);
  const at = (r: number, a: number): [number, number] => [r * Math.cos(a), r * Math.sin(a)];
  const s = new THREE.Shape();
  const cut = (a: number, p: [number, number], q: [number, number]) => {
    const [cx, cy] = at(1, a);
    s.absarc(cx, cy, RING_CUT, Math.atan2(p[1] - cy, p[0] - cx), Math.atan2(q[1] - cy, q[0] - cx), true);
  };
  s.absarc(0, 0, RING_OUT, a0 + CUT_O, a1 - CUT_O, false);
  cut(a1, at(RING_OUT, a1 - CUT_O), at(RING_IN, a1 - CUT_I));
  s.absarc(0, 0, RING_IN, a1 - CUT_I, a0 + CUT_I, true);
  cut(a0, at(RING_IN, a0 + CUT_I), at(RING_OUT, a0 + CUT_O));
  return s;
}

/** a flat logo outline, extruded thin (a watch bezel) and bevelled, lying in the
 *  mark's plane; groups: 0 = the flat faces, 1 = the bevels and sides */
function slabGeo(s: THREE.Shape) {
  const opt = { depth: DEPTH, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 3, curveSegments: 48 };
  return new THREE.ExtrudeGeometry(s, opt).rotateX(-Math.PI / 2).translate(0, -DEPTH / 2, 0);
}

/** the one ink silhouette: the outer contour only (the orbit's outer edges and the
 *  nodes' outer halves), at the bevel's widest */
function silhouette() {
  const r = BEVEL + 0.004;
  const pts: THREE.Vector3[] = [];
  const arcPts = (cx: number, cy: number, rad: number, a0: number, a1: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const u = (a: number) => [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
      const [x0, y0] = u(lerp(a0, a1, i / n));
      const [x1, y1] = u(lerp(a0, a1, (i + 1) / n));
      pts.push(new THREE.Vector3(x0, 0, -y0), new THREE.Vector3(x1, 0, -y1));
    }
  };
  NODE_A.forEach((a, k) => {
    const a0 = deg(a);
    const a1 = deg(NODE_A[k + 1] ?? 360);
    arcPts(0, 0, RING_OUT + r, a0 + CUT_O, a1 - CUT_O, 48);
    arcPts(Math.cos(a0), Math.sin(a0), NODE_R + r, a0 - deg(100), a0 + deg(100), 32);
  });
  return new THREE.BufferGeometry().setFromPoints(pts);
}

/** The verdict the hub shows: one word, ink on the glass, ~15 px on screen. */
const WORD_TEX = { w: 1024, h: 576 };
function wordTextures() {
  return WORDS.map((word) => {
    const cv = document.createElement("canvas");
    cv.width = WORD_TEX.w;
    cv.height = WORD_TEX.h;
    const g = cv.getContext("2d")!;
    // upright medium caps, sized to fill the hub: ≥ 14 px on screen (hub ≈ 55-62 px wide)
    const px = Math.min(260, Math.floor(1000 / (0.6 * word.length)));
    g.font = `normal normal 500 ${px}px "IBM Plex Mono", ui-monospace, monospace`;
    g.fillStyle = "#fff";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(word.toUpperCase(), WORD_TEX.w / 2, WORD_TEX.h / 2 + 6);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  });
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
  const matPacket = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false });
  const matWire = FLAGGED.map(
    () => new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false }),
  );

  /* ---------- floor ---------- */
  const tex = planTextures();
  const logTex = logTexture();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uPlan: { value: tex.base },
    uHidden: { value: tex.hidden },
    uRect: { value: new THREE.Vector4(PLAN.x0, PLAN.z0, PLAN.w, PLAN.d) },
    uRev: { value: [0, 1, 2].map(() => new THREE.Vector4()) },
    uLog: { value: logTex },
    uLogRect: { value: new THREE.Vector4(...LOG_RECT) },
    uLogU: { value: new THREE.Vector2(...SU) },
    uLogV: { value: new THREE.Vector2(...SV) },
    uBand: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
    uBandX: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
    uBandC: { value: Array.from({ length: NB }, () => new THREE.Vector3()) },
    uHidAmt: { value: 1 },
    uInkAmt: { value: dark ? 0.22 : 0.17 },
    uDotAmt: { value: dark ? 0.16 : 0.13 },
    uShadeMax: { value: dark ? 0.9 : 0.5 },
    uGridAmt: { value: dark ? 0.04 : 0.1 },
    uPool: { value: new THREE.Vector4(0.4, -0.4, 7.5, dark ? 0.045 : 0) },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uFade: { value: new THREE.Vector4(0.6, 0.8, 6.3, 9.2) }, // the tabletop reaches the log strip at its front edge
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.ShaderMaterial({
      uniforms: floorU,
      vertexShader: floorVert,
      fragmentShader: `#define NC ${NC}\n#define NB ${NB}\n` + floorFrag,
      toneMapped: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  let nCaster = 0;
  const caster = (x: number, z: number, hw: number, hd: number, r: number, soft: number, k: number) => {
    if (nCaster >= NC) return;
    floorU.uCA.value[nCaster].set(x + 0.05, z + 0.07, hw, hd);
    floorU.uCB.value[nCaster].set(r, soft, k, 0);
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
     registered agent's chrome hex core sits in an open slot ---------- */
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
  // in the rack's open slot, on its glass: agent:finance's own tool calls, in mono ink
  // (they appear when the mark reads the rack)
  const callTex = (() => {
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = 440;
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#fff";
    g.font = `500 44px "IBM Plex Mono", ui-monospace, monospace`;
    g.textBaseline = "middle";
    ["agent:finance", "read(invoice_0412.pdf)", "sum → EUR 18,240.00", "log(ledger)"].forEach((l, i) => g.fillText(l, 24, 70 + i * 100));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  })();
  const matCalls = new THREE.MeshBasicMaterial({ color: ink, alphaMap: callTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const calls = add(rack, new THREE.PlaneGeometry(0.68, 0.47), matCalls, 0, 0.8, 0.334);
  calls.visible = false;
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

  /* ---------- flows: a hairline track and packets moving along it, shown only
     while data actually moves ---------- */
  const packetGeo = new THREE.BoxGeometry(1, 1, 1);
  const makeFlow = (a: [number, number], b: [number, number], n: number, mat: THREE.Material) => {
    const A = new THREE.Vector3(a[0], 0.014, a[1]);
    const B = new THREE.Vector3(b[0], 0.014, b[1]);
    const len = A.distanceTo(B);
    const ang = Math.atan2(-(B.z - A.z), B.x - A.x);
    const mesh = new THREE.InstancedMesh(packetGeo, mat, n);
    mesh.frustumCulled = false;
    const trackMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.012), trackMat);
    track.position.copy(A).lerp(B, 0.5).setY(0.004);
    track.rotation.set(-Math.PI / 2, 0, ang);
    scene.add(mesh, track);
    return { mesh, track, trackMat, A, B, n, q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang) };
  };
  type Flow = ReturnType<typeof makeFlow>;
  const crmDesk = DESKS[FLAGGED[0].desk];
  const gptDesk = DESKS[FLAGGED[1].desk];
  // crm-assistant pulling records out of the database: the one violet signal
  const flowCrm = makeFlow([DB.x + 0.5, DB.z + 0.02], [crmDesk.x - DESK.w / 2 - 0.04, crmDesk.z + 0.02], 6, matPacket); // ink: no violet in this version
  // chatgpt.com: data leaving the building to the right, behind ws-sal-03; it runs away
  // from the log strip and never crosses its rows
  const flowGpt = makeFlow([gptDesk.x + 0.7, gptDesk.z - 0.5], [gptDesk.x + 3.8, gptDesk.z - 2.1], 7, matPacket);

  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  /** continuous stream: packets loop along the track while amt > 0 */
  const stream = (f: Flow, t: number, amt: number, period: number) => {
    for (let i = 0; i < f.n; i++) {
      const ph = (((t / period + i / f.n) % 1) + 1) % 1;
      const edge = smooth(clamp01(ph / 0.14)) * smooth(clamp01((1 - ph) / 0.14));
      const s = Math.max(amt * edge, 0.0001);
      tmpP.copy(f.A).lerp(f.B, ph);
      tmpS.set(0.1 * s, 0.012 * s, 0.03 * s);
      tmpM.compose(tmpP, f.q, tmpS);
      f.mesh.setMatrixAt(i, tmpM);
    }
    f.mesh.instanceMatrix.needsUpdate = true;
    f.mesh.visible = amt > 0.001;
    f.trackMat.opacity = amt * (dark ? 0.35 : 0.28);
    f.track.visible = amt > 0.001;
  };
  /* ---------- the mark: one rigid chrome piece, flat, extruded thin from the logo's
     outline, a clear glass hub; lit by its own strip-and-flag studio so the chrome
     reads as black and white bands ---------- */
  const markEnv = markEnvironment(renderer);
  const chrome = (roughness: number) =>
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(dark ? "#e6e8ec" : "#f4f5f7"), metalness: 1, roughness, envMap: markEnv, envMapIntensity: 1 });
  const matMark = [chrome(0.08), chrome(0.14)]; // flat faces, bevels
  const matHub = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    ior: 1.5,
    thickness: 0.03,
    specularIntensity: 1,
    envMap: markEnv,
  });
  const matRim = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.4 : 0.5 });
  const mark = new THREE.Group();
  mark.scale.setScalar(S);
  scene.add(mark);
  mark.add(new THREE.Mesh(slabGeo(bodyShape()), matMark));
  NODE_A.forEach((_, k) => mark.add(new THREE.Mesh(slabGeo(bandShape(k)), matMark)));
  mark.add(new THREE.Mesh(new THREE.CylinderGeometry(HUB_GLASS + 0.005, HUB_GLASS + 0.005, DEPTH + BEVEL, 96), matHub));
  mark.add(new THREE.LineSegments(silhouette(), matRim));
  // the verdict: a small upright tab rising from the hub, always square to the
  // camera, so the word reads as plain upright mono, never a foreshortened slant
  const wordTex = wordTextures();
  const uR = new THREE.Vector3(1, 0, 0);
  const TAB_W = 2 * WORD_R * S;
  const matWord = new THREE.MeshBasicMaterial({ color: ink, alphaMap: wordTex[0], transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(TAB_W, (TAB_W * WORD_TEX.h) / WORD_TEX.w), matWord);
  tab.renderOrder = 11;
  scene.add(tab);

  /* ---------- the hairlines a node projects from what it found to its row's start ---------- */
  const leadGeo = new THREE.PlaneGeometry(1, 0.012).translate(0.5, 0, 0).rotateX(-Math.PI / 2);
  const leads = ACTS.map((a) => {
    const [rx, rz] = stripToWorld(LOG.u0 - 0.12, rowV(a.row));
    const [fx, fz] = a.from;
    const mat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(leadGeo, mat);
    m.position.set(fx, 0.005, fz);
    m.rotation.y = Math.atan2(-(rz - fz), rx - fx);
    m.visible = false;
    scene.add(m);
    return { m, mat, len: Math.hypot(rx - fx, rz - fz) };
  });

  /* ---------- per-frame ---------- */
  let viewW = 1;
  let viewH = 1;
  const tgt = new THREE.Vector3();

  /** the section's view; in Govern it tilts down 7° so the strip reads as the log's rows */
  function placeCamera(t: number) {
    const k = smooth(seg(t, 5000, 5600));
    const ph = (t / LOOP_MS) * Math.PI * 2;
    const az = cam.az + Math.sin(ph) * 0.012 * (1 - k);
    const el = cam.el + deg(7) * k + Math.sin(ph + 1.2) * 0.006 * (1 - k);
    const dist = cam.dist * lerp(1, 1.131, k);
    tgt.set(lerp(0.6, 0.8, k), 0.2, lerp(1.0, 0.75, k));
    camera.position.set(
      tgt.x + Math.sin(az) * Math.cos(el) * dist,
      tgt.y + Math.sin(el) * dist,
      tgt.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(tgt);
    camera.updateMatrixWorld();
  }

  const pose: Pose = [0, 0, 0, 0];
  const begin = (i: number) => (ACTS[i] ? ACTS[i].lead[0] - 100 : 1e9); // an act begins with its aim
  /** which act writes each band: rows 0-3 (text), rows 1-2 first verdict, rows 1-2 fix */
  const BAND_ACT = [0, 1, 2, 5, 1, 2, 3, 4];
  const BAND_ROW = [0, 1, 2, 3, 1, 2, 1, 2];
  BAND_ACT.forEach((_, i) => {
    const r = BAND_ROW[i];
    floorU.uBandX.value[i].set(i < 6 ? LOG.u0 - 0.05 : VX - 0.05, (i < 6 ? LAY[r].vEnd : LAY[r].fEnd) + 0.05, 0, 0);
    floorU.uBandC.value[i].set(i < 4 ? 1 : 0, i === 4 || i === 5 ? 1 : 0, i >= 6 ? 1 : 0);
  });
  const labelPos = [
    new THREE.Vector3(RACK.x, 1.74, RACK.z),
    ...ais.map((a) => new THREE.Vector3(a.x, TOP + 0.06 + aiH + 0.12, a.z)),
  ];
  const labelState: HeroLabel[] = labelPos.map(() => ({ x: 0, y: 0, a: 0, state: 0 }));
  const labelA = labelPos.map(() => 0);
  // a chip is gone before the next act begins: no ghost fading under the next verdict
  const win = (t: number, t0: number, t1: number) => smooth(seg(t, t0, t0 + 150)) * (1 - smooth(seg(t, t1 - 150, t1)));
  const proj = new THREE.Vector3();

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    placeCamera(t);
    const alive = 1 - smooth(seg(t, RESET[0], RESET[1]));
    const sealed = smooth(seg(t, SEALED, SEALED + 300));

    /* the mark: it glides above the desks, and only turns to aim its gap */
    poseAt(t, pose);
    mark.position.set(pose[0], pose[1], pose[2]);
    mark.rotation.set(0, pose[3], 0);
    mark.updateMatrixWorld(true);

    /* the log: each band is written out at an even pace; a fix replaces its verdict in
       place; finished rows dim slightly until the log is sealed */
    BAND_ACT.forEach((ai, i) => {
      const a = ACTS[ai];
      const r = BAND_ROW[i];
      const [u0, u1] = i >= 6 ? [VX, LAY[r].fEnd] : [LOG.u0, LAY[r].vEnd];
      const u = t < a.type[0] ? -1e3 : lerp(u0, u1, seg(t, a.type[0], a.type[1]));
      let amt = lerp(lerp(1, 0.72, smooth(seg(t, begin(ai + 1), begin(ai + 1) + 200))), 1, sealed) * alive;
      if (i === 4 || i === 5) amt *= 1 - smooth(seg(t, ACTS[i - 1].type[0], ACTS[i - 1].type[0] + 100)); // FLAGGED gives way
      const v = rowV(r);
      floorU.uBand.value[i].set(v - 0.16, v + 0.1, u, t < a.type[0] ? 0 : amt);
    });

    /* the hairlines: projected from under node 0, then let go once the row is written */
    ACTS.forEach((a, i) => {
      const k = outCubic(seg(t, a.lead[0], a.lead[1]));
      const L = leads[i];
      L.mat.opacity = (dark ? 0.45 : 0.36) * (1 - smooth(seg(t, a.lead[1] + 60, a.lead[1] + 320))) * alive; // let go once it lands
      L.m.scale.x = Math.max(L.len * k, 0.0001);
      L.m.visible = k > 0.001 && L.mat.opacity > 0.002;
    });

    /* the verdict on the hub: after each act, until the next begins */
    let [amt, inK, wc] = [0, 0, -1];
    ACTS.forEach((a, i) => {
      const k = seg(t, a.type[1], a.type[1] + 160);
      const f = smooth(k) * (1 - smooth(seg(t, begin(i + 1), begin(i + 1) + 120)));
      if (f > amt) [amt, inK, wc] = [f, k, a.word];
    });
    tab.visible = amt > 0.002;
    if (wc >= 0 && matWord.alphaMap !== wordTex[wc]) {
      matWord.alphaMap = wordTex[wc];
      matWord.needsUpdate = true;
    }
    matWord.opacity = amt * alive;
    const grow = lerp(0.75, 1, outCubic(inK));
    tab.scale.setScalar(grow);
    tab.quaternion.copy(camera.quaternion);
    tab.position.set(pose[0], pose[1] + HALF * S + 0.02 + ((TAB_W * WORD_TEX.h) / WORD_TEX.w / 2) * grow * 0.6, pose[2]);
    uR.setFromMatrixColumn(camera.matrixWorld, 0);

    /* what was found: the rack's own calls show on its glass; the plan's hidden
       marks spread out from each desk as it is found */
    const found = [begin(0), begin(1) + 300, begin(2) + 300];
    matCalls.opacity = 0.8 * smooth(seg(t, found[0] + 100, found[0] + 350)) * alive;
    calls.visible = matCalls.opacity > 0.002;
    const rev = (i: number, x: number, z: number, T: number, R: number) =>
      floorU.uRev.value[i].set(x, z, outCubic(seg(t, T, T + 450)) * R, 0);
    rev(0, RACK.x, RACK.z, found[0] + 100, 1.05);
    FLAGGED.forEach((f, i) => rev(i + 1, DESKS[f.desk].x, DESKS[f.desk].z, found[i + 1], 1.25));
    floorU.uHidAmt.value = alive;

    /* contact shadows: static, then the mark's, soft (it hovers) */
    nCaster = 0;
    for (const d of DESKS) {
      caster(d.x, d.z, DESK.w / 2, DESK.d / 2, 0.03, 0.34, dark ? 0.4 : 0.1);
      caster(d.x + 0.12, d.z + DESK.d / 2 + 0.3, 0.2, 0.2, 0.2, 0.12, dark ? 0.65 : 0.22);
    }
    caster(RACK.x, RACK.z, 0.39, 0.33, 0.05, 0.3, dark ? 0.6 : 0.16);
    caster(DB.x, DB.z, 0.42, 0.42, 0.42, 0.22, dark ? 0.55 : 0.16);
    caster(pose[0], pose[2], 0.85 * S, 0.85 * S, 0.85 * S, 0.4, dark ? 0.3 : 0.08);

    /* the flagged AIs: printed up as they are found; their flows run until the fix */
    FLAGGED.forEach((_, i) => {
      const a = ais[i];
      const T = found[i + 1];
      const printed = smooth(seg(t, T + 40, T + 300)) * alive;
      const wireIn = smooth(seg(t, T - 120, T + 40)) * (1 - smooth(seg(t, T + 300, T + 550)));
      const wireOut = Math.sin(Math.PI * seg(t, RESET[0], RESET[0] + 600)) * 0.7;
      clipPlanes[i].constant = TOP + 0.03 + printed * aiH + 0.0001;
      a.body.visible = printed > 0.001;
      a.foot.visible = printed > 0.001;
      matWire[i].opacity = Math.max(wireIn, wireOut) * (dark ? 0.7 : 0.55);
      a.wire.visible = matWire[i].opacity > 0.001;
    });
    const flowK = (i: number) =>
      smooth(seg(t, found[i + 1] + 150, found[i + 1] + 400)) * (1 - smooth(seg(t, ACTS[i + 3].type[0], ACTS[i + 3].type[0] + 200))) * alive;
    stream(flowCrm, t, flowK(0), 1500);
    stream(flowGpt, t, flowK(1), 1700);

    /* chips: once their event has happened, at most one, the current act's; none in Govern */
    labelA.fill(0);
    ACTS.forEach((a, i) => {
      if (a.chip >= 0) labelA[a.chip] = Math.max(labelA[a.chip], win(t, a.type[1], begin(i + 1)));
    });
    for (let i = 0; i < 3; i++) labelA[i] *= 1 - smooth(seg(t, 4950, 5100));
    labelState[0].state = 0;
    labelState[1].state = t >= ACTS[3].type[1] ? 1 : 0;
    labelState[2].state = t >= ACTS[4].type[1] ? 1 : 0;

    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;
  }

  /** The section only uses "narrow"; "wide" frames it the same. The fit keeps the whole
   *  office, the mark's stations and the log strip 40 px inside a 770×620 canvas. */
  function resize(width: number, height: number, _mode: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    camera.fov = 24;
    const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    cam.dist = Math.max(3.73 / vHalf, 4.63 / (vHalf * camera.aspect));
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels() {
      // a chip never sits on the mark: while the mark is over it on screen, it waits hidden
      const toPx = (v: THREE.Vector3) => [((v.x + 1) / 2) * viewW, ((1 - v.y) / 2) * viewH];
      const [mx, my] = toPx(proj.copy(mark.position).project(camera));
      const [ex] = toPx(proj.copy(mark.position).addScaledVector(uR, 1.2 * S).project(camera));
      const rx = Math.abs(ex - mx) + 62; // + half a chip
      const ry = Math.abs(ex - mx) * 0.75 + 24;
      labelPos.forEach((p, i) => {
        const [x, y] = toPx(proj.copy(p).project(camera));
        const e = Math.hypot((x - mx) / rx, (y - 29 - my) / ry); // the chip's box sits ~14-44 px above its anchor
        labelState[i].x = x;
        labelState[i].y = y;
        labelState[i].a = labelA[i] * smooth(clamp01((e - 0.85) / 0.25));
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
      logTex.dispose();
      wordTex.forEach((x) => x.dispose());
      markEnv.dispose();
      callTex.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
