/* Mockup 5's See / Secure / Govern section, direction s·a: "the MRI".
 * Driven by the section's step clock through netTime (See 300–3500, Secure
 * 3500–5000, Govern 5000–7600); LOOP_MS only matters for loops.
 *
 * A clean floor plan (1 px ink footprints of rooms and desks, each with its
 * occupant's or system's name) and one instrument: the Blindsight mark, a thin
 * chrome watch-bezel extrusion of the logo whose hub is a flat clear glass disc
 * in a chrome bezel. The hub is the scan window: whatever lies beneath it is
 * seen IN SECTION, as stacked strata of what runs inside (copilot (m365),
 * crm-assistant, chatgpt.com (personal), …).
 *
 *   300–1050    hero size, face-on; it scales up and tips flat above the plan.
 *   1050–3400   SEE. A back-and-forth raster, row by row (constant speed, eased
 *               turns). On a finding the raster pauses, a node comes over it and
 *               dips: flagged (its stratum darkens). One finding at a time.
 *   3500–5000   SECURE. At mid size, low over the plan, a node draws each fence.
 *   5000–7600   GOVERN. It settles at hero size; policy runs from agent:finance
 *               to both fences; the chips come back, logged.
 *   9700–10400  reset.
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
 *  (0 registered/flagged · 1 masked/blocked · 2 logged). Order: agent, then the two findings. */
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
const inOutSine = (x: number) => (1 - Math.cos(Math.PI * x)) / 2;
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
/** a window that eases in over f ms from a and out over f ms to b */
const win = (t: number, a: number, b: number, f = 90) => smooth(seg(t, a, a + f)) * (1 - smooth(seg(t, b - f, b)));

/* ---------- the mark (mark units: orbit radius 1, so D = 2) ---------- */
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const BAND = 0.18; // stroke ≈ 0.09·D
const ARM_W = 0.16;
const [HUB_R, NODE_R, BEZEL] = [0.5, 0.25, 0.05];
const DEPTH = 0.25 * BAND; // a watch bezel, never a slab
const BEV = 0.08 * BAND;
const SLAB = DEPTH - 2 * BEV; // ExtrudeGeometry's depth (its bevels add both faces)
const GLASS_R = HUB_R - BEZEL;
/** orbit radius in world units */
const SIZE = { hero: 0.42, big: 1.55, mid: 0.8 };
/** flat flight heights: scanning, the dip of a touch, drawing a fence */
const FLY = { big: 0.8, dip: 0.32, mid: 0.24 };
/** the camera makes room while the mark is large */
const ROOM = { dist: 0.2, lift: 0.1 };
/** where the mark starts and settles: hero size, face-on, above the middle of the plan */
const HERO_AT: [number, number, number] = [0.8, 1.5, 0.2];

/* ------------------------------------------------------------------ */
/* the plan (world units; the floor is y = 0)                          */
/* ------------------------------------------------------------------ */
const PLAN = { x0: -8, z0: -6, w: 16, d: 12, px: 128 };
/** type on the floor is drawn this much taller, so it reads upright from the camera */
const STRETCH = 1.8;
type Room = { name: string; x0: number; x1: number; z0: number; z1: number; strata: string[] };
const ROOMS: Room[] = [
  { name: "SERVER ROOM", x0: -3.95, x1: -0.85, z0: -3.0, z1: -0.35, strata: ["vlan 20 · servers", "backup · nightly", "erp connector"] },
  { name: "FINANCE", x0: -0.85, x1: 3.75, z0: -3.0, z1: -0.35, strata: ["corp wifi", "sso · okta", "m365 tenant"] },
  { name: "SALES", x0: -1.85, x1: 4.75, z0: -0.35, z1: 2.4, strata: ["corp wifi", "sso · okta", "m365 tenant"] },
];
/** footprints: name inside, three strata (top = what runs on it); flag: which finding's stratum 0 is */
type Spot = { name: string; x: number; z: number; w: number; d: number; strata: string[]; flag: number };
const [ROW_A, ROW_B] = [-1.8, 1.1];
const DESK = { w: 1.9, d: 0.9 };
const desk = (name: string, x: number, z: number, strata: string[], flag = -1): Spot => ({ name, x, z, ...DESK, strata, flag });
const SPOTS: Spot[] = [
  { name: "agent:finance", x: -3.0, z: ROW_A, w: 1.5, d: 0.9, strata: ["agent:finance", "invoice_0412.pdf", "erp connector"], flag: -1 },
  { name: "crm-db", x: -1.6, z: ROW_A, w: 1.2, d: 0.9, strata: ["crm records", "IBAN [masked]", "user_7f3a"], flag: -1 },
  desk("user_2c19", 0.4, ROW_A, ["copilot (m365)", "excel", "user_2c19"]),
  desk("user_7f3a", 2.55, ROW_A, ["crm-assistant", "outlook", "user_7f3a"], 0),
  desk("user_b804", -0.7, ROW_B, ["copilot (m365)", "teams", "user_b804"]),
  desk("m.keller", 1.45, ROW_B, ["chatgpt.com (personal)", "browser", "m.keller"], 1),
  desk("user_91de", 3.6, ROW_B, ["copilot (m365)", "crm web", "user_91de"]),
];
const AGENT = SPOTS[0];
const DB = SPOTS[1];
/** the two findings (crm-assistant, chatgpt.com (personal)), by spot */
const FIND = [SPOTS[3], SPOTS[5]];
/** the node that acts on each finding, and draws its fence (chosen to keep the mark in frame) */
const ACT_NODE = [0, 2];
const FENCE_M = 0.18; // the fence runs this far outside the footprint

