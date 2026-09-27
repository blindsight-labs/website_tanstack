/* Hero scene for mockup 10, version C: "The exploded view".
 *
 * An Apple/Linear-style product teardown of the Blindsight mark (orbit radius = 1: hub
 * r 0.5, three arms 0.17 wide to three flat node discs r 0.25 at 0°, 128°, 232°, an
 * orbit band 0.22 wide broken into three arcs with a ±20° gap at each node).
 *
 * The mark lies above a small satin plinth on a desk (tilted 58° from facing the
 * camera, a 3/4 view) and turns like a turntable about its own normal, round a plain
 * chrome spindle. The turn IS the mechanism: a low glass cam ramp runs round the
 * plinth's edge, its chrome track rising and falling with the angle; a follower on the
 * ring layer rides it, and the layers telescope up in proportion (the ring by the
 * follower's lift, the lens plate twice as far). So the height of the layers is a
 * direct function of how far the mark has turned (screwAt(turn angle)), never of time.
 * At the end of the loop the turn carries the follower back down the ramp and the
 * stack lands as the flat logo. A click that jumps the clock just makes the turn catch
 * up (critically damped, shortest path), and the layers ride the cam with it.
 *
 *   01 SEE     top layer: a thin clear glass lens plate carrying the hub, arms and
 *              nodes. A sweep line engraved on the plate laps it once; each glass
 *              tablet it passes (an AI app: three on the arms, three unsanctioned
 *              ones between them) switches from dim smoky glass to crisp, printed.
 *   02 SECURE  middle layer: the full broken orbit, the boundary. With the top layer
 *              lifted its gaps are open. As the front gap comes round to face the
 *              camera, a violet-printed glass card (the page's only violet) slides in
 *              at it, a glass wall rises across the gap, the card knocks against it and
 *              is held; then its violet print is stripped and it clears.
 *   03 GOVERN  bottom layer: the plinth. While the audit row types (LOG_T.in → seal) a
 *              tick bezel is engraved round it, a hairline ring seals it, and the turn
 *              winds the stack shut down onto it.
 *
 * Each layer lights up in turn and carries a 3D label on a hairline leader (the page's
 * own node labels step aside: nodes() returns []).
 */
import { THREE, RoundedBoxGeometry, createRenderer, type Theme } from "./core";

export const LOOP_MS = 12000;
/** A calm, representative frame for reduced motion: open, all three layers labelled,
 *  the ledger sealed. */
export const SETTLED_MS = 9400;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 7500, seal: 9200, out: 11700 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 0, t1: 4000 },
  { n: "02", label: "Secure it", t0: 4000, t1: 7200 },
  { n: "03", label: "Govern it", t0: 7200, t1: 11700 },
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
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;
const wrap180 = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

/* the mark (orbit radius = 1) */
const HUB_R = 0.5, NODE_R = 0.25, ARM_W = 0.17;
const NODE_D = 0.1; // node discs: the logo's own flat nodes, r 0.25, a rounded edge
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const BAND = 0.22, BAND_D = 0.05; // ONE thin broken orbit: glass with a chrome edge
const BAND_Z = BAND_D / 2;
const EDGE_W = 0.013; // the chrome edge round each arc
const R_OUT = 1 + NODE_R; // the mark's outer extent

/* the stack (world: y up; each layer's mark lies in its own x/z plane) */
const EL = deg(32); // camera elevation: the mark is tilted 58° from facing the camera
const LAYER_GAP = 0.55; // ring rise when open, in orbit radii (the lens plate rises twice this)
const REST_Y = 0.16; // ring and plate height above the plinth when assembled (clear of the cam)
const FOLLOW = 0.5; // how much of the stack's rise the framing follows (a gentle pedestal)
const PHASE = -30; // the mark's turn at the loop's start (so the Secure gap meets the camera)
const R_BASE = 1.1, BASE_T = 0.035, CHAMFER = 0.018; // the plinth: orbit radius + 10%
const R_PLATE = 0.86; // the lens plate sits just inside the ring (inner edge 0.89)
const PLATE_T = 0.03, PLATE_TOP = PLATE_T / 2;
const ARM_T = 0.06, ARM_Z = PLATE_TOP + ARM_T / 2, ARM_TOP = ARM_Z + ARM_T / 2;
const NODE_Z = 0.006; // node discs sit in the orbit's plane, in its gaps
const LENS_D = 0.2, LENS_Z = 0.1;

/* the turn: one per loop, faster while it winds open and shut */
const OPEN0 = 300, OPEN1 = 2300, CLOSE0 = 9650, CLOSE1 = 11650;
const WIND = 1.0; // extra speed while winding (peak ≈ 2.5× the cruising speed)
const SPIN_W = 0.006; // critically damped follow, per ms (settles in ≈ 0.8 s)
const spinW = (t: number) =>
  t + WIND * ((OPEN1 - OPEN0) * smooth(seg(t, OPEN0, OPEN1)) + (CLOSE1 - CLOSE0) * smooth(seg(t, CLOSE0, CLOSE1)));
const W_LOOP = spinW(LOOP_MS);
/** the story's turn in degrees, unwrapped across loops (continuous in tAbs) */
function spinAt(tAbs: number) {
  const k = Math.floor(tAbs / LOOP_MS);
  return 360 * k + (360 * spinW(tAbs - k * LOOP_MS)) / W_LOOP;
}
/* the cam: the stretch of the turn that lifts the stack, and the stretch that lowers it */
const A_O0 = (360 * spinW(OPEN0)) / W_LOOP, A_O1 = (360 * spinW(OPEN1)) / W_LOOP;
const A_C0 = (360 * spinW(CLOSE0)) / W_LOOP, A_C1 = (360 * spinW(CLOSE1)) / W_LOOP;
const thread = (x: number) => 0.5 * x + 0.5 * smooth(x);
/** how far up the cam (0 = seated, 1 = open) the mark is at this turn (0..360) */
function screwAt(a: number) {
  if (a < A_O0) return 0;
  if (a < A_O1) return thread((a - A_O0) / (A_O1 - A_O0));
  if (a < A_C0) return 1;
  if (a < A_C1) return 1 - thread((a - A_C0) / (A_C1 - A_C0));
  return 0;
}
/* the plain spindle, and the cam round the plinth's edge with the ring's follower */
const SP_R = 0.035;
const SP_H = REST_Y + 2 * LAYER_GAP + LENS_Z + 0.04;
const CAM_R = 1.05; // the cam ramp's radius, just inside the plinth's chamfer
const CAM_Y0 = 0.012, CAM_H = 0.09; // track height seated, and its rise
const PIN_A = -56; // follower's angle on the ring (on an arc; puts the cam's low stretch at the front)
/** the cam track's height at a world angle: the follower passes there at this turn */
const camY = (worldDeg: number) => CAM_Y0 + CAM_H * screwAt((((worldDeg - PHASE - PIN_A) % 360) + 360) % 360);

