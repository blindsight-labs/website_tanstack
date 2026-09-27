/* The office scene for the See / Secure / Govern section, driven by its step clock.
 *
 * Variant b, "the floor becomes the log". The office is a clean printed plan: rooms
 * and desk footprints, each with its occupant's or system's name. The Blindsight
 * mark (one rigid chrome piece, a flat glass hub) glides low over it, row by row,
 * its leading gap aimed along the way; one trailing node is a pen. As the mark
 * passes each finding, that node writes one line of the audit log on the floor
 * beside it, with the verdict in a right margin.
 *
 * Storyboard (scene ms; the section plays 300 → 7600, see BEATS):
 *   SEE      Row 1 (server room): agent:finance · invoice_0412.pdf .... LOGGED.
 *            Row 2 (finance): crm-assistant → export(customers) ....... FLAGGED.
 *            Row 3 (sales): chatgpt.com (personal) · m.keller .......... FLAGGED.
 *   SECURE   Back up the margin: the node strikes each FLAGGED and writes the
 *            verdict beside it: MASKED, then BLOCKED.
 *   GOVERN   The camera eases to top-down and the floor reads as the log; the
 *            node rules it off (LOGGED) and the hub reads "logged".
 * One act at a time; finished lines dim slightly until the log is sealed.
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
 *  (0 found · 1 secured · 2 logged). Order: agent:finance, crm-assistant, chatgpt.com. */
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
const easeQ = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const deg = (d: number) => (d * Math.PI) / 180;
const wrapPi = (a: number) => {
  const r = (a + Math.PI) % (Math.PI * 2);
  return (r < 0 ? r + Math.PI * 2 : r) - Math.PI;
};
/** accelerate, cruise at constant speed (the pen writes at an even pace), decelerate */
const trap = (k: number, a = 0.18) => {
  const v = 1 / (1 - a);
  if (k < a) return (v * k * k) / (2 * a);
  if (k > 1 - a) return 1 - (v * (1 - k) * (1 - k)) / (2 * a);
  return v * (k - a / 2);
};

/* ------------------------------------------------------------------ */
/* the plan (world units; the floor is y = 0)                          */
/* ------------------------------------------------------------------ */
/** three rooms, one row each; the scan and the log both run row by row */
const ROOMS = [
  { name: "SERVER ROOM", zc: -1.4 },
  { name: "FINANCE", zc: 0 },
  { name: "SALES", zc: 1.4 },
];
const ROOM = { x0: -2.3, x1: 2.3, h: 1.36 };
/** footprints sit in the back half of each room; the first in a row is its finding */
const PRINTS = [
  { x: -1.7, row: 0, w: 0.72, name: "agent:finance" },
  { x: -0.45, row: 0, w: 0.56, name: "crm-db" },
  { x: -1.6, row: 1, w: 0.9, name: "user_7f3a" },
  { x: -0.3, row: 1, w: 0.9, name: "ws-fin-01" },
  { x: 1.0, row: 1, w: 0.9, name: "ws-fin-02" },
  { x: -1.6, row: 2, w: 0.9, name: "m.keller" },
  { x: -0.3, row: 2, w: 0.9, name: "ws-sal-02" },
  { x: 1.0, row: 2, w: 0.9, name: "ws-sal-03" },
];
const PRINT_D = 0.42;
const printZ = (row: number) => ROOMS[row].zc - 0.3;
/** the log: one line per row, in the front half of its room; verdicts in a right margin */
const LOG = { x0: -2.05, vx: 0.35, em: 0.1, rect: [-2.6, -2.2, 5.4, 4.5] as const, px: 300 };
const lineZ = (row: number) => ROOMS[row].zc + 0.3;
const SEAL_Z = lineZ(2) + 0.25;
const LINES = [
  { text: "agent:finance · invoice_0412.pdf", verdict: "LOGGED", fix: "" },
  { text: "crm-assistant → export(customers)", verdict: "FLAGGED", fix: "MASKED" },
  { text: "chatgpt.com (personal) · m.keller", verdict: "FLAGGED", fix: "BLOCKED" },
];