/* ---------- the story (scene ms) ---------- */
const EXPAND: [number, number] = [330, 1050];
/** moves of the hub on the plan; between them it holds (a pause, or an act) */
const RASTER: { t0: number; t1: number; a: [number, number]; b: [number, number]; turn?: boolean }[] = [
  { t0: 1050, t1: 1750, a: [-3.0, ROW_A], b: [FIND[0].x, ROW_A] },
  { t0: 2130, t1: 2400, a: [FIND[0].x, ROW_A], b: [3.6, ROW_B], turn: true },
  { t0: 2400, t1: 2620, a: [3.6, ROW_B], b: [FIND[1].x, ROW_B] },
  { t0: 3000, t1: 3400, a: [FIND[1].x, ROW_B], b: [-0.7, ROW_B] },
];
/** per finding: the raster pauses and a node acts [start, end] */
const ACT: [number, number][] = [
  [1750, 2130],
  [2620, 3000],
];
const TO_FENCE: [number, number][] = [
  [3500, 3780],
  [4230, 4480],
];
const FENCE: [number, number][] = [
  [3780, 4230],
  [4480, 4930],
];
const SETTLE: [number, number] = [5000, 5700];
const POLICY: [number, number] = [5750, 6700];
const ALL_CHIPS = 6400; // Govern: every chip comes back
const RESET: [number, number] = [9700, 10400];

/* ------------------------------------------------------------------ */
/* studios                                                             */
/* ------------------------------------------------------------------ */
function pmremOf(renderer: THREE.WebGLRenderer, scene: THREE.Scene, blur: number) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, blur).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}
const panelIn = (scene: THREE.Scene, w: number, h: number, azDeg: number, elDeg: number, v: number, dist = 14) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide }));
  const [az, el] = [deg(azDeg), deg(elDeg)];
  m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
  m.lookAt(0, 0, 0);
  scene.add(m);
};
/** the room's soft grey studio (glass, floor furniture) */
function roomEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? 0x0b0b0c : 0x6a6b6e);
  panelIn(scene, 18, 3, 0, 78, dark ? 2.0 : 2.2);
  panelIn(scene, 2.2, 14, 58, 6, dark ? 2.6 : 2.6);
  panelIn(scene, 1.6, 14, -40, 8, dark ? 1.8 : 2.6);
  return pmremOf(renderer, scene, 0.02);
}
/** strip-and-flag: black room, a few hard white strips, so chrome reads as crisp
 *  black and white bands and never mid-grey (no broad front fill) */
function stripStudio(renderer: THREE.WebGLRenderer, camAz: number) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030304);
  const back = (camAz * 180) / Math.PI + 180; // what a flat top face reflects from this camera
  panelIn(scene, 30, 1.1, back, 34, 6); // the long strip across the tops
  panelIn(scene, 30, 0.5, back, 16, 3.5);
  panelIn(scene, 0.9, 20, back - 42, 10, 5); // side strips for the bevels
  panelIn(scene, 0.9, 20, back + 48, 10, 5);
  panelIn(scene, 0.7, 20, (camAz * 180) / Math.PI + 30, 8, 3); // face-on (hero) reflections
  panelIn(scene, 20, 0.8, (camAz * 180) / Math.PI, 62, 4);
  return pmremOf(renderer, scene, 0.004);
}

