/* The office-network scene from mockup 5's hero, reused by mockup 8's
 * See / Secure / Govern section (driven by its step clock, not a loop).
 *
 * Originally: hero scene for mockup 5: "an office network, seen, secured and governed".
 *
 * A product-photography tabletop, not a network diagram: a floor plan printed
 * with zone brackets and a fine grid, and on it real objects in the site's
 * materials — a clear glass server rack (agent:finance runs in it), a glass
 * database, and five glass desks (monitor, laptop, a
 * chrome puck for the person). There are no permanent connection lines: a
 * hairline only appears while data actually moves.
 *
 * Direction s·a: THE HOLE IS THE LENS. The Blindsight mark hangs vertical, face-on
 * to the camera, in front of the office; its hub is a clear glass disc in a thin
 * chrome bezel. The office has two states: unseen (today's pale office, blank
 * screens) and revealed (full-contrast ink: what runs on each screen, agent:
 * finance's tool calls on the rack's glass, and the AI prisms nobody could see).
 * Every revealable object mixes the two with reveal = max(inHole, swept):
 * inHole is a screen-space test against the hub's projected disc; swept is how
 * far the hole's trailing edge has travelled along that object's row, so the
 * revealed state wipes in behind the hole and stays, like a squeegee.
 *
 * Storyboard (scene ms; the page maps See 300–3500, Secure 3500–5000, Govern 5000–7600):
 *   300–700     the mark appears small and expands to lens size.
 *   700–4850    three passes, one per row, alternating direction at constant speed
 *               with eased turns: rack and database, the back desks, the front
 *               desks. When the hole lands on a finding the scan stops: the
 *               nearest node drops a hairline to the desk, traces the fence round
 *               its footprint and sets the verdict word beside it (MASKED,
 *               BLOCKED); then the scan resumes.
 *   5000–5700   the ring tips flat and glides to the exit, where it becomes the
 *               checkpoint: one flow passes through its hub, which reads LOGGED.
 *               The revealed office stays as the record.
 *   9700–10400  the office resets calmly.
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
const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
/** accelerate over a, cruise at constant speed, brake over a */
const trap = (x: number, a: number) => {
  const v = 1 / (1 - a);
  if (x < a) return (v * x * x) / (2 * a);
  if (x > 1 - a) return 1 - (v * (1 - x) * (1 - x)) / (2 * a);
  return v * (x - a / 2);
};

const inOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
/** a window that eases in over f ms from a and out over f ms to b */
const win = (t: number, a: number, b: number, f = 120) => smooth(seg(t, a, a + f)) * (1 - smooth(seg(t, b - f, b)));

/* ---------- the mark (mark units: orbit radius 1, D = 2), one spec for every build ---------- */
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node
const BAND = 0.18; // stroke ≈ 0.09·D
const ARM_W = 0.16;
const [HUB_R, NODE_R, BEZEL] = [0.5, 0.25, 0.05];
const DEPTH = 0.25 * BAND; // a watch bezel
const BEV = 0.08 * BAND;
const SLAB = DEPTH - 2 * BEV; // ExtrudeGeometry's depth (its bevels add both faces)
/** The lens hangs this far in front of what it looks at, on the line to the
 *  camera, so it never touches the office. Its size is set on screen: R_EQ is
 *  its orbit radius measured at the target's depth (the hole is 0.45 of it,
 *  ≈ 100 px; the whole mark ≈ 285 px, the most the rack's row allows in frame). */
const LENS = { off: 4.5, rEq: 1.2, small: 0.3 }; // ≈ 210 px mark; its hole (≈ 85 px) holds one monitor and a 13-character line at 11 px
const ROOM = { dist: 0.08, lift: 0.2 };
const APPEAR: [number, number] = [260, 360];
const EXPAND: [number, number] = [300, 700];

/* ---------- the passes (targets on the plan: x, y, z) ---------- */
type V3 = [number, number, number];
type Move = { t0: number; t1: number; a: V3; b: V3; row: number; turn?: boolean };
const PASS: Move[] = [
  // the hole aims at screen height (≈ 0.9), so each desk's monitor, prism and label sit in it
  { t0: 700, t1: 1150, a: [-0.4, 0.6, -1.2], b: [-3.6, 0.9, -2.25], row: 0 }, // rack and database, ←
  { t0: 1150, t1: 1400, a: [-3.6, 0.9, -2.25], b: [-0.5, 0.9, -2.6], row: 1, turn: true },
  { t0: 1400, t1: 1850, a: [-0.5, 0.9, -2.6], b: [2.1, 0.9, -1.41], row: 1 }, // back desks, → (stops on ws-fin-02)
  { t0: 2750, t1: 2950, a: [2.1, 0.9, -1.41], b: [3.3, 0.9, -0.87], row: 1 },
  { t0: 2950, t1: 3200, a: [3.3, 0.9, -0.87], b: [4.2, 0.9, 0.85], row: 2, turn: true },
  { t0: 3200, t1: 3600, a: [4.2, 0.9, 0.85], b: [1.55, 0.9, 1.21], row: 2 }, // front desks, ← (stops on m.keller)
  { t0: 4500, t1: 4950, a: [1.55, 0.9, 1.21], b: [-1.9, 0.9, 1.68], row: 2 },
];
/** each row's direction of travel along x */
const ROW_DIR = [-1, 1, -1];
/** per finding (the scan is stopped): [hairline drops, trace starts, trace ends, verdict set, hairline gone] */
const ACT = [
  [1850, 2000, 2500, 2620, 2750],
  [3600, 3750, 4250, 4370, 4500],
];
const VERDICT = ["MASKED", "BLOCKED"];
/** Govern: tip flat and glide to the exit; then the checkpoint */
const TIP: [number, number] = [5000, 5700];
const EXIT = { x: 3.75, z: -1.0, r: 0.75 };
const THROUGH: [number, number] = [5850, 7350];
const ALL_CHIPS = 6150;
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

const floorVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const floorFrag = /* glsl */ `
  uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uShade;
  uniform sampler2D uPlan;
  uniform vec4 uRect;
  uniform vec3 uHole; uniform float uAA;
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

    float fw = length(fwidth(p));
    vec2 g = (fract(p / 0.25 + 0.5) - 0.5) * 0.25;
    float dots = 1.0 - smoothstep(0.0095, 0.0095 + fw, length(g));
    dots *= 1.0 - smoothstep(0.014, 0.034, fw);

    // seen through the lens: the plan in full ink
    float lens = 1.0 - smoothstep(uHole.z - uAA, uHole.z + uAA, length(gl_FragCoord.xy - uHole.xy));

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
    float ink = clamp((base * uInkAmt + dots * uDotAmt + grid * uGridAmt) * (1.0 + 2.2 * lens), 0.0, 1.0);
    col = mix(col, uInk, ink);

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

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
/** strip-and-flag: a black room with a few hard white strips, so the mark's
 *  chrome reads as crisp black and white bands, never mid-grey */
function stripStudio(renderer: THREE.WebGLRenderer, camAz: number, camEl: number) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.34, 0.34, 0.35); // lighter: bright polished steel, not dark grey
  const strip = (w: number, h: number, azDeg: number, elDeg: number, v: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
    const [az, el] = [deg(azDeg), deg(elDeg)];
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(14);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  // calm: a grey room, one soft band just above the direction a face-on flat
  // mirrors (the camera's), a darker flag just below it, two soft verticals for
  // the bevels, and an overhead softbox so the ring lying flat reads as the same
  // chrome, never as black enamel
  const [az0, el0] = [(camAz * 180) / Math.PI, (camEl * 180) / Math.PI];
  strip(40, 2.6, az0, el0 + 7, 2.3);
  strip(40, 1.6, az0, el0 - 6, 0.06);
  for (const da of [-20, 22]) strip(1.2, 30, az0 + da, el0, 1.5);
  strip(24, 9, 0, 86, 1.4); // overhead
  strip(30, 3, az0 + 180, 30, 1.2); // what a flat top mirrors from this camera
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/* the mark's geometry, from the logo's own outline */
const extrude = (shape: THREE.Shape, curveSegments: number) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: SLAB, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments });
  g.translate(0, 0, -SLAB / 2);
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
/** one arm: concave on the hub's bezel at its inner end, on its node at the outer */
function barShape(ad: number, bev: number) {
  const a = deg(ad);
  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const hw = ARM_W / 2 - bev;
  const [hr, nr] = [HUB_R + bev, NODE_R + bev];
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
/** one orbit arc with round ends */
function arcShape(a0: number, a1: number, bev: number) {
  const hw = BAND / 2 - bev;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}
/** the OUTER silhouette only (open lines on both faces): each arc's outer edge
 *  with the outer quarter of its round ends, and the outer side of each node */
function silhouette() {
  const hw = BAND / 2;
  const lines: THREE.Vector3[][] = [];
  for (const z of [DEPTH / 2 + 0.002]) {
    const P = (x: number, y: number) => new THREE.Vector3(x, y, z);
    NODE_A.forEach((a, i) => {
      const [a0, a1] = [deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP)];
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 8; k++) {
        const q = a0 - Math.PI / 2 + (k / 8) * (Math.PI / 2);
        pts.push(P(Math.cos(a0) + Math.cos(q) * hw, Math.sin(a0) + Math.sin(q) * hw));
      }
      for (let k = 1; k <= 64; k++) {
        const q = lerp(a0, a1, k / 64);
        pts.push(P(Math.cos(q) * (1 + hw), Math.sin(q) * (1 + hw)));
      }
      for (let k = 1; k <= 8; k++) {
        const q = a1 + (k / 8) * (Math.PI / 2);
        pts.push(P(Math.cos(a1) + Math.cos(q) * hw, Math.sin(a1) + Math.sin(q) * hw));
      }
      lines.push(pts);
      const n = deg(a);
      const node: THREE.Vector3[] = [];
      for (let k = 0; k <= 40; k++) {
        const q = n - deg(105) + (k / 40) * deg(210);
        node.push(P(Math.cos(n) + Math.cos(q) * NODE_R, Math.sin(n) + Math.sin(q) * NODE_R));
      }
      lines.push(node);
    });
  }
  return lines;
}

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
  /* ---------- the reveal: every revealable surface mixes its two states with
     reveal = max(inHole, swept) ---------- */
  const revealU = {
    uHole: { value: new THREE.Vector3(-1e4, -1e4, 0) }, // the hub's hole on screen: centre, radius (buffer px)
    uAA: { value: 1.3 }, // half the edge, in buffer px (≈ 1.5 css px in all)
    uSwept: { value: new THREE.Vector3(-ROW_DIR[0] * 99, -ROW_DIR[1] * 99, -ROW_DIR[2] * 99) }, // per row: the trailing edge's reach (world x)
    uDir: { value: new THREE.Vector3(ROW_DIR[0], ROW_DIR[1], ROW_DIR[2]) },
    uLife: { value: 1 }, // the loop's reset fades the revealed state out
  };
  const texs: THREE.Texture[] = [];
  const REVEAL_GLSL = /* glsl */ `
    uniform vec3 uHole; uniform float uAA; uniform vec3 uSwept; uniform vec3 uDir; uniform float uRow; uniform float uLife;
    float inHoleNow() {
      return 1.0 - smoothstep(uHole.z - uAA, uHole.z + uAA, length(gl_FragCoord.xy - uHole.xy));
    }
    float sweptBy(vec3 w) {
      float sx = uRow < 0.5 ? uSwept.x : uRow < 1.5 ? uSwept.y : uSwept.z;
      float dir = uRow < 0.5 ? uDir.x : uRow < 1.5 ? uDir.y : uDir.z;
      float e = fwidth(w.x) * 0.75 + 1e-4;
      return smoothstep(-e, e, (sx - w.x) * dir);
    }
    float revealAt(vec3 w) {
      return max(inHoleNow(), sweptBy(w)) * uLife;
    }`;
  const revealVert = /* glsl */ `
    varying vec3 vRW; varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vRW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const revealFrag =
    REVEAL_GLSL +
    /* glsl */ `
    uniform vec3 uCol; uniform float uA; uniform sampler2D uMap; uniform float uUseMap; uniform float uMode;
    varying vec3 vRW; varying vec2 vUv;
    void main() {
      vec4 m = uUseMap > 0.5 ? texture2D(uMap, vUv) : vec4(uCol, 1.0);
      // mode 0: revealed anywhere; 1: only inside the lens (clipped to the hole);
      // 2: only where swept (the record, never inside the lens)
      float r = uMode < 0.5 ? revealAt(vRW) : uMode < 1.5 ? inHoleNow() * uLife : sweptBy(vRW) * uLife;
      float a = uA * m.a * r;
      if (a < 0.003) discard;
      gl_FragColor = vec4(m.rgb, a);
      #include <colorspace_fragment>
    }`;
  /** a surface that exists only in the revealed state (ink lines, screen contents, text) */
  const revealMat = (row: number, o: { col?: THREE.Color; a?: number; map?: THREE.Texture; mode?: number } = {}) =>
    new THREE.ShaderMaterial({
      uniforms: { ...revealU, uRow: { value: row }, uCol: { value: o.col ?? ink }, uA: { value: o.a ?? 1 }, uMap: { value: o.map ?? null }, uUseMap: { value: o.map ? 1 : 0 }, uMode: { value: o.mode ?? 0 } },
      vertexShader: revealVert,
      fragmentShader: revealFrag,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  /** a solid that exists only in the revealed state (cut by the reveal) */
  const revealSolid = <M extends THREE.Material>(m: M, row: number) => {
    m.onBeforeCompile = (s) => {
      Object.assign(s.uniforms, revealU, { uRow: { value: row } });
      s.vertexShader = s.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRW;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      s.fragmentShader = s.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRW;\n" + REVEAL_GLSL)
        .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nif (revealAt(vRW) < 0.5) discard;");
    };
    m.customProgramCacheKey = () => `reveal-${row}`;
    return m;
  };
  /** text on a transparent canvas (for camera-facing ink labels and screen contents) */
  const textTex = (lines: string[], w: number, h: number, px: number, bgFill: string | null, col: string) => {
    const c = document.createElement("canvas");
    [c.width, c.height] = [w, h];
    const g = c.getContext("2d")!;
    if (bgFill) {
      g.fillStyle = bgFill;
      g.fillRect(0, 0, w, h);
    }
    g.fillStyle = col;
    g.textBaseline = "middle";
    lines.forEach((s, i) => {
      g.font = `${i === 0 ? 600 : 500} ${px}px "IBM Plex Mono", ui-monospace, monospace`;
      g.fillText(s, px * 0.4, px * 0.9 + i * px * 1.35);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texs.push(t);
    return t;
  };
  const inkHex = `#${ink.getHexString()}`;

  // the AIs nobody registered: raw unpolished metal, present only where revealed
  const matGun = FLAGGED.map((f) =>
    revealSolid(
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(dark ? "#85878C" : "#A3A6AD"), metalness: 1, roughness: 0.42, side: THREE.DoubleSide }),
      DESKS[f.desk].z < 0 ? 1 : 2,
    ),
  );
  // monitors: graphite glass in light mode, blank until revealed
  const matScreen = dark ? matSheet : glass({ thickness: 0.2, attenuationColor: new THREE.Color("#3a3b40"), attenuationDistance: 0.14 });
  const textGrey = new THREE.Color(dark ? "#6f727b" : "#b4b7bd");
  const matScreenInk = new THREE.MeshBasicMaterial({ color: textGrey, toneMapped: false });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");
  const matSignal = new THREE.MeshBasicMaterial({ color: signalCol, toneMapped: false });
  const matPacket = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false });
  // fence lines: ink; softened on black, where full white reads as a glowing edge
  const matLine = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, transparent: dark, opacity: dark ? 0.6 : 1 });

  /* ---------- floor ---------- */
  const tex = planTextures();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uPlan: { value: tex.base },
    uRect: { value: new THREE.Vector4(PLAN.x0, PLAN.z0, PLAN.w, PLAN.d) },
    uHole: revealU.uHole,
    uAA: revealU.uAA,
    uInkAmt: { value: dark ? 0.22 : 0.17 },
    uDotAmt: { value: dark ? 0.16 : 0.13 },
    uShadeMax: { value: dark ? 0.9 : 0.5 },
    uGridAmt: { value: dark ? 0.04 : 0.1 },
    uPool: { value: new THREE.Vector4(0.4, -0.4, 7.5, dark ? 0.045 : 0) },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uFade: { value: new THREE.Vector4(0.2, -0.2, 4.6, 8.4) },
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
  const TOP = DESK.top + 0.0225;
  /* the revealed state: ink outlines, what is on each screen, and a camera-facing
     line of ink saying what runs there */
  /** camera-facing labels, turned to the camera each frame. Two kinds:
   *  - lens: short (≤ 13 characters a line), ≈ 11 px, drawn only inside the hole, so
   *    the lens reads them whole and they never cross the ring, arms or nodes;
   *  - record: the full line, left where the scan has passed, hidden while the
   *    mark overlaps it. */
  type Bill = { m: THREE.Mesh; mat: THREE.ShaderMaterial; lens: boolean; a: number; hw: number; hh: number };
  const bills: Bill[] = [];
  const PPU = 80; // ≈ css px per world unit at the office's depth (sets type sizes)
  const outline = (parent: THREE.Object3D, geo: THREE.BufferGeometry, row: number, x: number, y: number, z: number, a = 0.85) => {
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), revealMat(row, { a }));
    l.position.set(x, y, z);
    parent.add(l);
    return l;
  };
  const measure = document.createElement("canvas").getContext("2d")!;
  const paper = `#${bg.getHexString()}e6`; // the lens label's backing: the page, 90%
  /** a label centred at (x, y, z), its type ≈ typePx on screen */
  const bill = (lines: string[], row: number, x: number, y: number, z: number, typePx: number, lens: boolean, a = 1) => {
    const px = 36;
    measure.font = `600 ${px}px "IBM Plex Mono", ui-monospace, monospace`;
    const W = Math.ceil(Math.max(...lines.map((s) => measure.measureText(s).width)) + px * 0.8); // fitted to its text
    const H = Math.round(px * 0.9 + lines.length * px * 1.35);
    const h = (typePx * H) / (px * PPU);
    const mat = revealMat(row, { map: textTex(lines, W, H, px, lens ? paper : null, inkHex), a, mode: lens ? 1 : 2 });
    // never occluded: inside the hole nothing of the mark is in front of a lens label,
    // and a record label steps back from the mark (below) instead of hiding behind glass
    mat.depthTest = false;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((h * W) / H, h), mat);
    m.position.set(x, y, z);
    m.renderOrder = lens ? 6 : 5;
    bills.push({ m, mat, lens, a, hw: ((h * W) / H) * PPU * 0.5, hh: h * PPU * 0.5 });
    scene.add(m);
    return m;
  };
  /** what the lens reads on each desk (short lines, so a line fits across the hole) */
  const LENS_SAYS = [["excel", "q3-forecast"], ["crm-assistant"], ["copilot", "(m365)"], ["chatgpt.com", "personal"], ["crm web"]];
  const SEEN = [
    { says: "excel · q3-forecast.xlsx", screen: ["q3-forecast.xlsx", "A1  revenue", "B4  =SUM(B1:B3)"] },
    { says: "crm-assistant", screen: ["crm-assistant", "export contacts", "1,204 rows"] },
    { says: "copilot (m365)", screen: ["copilot (m365)", "draft: follow-up", ""] },
    { says: "chatgpt.com · personal", screen: ["chatgpt.com", "personal account", "paste: crm-export"] },
    { says: "crm web", screen: ["crm web", "pipeline · q3", ""] },
  ];
  const deskRow = (d: { z: number }) => (d.z < 0 ? 1 : 2);
  const topBox = new THREE.BoxGeometry(DESK.w + 0.004, 0.05, DESK.d + 0.004);
  const monBox = new THREE.BoxGeometry(0.664, 0.404, 0.03);
  const screenGeo = new THREE.PlaneGeometry(0.62, 0.36);
  DESKS.forEach((d, i) => {
    const g = new THREE.Group();
    g.position.set(d.x, 0, d.z);
    add(g, topGeo, matSheet, 0, DESK.top, 0);
    // glass panel legs: satin slabs printed as dark grey blocks on the white page
    add(g, legGeo, matSheet, -DESK.w / 2 + 0.06, DESK.top / 2, 0);
    add(g, legGeo, matSheet, DESK.w / 2 - 0.06, DESK.top / 2, 0);
    const mz = -DESK.d / 2 + 0.13;
    add(g, footGeo, matChrome, 0, TOP + 0.007, mz);
    add(g, neckGeo, matChrome, 0, TOP + 0.07, mz - 0.01);
    add(g, monGeo, matScreen, 0, TOP + 0.12 + 0.2, mz); // blank until revealed
    add(g, lapGeo, matSatin, -0.12, TOP + 0.008, 0.1);
    const row = deskRow(d);
    const hot = FLAGGED.some((f) => f.desk === i);
    outline(g, topBox, row, 0, DESK.top, 0);
    outline(g, monBox, row, 0, TOP + 0.32, mz);
    const shot = new THREE.Mesh(
      screenGeo,
      revealMat(row, { map: textTex(SEEN[i].screen, 512, 300, 40, dark ? "#1d1e22" : "#f1f2f4", inkHex) }),
    );
    shot.position.set(0, TOP + 0.32, mz + 0.0135);
    g.add(shot);
    scene.add(g);
    bill(LENS_SAYS[i], row, d.x + 0.08, TOP + 0.36, d.z + mz + 0.05, 11, true); // read through the lens, over the screen
    bill([SEEN[i].says], row, d.x + 0.1, 1.15, d.z + mz, 8, false, hot ? 1 : 0.62); // the record, just above the monitor
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
  // no hex core (it read as a security icon): revealed, the rack shows agent:finance's tool calls
  outline(rack, new THREE.BoxGeometry(0.784, 1.604, 0.664), 0, 0, 0.8, 0);
  scene.add(rack);
  bill(["agent:finance"], 0, RACK.x, 0.9, RACK.z + 0.36, 11, true);
  // the record on the rack's glass: agent:finance's tool calls, ≥ 11 px
  // on the rack's front face, a hair in front of the glass, facing the camera; drawn
  // after the glass and never depth-tested against it, so all three lines read whole
  bill(["read(invoice_0412.pdf)", "crm.export(customers)", "send_email(ext-sync.io)"], 0, RACK.x + 0.55, 0.95, RACK.z + 0.36, 11, false); // right of the row's final sweep edge (x ≈ -3.06), so every line starts whole

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
  const discBox = new THREE.CylinderGeometry(0.424, 0.424, 0.154, 64);
  for (let i = 0; i < 3; i++) {
    add(db, discGeo, matDisc, 0, i * 0.19, 0);
    if (i < 2) add(db, spacerGeo, matChrome, 0, i * 0.19 + 0.17, 0);
    outline(db, discBox, 0, 0, i * 0.19 + 0.075, 0);
  }
  scene.add(db);
  bill(["crm-db", "1,204 records"], 0, DB.x, 0.45, DB.z + 0.2, 11, true);
  bill(["crm-db · 1,204 records"], 0, DB.x, 0.74, DB.z, 8, false, 0.62);

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
  const aiH = 0.25 * 1.25 + 0.03; // hex height + bevel
  const ais = FLAGGED.map((f, i) => {
    const d = DESKS[f.desk];
    const x = d.x + 0.36;
    const z = d.z + 0.1;
    const body = new THREE.Mesh(aiGeo, matGun[i]); // exists only where revealed
    body.position.set(x, TOP + 0.03 + aiH / 2, z);
    body.rotation.y = cam.az - 0.25;
    scene.add(body);
    return { body, x, z };
  });

  /* ---------- fences: an ink square on the floor, traced by a node's hairline,
     and the verdict set on the floor beside it ---------- */
  const segGeo = new THREE.BoxGeometry(1, 0.004, 0.02).translate(0.5, 0, 0);
  const fences = FLAGGED.map((f, i) => {
    const d = DESKS[f.desk];
    const hx = FENCE_H.x;
    const hz = FENCE_H.z;
    // clockwise from the front-left corner
    const corners: [number, number][] = [
      [d.x - hx, d.z + hz],
      [d.x - hx, d.z - hz],
      [d.x + hx, d.z - hz],
      [d.x + hx, d.z + hz],
      [d.x - hx, d.z + hz],
    ];
    const segs = corners.slice(0, 4).map(([x0, z0], k) => {
      const [x1, z1] = corners[k + 1];
      const m = new THREE.Mesh(segGeo, matLine);
      m.position.set(x0, 0.003, z0);
      m.rotation.y = Math.atan2(-(z1 - z0), x1 - x0);
      scene.add(m);
      return { m, len: Math.hypot(x1 - x0, z1 - z0) };
    });
    const lens = segs.map((s) => s.len);
    const total = lens.reduce((p, q) => p + q, 0);
    /** the hairline's foot at fraction u of the square (by length: it moves at constant speed) */
    const pen = (u: number, out: THREE.Vector3) => {
      let rest = clamp01(u) * total;
      for (let k = 0; k < 4; k++) {
        if (rest <= lens[k] || k === 3) {
          const q = clamp01(rest / lens[k]);
          return out.set(lerp(corners[k][0], corners[k + 1][0], q), 0.004, lerp(corners[k][1], corners[k + 1][1], q));
        }
        rest -= lens[k];
      }
      return out;
    };
    const drawn = (u: number, k: number) => clamp01((clamp01(u) * total - lens.slice(0, k).reduce((p, q) => p + q, 0)) / lens[k]);
    // the verdict, set on the floor beside the square (type drawn tall so it reads from the camera)
    const vc = document.createElement("canvas");
    [vc.width, vc.height] = [512, 128];
    const vg = vc.getContext("2d")!;
    vg.fillStyle = inkHex;
    vg.font = '600 40px "IBM Plex Mono", ui-monospace, monospace';
    (vg as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "6px";
    vg.textBaseline = "middle";
    vg.save();
    vg.translate(8, 64);
    vg.scale(1, 1.8);
    vg.fillText(VERDICT[i], 0, 0);
    vg.restore();
    const vt = new THREE.CanvasTexture(vc);
    vt.colorSpace = THREE.SRGBColorSpace;
    vt.anisotropy = 8;
    texs.push(vt);
    const verdictM = new THREE.MeshBasicMaterial({ map: vt, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const verdict = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), verdictM);
    verdict.rotation.x = -Math.PI / 2;
    verdict.position.set(d.x + 0.1, 0.005, d.z - hz - 0.26); // just behind the square, where the floor is clear
    scene.add(verdict);
    return { segs, pen, drawn, verdictM, d };
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
  const flowCrm = makeFlow([DB.x + 0.5, DB.z + 0.02], [crmDesk.x - DESK.w / 2 - 0.04, crmDesk.z + 0.02], 6, matSignal);
  // chatgpt.com: data leaving the building (the track runs off the plan)
  // it leaves to the right, between ws-fin-02 and ws-sal-03, and off the plan
  const flowGpt = makeFlow([gptDesk.x + FENCE_H.x - 0.14, gptDesk.z - 0.65], [gptDesk.x + 4.1, gptDesk.z - 2.1], 7, matPacket);
  // Govern: the next request passes the checkpoint's hub at the exit
  const flowGate = makeFlow([EXIT.x - 0.85, EXIT.z - 1.6], [EXIT.x + 0.75, EXIT.z + 1.4], 5, matPacket);

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

  /* ---------- the mark: one rigid group in crisp chrome; the hub is a clear glass
     disc in a thin chrome bezel (the lens), cued only by one faint diagonal strip ---------- */
  const studio = stripStudio(renderer, cam.az, cam.el);
  const chromeCol = new THREE.Color(dark ? "#e9ebef" : "#f4f5f7");
  // group 0 = the flat faces (0.08), group 1 = sides and bevels (0.14)
  const markChrome = [0.08, 0.14].map((roughness) => new THREE.MeshStandardMaterial({ color: chromeCol, metalness: 1, roughness, envMap: studio }));
  const matSil = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.35 : 0.4, depthWrite: false }); // one light 1 px outer line
  const mark = new THREE.Group();
  mark.visible = false;
  scene.add(mark);
  NODE_A.forEach((a, i) => {
    const [a0, a1] = [deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP)];
    mark.add(new THREE.Mesh(extrude(arcShape(a0, a1, BEV), 72), markChrome));
    mark.add(new THREE.Mesh(extrude(barShape(a, BEV), 40), markChrome));
    const node = new THREE.Mesh(extrude(disc(NODE_R - BEV), 64), markChrome); // a solid disc, flush with the ring
    node.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0);
    mark.add(node);
  });
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BEV, HUB_R - BEZEL + BEV), 96), markChrome)); // the bezel
  // the lens: flat clear glass (drawn, not refracted, so the revealed office shows
  // through it); its one cue is a faint diagonal strip, ~4% white
  const glassDisc = new THREE.Mesh(
    new THREE.CircleGeometry(HUB_R - BEZEL, 96),
    new THREE.ShaderMaterial({
      uniforms: { uA: { value: dark ? 0.06 : 0.04 } },
      vertexShader: /* glsl */ `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uA; varying vec2 vP;
        void main() {
          float d = abs(dot(vP, vec2(0.7071, 0.7071)) - 0.13);
          gl_FragColor = vec4(1.0, 1.0, 1.0, uA * (1.0 - smoothstep(0.05, 0.085, d)));
        }`,
      transparent: true,
      depthWrite: false,
    }),
  );
  glassDisc.position.z = DEPTH * 0.2;
  mark.add(glassDisc);
  for (const pts of silhouette()) mark.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matSil));
  const nodeLocal = NODE_A.map((a) => new THREE.Vector3(Math.cos(deg(a)), Math.sin(deg(a)), 0));

  // the checkpoint's word, set in the hub facing the camera
  const logC = document.createElement("canvas");
  [logC.width, logC.height] = [320, 80];
  {
    const g = logC.getContext("2d")!;
    g.fillStyle = inkHex;
    g.font = '600 44px "IBM Plex Mono", ui-monospace, monospace';
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "5px";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("LOGGED", 160, 42);
  }
  const logT = new THREE.CanvasTexture(logC);
  logT.colorSpace = THREE.SRGBColorSpace;
  texs.push(logT);
  const logM = new THREE.MeshBasicMaterial({ map: logT, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const logged = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), logM); // ≈ 11 px type, facing the camera
  logged.renderOrder = 10;
  scene.add(logged);

  // the hairline a node drops to a finding, to trace its fence
  const hairGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const hairM = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false });
  const hair = new THREE.Line(hairGeo, hairM);
  hair.frustumCulled = false;
  scene.add(hair);

  /* ---------- the lens's path: derived from t alone, so time can jump ---------- */
  const T = new THREE.Vector3(); // what the hole is looking at
  const rT = 0.45 * LENS.rEq; // the hole's radius, measured at what it looks at
  function lookAtT(t: number) {
    T.set(...PASS[0].a);
    for (const m of PASS) {
      if (t < m.t0) break;
      const k = m.turn ? inOutCubic(seg(t, m.t0, m.t1)) : trap(seg(t, m.t0, m.t1), 0.12);
      T.set(lerp(m.a[0], m.b[0], k), lerp(m.a[1], m.b[1], k), lerp(m.a[2], m.b[2], k));
    }
  }
  /** per row: how far the hole's trailing edge has reached (world x); it only ever grows */
  function sweptAt(t: number, row: number) {
    const d = ROW_DIR[row];
    let x = -d * 99;
    for (const m of PASS) {
      if (m.row !== row || m.turn || t < m.t0) continue;
      const k = trap(seg(t, m.t0, m.t1), 0.12);
      x = lerp(m.a[0], m.b[0], k) - d * rT;
    }
    return x;
  }
  const flatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, cam.az, 0, "YXZ"));
  const lensP = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  /** the lens in front of T, face-on, sized so its orbit measures R_EQ at T's depth */
  function lensAt(out: THREE.Vector3) {
    tmpV.copy(camera.position).sub(T).normalize();
    out.copy(T).addScaledVector(tmpV, LENS.off);
    return (LENS.rEq * camera.position.distanceTo(out)) / camera.position.distanceTo(T);
  }

  /* ---------- per-frame ---------- */
  let viewW = 1;
  let viewH = 1;
  let mode: HeroMode = "wide";
  const [tmpA, tmpB, tmpC, camRight] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const buf = new THREE.Vector2();
  /** the mark on screen (css px): centre and the radius chips keep out of */
  const markScreen = new THREE.Vector3(-1e4, -1e4, 0);

  const aim = new THREE.Vector3();
  /** room: 0 normal framing … 1 pulled back a little and following the lens a
   *  quarter of the way, so the whole mark stays in frame on every row */
  function placeCamera(loopT: number, room: number) {
    const ph = (loopT / LOOP_MS) * Math.PI * 2;
    const az = cam.az + Math.sin(ph) * 0.03;
    const el = cam.el + Math.sin(ph + 1.2) * 0.012;
    const dist = cam.dist * (1 + ROOM.dist * room);
    aim.copy(target).lerp(T, 0.25 * room);
    aim.y += ROOM.lift * room;
    camera.position.set(
      aim.x + Math.sin(az) * Math.cos(el) * dist,
      aim.y + Math.sin(el) * dist,
      aim.z + Math.cos(az) * Math.cos(el) * dist,
    );
    camera.lookAt(aim);
  }

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const reset = seg(t, RESET[0], RESET[1]);
    const alive = 1 - smooth(reset);

    /* the lens: small, then lens size; three passes; then it tips flat and
       glides to the exit as the checkpoint */
    lookAtT(t);
    const appear = smooth(seg(t, APPEAR[0], APPEAR[1])) * (1 - inOutCubic(seg(t, RESET[0], RESET[0] + 450)));
    const grow = inOutCubic(seg(t, EXPAND[0], EXPAND[1]));
    const tip = inOutCubic(seg(t, TIP[0], TIP[1]));
    placeCamera(t, grow * (1 - tip));
    camera.updateMatrixWorld();
    let size = lensAt(lensP) * lerp(LENS.small / LENS.rEq, 1, grow);
    const flatY = DEPTH * EXIT.r * 0.5 + 0.006;
    mark.position.copy(lensP).lerp(tmpV.set(EXIT.x, flatY, EXIT.z), tip);
    size = lerp(size, EXIT.r, tip);
    mark.quaternion.copy(camera.quaternion).slerp(flatQ, tip);
    mark.scale.setScalar(Math.max(size * appear, 1e-4));
    mark.visible = appear > 0.001;
    mark.updateMatrixWorld();

    /* the hole on screen (buffer px), for inHole; off once the lens has become the checkpoint */
    renderer.getDrawingBufferSize(buf);
    const holeC = tmpV.copy(mark.position).project(camera);
    const cx = ((holeC.x + 1) / 2) * buf.x;
    const cy = ((holeC.y + 1) / 2) * buf.y;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    const edge = tmpV.copy(mark.position).addScaledVector(camRight, (HUB_R - BEZEL) * size * appear).project(camera);
    const hrFull = Math.hypot(((edge.x + 1) / 2) * buf.x - cx, ((edge.y + 1) / 2) * buf.y - cy);
    const hr = hrFull * (1 - smooth(clamp01(tip * 3)));
    revealU.uHole.value.set(cx, cy, hr);
    revealU.uAA.value = 0.75 * renderer.getPixelRatio();
    revealU.uSwept.value.set(sweptAt(t, 0), sweptAt(t, 1), sweptAt(t, 2));
    revealU.uLife.value = alive;
    markScreen.set(cx / renderer.getPixelRatio(), viewH - cy / renderer.getPixelRatio(), (hrFull / renderer.getPixelRatio()) * ((1 + NODE_R) / (HUB_R - BEZEL)) + 12);
    // labels face the camera; a record label steps back wherever it would touch
    // the mark (lens labels are clipped to the hole by their shader)
    for (const b of bills) {
      b.m.quaternion.copy(camera.quaternion);
      if (b.lens) continue;
      proj.copy(b.m.position).project(camera);
      const [lx, ly] = [((proj.x + 1) / 2) * viewW, ((1 - proj.y) / 2) * viewH];
      const [nx, ny] = [clamp(markScreen.x, lx - b.hw, lx + b.hw), clamp(markScreen.y, ly - b.hh, ly + b.hh)];
      const gap = Math.hypot(markScreen.x - nx, markScreen.y - ny) - markScreen.z; // label rect to the mark's disc
      b.mat.uniforms.uA.value = b.a * (appear > 0.001 ? smooth(clamp01(gap / 16)) : 1);
    }

    /* static contact shadows */
    nCaster = 0;
    for (const d of DESKS) {
      caster(d.x, d.z, DESK.w / 2, DESK.d / 2, 0.03, 0.34, dark ? 0.4 : 0.1);
      caster(d.x + 0.12, d.z + DESK.d / 2 + 0.3, 0.2, 0.2, 0.2, 0.12, dark ? 0.65 : 0.22);
    }
    caster(RACK.x, RACK.z, 0.39, 0.33, 0.05, 0.3, dark ? 0.6 : 0.16);
    caster(DB.x, DB.z, 0.42, 0.42, 0.42, 0.22, dark ? 0.55 : 0.16);

    /* the findings: the scan stops on each; the nearest node drops a hairline to
       the desk, traces the fence round its footprint and sets the verdict */
    const fenceK: number[] = [];
    let hairK = 0;
    FLAGGED.forEach((_, i) => {
      const [a0, a1, a2, a3, a4] = ACT[i];
      const fx = fences[i];
      const u = inOutSine(seg(t, a1, a2));
      fx.segs.forEach((s, k) => {
        const kk = fx.drawn(u, k) * alive;
        s.m.scale.x = Math.max(s.len * kk, 0.0001);
        s.m.visible = kk > 0.001;
      });
      fx.verdictM.opacity = smooth(seg(t, a2, a3)) * alive;
      fenceK.push(u);
      const k = win(t, a0, a4, 100);
      if (k > hairK) {
        hairK = k;
        // the node nearest (on screen) to where the trace starts
        const c0 = fx.pen(0, tmpA);
        let best = 0;
        let bd = Infinity;
        nodeLocal.forEach((n, j) => {
          const d = tmpB.copy(n).applyMatrix4(mark.matrixWorld).project(camera).distanceTo(tmpC.copy(c0).project(camera));
          if (d < bd) [bd, best] = [d, j];
        });
        const node = tmpB.copy(nodeLocal[best]).applyMatrix4(mark.matrixWorld);
        // drop to the first corner, trace, then rise back into the node
        const foot = t < a1 ? tmpC.copy(node).lerp(c0, inOutCubic(seg(t, a0, a1))) : t < a3 ? fx.pen(u, tmpC) : tmpC.copy(c0).lerp(node, inOutCubic(seg(t, a3, a4)));
        const pa = hairGeo.getAttribute("position") as THREE.BufferAttribute;
        pa.setXYZ(0, node.x, node.y, node.z);
        pa.setXYZ(1, foot.x, foot.y, foot.z);
        pa.needsUpdate = true;
      }
    });
    hairM.opacity = hairK * alive * (dark ? 0.7 : 0.85);
    hair.visible = hairM.opacity > 0.002;

    /* flows: from the moment the hole lands on the AI until its fence is drawn */
    const flowK = (i: number) => smooth(seg(t, ACT[i][0], ACT[i][0] + 150)) * (1 - smooth(clamp01((fenceK[i] - 0.6) / 0.4))) * alive;
    stream(flowCrm, t, flowK(0), 1500);
    stream(flowGpt, t, flowK(1), 1700);

    /* Govern: the checkpoint; the next request passes through its hub, logged */
    const gate = win(t, THROUGH[0], THROUGH[1], 300) * alive;
    stream(flowGate, t, gate, 1600);
    logged.position.set(EXIT.x, 0.14, EXIT.z);
    logged.quaternion.copy(camera.quaternion);
    logM.opacity = smooth(seg(t, THROUGH[0] + 250, THROUGH[0] + 550)) * alive;

    /* chips: one at a time, only once their event has happened; none in Govern,
       where the checkpoint's LOGGED says it (states still advance for the page) */
    const show = [win(t, 980, 1380), win(t, ACT[0][0] + 80, PASS[4].t1), win(t, ACT[1][0] + 80, 5000)];
    labelState.forEach((L, i) => {
      L.a = Math.min(1, show[i]) * alive;
      if (i === 0) L.state = t >= ALL_CHIPS ? 2 : 0;
      else L.state = t >= ALL_CHIPS ? 2 : fenceK[i - 1] > 0.97 ? 1 : 0;
    });

    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;
  }

  // chips hang below their object (its front edge, on the floor): the side facing
  // away from the revealed labels, which sit above the screens
  const labelPos = [
    new THREE.Vector3(RACK.x, 0, RACK.z + 0.62),
    ...FLAGGED.map((f) => new THREE.Vector3(DESKS[f.desk].x + 0.1, 0, DESKS[f.desk].z + DESK.d / 2 + 0.12)),
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
        const x = ((proj.x + 1) / 2) * viewW;
        let y = ((1 - proj.y) / 2) * viewH;
        // never over the mark: drop straight below its disc (away from the labels
        // above the screens), and stay in frame
        const R = markScreen.z + 30;
        if (Math.abs(x - markScreen.x) < R + 70 && y > markScreen.y - R && y < markScreen.y + R) {
          y = markScreen.y + Math.sqrt(Math.max(R * R - (x - markScreen.x) ** 2, 0)) + 30;
        }
        labelState[i].x = Math.min(viewW - 80, Math.max(80, x));
        labelState[i].y = Math.min(viewH - 24, Math.max(36, y));
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
      env.dispose();
      studio.dispose();
      renderer.dispose();
    },
  };
}