/* 01 See: the sweep and the tablets */
const SW_T0 = 1300, SW_T1 = 3600;
const SW_A0 = -62; // plate angle it starts from (on screen: at the left at t ≈ 2500)
const SW_TRAIL = 60;
const SW_R0 = HUB_R + 0.03, SW_R1 = R_PLATE - 0.02;
const sweepEase = (x: number) => 0.35 * x + 0.65 * smooth(x);
const TAB_L = 0.19, TAB_W = 0.25, TAB_T = 0.045; // radial, tangential, thickness
const TAB_ARM_Z = ARM_TOP + TAB_T / 2 + 0.003;
const TAB_PLATE_Z = PLATE_TOP + TAB_T / 2 + 0.003;
const TABS = [
  { a: 0, r: 0.635, z: TAB_ARM_Z },
  { a: 64, r: 0.68, z: TAB_PLATE_Z }, // unsanctioned apps sit between the arms
  { a: 128, r: 0.635, z: TAB_ARM_Z },
  { a: 180, r: 0.68, z: TAB_PLATE_Z },
  { a: 232, r: 0.635, z: TAB_ARM_Z },
  { a: 296, r: 0.68, z: TAB_PLATE_Z },
];
const TAB_REL = TABS.map((b) => (((b.a - SW_A0) % 360) + 360) % 360);
const RESET_T = 11700; // assembled again: everything goes back for the next loop

/* 02 Secure: the gate across a ring gap and the held violet card */
const SECURE_NODE = 1; // the 128° gap: it faces the camera while the card is held
const V_T0 = 4150, V_GO = 4350, V_HIT = 5150; // appears, sets off, meets the wall
const GATE_T0 = 4600, GATE_T1 = 5050; // the wall rises in the gap
const STRIP_T0 = 6250, STRIP_T1 = 6700; // its violet print is stripped
const V_OUT0 = 6700, V_OUT1 = 7100; // cleared
const GATE_DN0 = 9700, GATE_DN1 = 10000; // the wall lowers before the node seats in the gap
const GATE_TH = 0.026, GATE_H = 0.36, GATE_SPAN = 19; // span: ± degrees
const CARD_W = 0.34, CARD_H = 0.26, CARD_T = 0.03; // upright, its print facing out
const CARD_ZC = -BAND_Z + CARD_H / 2 + 0.006;
const V_START = 1.62;
const V_STOP = 1 + GATE_TH / 2 + 0.004 + CARD_T / 2;
/** incoming travel: enters with some speed, still moving when it meets the gate */
const travel = (x: number) => {
  const x2 = x * x;
  const x3 = x2 * x;
  return (x3 - 2 * x2 + x) * 0.9 + (3 * x2 - 2 * x3) + (x3 - x2) * 0.55;
};

/* 03 Govern: the ledger bezel on the plinth (engraving starts at the front) */
const TICK_STEP = 3, TICK_OUT = CAM_R - 0.025, TICK_MINOR = 0.04, TICK_MAJOR = 0.075;
const TICK_A0 = -90;
const TICK_RET0 = 11700, TICK_RET1 = 11960; // the bezel rewinds for the next loop
const SEAL_R0 = 0.924, SEAL_R1 = 0.93;

/* labels, printed in 3D (index = beat = layer: 0 top, 1 ring, 2 plinth) */
const LBL = [
  { t: "01 · SEE IT", s: "every AI in view", r: R_PLATE + 0.015 },
  { t: "02 · SECURE IT", s: "attacks stopped at runtime", r: 1 + BAND / 2 + 0.012 },
  { t: "03 · GOVERN IT", s: "every decision logged", r: R_BASE + 0.012 },
];
const X_L = R_OUT + 0.32; // where the leaders end and the type column starts
const X_LEFT = R_OUT + 0.04;
const LBL_W = 200, LBL_H = 46; // css px
const LBL_TY = 12; // the title's centre, from the top: sits on the leader
const LBL_GAP = 8;
const TEXT_PX = LBL_GAP + LBL_W - 4;
const INACT = 0.3; // opacity of an inactive layer's label
/* framing (screen units above the origin: the reference centre, the half height) */
const C_REF = 0.36, V_HALF = 1.35;
const FLOOR = 16;

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
    panel(12, 3.2, 215, 12, 0.2);
    panel(24, 9, 180, 44, 0.28);
    panel(12, 0.6, 180, 30, 1.3); // a thin glint across the flat top faces
  } else {
    panel(14, 1.4, 0, 78, 2.0);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(9, 1.3, 205, -6, 0.0);
    panel(1.8, 14, 58, 6, 2.6);
    panel(1.2, 14, -40, 8, 2.4);
    panel(12, 0.5, 180, 30, 1.2);
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

/** Draw a silhouette off-canvas and keep only its blurred shadow (works everywhere,
 *  unlike ctx.filter). */
function castShadow(g: CanvasRenderingContext2D, src: HTMLCanvasElement, blurPx: number, alpha: number) {
  const OFF = src.width * 2;
  g.save();
  g.shadowColor = `rgba(0,0,0,${alpha})`;
  g.shadowBlur = blurPx;
  g.shadowOffsetX = OFF;
  g.drawImage(src, -OFF, 0);
  g.restore();
}

/** The desk: the page colour, a hairline grid and dot field fading out from the centre
 *  (straight lines for the glass to bend), and the base plate's contact shadow. */
function floorTexture(bg: THREE.Color, ink: THREE.Color, dark: boolean) {
  const N = 2048;
  const px = N / FLOOR;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const g = c.getContext("2d")!;
  g.fillStyle = `#${bg.getHexString()}`;
  g.fillRect(0, 0, N, N);
  const cx = N / 2;
  const cy = N / 2;
  const disc = document.createElement("canvas");
  disc.width = disc.height = N;
  const d = disc.getContext("2d")!;
  d.fillStyle = "#000";
  d.beginPath();
  d.arc(cx, cy, R_BASE * px, 0, TAU);
  d.fill();
  castShadow(g, disc, 0.55 * px, dark ? 0.5 : 0.08); // ambient
  castShadow(g, disc, 0.07 * px, dark ? 0.7 : 0.16); // contact
  const fade = (x: number, y: number) => {
    const r = Math.hypot(x - cx, y - cy) / (4.2 * px);
    return 1 - smooth(clamp01((r - 0.3) / 0.7));
  };
  const inkCss = `#${ink.getHexString()}`;
  g.strokeStyle = inkCss;
  g.lineWidth = 1.5;
  const step = 0.25 * px;
  const segL = step / 3;
  for (let y = cy % step; y < N; y += step)
    for (let x = 0; x < N; x += segL) {
      const f = fade(x + segL / 2, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.1 : 0.07);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + segL, y);
      g.stroke();
    }
  for (let x = cx % step; x < N; x += step)
    for (let y = 0; y < N; y += segL) {
      const f = fade(x, y + segL / 2);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.1 : 0.07);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + segL);
      g.stroke();
    }
  g.fillStyle = inkCss;
  for (let y = (cy % step) + step / 2; y < N; y += step)
    for (let x = (cx % step) + step / 2; x < N; x += step) {
      const f = fade(x, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.22 : 0.15);
      g.beginPath();
      g.arc(x, y, 2, 0, TAU);
      g.fill();
    }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A 3D label: mono caps title on the leader's line, a one-line Sans sub below. */