/* ------------------------------------------------------------------ */
/* floor: the plan, and the section seen through the hub               */
/* ------------------------------------------------------------------ */
const NC = 12;
const floorVert = /* glsl */ `
  varying vec3 vW;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;
const floorFrag = /* glsl */ `
  uniform vec3 uBg; uniform vec3 uInk; uniform vec3 uShade;
  uniform sampler2D uPlan; uniform sampler2D uSec;
  uniform vec4 uRect;
  uniform float uInkAmt; uniform float uDotAmt; uniform float uShadeMax; uniform float uSecAmt;
  uniform vec3 uCam; uniform vec3 uWinC; uniform vec3 uWinN; uniform float uWinR; uniform float uWinAmt;
  uniform vec2 uFlag;
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
    float plan = texture2D(uPlan, uv).r * inRect;
    vec3 sec = texture2D(uSec, uv).rgb * inRect;

    float fw = length(fwidth(p));
    vec2 g = (fract(p / 0.25 + 0.5) - 0.5) * 0.25;
    float dots = (1.0 - smoothstep(0.0095, 0.0095 + fw, length(g))) * (1.0 - smoothstep(0.014, 0.034, fw));

    // the scan window: is this floor point seen through the hub's glass disc?
    vec3 d = vW - uCam;
    float den = dot(d, uWinN);
    float tt = abs(den) > 1e-6 ? dot(uWinC - uCam, uWinN) / den : -1.0;
    float rr = length(uCam + d * tt - uWinC);
    float aa = fwidth(rr) + 1e-4;
    float inWin = step(0.0, tt) * step(tt, 1.0) * (1.0 - smoothstep(uWinR - aa, uWinR + aa, rr)) * uWinAmt;

    float sh = 0.0;
    for (int i = 0; i < NC; i++) {
      vec4 a = uCA[i]; vec4 b = uCB[i];
      if (b.z > 0.0) {
        float dd = sdRB(p - a.xy, a.zw, b.x);
        float core = 1.0 - smoothstep(-b.y * 0.45, b.y, dd);
        float tail = exp(-max(dd, 0.0) / (b.y * 2.2)) * 0.32;
        sh = max(sh, b.z * max(core, tail));
      }
    }

    vec3 col = mix(uBg, uShade, clamp(sh, 0.0, uShadeMax));
    float inkPlan = plan * uInkAmt + dots * uDotAmt;
    // in section: a faint field, the strata, and a flagged stratum darkened
    float inkSec = 0.035 + sec.r * uSecAmt + (sec.g * uFlag.x + sec.b * uFlag.y) * 0.3;
    col = mix(col, uInk, clamp(mix(inkPlan, inkSec, inWin), 0.0, 1.0));

    float r = length((p - uFade.xy) * vec2(0.82, 1.18));
    float f = 1.0 - smoothstep(uFade.z, uFade.w, r);
    gl_FragColor = vec4(mix(uBg, col, f), 1.0);
    #include <colorspace_fragment>
  }`;

async function fontsReady() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.race([
    Promise.all([document.fonts.load('500 22px "IBM Plex Mono"'), document.fonts.load('400 22px "IBM Plex Mono"')]).catch(() => undefined),
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

/** the plan (R: footprints and names) and the section (R: strata and their
 *  labels, G/B: the two findings' flagged strata) */
function planTextures() {
  const [W, H] = [PLAN.w * PLAN.px, PLAN.d * PLAN.px];
  const X = (x: number) => (x - PLAN.x0) * PLAN.px;
  const Z = (z: number) => (z - PLAN.z0) * PLAN.px;
  const mk = () => {
    const c = document.createElement("canvas");
    [c.width, c.height] = [W, H];
    const g = c.getContext("2d")!;
    g.fillStyle = "#000";
    g.fillRect(0, 0, W, H);
    return { c, g };
  };
  const say = (g: CanvasRenderingContext2D, s: string, x: number, z: number, px: number, align: CanvasTextAlign = "left") => {
    g.save();
    g.translate(X(x), Z(z));
    g.scale(1, STRETCH);
    g.font = `500 ${px}px "IBM Plex Mono", ui-monospace, monospace`;
    (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${Math.round(px * 0.06)}px`;
    g.textAlign = align;
    g.textBaseline = "middle";
    g.fillText(s, 0, 0);
    g.restore();
  };
  const rect = (g: CanvasRenderingContext2D, x0: number, z0: number, x1: number, z1: number) =>
    g.strokeRect(X(x0), Z(z0), X(x1) - X(x0), Z(z1) - Z(z0));

  /* the plan: rooms and footprints, each with its name */
  const plan = mk();
  {
    const g = plan.g;
    g.strokeStyle = g.fillStyle = "#fff";
    g.lineWidth = 2;
    for (const r of ROOMS) {
      rect(g, r.x0, r.z0, r.x1, r.z1);
      say(g, r.name, r.x0 + 0.14, r.z0 + 0.22, 15);
    }
    for (const s of SPOTS) {
      rect(g, s.x - s.w / 2, s.z - s.d / 2, s.x + s.w / 2, s.z + s.d / 2);
      say(g, s.name, s.x, s.z, 17, "center");
    }
  }

  /* the section: every footprint as stacked strata of what runs inside */
  const sec = mk();
  {
    const g = sec.g;
    for (const r of ROOMS) {
      const n = Math.floor((r.z1 - r.z0) / 0.34);
      for (let k = 0; k < n; k++) {
        const z = r.z0 + k * 0.34;
        g.strokeStyle = "rgb(80,0,0)";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(X(r.x0), Z(z));
        g.lineTo(X(r.x1), Z(z));
        g.stroke();
        g.fillStyle = "rgb(115,0,0)";
        for (let x = r.x0 + 0.12 + (k % 2) * 0.9; x < r.x1 - 1.2; x += 1.8) say(g, r.strata[k % r.strata.length], x, z + 0.17, 14);
      }
    }
    for (const s of SPOTS) {
      const [x0, z0] = [s.x - s.w / 2, s.z - s.d / 2];
      g.fillStyle = "#000";
      g.fillRect(X(x0), Z(z0), s.w * PLAN.px, s.d * PLAN.px);
      g.strokeStyle = "rgb(255,0,0)";
      g.lineWidth = 2;
      rect(g, x0, z0, x0 + s.w, z0 + s.d);
      const h = s.d / s.strata.length;
      s.strata.forEach((txt, k) => {
        if (k) {
          g.strokeStyle = "rgb(170,0,0)";
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(X(x0), Z(z0 + k * h));
          g.lineTo(X(x0 + s.w), Z(z0 + k * h));
          g.stroke();
        }
        g.fillStyle = "rgb(255,0,0)";
        say(g, txt, x0 + 0.09, z0 + (k + 0.5) * h, 17);
      });
    }
    g.globalCompositeOperation = "lighter";
    for (const s of SPOTS) {
      if (s.flag < 0) continue;
      g.fillStyle = s.flag === 0 ? "rgb(0,255,0)" : "rgb(0,0,255)";
      g.fillRect(X(s.x - s.w / 2), Z(s.z - s.d / 2), s.w * PLAN.px, (s.d / s.strata.length) * PLAN.px);
    }
    g.globalCompositeOperation = "source-over";
  }
  return { plan: dataTexture(plan.c), sec: dataTexture(sec.c) };
}