/* ------------------------------------------------------------------ */
/* the mark (logo units: orbit radius 1, from ICON_Blindsight.svg)     */
/* ------------------------------------------------------------------ */
const S = 0.72; // world size of the orbit radius
const [HUB_R, HUB_GLASS, NODE_R, ARM_W] = [0.5, 0.44, 0.25, 0.168];
const [RING_IN, RING_OUT, RING_CUT] = [0.89, 1.11, 0.36]; // stroke 0.22 ≈ 0.09·D
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise seen from above
const [DEPTH, BEVEL] = [0.024, 0.016]; // ≈ 0.25 × stroke in all: a watch bezel
const HALF = DEPTH / 2 + BEVEL;
const [WORD_Y, WORD_R] = [HALF + 0.004, 0.42];
const Y_MARK = 0.16; // it glides low: nothing on the floor is taller than ink
/** the pen: node 2 when the heading is 0 (trailing, on the camera side) */
const PEN = { x: Math.cos(deg(NODE_A[2])) * S, z: -Math.sin(deg(NODE_A[2])) * S };
const hubZ = (z: number) => z - PEN.z; // the hub's track for a pen line at z
const WORDS = ["flagged", "masked", "blocked", "logged"];

type Pose = number[]; // x, y, z, heading
type Ease = "c" | "q" | "t";
type Key = { t: number; v: Pose; e: Ease };
/** one act: the pen writes band `band` between t0 and t1; chip `chip` is the current one */
type Act = { t0: number; t1: number; band: number; chip: number; word: number };

/** The whole choreography as data; every frame is evaluated from time alone, so a
 *  jump in time (a click on a step) lands on the right pose. */
const SCRIPT = (() => {
  const keys: Key[] = [];
  const acts: Act[] = [];
  const HX = [-2.0, 1.7]; // hub x across a row (the pen covers x0 → the margin's end)
  const MX = [LOG.vx - 0.08 - PEN.x, LOG.vx + 1.0 - PEN.x]; // hub x across the margin
  let cur: Pose = [HX[0], Y_MARK, hubZ(lineZ(0)), 0];
  keys.push({ t: 0, v: cur.slice(), e: "c" });
  const key = (t: number, v: Pose, e: Ease = "c") => {
    keys.push({ t, v: v.slice(), e });
    cur = v.slice();
  };
  const hold = (t: number) => key(t, cur);
  /** the gap aims first: turn until the nearest node faces (tx, tz) */
  const aim = (t0: number, t1: number, tx: number, tz: number) => {
    const ang = Math.atan2(-(tz - cur[2]), tx - cur[0]);
    let bd = Infinity;
    for (const a of NODE_A) {
      const d = wrapPi(ang - deg(a) - cur[3]);
      if (Math.abs(d) < Math.abs(bd)) bd = d;
    }
    hold(t0);
    key(t1, [cur[0], cur[1], cur[2], cur[3] + bd]);
  };
  /** back to heading 0: node 0's gap leads along +x, node 2 is over the line */
  const square = (t0: number, t1: number) => {
    hold(t0);
    key(t1, [cur[0], cur[1], cur[2], cur[3] + wrapPi(-cur[3])]);
  };
  const glide = (t0: number, t1: number, x: number, z: number) => {
    aim(t0, t0 + 60, x, z);
    hold(t0 + 60);
    key(t1 - 60, [x, Y_MARK, z, cur[3]], "q");
    square(t1 - 60, t1);
  };
  const write = (t0: number, t1: number, x1: number, band: number, chip: number, word: number) => {
    hold(t0);
    key(t1, [x1, Y_MARK, cur[2], cur[3]], "t");
    acts.push({ t0, t1, band, chip, word });
  };

  /* SEE: three rows, one line each */
  write(300, 980, HX[1], 0, 0, -1);
  glide(980, 1280, HX[0], hubZ(lineZ(1)));
  write(1280, 1960, HX[1], 1, 1, 0);
  glide(1960, 2260, HX[0], hubZ(lineZ(2)));
  write(2260, 2940, HX[1], 2, 2, 0);
  /* SECURE: up to the margin; strike and rewrite, top to bottom */
  glide(3500, 3780, MX[0], hubZ(lineZ(1)));
  write(3780, 4150, MX[1], 3, 1, 1);
  glide(4250, 4530, MX[0], hubZ(lineZ(2)));
  write(4530, 4900, MX[1], 4, 2, 2);
  /* GOVERN: rule the log off, then step aside so all of it reads */
  glide(5000, 5460, HX[0], hubZ(SEAL_Z));
  write(5460, 5980, HX[1], 5, -1, 3);
  aim(6050, 6110, 3.3, 0);
  hold(6110);
  key(6450, [3.3, Y_MARK, 0, cur[3]], "q"); // parked off the plan: its ring spans x 2.5 → 4.1

  return { keys, acts };
})();
const SEALED = SCRIPT.acts[5].t1;