function labelTexture(title: string, sub: string, ink: THREE.Color) {
  const S = 4; // texels per css px
  const c = document.createElement("canvas");
  c.width = LBL_W * S;
  c.height = LBL_H * S;
  const g = c.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing?: string };
  g.scale(S, S);
  g.fillStyle = `#${ink.getHexString()}`;
  g.textBaseline = "middle";
  g.font = `500 11.5px "IBM Plex Mono", ui-monospace, monospace`;
  g.letterSpacing = "1.4px";
  g.fillText(title, 1, LBL_TY);
  g.letterSpacing = "0px";
  g.font = `400 13px "IBM Plex Sans", system-ui, sans-serif`;
  g.globalAlpha = 0.64;
  g.fillText(sub, 1, LBL_TY + 19);
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

async function fontsReady() {
  try {
    const f = document.fonts;
    await Promise.race([
      Promise.all([f.load('500 46px "IBM Plex Mono"'), f.load('400 52px "IBM Plex Sans"')]),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
  } catch {
    /* fall back to whatever is loaded */
  }
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

/** The three orbit arcs as flat shapes of half-width hw with rounded ends. */
function arcShapes(hw: number) {
  return NODE_A.map((a, i) => {
    const a0 = deg(a + GAP);
    const a1 = deg((NODE_A[i + 1] ?? 360) - GAP);
    const sh = new THREE.Shape();
    sh.absarc(0, 0, 1 + hw, a0, a1, false);
    sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
    sh.absarc(0, 0, 1 - hw, a1, a0, true);
    sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
    return sh;
  });
}

/** An annular sector (radians), for the gate across a gap. */
function sectorShape(a0: number, a1: number, r0: number, r1: number) {
  const sh = new THREE.Shape();
  sh.absarc(0, 0, r1, a0, a1, false);
  sh.absarc(0, 0, r0, a1, a0, true);
  sh.closePath();
  return sh;
}

/** The printed label on a tablet: two short bars, like a line of mono text (or, for the
 *  violet card, one short bar: a single word). */
function printGeometry(single = false) {
  const q = (x0: number, x1: number, y0: number, y1: number) => [x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y0, 0, x1, y1, 0, x0, y1, 0];
  const pos = new Float32Array(single ? q(-0.1, 0.06, -0.026, 0.026) : [...q(-0.065, 0.065, 0.016, 0.05), ...q(-0.065, 0.005, -0.05, -0.016)]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return g;
}

/** A thin fresnel rim for clear glass: bright (dark mode) or ink (light mode) only where
 *  the surface turns away from the eye. On instanced meshes, the instance colour's red
 *  channel scales it (dim tablets get a softer edge). */
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
      varying vec3 vN; varying vec3 vV; varying float vK;
      void main() {
        vec4 p = vec4(position, 1.0);
        vec3 n = normal;
        vK = 1.0;
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          n = mat3(instanceMatrix) * n;
        #endif
        #ifdef USE_INSTANCING_COLOR
          vK = instanceColor.r;
        #endif
        vec4 mv = modelViewMatrix * p;
        vN = normalize(normalMatrix * n);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV; varying float vK;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        f = smoothstep(0.35, 0.95, f);
        gl_FragColor = vec4(col, f * k * vK);
      }`,
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
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;
  renderer.localClippingEnabled = true;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.0 : 0.7);
  key.position.set(-3, 6, 4);
  // a low back light: bright edges on every plate, so the layers part from a black page
  // (low, so its mirror lobe on the flat tops misses the camera: no hot spots)
  const back = new THREE.DirectionalLight(0xffffff, dark ? 2.2 : 0.45);
  back.position.set(2, 0.8, -6);
  scene.add(key, back);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);

  /* ---------- materials ---------- */
  const glass = (extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.1,
      ior: 1.5,
      dispersion: 0.02,
      clearcoat: 0,
      attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"),
      attenuationDistance: 60,
      ...extra,
    });
  /* Thin panes (the lens plate, the gate) are alpha-blended glass: a thin parallel pane
     barely refracts anyway, and three cannot see one transmissive object through another. */
  const thinGlass = (opacity: number) =>
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity, depthWrite: false, envMapIntensity: dark ? 1.6 : 1.2 });
  const chrome = () =>
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(dark ? "#e6e8ec" : "#f3f4f6"), metalness: 1, roughness: 0.06, envMapIntensity: 1 });
  const satin = (hex: string, rough = 0.3) =>
    new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), metalness: 1, roughness: rough, envMapIntensity: 1 });
  const rimCol = dark ? new THREE.Color(0xffffff) : ink;
  const RIM_K = dark ? 0.85 : 0.42;

  // top layer
  const matPlate = thinGlass(dark ? 0.16 : 0.24);
  const matLens = glass({ thickness: 0.3, envMapIntensity: dark ? 1.4 : 1 });
  const matArm = satin(dark ? "#8a8c92" : "#c4c6cc");
  const matChromeTop = chrome();
  const rimTop = rimMaterial(rimCol, RIM_K);
  // ring layer: one thin broken orbit, clear glass with a chrome edge
  const matRing = thinGlass(dark ? 0.22 : 0.3);
  const matRingEdge = chrome();
  const matChromeMid = chrome();
  const rimMid = rimMaterial(rimCol, RIM_K);
  // the plinth: thin light satin, a polished chamfer
  const matBaseTop = satin(dark ? "#a6a8ae" : "#e4e6ea", 0.3);
  const matBaseSide = satin(dark ? "#a6a8ae" : "#e4e6ea", 0.24);
  const matChamfer = chrome();
  const rimBase = rimMaterial(rimCol, dark ? 0.75 : 0.3);
  // the cam round its edge: a low glass ramp with a polished track
  const matCam = thinGlass(dark ? 0.2 : 0.26);
  matCam.side = THREE.DoubleSide;
  const matTrack = chrome();
  // the spindle: chrome, shown only below the lens plate (clipped at the hub)
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const matSpindle = chrome();
  matSpindle.clippingPlanes = [clip];
  // small moving glass parts
  const matTab = glass({ thickness: 0.05, dispersion: 0.01, envMapIntensity: dark ? 1.5 : 1.1 });
  const matGate = thinGlass(dark ? 0.22 : 0.3);
  const rimHi = rimMaterial(rimCol, dark ? 1.0 : 0.55);
  // print
  const matInk = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false });
  const matTick = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const matSeal = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");
  const matSignal = new THREE.MeshBasicMaterial({ color: signalCol, transparent: true, opacity: 0, toneMapped: false, side: THREE.DoubleSide });

  /* what "lights up" per layer: [material, its resting env intensity] */
  const litSets = [[matArm, matChromeTop, matLens, matPlate], [matRing, matRingEdge, matChromeMid], [matBaseTop, matBaseSide, matChamfer, matTrack]].map((set) =>
    set.map((m) => [m, m.envMapIntensity] as [THREE.MeshPhysicalMaterial, number]),
  );
  const litRims = [rimTop, rimMid, rimBase];
  const rimK0 = [RIM_K, RIM_K, rimBase.uniforms.k.value as number];

  /* ---------- rig, desk, layers ---------- */
  const rig = new THREE.Group(); // cursor lean + framing pedestal
  scene.add(rig);

  const floorTex = floorTexture(bg, ink, dark);
  // drawn first and writes no depth: the billboarded labels dip below the desk plane
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR, FLOOR),
    new THREE.MeshBasicMaterial({ map: floorTex, toneMapped: false, depthWrite: false }),
  );
  floor.renderOrder = -1;
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -BASE_T - 0.002;
  rig.add(floor);

  /** a layer: `layer` turns about world y and rides the cam; `flat` holds the mark in its x/y plane */
  const mkLayer = () => {
    const layer = new THREE.Group();
    const flat = new THREE.Group();
    flat.rotation.x = -Math.PI / 2; // mark +z → world up; mark angle -90° faces the camera
    layer.add(flat);
    rig.add(layer);
    return { layer, flat };
  };
  const top = mkLayer();
  const mid = mkLayer();
  const base = mkLayer(); // the plinth stays put

  /* ---------- the plain spindle, and the cam ramp round the plinth's edge ---------- */
  {
    const rod = new THREE.CylinderGeometry(SP_R, SP_R, SP_H, 24);
    rod.translate(0, SP_H / 2, 0);
    const collar = new THREE.TorusGeometry(0.07, 0.016, 12, 48);
    collar.rotateX(Math.PI / 2);
    collar.translate(0, 0.01, 0);
    rig.add(new THREE.Mesh(rod, matSpindle), new THREE.Mesh(collar, matChamfer));
    // the cam: a glass ribbon standing on the plinth whose top edge (a chrome track) is
    // the height the follower gives the layers at each angle of the turn
    const SEGS = 240;
    const pos = new Float32Array((SEGS + 1) * 6);
    const idx: number[] = [];
    const track: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGS; i++) {
      const w = (i / SEGS) * 360;
      const x = Math.cos(deg(w)) * CAM_R;
      const z = -Math.sin(deg(w)) * CAM_R;
      const y = camY(w);
      pos.set([x, 0, z, x, y, z], i * 6);
      if (i < SEGS) {
        idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
        track.push(new THREE.Vector3(x, y + 0.006, z));
      }
    }
    const camGeo = new THREE.BufferGeometry();
    camGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    camGeo.setIndex(idx);
    camGeo.computeVertexNormals();
    const trackGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(track, true), 480, 0.006, 6, true);
    rig.add(new THREE.Mesh(camGeo, matCam), new THREE.Mesh(trackGeo, matTrack));
  }

  /* ---------- 03: the plinth and its ledger ---------- */
  {
    const rTop = R_BASE - CHAMFER;
    base.flat.add(new THREE.Mesh(new THREE.CircleGeometry(rTop, 160), matBaseTop));
    const cham = new THREE.LatheGeometry([new THREE.Vector2(rTop, 0), new THREE.Vector2(R_BASE, -CHAMFER)], 160);
    cham.rotateX(Math.PI / 2);
    const sideH = BASE_T - CHAMFER;
    const side = new THREE.CylinderGeometry(R_BASE, R_BASE, sideH, 160, 1, true).rotateX(Math.PI / 2).translate(0, 0, -CHAMFER - sideH / 2);
    base.flat.add(new THREE.Mesh(cham, matChamfer), new THREE.Mesh(cham, rimBase), new THREE.Mesh(side, matBaseSide), new THREE.Mesh(side, rimBase));
  }
  const zAxis = new THREE.Vector3(0, 0, 1);
  const tickP: THREE.Vector3[] = [];
  const tickQ: THREE.Quaternion[] = [];
  const tickL: number[] = [];
  for (let k = 0; k < 360 / TICK_STEP; k++) {
    const th = deg(TICK_A0 + k * TICK_STEP);
    tickP.push(new THREE.Vector3(Math.cos(th) * TICK_OUT, Math.sin(th) * TICK_OUT, 0.0015));
    tickQ.push(new THREE.Quaternion().setFromAxisAngle(zAxis, th));
    tickL.push(k % 10 === 0 ? TICK_MAJOR : TICK_MINOR);
  }
  const NTK = tickP.length;
  const tickGeo = new THREE.PlaneGeometry(1, 0.009);
  tickGeo.translate(-0.5, 0, 0); // hangs inward from the outer radius
  const ticks = new THREE.InstancedMesh(tickGeo, matTick, NTK);
  ticks.frustumCulled = false;
  ticks.visible = false;
  base.flat.add(ticks);
  const seal = new THREE.Mesh(new THREE.RingGeometry(SEAL_R0, SEAL_R1, 240), matSeal);
  seal.position.z = 0.0015;
  seal.visible = false;
  base.flat.add(seal);

  /* ---------- 02: the full broken orbit, its gate and the violet card ---------- */
  // one thin band at the logo's proportions: a glass fill inside a polished chrome edge
  const fillD = BAND_D - 0.01;
  const bandGeo = new THREE.ExtrudeGeometry(arcShapes(BAND / 2 - EDGE_W / 2), { depth: fillD, bevelEnabled: false, curveSegments: 72 });
  bandGeo.translate(0, 0, -fillD / 2);
  const edgeShapes = arcShapes(BAND / 2);
  arcShapes(BAND / 2 - EDGE_W).forEach((h, i) => edgeShapes[i].holes.push(h));
  const edgeGeo = new THREE.ExtrudeGeometry(edgeShapes, { depth: BAND_D, bevelEnabled: false, curveSegments: 72 });
  edgeGeo.translate(0, 0, -BAND_D / 2);
  mid.flat.add(new THREE.Mesh(bandGeo, matRing), new THREE.Mesh(bandGeo, rimMid), new THREE.Mesh(edgeGeo, matRingEdge));

  // the follower: a small shoe on the cam track and a hairline rod up to the orbit's underside
  const pinX = Math.cos(deg(PIN_A)) * CAM_R;
  const pinY = Math.sin(deg(PIN_A)) * CAM_R;
  const followRodGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 12);
  followRodGeo.rotateX(Math.PI / 2);
  followRodGeo.translate(0, 0, 0.5); // spans z 0..1: scaled to reach the orbit
  const followRod = new THREE.Mesh(followRodGeo, matChromeMid);
  const shoe = new THREE.Mesh(puck(0.03, 0.03, 0.01, 32), matChromeMid);
  followRod.position.set(pinX, pinY, 0);
  shoe.position.set(pinX, pinY, 0);
  mid.flat.add(followRod, shoe);

  const gA = deg(NODE_A[SECURE_NODE]);
  const gC = Math.cos(gA);
  const gS = Math.sin(gA);
  const gate = new THREE.Group();
  const gateGeo = new THREE.ExtrudeGeometry(sectorShape(gA - deg(GATE_SPAN), gA + deg(GATE_SPAN), 1 - GATE_TH / 2, 1 + GATE_TH / 2), {
    depth: GATE_H,
    bevelEnabled: false,
    curveSegments: 32,
  });
  const capGeo = new THREE.ExtrudeGeometry(sectorShape(gA - deg(GATE_SPAN), gA + deg(GATE_SPAN), 1 - GATE_TH / 2 - 0.006, 1 + GATE_TH / 2 + 0.006), {
    depth: 0.014,
    bevelEnabled: false,
    curveSegments: 32,
  });
  const gateWall = new THREE.Mesh(gateGeo, matGate);
  const gateRim = new THREE.Mesh(gateGeo, rimHi);
  const gateCap = new THREE.Mesh(capGeo, matChromeMid);
  gateWall.position.z = gateRim.position.z = -BAND_Z;
  gate.add(gateWall, gateRim, gateCap);
  gate.visible = false;
  mid.flat.add(gate);

  // the card stands upright on the gap's radius, its printed face outwards (towards the
  // camera when the gap is at the front): local x = tangent, y = up, z = outward
  const radV = new THREE.Vector3(gC, gS, 0);
  const upV = new THREE.Vector3(0, 0, 1);
  const cardQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(-gS, gC, 0), upV, radV));
  const cardGeo = new RoundedBoxGeometry(CARD_W, CARD_H, CARD_T, 3, 0.02);
  const cardPrintGeo = printGeometry(true);
  const vCard = new THREE.Mesh(cardGeo, matTab);
  const vRim = new THREE.Mesh(cardGeo, rimHi);
  const vPrint = new THREE.Mesh(cardPrintGeo, matSignal);
  for (const m of [vCard, vRim, vPrint]) {
    m.quaternion.copy(cardQ);
    m.visible = false;
    mid.flat.add(m);
  }

  /* ---------- 01: the lens plate, hub, arms, node discs, sweep and tablets ---------- */
  const plateGeo = puck(R_PLATE, PLATE_T, 0.012, 128);
  top.flat.add(new THREE.Mesh(plateGeo, matPlate), new THREE.Mesh(plateGeo, rimTop));
  const armIn = HUB_R - 0.03;
  const armLen = 1 - NODE_R * 0.4 - armIn;
  const armGeo = new RoundedBoxGeometry(armLen, ARM_W, ARM_T, 3, 0.025);
  const nodeGeo = puck(NODE_R, NODE_D, 0.035);
  NODE_A.forEach((a) => {
    const c = Math.cos(deg(a));
    const s = Math.sin(deg(a));
    const arm = new THREE.Mesh(armGeo, matArm);
    arm.position.set(c * (armIn + armLen / 2), s * (armIn + armLen / 2), ARM_Z);
    arm.rotation.z = deg(a);
    const node = new THREE.Mesh(nodeGeo, matChromeTop);
    node.position.set(c, s, NODE_Z);
    top.flat.add(arm, node);
  });
  const lensGeo = puck(HUB_R, LENS_D, 0.08);
  const lens = new THREE.Mesh(lensGeo, matLens);
  const lensRim = new THREE.Mesh(lensGeo, rimTop);
  const core = new THREE.Mesh(puck(0.19, 0.1, 0.04), matChromeTop); // a chrome disc at the lens's heart
  lens.position.z = lensRim.position.z = core.position.z = LENS_Z;
  top.flat.add(lens, lensRim, core);

  // the sweep, engraved on the plate: a hairline with a faint trail behind it
  const sweep = new THREE.Group();
  sweep.position.z = PLATE_TOP + 0.0015;
  const TR_SEGS = 48;
  const trailGeo = new THREE.RingGeometry(SW_R0, SW_R1, TR_SEGS, 1, -deg(SW_TRAIL), deg(SW_TRAIL));
  {
    const n = trailGeo.attributes.position.count;
    const col = new Float32Array(n * 4);
    for (let v = 0; v < n; v++) {
      const f = (v % (TR_SEGS + 1)) / TR_SEGS;
      col[v * 4] = ink.r;
      col[v * 4 + 1] = ink.g;
      col[v * 4 + 2] = ink.b;
      col[v * 4 + 3] = f * f;
    }
    trailGeo.setAttribute("color", new THREE.BufferAttribute(col, 4));
  }
  const trailMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const lineMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const lineGeo = new THREE.PlaneGeometry(SW_R1 - SW_R0, 0.008);
  lineGeo.translate((SW_R0 + SW_R1) / 2, 0, 0.0005);
  sweep.add(new THREE.Mesh(trailGeo, trailMat), new THREE.Mesh(lineGeo, lineMat));
  sweep.visible = false;
  top.flat.add(sweep);

  // the tablets: instanced glass, their rims, their prints
  const NT = TABS.length;
  const tabGeo = new RoundedBoxGeometry(TAB_L, TAB_W, TAB_T, 3, 0.018);
  const printGeo = printGeometry();
  const tabs = new THREE.InstancedMesh(tabGeo, matTab, NT);
  const tabRims = new THREE.InstancedMesh(tabGeo, rimHi, NT);
  const prints = new THREE.InstancedMesh(printGeo, matInk, NT);
  const UNSEEN = dark ? 0.62 : 0.5; // tint of an unidentified tablet (1 = clear glass)
  const tmpC = new THREE.Color();
  for (let i = 0; i < NT; i++) {
    tmpC.setScalar(UNSEEN);
    tabs.setColorAt(i, tmpC);
    tabRims.setColorAt(i, tmpC);
  }
  for (const m of [tabs, tabRims, prints]) {
    m.frustumCulled = false;
    top.flat.add(m);
  }
  const tabQ = TABS.map((b) => new THREE.Quaternion().setFromAxisAngle(zAxis, deg(b.a)));

  /* ---------- labels: printed in 3D, facing the camera ---------- */
  const labelGroup = new THREE.Group();
  rig.add(labelGroup);
  const leaderGeo = new THREE.PlaneGeometry(1, 1);
  leaderGeo.translate(0.5, 0, 0);
  const dotGeo = new THREE.CircleGeometry(1, 24);
  const textGeo = new THREE.PlaneGeometry(LBL_W, LBL_H);
  textGeo.translate(LBL_W / 2, LBL_H / 2 - LBL_TY, 0); // origin: left edge, on the title's centre line
  const labelParts = LBL.map((d) => {
    const tex = labelTexture(d.t, d.s, ink);
    const textMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const leadMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const text = new THREE.Mesh(textGeo, textMat);
    const leader = new THREE.Mesh(leaderGeo, leadMat);
    const dot = new THREE.Mesh(dotGeo, leadMat);
    for (const m of [text, leader, dot]) {
      m.renderOrder = 10;
      labelGroup.add(m);
    }
    return { tex, text, leader, dot, textMat, leadMat, r: d.r };
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
  let pxPerUnit = 160;
  let lastReal = -1;
  let fDt = 16;
  let fSnap = true;
  const follow = (cur: number, to: number, tau: number) => (fSnap ? to : cur + (to - cur) * (1 - Math.exp(-fDt / tau)));
  let spinDeg = 0;
  let spinVel = 0;
  const act = [0, 0, 0];
  let swAlpha = 0;
  let swAng = SW_A0;
  const rev = new Float32Array(NT);
  let vA = 0;
  let vR = V_START;
  let stripK = 0;
  let gateK = 0;
  let ledgerP = 0;
  let lastPk = -1;
  let sealK = 0;

  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const qBill = new THREE.Quaternion();

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const nowMs = performance.now();
    const raw = lastReal < 0 ? Infinity : nowMs - lastReal;
    lastReal = nowMs;
    fSnap = raw > 250;
    fDt = fSnap ? 16 : raw;

    /* the turn: a critically damped follow of the story's angle (its speed fed forward,
       so it never lags while cruising), shortest path after a jump */
    const tgt = spinAt(tAbs);
    const tgtV = (spinAt(tAbs + 10) - tgt) / 10;
    if (fSnap) {
      spinDeg = tgt;
      spinVel = tgtV;
    } else {
      const x = wrap180(spinDeg - tgt);
      const v = spinVel - tgtV;
      const ex = Math.exp(-SPIN_W * fDt);
      const tmp = (v + SPIN_W * x) * fDt;
      spinDeg = tgt + (x + tmp) * ex;
      spinVel = tgtV + (v - SPIN_W * tmp) * ex;
    }

    /* ... and the cam turns it into height: the follower on the orbit rides the track
       round the plinth's edge; the orbit rises with it and the lens plate twice as far */
    const u = screwAt(((spinDeg % 360) + 360) % 360);
    const midY = REST_Y + LAYER_GAP * u;
    top.layer.position.y = REST_Y + 2 * LAYER_GAP * u;
    mid.layer.position.y = midY;
    top.layer.rotation.y = mid.layer.rotation.y = deg(spinDeg + PHASE);
    // the follower's angle on the plinth is exactly where the track has this height
    const shoeZ = CAM_Y0 + CAM_H * u + 0.006 + 0.015 - midY;
    shoe.position.z = shoeZ;
    followRod.position.z = shoeZ;
    followRod.scale.z = Math.max(-BAND_Z - shoeZ, 1e-3);

    /* ambient (real time): a gentle lean to the cursor, a slow float, travelling light */
    const le = fSnap ? 1 : 1 - Math.pow(0.03, fDt / 1000);
    lean.x += (lean.tx - lean.x) * le;
    lean.y += (lean.ty - lean.y) * le;
    rig.rotation.set(lean.y * 0.035, 0, 0);
    rig.position.y = -FOLLOW * LAYER_GAP * u + Math.sin((nowMs / 19000) * TAU) * 0.012;
    scene.environmentRotation.set(0, Math.sin((nowMs / 37000) * TAU) * 0.3, 0);
    // the spindle shows only below the hub, which rides it
    clip.constant = rig.position.y + top.layer.position.y + LENS_Z;

    /* the active layer lights up */
    const cur = BEATS.findIndex((b) => t >= b.t0 && t < b.t1);
    for (let i = 0; i < 3; i++) {
      const a = (act[i] = follow(act[i], cur === i ? 1 : 0, 180));
      const lit = 0.8 + 0.32 * a;
      for (const [m, k0] of litSets[i]) m.envMapIntensity = k0 * lit;
      litRims[i].uniforms.k.value = rimK0[i] * (0.6 + 0.45 * a);
    }

    /* 01: the sweep laps the plate once; each tablet it passes turns crisp */
    const swOn = t >= SW_T0 - 150 && t < SW_T1 + 120 ? 1 : 0;
    swAlpha = follow(swAlpha, swOn, 110);
    const swDeg = 360 * sweepEase(seg(t, SW_T0, SW_T1));
    const swTarget = SW_A0 + swDeg;
    swAng = swAlpha < 0.02 ? swTarget : follow(swAng, swTarget, 60);
    sweep.rotation.z = deg(swAng);
    trailMat.opacity = swAlpha * (dark ? 0.2 : 0.14);
    lineMat.opacity = swAlpha * (dark ? 0.9 : 0.75);
    sweep.visible = swAlpha > 0.01;

    const parted = smooth(clamp01((u - 0.3) / 0.4)); // the layers have parted
    const gs = Math.max(parted, 1e-4); // the apps come into view as it lifts
    for (let i = 0; i < NT; i++) {
      const b = TABS[i];
      const seen = t >= SW_T0 && t < RESET_T && (t >= SW_T1 || swDeg >= TAB_REL[i]) ? 1 : 0;
      rev[i] = follow(rev[i], seen, seen > rev[i] ? 70 : 250);
      const c = Math.cos(deg(b.a));
      const s = Math.sin(deg(b.a));
      tmpP.set(c * b.r, s * b.r, b.z);
      tmpS.setScalar(gs);
      tmpM.compose(tmpP, tabQ[i], tmpS);
      tabs.setMatrixAt(i, tmpM);
      tabRims.setMatrixAt(i, tmpM);
      tmpC.setScalar(UNSEEN + (1 - UNSEEN) * rev[i]);
      tabs.setColorAt(i, tmpC);
      tabRims.setColorAt(i, tmpC);
      tmpP.z = b.z + (TAB_T / 2 + 0.0015) * gs;
      tmpS.setScalar(Math.max(gs * rev[i], 1e-4));
      tmpM.compose(tmpP, tabQ[i], tmpS);
      prints.setMatrixAt(i, tmpM);
    }
    tabs.instanceMatrix.needsUpdate = true;
    tabRims.instanceMatrix.needsUpdate = true;
    prints.instanceMatrix.needsUpdate = true;
    if (tabs.instanceColor) tabs.instanceColor.needsUpdate = true;
    if (tabRims.instanceColor) tabRims.instanceColor.needsUpdate = true;

    /* 02: a violet card slides at the open gap; the gap's wall rises; it is held, stripped, cleared */
    const vaT = smooth(seg(t, V_T0, V_T0 + 350)) * (1 - smooth(seg(t, V_OUT0, V_OUT1)));
    const knock = seg(t, V_HIT, V_HIT + 300);
    const vrT = V_START - (V_START - V_STOP) * travel(seg(t, V_GO, V_HIT)) + 0.025 * Math.sin(Math.PI * knock) * (1 - knock) * (1 - knock);
    vA = follow(vA, vaT, 90);
    vR = vA < 0.02 ? vrT : follow(vR, vrT, 40);
    stripK = follow(stripK, smooth(seg(t, STRIP_T0, STRIP_T1)), 80);
    const vs = Math.max(vA, 1e-4);
    tmpP.copy(radV).multiplyScalar(vR).addScaledVector(upV, CARD_ZC);
    vCard.position.copy(tmpP);
    vCard.scale.setScalar(vs);
    vRim.position.copy(tmpP);
    vRim.scale.setScalar(vs);
    const ps = Math.max(1 - stripK, 1e-4);
    vPrint.position.copy(tmpP).addScaledVector(radV, (CARD_T / 2 + 0.002) * vs);
    vPrint.scale.set(vs * ps, vs * (0.4 + 0.6 * ps), vs);
    matSignal.opacity = vA * (1 - stripK);
    vCard.visible = vRim.visible = vA > 0.01;
    vPrint.visible = matSignal.opacity > 0.01;

    const gT = outCubic(seg(t, GATE_T0, GATE_T1)) * (1 - smooth(seg(t, GATE_DN0, GATE_DN1)));
    gateK = follow(gateK, gT, 70);
    const gk = Math.max(gateK, 1e-3);
    gateWall.scale.z = gateRim.scale.z = gk;
    gateCap.position.z = -BAND_Z + GATE_H * gk;
    gate.visible = gateK > 0.004;

    /* 03: the bezel is engraved tick by tick while the audit row types, then sealed;
       at the loop's end it rewinds */
    const progT = t < LOG_T.in ? 0 : t < TICK_RET0 ? seg(t, LOG_T.in, LOG_T.seal) : 1 - seg(t, TICK_RET0, TICK_RET1);
    ledgerP = follow(ledgerP, progT, 110);
    const pk = ledgerP * NTK;
    if (Math.abs(pk - lastPk) > 1e-3) {
      lastPk = pk;
      for (let k = 0; k < NTK; k++) {
        const grown = outCubic(clamp01((pk - k) * 1.6));
        tmpS.set(Math.max(grown * tickL[k], 1e-4), 1, 1);
        tmpM.compose(tickP[k], tickQ[k], tmpS);
        ticks.setMatrixAt(k, tmpM);
      }
      ticks.instanceMatrix.needsUpdate = true;
    }
    ticks.visible = pk > 0.01;
    sealK = follow(sealK, t >= LOG_T.seal && t < TICK_RET0 ? 1 : 0, 140);
    matSeal.opacity = sealK * (dark ? 0.85 : 0.75);
    seal.visible = sealK > 0.01;

    /* labels: on each layer's rim, facing the camera; the active one in ink. A label
       shows once its layer has parted from its neighbour (or while it is active). */
    const shown = [parted, parted, smooth(clamp01((u - 0.15) / 0.3))];
    const ys = [top.layer.position.y, mid.layer.position.y, -BASE_T / 2];
    const s = pxPerUnit;
    qBill.copy(rig.quaternion).invert().multiply(camera.quaternion);
    for (let i = 0; i < 3; i++) {
      const L = labelParts[i];
      const a = act[i];
      const op = (INACT + (1 - INACT) * a) * Math.max(shown[i], a);
      L.textMat.opacity = op;
      L.leadMat.opacity = op * 0.8;
      const y = ys[i];
      L.dot.position.set(L.r, y, 0);
      L.dot.scale.setScalar(2.3 / s);
      L.leader.position.set(L.r, y, 0);
      L.leader.scale.set(X_L - L.r, 1 / s, 1);
      L.text.position.set(X_L + LBL_GAP / s, y, 0);
      L.text.scale.setScalar(1 / s);
      for (const m of [L.dot, L.leader, L.text]) {
        m.quaternion.copy(qBill);
        m.visible = op > 0.01;
      }
    }
  }

  function resize(width: number, height: number, m: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    let ox: number;
    let oy: number;
    if (m === "wide") {
      // usable: right of the copy (the mask is opaque from ~52%), 30 px off the top and
      // right edges, clear of the caption rail at the bottom; the labels sit right of the stack
      camera.fov = 22;
      const lb = viewW * 0.505;
      const rb = viewW - 34;
      const tb = 30;
      const bb = viewH - 140;
      const need = X_LEFT + X_L;
      pxPerUnit = Math.max(40, Math.min((rb - lb - TEXT_PX) / need, (bb - tb) / (2 * V_HALF), 215));
      const slack = Math.max(0, rb - lb - need * pxPerUnit - TEXT_PX);
      ox = lb + slack / 2 + X_LEFT * pxPerUnit;
      oy = (tb + bb) / 2 + C_REF * pxPerUnit;
      labelGroup.visible = true;
    } else {
      // phone: the stack alone, centred (the caption rail names the beats)
      camera.fov = 24;
      pxPerUnit = Math.max(30, Math.min((viewW * 0.86) / (2 * X_LEFT), (viewH * 0.86) / (2 * V_HALF)));
      ox = viewW / 2;
      oy = viewH / 2 + 0.2 * pxPerUnit;
      labelGroup.visible = false;
    }
    // a lens shift puts the stack's origin at (ox, oy), so perspective stays straight
    const dx = ox - viewW / 2;
    const dy = oy - viewH / 2;
    const fullW = viewW + 2 * Math.abs(dx);
    const fullH = viewH + 2 * Math.abs(dy);
    camera.aspect = fullW / fullH;
    camera.setViewOffset(fullW, fullH, dx >= 0 ? 0 : 2 * Math.abs(dx), dy >= 0 ? 0 : 2 * Math.abs(dy), viewW, viewH);
    const dist = fullH / (2 * pxPerUnit * Math.tan(deg(camera.fov / 2)));
    camera.position.set(0, dist * Math.sin(EL), dist * Math.cos(EL));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  /** a rig-local point → stage px (written into tmpV.x / tmpV.y) */
  const toStage = (x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(rig.matrixWorld).project(camera);
    tmpV.set(((tmpV.x + 1) / 2) * viewW, ((1 - tmpV.y) / 2) * viewH, 0);
    return tmpV;
  };
  const HIT_PTS: [number, number, number][] = [
    [-R_OUT, 0, 0],
    [R_OUT, 0, 0],
    [0, 0, R_OUT],
    [0, -BASE_T, R_BASE],
    [0, 0, -R_OUT],
  ];

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels: () => [],
    // the stack labels its own layers in 3D, and its nodes spin: the page's labels step aside
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      // the ellipse inscribed in the stack's projected bounds (plinth to top layer)
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      const add = (px: number, py: number, pz: number) => {
        const p = toStage(px, py, pz);
        x0 = Math.min(x0, p.x);
        x1 = Math.max(x1, p.x);
        y0 = Math.min(y0, p.y);
        y1 = Math.max(y1, p.y);
      };
      for (const p of HIT_PTS) add(p[0], p[1], p[2]);
      add(0, top.layer.position.y + LENS_Z + LENS_D / 2, -1);
      const a = (x1 - x0) / 2;
      const b = (y1 - y0) / 2;
      if (a < 1 || b < 1) return false;
      const u = (x - (x0 + x1) / 2) / a;
      const v = (y - (y0 + y1) / 2) / b;
      return u * u + v * v <= 1;
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      tabs.dispose();
      tabRims.dispose();
      prints.dispose();
      ticks.dispose();
      labelParts.forEach((L) => L.tex.dispose());
      floorTex.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