/* ------------------------------------------------------------------ */
/* the mark's geometry, from the logo's own outline                    */
/* ------------------------------------------------------------------ */
/** a watch-bezel slab centred on z = 0 (group 0: the faces, group 1: sides and bevels) */
const extrude = (shape: THREE.Shape, curveSegments: number, depth = SLAB, bev = BEV) => {
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
/** the OUTER silhouette only: each arc's outer edge with the outer quarter of
 *  its round ends, and the outer side of each node (open lines on the top face) */
function silhouette() {
  const z = DEPTH / 2 + 0.002;
  const hw = BAND / 2;
  const P = (x: number, y: number) => new THREE.Vector3(x, y, z);
  const lines: THREE.Vector3[][] = [];
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
  return lines;
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
  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = roomEnvironment(renderer, dark);
  scene.environment = env;

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const target = new THREE.Vector3(0.45, 0.4, -0.4);
  const cam = { az: 0.66, el: 0.58, dist: 21 };
  const studio = stripStudio(renderer, cam.az);

  /* ---------- floor ---------- */
  const tex = planTextures();
  const floorU = {
    uBg: { value: bg },
    uInk: { value: ink },
    uShade: { value: dark ? new THREE.Color(0, 0, 0) : ink.clone() },
    uPlan: { value: tex.plan },
    uSec: { value: tex.sec },
    uRect: { value: new THREE.Vector4(PLAN.x0, PLAN.z0, PLAN.w, PLAN.d) },
    uInkAmt: { value: dark ? 0.2 : 0.15 }, // footprints at ~15% ink
    uDotAmt: { value: dark ? 0.06 : 0.045 },
    uShadeMax: { value: dark ? 0.7 : 0.35 },
    uSecAmt: { value: dark ? 0.72 : 0.78 },
    uCam: { value: new THREE.Vector3() },
    uWinC: { value: new THREE.Vector3() },
    uWinN: { value: new THREE.Vector3(0, 1, 0) },
    uWinR: { value: 0 },
    uWinAmt: { value: 0 },
    uFlag: { value: new THREE.Vector2() },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uFade: { value: new THREE.Vector4(0.4, -0.3, 5.0, 8.6) },
  };
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 40),
    new THREE.ShaderMaterial({ uniforms: floorU, vertexShader: floorVert, fragmentShader: `#define NC ${NC}\n` + floorFrag, toneMapped: false }),
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

  /* ---------- the mark: one rigid group; chrome everywhere but the hub, which is
     a flat clear glass disc in a thin chrome bezel; one outer silhouette ---------- */
  const chromeCol = new THREE.Color(dark ? "#e9ebef" : "#f4f5f7");
  const chrome = [0.08, 0.14].map((roughness) => new THREE.MeshStandardMaterial({ color: chromeCol, metalness: 1, roughness, envMap: studio }));
  const matGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.02,
    transmission: 1,
    ior: 1.5,
    thickness: 0.05,
    specularIntensity: 0.6,
    envMapIntensity: 0.35, // the window stays readable: no bright sheen across it
  });
  const matSil = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.7 : 0.85, depthWrite: false });
  const mark = new THREE.Group();
  mark.rotation.order = "YXZ";
  mark.visible = false;
  scene.add(mark);
  NODE_A.forEach((a, i) => {
    const [a0, a1] = [deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP)];
    mark.add(new THREE.Mesh(extrude(arcShape(a0, a1, BEV), 72), chrome));
    mark.add(new THREE.Mesh(extrude(barShape(a, BEV), 40), chrome));
    const node = new THREE.Mesh(extrude(disc(NODE_R - BEV), 64), chrome); // solid, flush with the ring
    node.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0);
    mark.add(node);
  });
  mark.add(new THREE.Mesh(extrude(disc(HUB_R - BEV, GLASS_R + BEV), 96), chrome)); // the bezel
  mark.add(new THREE.Mesh(extrude(disc(GLASS_R), 96, DEPTH * 0.5, 0.004), matGlass)); // the window
  for (const pts of silhouette()) mark.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matSil));
  /** each node's direction on the plan when the mark lies flat (yaw = the camera's azimuth) */
  const nodeDir = NODE_A.map((a) => new THREE.Vector2(Math.cos(deg(a) + cam.az), -Math.sin(deg(a) + cam.az)));

  /* ---------- fences: an ink square on the floor, drawn by a node; and the
     finding's tick, left by the touch ---------- */
  const matLine = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, transparent: dark, opacity: dark ? 0.7 : 1 });
  const segGeo = new THREE.BoxGeometry(1, 0.003, 0.018).translate(0.5, 0, 0);
  const inkSeg = (x: number, z: number, len: number, ang: number) => {
    const m = new THREE.Mesh(segGeo, matLine);
    m.position.set(x, 0.003, z);
    m.rotation.y = ang;
    m.visible = false;
    scene.add(m);
    return { m, len };
  };
  const fences = FIND.map((s) => {
    const [hx, hz] = [s.w / 2 + FENCE_M, s.d / 2 + FENCE_M];
    // clockwise from the front-left corner
    const c: [number, number][] = [
      [s.x - hx, s.z + hz],
      [s.x - hx, s.z - hz],
      [s.x + hx, s.z - hz],
      [s.x + hx, s.z + hz],
      [s.x - hx, s.z + hz],
    ];
    const segs = c.slice(0, 4).map(([x0, z0], k) => inkSeg(x0, z0, Math.hypot(c[k + 1][0] - x0, c[k + 1][1] - z0), Math.atan2(-(c[k + 1][1] - z0), c[k + 1][0] - x0)));
    const lens = segs.map((q) => q.len);
    const total = lens.reduce((p, q) => p + q, 0);
    /** the pen at fraction u of the square (by length: the node moves at constant speed) */
    const pen = (u: number, out: THREE.Vector3) => {
      let rest = clamp01(u) * total;
      for (let k = 0; k < 4; k++) {
        if (rest <= lens[k] || k === 3) {
          const f = clamp01(rest / lens[k]);
          return out.set(lerp(c[k][0], c[k + 1][0], f), 0, lerp(c[k][1], c[k + 1][1], f));
        }
        rest -= lens[k];
      }
      return out;
    };
    const drawn = (u: number, k: number) => clamp01((clamp01(u) * total - lens.slice(0, k).reduce((p, q) => p + q, 0)) / lens[k]);
    const tx = s.x + hx + 0.1;
    const tz = s.z + hz - 0.12;
    const tick = [inkSeg(tx, tz, 0.07, deg(-45)), inkSeg(tx + 0.0495, tz + 0.0495, 0.16, deg(55))];
    return { segs, pen, drawn, tick };
  });

  /* ---------- flows (ink): a hairline track and packets, only while data moves ---------- */
  const matPacket = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false });
  const packetGeo = new THREE.BoxGeometry(1, 1, 1);
  const makeFlow = (a: [number, number], b: [number, number], n: number) => {
    const A = new THREE.Vector3(a[0], 0.014, a[1]);
    const B = new THREE.Vector3(b[0], 0.014, b[1]);
    const ang = Math.atan2(-(B.z - A.z), B.x - A.x);
    const mesh = new THREE.InstancedMesh(packetGeo, matPacket, n);
    mesh.frustumCulled = false;
    const trackMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(A.distanceTo(B), 0.012), trackMat);
    track.position.copy(A).lerp(B, 0.5).setY(0.004);
    track.rotation.set(-Math.PI / 2, 0, ang);
    scene.add(mesh, track);
    return { mesh, track, trackMat, A, B, n, q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang) };
  };
  type Flow = ReturnType<typeof makeFlow>;
  // crm-assistant pulling records out of crm-db (behind the finance row)
  const flowCrm = makeFlow([DB.x - 0.3, ROW_A - 0.82], [FIND[0].x, ROW_A - 0.82], 6);
  // chatgpt.com (personal): data leaving the building, off the plan
  const flowGpt = makeFlow([FIND[1].x + FIND[1].w / 2 + 0.02, FIND[1].z - 0.44], [FIND[1].x + 4.2, FIND[1].z - 2.0], 7);
  // Govern: the policy travels from agent:finance to each fence, once
  const pulseA = makeFlow([AGENT.x + AGENT.w / 2, ROW_A + 0.6], [FIND[0].x - FIND[0].w / 2 - FENCE_M, ROW_A + 0.63], 4);
  const pulseB = makeFlow([AGENT.x + AGENT.w / 2, ROW_A + 0.7], [FIND[1].x - FIND[1].w / 2 - FENCE_M, FIND[1].z - FIND[1].d / 2 - FENCE_M], 4);
  const tmpM = new THREE.Matrix4();
  const tmpP = new THREE.Vector3();
  const tmpS = new THREE.Vector3();
  const place = (f: Flow, i: number, ph: number, s: number) => {
    tmpP.copy(f.A).lerp(f.B, ph);
    tmpS.set(0.1 * s, 0.012 * s, 0.03 * s);
    f.mesh.setMatrixAt(i, tmpM.compose(tmpP, f.q, tmpS));
  };
  /** continuous stream at constant speed while amt > 0 */
  const stream = (f: Flow, t: number, amt: number, period: number) => {
    for (let i = 0; i < f.n; i++) {
      const ph = (((t / period + i / f.n) % 1) + 1) % 1;
      place(f, i, ph, Math.max(amt * smooth(clamp01(ph / 0.14)) * smooth(clamp01((1 - ph) / 0.14)), 1e-4));
    }
    f.mesh.instanceMatrix.needsUpdate = true;
    f.mesh.visible = f.track.visible = amt > 0.001;
    f.trackMat.opacity = amt * (dark ? 0.35 : 0.28);
  };
  /** one-shot: each packet runs the track once, staggered */
  const shot = (f: Flow, t: number, t0: number, dur: number, amt: number) => {
    let any = false;
    for (let i = 0; i < f.n; i++) {
      const ph = seg(t, t0 + i * 120, t0 + i * 120 + dur);
      const on = ph > 0 && ph < 1;
      any = any || on;
      place(f, i, ph, Math.max(on ? amt * smooth(clamp01(ph / 0.1)) * smooth(clamp01((1 - ph) / 0.1)) : 0, 1e-4));
    }
    f.mesh.instanceMatrix.needsUpdate = true;
    f.mesh.visible = any;
    f.trackMat.opacity = win(t, t0 - 150, t0 + dur + f.n * 120 + 300, 300) * amt * (dark ? 0.3 : 0.22);
    f.track.visible = f.trackMat.opacity > 0.001;
  };

  /* ---------- the mark's path: derived from t alone, so time can jump ---------- */
  const HERO = new THREE.Vector3(...HERO_AT);
  const hubP = new THREE.Vector3();
  const [A, B] = [new THREE.Vector3(), new THREE.Vector3()];
  const ras = new THREE.Vector2();
  const st = { size: SIZE.hero, tip: 0 };
  function rasterAt(t: number) {
    ras.set(RASTER[0].a[0], RASTER[0].a[1]);
    for (const r of RASTER) {
      if (t < r.t0) break;
      const k = r.turn ? inOutCubic(seg(t, r.t0, r.t1)) : trap(seg(t, r.t0, r.t1), 0.16);
      ras.set(lerp(r.a[0], r.b[0], k), lerp(r.a[1], r.b[1], k));
    }
  }
  /** the hub that puts finding i's acting node over plan point (x, z) */
  const nodeOver = (i: number, x: number, z: number, size: number, y: number, out: THREE.Vector3) =>
    out.set(x - size * nodeDir[ACT_NODE[i]].x, y, z - size * nodeDir[ACT_NODE[i]].y);
  /** 0..1: out to the finding, the touch, back to where the raster paused */
  const actK = (t: number, i: number) => {
    const u = seg(t, ACT[i][0], ACT[i][1]);
    return inOutCubic(seg(u, 0, 0.4)) * (1 - inOutCubic(seg(u, 0.64, 1)));
  };
  /** the touch: the node dips to the plan and rises */
  const dipK = (t: number, i: number) => Math.sin(Math.PI * seg(t, lerp(ACT[i][0], ACT[i][1], 0.36), lerp(ACT[i][0], ACT[i][1], 0.66)));
  const touchAt = (i: number) => lerp(ACT[i][0], ACT[i][1], 0.5);
  const drawU = (t: number, i: number) => inOutSine(seg(t, FENCE[i][0], FENCE[i][1]));
  const fenceHub = (i: number, u: number, out: THREE.Vector3) => {
    fences[i].pen(u, out);
    return nodeOver(i, out.x, out.z, SIZE.mid, FLY.mid, out);
  };
  function markAt(t: number) {
    rasterAt(t);
    st.size = SIZE.big;
    st.tip = 1;
    if (t < EXPAND[1]) {
      // hero size, face-on → scaled up and tipped flat over the raster's first row
      const k = inOutCubic(seg(t, EXPAND[0], EXPAND[1]));
      hubP.lerpVectors(HERO, A.set(ras.x, FLY.big, ras.y), k);
      st.size = lerp(SIZE.hero, SIZE.big, k);
      st.tip = k;
    } else if (t < TO_FENCE[0][0]) {
      hubP.set(ras.x, FLY.big, ras.y);
      ACT.forEach((_, i) => {
        const k = actK(t, i);
        if (k > 0) hubP.lerp(nodeOver(i, FIND[i].x, FIND[i].z, SIZE.big, lerp(FLY.big, FLY.dip, dipK(t, i)), A), k);
      });
    } else if (t < SETTLE[0]) {
      st.size = SIZE.mid;
      if (t < FENCE[0][0]) {
        const k = inOutCubic(seg(t, TO_FENCE[0][0], TO_FENCE[0][1]));
        hubP.lerpVectors(A.set(ras.x, FLY.big, ras.y), fenceHub(0, 0, B), k);
        st.size = lerp(SIZE.big, SIZE.mid, k);
      } else if (t < TO_FENCE[1][0]) fenceHub(0, drawU(t, 0), hubP);
      else if (t < FENCE[1][0]) hubP.lerpVectors(fenceHub(0, 1, A), fenceHub(1, 0, B), inOutCubic(seg(t, TO_FENCE[1][0], TO_FENCE[1][1])));
      else fenceHub(1, drawU(t, 1), hubP);
    } else {
      // Govern: back to hero size, face-on, above the plan
      const k = inOutCubic(seg(t, SETTLE[0], SETTLE[1]));
      hubP.lerpVectors(fenceHub(1, 1, A), HERO, k);
      st.size = lerp(SIZE.mid, SIZE.hero, k);
      st.tip = 1 - k;
    }
  }

  /* ---------- per-frame ---------- */
  let [viewW, viewH] = [1, 1];
  let mode: HeroMode = "wide";
  const aim = new THREE.Vector3();
  function placeCamera(loopT: number, room: number) {
    const ph = (loopT / LOOP_MS) * TAU;
    const az = cam.az + Math.sin(ph) * 0.03;
    const el = cam.el + Math.sin(ph + 1.2) * 0.012;
    const dist = cam.dist * (1 + ROOM.dist * room);
    aim.copy(target).setY(target.y + ROOM.lift * room);
    camera.position.set(aim.x + Math.sin(az) * Math.cos(el) * dist, aim.y + Math.sin(el) * dist, aim.z + Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(aim);
  }

  /* chips: at most one at a time (the current act), all of them in Govern; never inside the ring */
  const anchors = [AGENT, FIND[0], FIND[1]].map((s) => new THREE.Vector3(s.x, 0, s.z - s.d / 2));
  const SIDE = [1, -1, 1]; // which side of the ring a chip steps to (toward the room it has)
  const SR = new THREE.Vector2(Math.cos(cam.az), -Math.sin(cam.az)); // screen-right, on the plan
  const labelPos = anchors.map((a) => a.clone());
  const labelState: HeroLabel[] = labelPos.map(() => ({ x: 0, y: 0, a: 0, state: 0 }));
  const proj = new THREE.Vector3();

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const alive = 1 - smooth(seg(t, RESET[0], RESET[1]));
    const appear = smooth(seg(t, 120, 300)) * (1 - inOutCubic(seg(t, RESET[0], RESET[0] + 450)));

    /* the mark, and the camera making room for it */
    markAt(t);
    mark.visible = appear > 0.001;
    mark.position.copy(hubP);
    mark.scale.setScalar(Math.max(st.size * appear, 1e-4));
    mark.rotation.set(-lerp(cam.el, Math.PI / 2, st.tip), cam.az, 0);
    placeCamera(t, clamp01((st.size - SIZE.hero) / (SIZE.big - SIZE.hero)));

    /* the scan window: the floor seen through the hub's glass is drawn in section */
    floorU.uCam.value.copy(camera.position);
    floorU.uWinC.value.copy(hubP);
    floorU.uWinN.value.set(0, 0, 1).applyQuaternion(mark.quaternion);
    floorU.uWinR.value = GLASS_R * st.size * appear;
    floorU.uWinAmt.value = appear;

    nCaster = 0;
    // the mark's soft shadow, and the acting node's when it is down at the plan
    const r = GLASS_R * st.size;
    caster(hubP.x + 0.12, hubP.z + 0.16, r, r, r, 0.25 + hubP.y * 0.5, (dark ? 0.2 : 0.05) * st.tip * appear);

    /* the findings: flagged by a node's touch (the stratum darkens, a tick is left),
       then fenced by a node */
    const flagged: number[] = [];
    const fenceK: number[] = [];
    FIND.forEach((s, i) => {
      const tt = touchAt(i);
      const fl = smooth(seg(t, tt - 60, tt + 120)) * alive;
      flagged.push(fl);
      const fx = fences[i];
      fx.tick.forEach((q, k) => {
        const kk = clamp01(seg(t, tt + 60, tt + 300) * 2 - k) * alive;
        q.m.scale.x = Math.max(q.len * kk, 1e-4);
        q.m.visible = kk > 0.001;
      });
      const u = drawU(t, i);
      fx.segs.forEach((q, k) => {
        const kk = fx.drawn(u, k) * alive;
        q.m.scale.x = Math.max(q.len * kk, 1e-4);
        q.m.visible = kk > 0.001;
      });
      fenceK.push(u);
      const down = Math.max(dipK(t, i), win(t, FENCE[i][0] - 60, FENCE[i][1] + 60, 120));
      if (down > 0.01) {
        const n = nodeDir[ACT_NODE[i]];
        const sz = st.size;
        caster(hubP.x + n.x * sz, hubP.z + n.y * sz, NODE_R * sz, NODE_R * sz, NODE_R * sz, 0.1, (dark ? 0.5 : 0.18) * down);
      }
    });
    floorU.uFlag.value.set(flagged[0], flagged[1]);

    /* flows: from the flag until the fence is drawn */
    stream(flowCrm, t, flagged[0] * (1 - smooth(clamp01((fenceK[0] - 0.6) / 0.4))) * alive, 1500);
    stream(flowGpt, t, flagged[1] * (1 - smooth(clamp01((fenceK[1] - 0.6) / 0.4))) * alive, 1700);
    /* govern: the policy travels from agent:finance to each fence */
    shot(pulseA, t, POLICY[0], 700, alive);
    shot(pulseB, t, POLICY[0] + 250, 800, alive);

    /* chips */
    const all = smooth(seg(t, ALL_CHIPS, ALL_CHIPS + 250));
    const show = [
      win(t, 1060, 1450) + all,
      win(t, touchAt(0), 2480) + win(t, FENCE[0][0], FENCE[0][1] + 150) + all,
      win(t, touchAt(1), 3480) + win(t, FENCE[1][0], 5000) + all,
    ];
    const reach = st.size * (1 + NODE_R) + 0.2;
    labelPos.forEach((p, i) => {
      const a = anchors[i];
      const dist = Math.hypot(a.x - hubP.x, a.z - hubP.z);
      const k = smooth(clamp01((reach + 0.7 - dist) / 0.5)) * smooth(clamp01((st.tip - 0.4) / 0.4));
      const off = SIDE[i] * (reach + 0.8);
      p.set(lerp(a.x, hubP.x + SR.x * off, k), lerp(a.y, hubP.y, k), lerp(a.z, hubP.z + SR.y * off, k));
      const L = labelState[i];
      const arrived = POLICY[0] + (i === 2 ? 250 : 0) + 900;
      L.a = Math.min(1, show[i]) * alive;
      L.state = t >= arrived ? 2 : i > 0 && fenceK[i - 1] > 0.97 ? 1 : 0;
    });

    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;
  }

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
      cam.dist = Math.max(2.9 / vHalf, 4.4 / (vHalf * camera.aspect));
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
      tex.plan.dispose();
      tex.sec.dispose();
      env.dispose();
      studio.dispose();
      renderer.dispose();
    },
  };
}