/** time → the mark's pose */
function poseAt(t: number, out: Pose) {
  const K = SCRIPT.keys;
  let i = 0;
  while (i < K.length - 1 && t >= K[i + 1].t) i++;
  const a = K[i];
  const b = K[Math.min(i + 1, K.length - 1)];
  const x = b.t > a.t ? clamp01((t - a.t) / (b.t - a.t)) : 0;
  const k = b.e === "q" ? easeQ(x) : b.e === "t" ? trap(x) : inOutCubic(x);
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
  // thin strips where the flat top mirrors: behind the mark from the oblique view
  // (azimuth ~200°, elevation ~40°) and near the zenith for the top-down view
  for (const el of [31, 37, 43, 49, 55]) panel(16, 0.5, 200, el, 5);
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
/* floor: the plan (alpha) and the log (rgb) in one texture            */
/* ------------------------------------------------------------------ */
const NC = 2;
const NB = 6; // log bands: 3 lines, 2 margin fixes, the seal

const floorVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const floorFrag = /* glsl */ `
  uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uShade;
  uniform sampler2D uLog; uniform vec4 uRect;
  uniform float uPlanAmt; uniform float uDotAmt; uniform float uShadeMax;
  uniform vec4 uBand[NB]; uniform vec3 uBandC[NB];
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
    vec4 L = texture2D(uLog, uv) * inRect;

    float fw = length(fwidth(p));
    vec2 g = (fract(p / 0.25 + 0.5) - 0.5) * 0.25;
    float dots = 1.0 - smoothstep(0.0095, 0.0095 + fw, length(g));
    dots *= 1.0 - smoothstep(0.014, 0.034, fw);

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

    // the log: each band is revealed up to its pen's x; finished bands are dimmed
    float logInk = 0.0;
    for (int i = 0; i < NB; i++) {
      vec4 b = uBand[i];
      if (b.w > 0.0 && p.y > b.x && p.y < b.y) {
        float rev = 1.0 - smoothstep(b.z - 0.004, b.z + 0.004, p.x);
        logInk = max(logInk, dot(L.rgb, uBandC[i]) * rev * b.w);
      }
    }

    vec3 col = mix(uBg, uShade, clamp(sh, 0.0, uShadeMax));
    col = mix(col, uInk, clamp(L.a * uPlanAmt + dots * uDotAmt, 0.0, 1.0));
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

/** The floor texture over LOG.rect, 300 px per unit. Channels: r = the three log
 *  lines, g = the strikes and the seal rule, b = the margin's second verdicts,
 *  a = the plan (rooms, footprints, names). Row 0 = the far edge (z min). */
function floorTexture() {
  const [rx, rz, rw, rd] = LOG.rect;
  const W = Math.round(rw * LOG.px);
  const H = Math.round(rd * LOG.px);
  const X = (x: number) => (x - rx) * LOG.px;
  const Z = (z: number) => (z - rz) * LOG.px;
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
  const mono = (g: CanvasRenderingContext2D, em: number, weight = 500, track = 0) => {
    g.font = `${weight} ${Math.round(em * LOG.px)}px "IBM Plex Mono", ui-monospace, monospace`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(em * LOG.px * track)}px`;
  };
  const VEM = 0.085; // verdicts: small mono caps
  const vw = (s: string, g: CanvasRenderingContext2D) => g.measureText(s).width / LOG.px;
  const lines = layer((g) => {
    LINES.forEach((l, i) => {
      const z = Z(lineZ(i));
      mono(g, LOG.em);
      g.fillText(l.text, X(LOG.x0), z);
      const end = LOG.x0 + vw(l.text, g) + 0.08;
      g.lineWidth = 2;
      g.beginPath(); // the hairline leader to the margin
      g.moveTo(X(end), z);
      g.lineTo(X(LOG.vx - 0.06), z);
      g.stroke();
      mono(g, VEM, 500, 0.08);
      g.fillText(l.verdict, X(LOG.vx), z);
    });
  });
  const marks = layer((g) => {
    mono(g, VEM, 500, 0.08);
    g.lineWidth = 3;
    LINES.forEach((l, i) => {
      if (!l.fix) return;
      const z = Z(lineZ(i));
      g.beginPath(); // strike the first verdict through
      g.moveTo(X(LOG.vx - 0.02), z);
      g.lineTo(X(LOG.vx + vw(l.verdict, g) + 0.02), z);
      g.stroke();
    });
    // the seal: its own subject, a hairline leader, and its verdict in the margin
    const seal = "sealed · 3 findings";
    mono(g, LOG.em);
    g.fillText(seal, X(LOG.x0), Z(SEAL_Z));
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(X(LOG.x0 + vw(seal, g) + 0.08), Z(SEAL_Z));
    g.lineTo(X(LOG.vx - 0.06), Z(SEAL_Z));
    g.stroke();
    mono(g, VEM, 500, 0.08);
    g.fillText("LOGGED", X(LOG.vx), Z(SEAL_Z));
  });
  const fixes = layer((g) => {
    mono(g, VEM, 500, 0.08);
    LINES.forEach((l, i) => {
      if (l.fix) g.fillText(l.fix, X(LOG.vx + vw(l.verdict, g) + 0.08), Z(lineZ(i)));
    });
  });
  const plan = layer((g) => {
    g.lineWidth = 2;
    const [x0, x1] = [X(ROOM.x0), X(ROOM.x1)];
    for (const r of ROOMS) {
      g.strokeRect(x0, Z(r.zc - ROOM.h / 2), x1 - x0, ROOM.h * LOG.px);
      mono(g, 0.075, 500, 0.14);
      g.fillText(r.name, X(ROOM.x1 - 0.12) - vw(r.name, g) * LOG.px, Z(r.zc - ROOM.h / 2 + 0.14));
    }
    mono(g, 0.07, 400);
    for (const p of PRINTS) {
      const z = printZ(p.row);
      g.strokeRect(X(p.x - p.w / 2), Z(z - PRINT_D / 2), p.w * LOG.px, PRINT_D * LOG.px);
      g.fillText(p.name, X(p.x - p.w / 2 + 0.07), Z(z));
    }
  });
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = lines[i * 4];
    data[i * 4 + 1] = marks[i * 4];
    data[i * 4 + 2] = fixes[i * 4];
    data[i * 4 + 3] = plan[i * 4];
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
    // small caps: capitals at x-height-ish size, tracked, upright medium
    g.font = `normal normal 500 176px "IBM Plex Mono", ui-monospace, monospace`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "14px";
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

/* the verdict on the lens: sampled in the camera's own frame, so the word reads
   upright and unforeshortened, like the virtual image a loupe gives the eye */
const lensVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const lensFrag = /* glsl */ `
  uniform sampler2D uTex; uniform vec3 uC; uniform vec3 uR; uniform vec3 uU; uniform vec3 uInk;
  uniform float uW; uniform float uAsp; uniform float uAmt;
  varying vec3 vW;
  void main() {
    vec3 d = vW - uC;
    vec2 uv = vec2(dot(d, uR) / uW + 0.5, dot(d, uU) * uAsp / uW + 0.5);
    vec2 e = fwidth(uv);
    vec2 inside = smoothstep(vec2(0.0), e, uv) * smoothstep(vec2(0.0), e, 1.0 - uv);
    float m = texture2D(uTex, clamp(uv, 0.0, 1.0)).a;
    gl_FragColor = vec4(uInk, m * uAmt * inside.x * inside.y);
    #include <colorspace_fragment>
  }`;

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  await fontsReady();

  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;

  /* ---------- camera: an oblique view of the plan; in Govern it eases to top-down
     so the floor reads as a page ---------- */
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const VIEW = [
    { az: 0.35, el: 0.72, tx: 0, tz: 0.05, h: 3.5, v: 2.3 },
    { az: 0, el: 1.45, tx: 0.95, tz: 0.1, h: 3.55, v: 2.4 }, // x -2.6 → 4.5: the plan and the parked mark
  ];
  let viewW = 1;
  let viewH = 1;
  function placeCamera(t: number) {
    const k = smooth(seg(t, 5000, 5700));
    const [a, b] = VIEW;
    const az = lerp(a.az, b.az, k);
    const el = lerp(a.el, b.el, k);
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(lerp(a.h, b.h, k) / (tan * camera.aspect), lerp(a.v, b.v, k) / tan);
    const tx = lerp(a.tx, b.tx, k);
    const tz = lerp(a.tz, b.tz, k);
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, tz + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(tx, 0, tz);
    camera.updateMatrixWorld();
  }

  /* ---------- floor: the plan at 15% ink, the log in full ink ---------- */
  const logTex = floorTexture();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uLog: { value: logTex },
    uRect: { value: new THREE.Vector4(...LOG.rect) },
    uPlanAmt: { value: 0.15 },
    uDotAmt: { value: dark ? 0.12 : 0.1 },
    uShadeMax: { value: dark ? 0.9 : 0.5 },
    uBand: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
    uBandC: { value: [0, 1, 2].map(() => new THREE.Vector3(1, 0, 0)).concat([new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 1, 1), new THREE.Vector3(0, 1, 0)]) },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uFade: { value: new THREE.Vector4(0.1, 0, 4.2, 7.5) },
  };
  const floorMat = new THREE.ShaderMaterial({
    uniforms: floorU,
    vertexShader: floorVert,
    fragmentShader: `#define NC ${NC}\n#define NB ${NB}\n` + floorFrag,
    toneMapped: false,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  /* ---------- the mark: one rigid piece, flat. Chrome extruded thin from the logo's
     own outline (bezel, arms, solid nodes, orbit), a flat clear glass hub, one ink
     silhouette on the outer contour ---------- */
  const chrome = (roughness: number) =>
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(dark ? "#e6e8ec" : "#f4f5f7"), metalness: 1, roughness, envMapIntensity: 1 });
  const matChrome = [chrome(0.08), chrome(0.14)]; // flat faces, bevels
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    ior: 1.5,
    thickness: 0.03,
    specularIntensity: 1,
  });
  const matRim = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.4 : 0.5, depthTest: false });
  const mark = new THREE.Group();
  mark.scale.setScalar(S);
  scene.add(mark);
  mark.add(new THREE.Mesh(slabGeo(bodyShape()), matChrome));
  NODE_A.forEach((_, k) => mark.add(new THREE.Mesh(slabGeo(bandShape(k)), matChrome)));
  mark.add(new THREE.Mesh(new THREE.CylinderGeometry(HUB_GLASS + 0.005, HUB_GLASS + 0.005, DEPTH + BEVEL, 96), matGlass));
  const rim = new THREE.LineSegments(silhouette(), matRim);
  rim.renderOrder = 10;
  mark.add(rim);
  // the verdict, on the glass
  const wordTex = wordTextures();
  const [uC, uR, uU] = [new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)];
  const lensU = { uTex: { value: wordTex[0] as THREE.Texture }, uC: { value: uC }, uR: { value: uR }, uU: { value: uU } };
  const lensN = { uW: { value: 1 }, uAsp: { value: WORD_TEX.w / WORD_TEX.h }, uAmt: { value: 0 }, uInk: { value: ink } };
  const lensImg = new THREE.Mesh(
    new THREE.CircleGeometry(WORD_R, 96).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({ uniforms: { ...lensU, ...lensN }, vertexShader: lensVert, fragmentShader: lensFrag, transparent: true, depthWrite: false, toneMapped: false }),
  );
  lensImg.position.y = WORD_Y;
  mark.add(lensImg);

  /* ---------- per-frame ---------- */
  const pose: Pose = [0, 0, 0, 0];
  const A = SCRIPT.acts;
  const nextT0 = (i: number) => (A[i + 1] ? A[i + 1].t0 : 1e9);
  const BAND_Z = [lineZ(0), lineZ(1), lineZ(2), lineZ(1), lineZ(2), SEAL_Z];
  /** chips stand on their footprints: agent:finance, user_7f3a (crm-assistant), m.keller (chatgpt.com) */
  // anchored at the footprint's middle: the chip's box rises into the room's empty back half, clear of any log row
  const labelPos = [PRINTS[0], PRINTS[2], PRINTS[5]].map((p) => new THREE.Vector3(p.x + 0.1, 0, printZ(p.row)));
  const labelState: HeroLabel[] = labelPos.map(() => ({ x: 0, y: 0, a: 0, state: 0 }));
  const labelA = labelPos.map(() => 0);
  const win = (t: number, t0: number, t1: number) => smooth(seg(t, t0, t0 + 150)) * (1 - smooth(seg(t, t1, t1 + 150)));

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    placeCamera(t);

    /* the mark: it glides, and only turns to aim its gap */
    poseAt(t, pose);
    mark.position.set(pose[0], pose[1], pose[2]);
    mark.rotation.set(0, pose[3], 0);
    mark.updateMatrixWorld(true);

    /* the log: the pen reveals the band it is writing; finished acts dim, until sealed */
    const penX = pose[0] + PEN.x;
    A.forEach((act, i) => {
      const x = t < act.t0 ? -1e3 : t > act.t1 ? 1e3 : penX;
      const nt = nextT0(i);
      let amt = t < act.t0 ? 0 : lerp(1, 0.72, smooth(seg(t, nt, nt + 200)));
      amt = lerp(amt, 1, smooth(seg(t, SEALED, SEALED + 300)));
      floorU.uBand.value[i].set(BAND_Z[i] - 0.09, BAND_Z[i] + 0.09, x, amt);
    });

    /* the verdict on the hub: after each act that has one, until the next begins */
    let [amt, inK, wc] = [0, 0, -1];
    A.forEach((act, i) => {
      if (act.word < 0) return;
      const k = seg(t, act.t1, act.t1 + 160);
      const f = smooth(k) * (1 - smooth(seg(t, nextT0(i), nextT0(i) + 120)));
      if (f > amt) [amt, inK, wc] = [f, k, act.word];
    });
    lensImg.visible = amt > 0.002;
    if (wc >= 0) lensU.uTex.value = wordTex[wc];
    lensN.uAmt.value = amt;
    lensN.uW.value = 2 * WORD_R * S * lerp(0.6, 1, outCubic(inK));
    mark.localToWorld(uC.set(0, WORD_Y, 0));
    uR.setFromMatrixColumn(camera.matrixWorld, 0);
    uU.setFromMatrixColumn(camera.matrixWorld, 1);

    /* its soft shadow on the plan */
    floorU.uCA.value[0].set(pose[0] + 0.03, pose[2] + 0.05, 0.9 * S, 0.9 * S);
    floorU.uCB.value[0].set(0.9 * S, 0.2, dark ? 0.45 : 0.16, 0);

    /* chips: one at a time, the current act's; all of them once the log is sealed */
    labelA.fill(0);
    A.forEach((act, i) => {
      if (act.chip >= 0) labelA[act.chip] = Math.max(labelA[act.chip], win(t, act.t0, nextT0(i)));
    });
    // in Govern the floor log is the record: no chips at all
    for (let i = 0; i < 3; i++) labelA[i] *= 1 - smooth(seg(t, 4950, 5100));
    labelState[0].state = t >= SEALED ? 2 : 0;
    labelState[1].state = t >= SEALED ? 2 : t >= A[3].t1 ? 1 : 0;
    labelState[2].state = t >= SEALED ? 2 : t >= A[4].t1 ? 1 : 0;
  }

  const proj = new THREE.Vector3();
  /** The section only uses "narrow" (the plan fills the canvas); "wide" frames it the same. */
  function resize(width: number, height: number, _mode: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    camera.updateProjectionMatrix();
  }

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels() {
      // the mark's footprint on screen: a chip never sits on it; it waits, hidden, until the mark has passed
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
      logTex.dispose();
      wordTex.forEach((x) => x.dispose());
      env.dispose();
      renderer.dispose();
    },
  };
}
