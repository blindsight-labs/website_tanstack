/* The landing Hero's scene: "an office network, seen, secured and governed".
 *
 * A product-photography tabletop, not a network diagram: a floor plan printed
 * with zone brackets and a fine grid, and on it real objects in the site's
 * materials — a clear glass server rack (the registered agent's chrome hex core
 * sits inside it), a glass database, and five glass desks (monitor, laptop, a
 * chrome puck for the person). There are no permanent connection lines: a
 * hairline only appears while data actually moves.
 *
 * Storyboard (time-based, LOOP_MS = 10.4 s; beat times are in BEATS below):
 *   0.0–0.6 s   calm office.
 *   0.6–3.5 s   SEE IT. A scan sweeps the floor. Behind it the plan updates: the
 *               rack's agent is marked REGISTERED; on two desks an AI nobody
 *               registered prints into view: the same hex as the rack's, in violet. As each is
 *               found its data flow shows: crm-assistant pulling records out of
 *               the database (the one violet signal) and chatgpt.com sending
 *               data out of the building.
 *   3.5–5.0 s   SECURE IT. Around each flagged desk a hairline square draws
 *               itself on the floor (dashed = unknown → solid = secured), then
 *               low smoked-glass walls rise out of it. The flows stop.
 *   5.0–9.7 s   GOVERN IT. Policy pulses run from the rack to both fences, the
 *               agent's core turns once, and the audit row (DOM) seals.
 *   9.7–10.4 s  the office resets calmly.
 *
 * Materials and the invitation:
 *   · Dark desks read as solid smoked glass: in dark only, the desks, monitors, rack
 *     blades and database discs share a denser smoke (lower transmission, a grey body,
 *     deep short attenuation), the rack cabinet a lighter one (its core stays legible),
 *     and every desk, the cabinet and the discs get a thin ink rim on their edges. The
 *     dark fence walls are a plain transparent smoked pane, not transmissive glass (which
 *     hid the desk inside). Light mode keeps the lighter glass.
 *   · Violet is the unknown AI: the two unregistered hexes print in satin violet metal
 *     (not raw grey), their wireframe draws in violet, they stay violet while contained,
 *     and as the policy pulse reaches each one (GOVERN) they settle to the rack agent's
 *     chrome: crm-assistant 5750–6350 ms, chatgpt.com 6100–6700 ms. Unknown → registered.
 *   · INVITE: the window after the story resolves (7000–9000 ms) in which the Hero
 *     lights the CTA once (hero.css).
 */
import { THREE, RoundedBoxGeometry, createRenderer, yieldToMain, type Theme } from "./core";

export const LOOP_MS = 10400;
/** A frame where everything has happened and nothing is moving (reduced motion). */
export const SETTLED_MS = 7600;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 5100, seal: 6300, out: 9700 };
/** After GOVERN has sealed and both AIs have settled to chrome, before the reset: the
 *  page's CTA invites once (the Hero sets data-invite on its section inside this window). */
export const INVITE = { t0: 7000, t1: 9000 };
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

/** the sweep starts at the office's left edge (nothing enters from under the
 *  headline) and runs off the right, where the card crops it */
const SCAN = { t0: 600, t1: 3400, x0: -4.3, x1: 6.4 };
/** the blade: a glass slab across the plan's depth (z), thick enough to read as a slab at hero scale */
const BLADE = { z0: -3.9, z1: 3.3, t: 0.07 };
/** per flagged desk: [floor square starts, walls done] */
const FENCE: [number, number][] = [
  [3600, 4550],
  [3850, 4800],
];
const POLICY: [number, number] = [5050, 6000];
/** per flagged AI: from the policy's first packet reaching its fence (see shot() calls in
 *  update) until its violet has settled to the registered agent's chrome */
const SETTLE: [number, number][] = [
  [POLICY[0] + 700, POLICY[0] + 1300],
  [POLICY[0] + 250 + 800, POLICY[0] + 1650],
];
const CORE_TURN: [number, number] = [5200, 6600];
const RESET: [number, number] = [9700, 10400];

/* ------------------------------------------------------------------ */
/* floor plan (world units; the floor is y = 0)                        */
/* ------------------------------------------------------------------ */
const PLAN = { x0: -8, z0: -6, w: 16, d: 12, px: 128 };
const ZONES: { name: string; x0: number; x1: number; z0: number; z1: number }[] = [
  { name: "SERVER ROOM", x0: -3.75, x1: -0.7, z0: -3.2, z1: -0.45 },
  // back row = sales (crm-assistant's desk, beside crm-db); front row = finance (m.keller)
  { name: "SALES", x0: -0.3, x1: 3.0, z0: -3.2, z1: -0.45 },
  { name: "FINANCE", x0: -1.45, x1: 4.05, z0: 0.35, z1: 2.4 },
];
// the one registered agent (agent:finance is the new, unregistered one in the Sequence)
const RACK = { x: -2.55, z: -2.15, name: "rack-01", agent: "agent:support" };
const DB = { x: -1.2, z: -1.3, name: "crm-db" };
const DESKS = [
  { id: "ws-sal-02", x: 0.4, z: -2.45 },
  { id: "ws-sal-01", x: 1.95, z: -1.25 },
  { id: "ws-fin-02", x: -0.55, z: 1.5 },
  { id: "ws-fin-01", x: 1.4, z: 1.2 },
  { id: "ws-fin-03", x: 3.35, z: 0.95 },
];
/** the two AIs nobody registered, by desk index */
const FLAGGED = [
  { desk: 1, label: "crm-assistant" }, // a sales rep's, on ws-sal-01
  { desk: 3, label: "chatgpt.com" }, // m.keller's personal account, on ws-fin-01
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
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  await fontsReady();

  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.localClippingEnabled = true;
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;

  // The build yields to the main thread between its expensive steps (context, studio PMREM,
  // plan textures and their upload, geometry, shader compile), so the page stays responsive
  // while the hero builds; nothing it draws changes.
  await yieldToMain();

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;
  await yieldToMain();

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
  // thin optical thickness everywhere: what sits inside stays legible.
  // Dark: clear glass over a near-black floor shows only the floor, so the desks all but
  // vanish. A smoked glass instead: a light body with a little less transmission, a deep
  // grey attenuation (the grid still shows through), a slight frost and a clear coat that
  // carries a front-to-back sheen, so it reads as a solid object. The cabinet gets a
  // lighter smoke: the registered agent's core inside it stays legible. Light keeps the
  // clear glass.
  const smoke = (thickness: number, transmission: number, attenuationDistance: number) =>
    glass({
      thickness,
      transmission,
      color: new THREE.Color("#d4d6dc"),
      attenuationColor: new THREE.Color("#2b2d33"),
      attenuationDistance,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.4,
    });
  const matCabinet = dark ? smoke(0.12, 0.92, 1.6) : glass({ thickness: 0.12 });
  const matSheet = dark ? smoke(0.08, 0.86, 0.9) : glass({ thickness: 0.08 });
  const matDisc = dark ? smoke(0.12, 0.86, 1.1) : glass({ thickness: 0.12 });
  // dark only: a thin ink rim on the edges of the desks, the cabinet and the discs, so each
  // form is drawn against the black floor. Top edges (matRim) a step brighter than the
  // uprights (matRimPost).
  const rimMat = (opacity: number) =>
    new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, transparent: true, opacity, depthWrite: false });
  const matRim = dark ? rimMat(0.5) : null;
  const matRimPost = dark ? rimMat(0.36) : null;
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#e6e8ec" : "#f4f4f1"),
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
  // the AI nobody registered is violet: satin violet metal (not a glow) from the moment the
  // scan finds it and while it is contained; governed, it settles to the registered agent's
  // chrome (matCore, below; update() blends them)
  // (anodized satin: part metal, with a clear coat; in dark lighter and less metallic, or
  // it mirrors the black studio into a deep indigo blob)
  // (the design system's primary 400 / 300; less metal in light too, or the studio darkens it)
  const gunViolet = {
    color: new THREE.Color(dark ? "#a8aeff" : "#8889ff"),
    metalness: dark ? 0.25 : 0.5,
    roughness: dark ? 0.26 : 0.24,
    env: dark ? 1.6 : 1,
    clearcoat: dark ? 0.8 : 1,
    clearcoatRoughness: dark ? 0.12 : 0.1,
  };
  const matGun = FLAGGED.map(
    (_, i) =>
      new THREE.MeshPhysicalMaterial({
        color: gunViolet.color.clone(),
        metalness: gunViolet.metalness,
        roughness: gunViolet.roughness,
        envMapIntensity: gunViolet.env,
        clearcoat: gunViolet.clearcoat,
        clearcoatRoughness: gunViolet.clearcoatRoughness,
        clippingPlanes: [clipPlanes[i]],
        side: THREE.DoubleSide,
      }),
  );
  // dark: NOT transmissive. The transmission pass only sees opaque objects, so through a
  // transmissive wall the (now smoked-glass) desk vanished and each fence read as a
  // near-black box. A plain transparent smoked pane blends over the desk instead; its
  // peak opacity is WALL_MAX (update() scales the rise by it). Light: as live.
  const WALL_MAX = dark ? 0.2 : 1;
  const matWall = FLAGGED.map(() =>
    dark
      ? new THREE.MeshPhysicalMaterial({
          color: new THREE.Color("#9a9ca3"),
          metalness: 0,
          roughness: 0.05,
          envMapIntensity: 1.4,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      : glass({
          thickness: 0.3,
          attenuationColor: new THREE.Color("#B2B4B8"),
          attenuationDistance: 3,
          transparent: true,
          opacity: 0,
        }),
  );
  // monitors: graphite glass in light mode, so every desk has one dark anchor
  // on the white page (all-clear glass read as fog)
  const matScreen = dark ? matSheet : glass({ thickness: 0.2, attenuationColor: new THREE.Color("#3a3b40"), attenuationDistance: 0.14 });
  const textGrey = new THREE.Color(dark ? "#6f727b" : "#b4b7bd");
  const matScreenInk = new THREE.MeshBasicMaterial({ color: textGrey, toneMapped: false });
  const matScreenText = new THREE.MeshBasicMaterial({ color: new THREE.Color(dark ? "#6f727b" : "#c9ccd2"), toneMapped: false });
  const signalCol = new THREE.Color(dark ? "#8889FF" : "#6960EC"); // hero.css --signal
  const matSignal = new THREE.MeshBasicMaterial({ color: signalCol, toneMapped: false });
  const matPacket = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false });
  const matWire = FLAGGED.map(
    () => new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false }),
  );
  // fence lines: ink; softened on black, where full white reads as a glowing edge
  const matLine = new THREE.MeshBasicMaterial({ color: ink, toneMapped: false, transparent: dark, opacity: dark ? 0.6 : 1 });

  /* ---------- floor ---------- */
  const tex = planTextures();
  // upload (and mip) the two plan textures now, each in its own task, not inside the first frame
  await yieldToMain();
  renderer.initTexture(tex.base);
  await yieldToMain();
  renderer.initTexture(tex.hidden);
  await yieldToMain();
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
    uFade: { value: new THREE.Vector4(0.2, -0.2, 5.0, 6.8) }, // the floor fades just outside the office, so it never runs under the step rail
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
  /* dark-only rims: thin strips on a rounded box's edges, centred on the rounding's
     mid-arc (≈ 0.3 × radius in from each face). Light builds none. */
  const RIM = 0.009;
  const rimGeo = new THREE.BoxGeometry(1, RIM, RIM);
  /** a rectangle of rims at height y, half sizes hw × hd, centred on (x, z) */
  const rimRect = (parent: THREE.Object3D, x: number, y: number, z: number, hw: number, hd: number) => {
    if (!matRim) return;
    for (const s of [-1, 1]) {
      add(parent, rimGeo, matRim, x, y, z + s * hd).scale.x = hw * 2;
      const m = add(parent, rimGeo, matRim, x + s * hw, y, z);
      m.scale.x = hd * 2;
      m.rotation.y = Math.PI / 2;
    }
  };
  /** a vertical rim from y0 to y1 at (x, z) */
  const rimPost = (parent: THREE.Object3D, x: number, z: number, y0: number, y1: number) => {
    if (!matRimPost) return;
    const m = add(parent, rimGeo, matRimPost, x, (y0 + y1) / 2, z);
    m.scale.x = y1 - y0;
    m.rotation.z = Math.PI / 2;
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
    // dark: the top's upper edge and each leg's outer front edge (radii 0.02 / 0.012)
    rimRect(g, 0, TOP - 0.006, 0, DESK.w / 2 - 0.006, DESK.d / 2 - 0.006);
    for (const s of [-1, 1])
      rimPost(g, s * (DESK.w / 2 - 0.06 + 0.015 - 0.0036), (DESK.d - 0.08) / 2 - 0.0036, 0, DESK.top - 0.0225);
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
  // dark: the cabinet's top edge and its four uprights (radius 0.05)
  rimRect(rack, 0, 1.6 - 0.015, 0, 0.39 - 0.015, 0.33 - 0.015);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rimPost(rack, sx * (0.39 - 0.015), sz * (0.33 - 0.015), 0, 1.6);
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
  const coreGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.026,
    bevelSegments: 4,
    curveSegments: 1,
  });
  coreGeo.center();
  coreGeo.computeVertexNormals();
  const coreSpin = new THREE.Group();
  coreSpin.position.set(0, 0.8, 0.02);
  // dark: the flat hex faces mirror the studio's bright strip panels (values 2.6–4.2) head-on
  // and blow out to a white glow; a dimmer, slightly satin chrome keeps it metal, not a lamp
  const matCore = dark
    ? new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#b4b7bd"), metalness: 1, roughness: 0.2, envMapIntensity: 0.32 })
    : matChrome;
  const core = new THREE.Mesh(coreGeo, matCore);
  // governed, the found AI settles to the registered agent's chrome. Dark: brighter than the
  // core's own values (which sit behind the cabinet's glass); bare on the desk those read as a
  // black lump next to it, not the same chrome
  const govTarget = dark
    ? { color: new THREE.Color("#d2d5db"), metalness: 0.5, roughness: 0.26, env: 1.3, coat: 0.6 }
    : { color: matCore.color, metalness: matCore.metalness, roughness: matCore.roughness, env: matCore.envMapIntensity, coat: 0.05 };
  coreSpin.add(core);
  rack.add(coreSpin);
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
  // dark: a rim ring on each disc's top edge (R 0.42, bevel 0.035)
  const discRimGeo = matRim ? new THREE.TorusGeometry(0.42 - 0.0105, RIM / 2, 6, 96) : null;
  for (let i = 0; i < 3; i++) {
    add(db, discGeo, matDisc, 0, i * 0.19, 0);
    if (i < 2) add(db, spacerGeo, matChrome, 0, i * 0.19 + 0.17, 0);
    if (matRim && discRimGeo) add(db, discRimGeo, matRim, 0, i * 0.19 + 0.15 - 0.0105, 0).rotation.x = Math.PI / 2;
  }
  scene.add(db);

  /* ---------- the AIs nobody registered: the same hex as the rack's agent, in
     satin violet metal ("the same kind of thing, but nobody registered it"),
     standing on the desk and printing up out of it, wireframe first; governed,
     it turns the agent's chrome ---------- */
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

  /* ---------- fences: a hairline square that draws itself on the floor, then
     four thin smoked-glass walls that rise out of it ---------- */
  const segGeo = new THREE.BoxGeometry(1, 0.004, 0.02).translate(0.5, 0, 0);
  const panelX = new RoundedBoxGeometry(FENCE_H.x * 2, FENCE_H.h, 0.03, 2, 0.012);
  const panelZ = new RoundedBoxGeometry(0.03, FENCE_H.h, FENCE_H.z * 2, 2, 0.012);
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
    const walls = new THREE.Group();
    walls.position.set(d.x, 0, d.z);
    add(walls, panelX, matWall[i], 0, FENCE_H.h / 2, -hz);
    add(walls, panelX, matWall[i], 0, FENCE_H.h / 2, hz);
    add(walls, panelZ, matWall[i], -hx, FENCE_H.h / 2, 0);
    add(walls, panelZ, matWall[i], hx, FENCE_H.h / 2, 0);
    // an ink line along the top edge: the walls read as a boundary, not a pod
    const edgeX = new THREE.BoxGeometry(hx * 2, 0.006, 0.012);
    const edgeZ = new THREE.BoxGeometry(0.012, 0.006, hz * 2);
    add(walls, edgeX, matLine, 0, FENCE_H.h, -hz);
    add(walls, edgeX, matLine, 0, FENCE_H.h, hz);
    add(walls, edgeZ, matLine, -hx, FENCE_H.h, 0);
    add(walls, edgeZ, matLine, hx, FENCE_H.h, 0);
    walls.visible = false;
    scene.add(walls);
    return { segs, walls, d };
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
  // it leaves to the right, between ws-sal-01 and ws-fin-03, and off the plan
  // (it runs off the plan; the card crops it)
  const flowGpt = makeFlow([gptDesk.x + FENCE_H.x - 0.14, gptDesk.z - 0.65], [gptDesk.x + 4.1, gptDesk.z - 2.1], 7, matPacket);
  // governance: the policy travels from the rack to each fence, once
  const pulseA = makeFlow([RACK.x + 0.45, RACK.z + 0.1], [crmDesk.x - FENCE_H.x, crmDesk.z - 0.3], 4, matPacket);
  const pulseB = makeFlow([RACK.x + 0.3, RACK.z + 0.4], [gptDesk.x - FENCE_H.x, gptDesk.z - 0.2], 4, matPacket);

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
  /** one-shot: each packet runs the track once, staggered */
  const shot = (f: Flow, t: number, t0: number, dur: number, amt: number) => {
    let any = false;
    for (let i = 0; i < f.n; i++) {
      const ph = seg(t, t0 + i * 120, t0 + i * 120 + dur);
      const on = ph > 0 && ph < 1;
      any = any || on;
      const edge = smooth(clamp01(ph / 0.1)) * smooth(clamp01((1 - ph) / 0.1));
      const s = Math.max(on ? amt * edge : 0, 0.0001);
      tmpP.copy(f.A).lerp(f.B, inOutCubic(ph));
      tmpS.set(0.1 * s, 0.012 * s, 0.03 * s);
      tmpM.compose(tmpP, f.q, tmpS);
      f.mesh.setMatrixAt(i, tmpM);
    }
    f.mesh.instanceMatrix.needsUpdate = true;
    f.mesh.visible = any;
    const tr = seg(t, t0 - 150, t0 + 150) * (1 - seg(t, t0 + dur + f.n * 120 - 100, t0 + dur + f.n * 120 + 300));
    f.trackMat.opacity = tr * amt * (dark ? 0.3 : 0.22);
    f.track.visible = f.trackMat.opacity > 0.001;
  };

  /* ---------- scan blade: a thin sheet of clear glass riding the scan line ---------- */
  const matBlade = glass({ thickness: 0.06, transparent: true, opacity: 0 });
  const blade = new THREE.Mesh(new RoundedBoxGeometry(BLADE.t, 1.1, BLADE.z1 - BLADE.z0, 2, 0.02), matBlade);
  blade.position.set(-99, 0.55, (BLADE.z0 + BLADE.z1) / 2);
  scene.add(blade);

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

    /* scan */
    const sp = seg(t, SCAN.t0, SCAN.t1);
    const scanX = lerp(SCAN.x0, SCAN.x1, inOutCubic(sp));
    const scanVis = smooth(seg(t, SCAN.t0, SCAN.t0 + 300)) * (1 - smooth(seg(t, SCAN.t1 - 350, SCAN.t1)));
    floorU.uScanX.value = scanX;
    floorU.uScan.value = scanVis;
    floorU.uHidX.value = t < SCAN.t0 ? -99 : t > SCAN.t1 ? 99 : scanX;
    floorU.uHidAmt.value = alive;
    blade.position.x = scanX;
    matBlade.opacity = scanVis;
    blade.visible = scanVis > 0.001;

    /* static contact shadows */
    nCaster = 0;
    for (const d of DESKS) {
      caster(d.x, d.z, DESK.w / 2, DESK.d / 2, 0.03, 0.34, dark ? 0.4 : 0.1);
      caster(d.x + 0.12, d.z + DESK.d / 2 + 0.3, 0.2, 0.2, 0.2, 0.12, dark ? 0.65 : 0.22);
    }
    caster(RACK.x, RACK.z, 0.39, 0.33, 0.05, 0.3, dark ? 0.6 : 0.16);
    caster(DB.x, DB.z, 0.42, 0.42, 0.42, 0.22, dark ? 0.55 : 0.16);

    /* the unregistered AIs: found as the scan passes, printed up, fenced */
    const fenceK: number[] = [];
    FLAGGED.forEach((_, i) => {
      const a = ais[i];
      const passed = scanX - a.x;
      let printed = t < SCAN.t0 ? 0 : t > SCAN.t1 ? 1 : clamp01((passed - 0.05) / 0.7);
      printed *= alive;
      const wireIn = t >= SCAN.t0 && t <= SCAN.t1 ? smooth(clamp01((passed + 0.5) / 0.5)) * (1 - smooth(clamp01((passed - 1.1) / 1.2))) : 0;
      const wireOut = Math.sin(Math.PI * seg(t, RESET[0], RESET[0] + 600)) * 0.7;
      clipPlanes[i].constant = TOP + 0.03 + printed * aiH + 0.0001;
      a.body.visible = printed > 0.001;
      a.foot.visible = printed > 0.001;
      matWire[i].opacity = Math.max(wireIn, wireOut) * (dark ? 0.7 : 0.55);
      a.wire.visible = matWire[i].opacity > 0.001;

      /* unknown → registered: violet until the policy reaches it, then the agent's chrome
         (it stays chrome as it sinks away in the reset; the next loop finds it violet) */
      const gov = smooth(seg(t, SETTLE[i][0], SETTLE[i][1]));
      const mg = matGun[i];
      mg.color.copy(gunViolet.color).lerp(govTarget.color, gov);
      mg.metalness = lerp(gunViolet.metalness, govTarget.metalness, gov);
      mg.roughness = lerp(gunViolet.roughness, govTarget.roughness, gov);
      mg.envMapIntensity = lerp(gunViolet.env, govTarget.env, gov);
      // the coat thins out but never reaches 0 (crossing 0 would recompile the program mid-loop)
      mg.clearcoat = lerp(gunViolet.clearcoat, govTarget.coat, gov);
      matWire[i].color.copy(signalCol).lerp(ink, gov);

      /* fence: square draws (first 45%), walls rise (the rest) */
      const [f0, f1] = FENCE[i];
      const fx = fences[i];
      const draw = seg(t, f0, lerp(f0, f1, 0.45));
      const rise = outCubic(seg(t, lerp(f0, f1, 0.4), f1));
      fx.segs.forEach((s, k) => {
        const kk = clamp01(draw * 4 - k) * alive;
        s.m.scale.x = Math.max(s.len * kk, 0.0001);
        s.m.visible = kk > 0.001;
      });
      const sink = 1 - inOutCubic(seg(t, RESET[0], RESET[1] - 100));
      const wallK = rise * sink;
      fx.walls.scale.y = Math.max(wallK, 0.0001);
      fx.walls.visible = wallK > 0.002;
      matWall[i].opacity = smooth(clamp01(wallK * 3)) * alive * WALL_MAX;
      if (wallK > 0.01)
        caster(fx.d.x, fx.d.z, FENCE_H.x, FENCE_H.z, 0.03, 0.2, (dark ? 0.35 : 0.08) * wallK);
      fenceK.push(rise);
    });

    /* flows: from the moment the AI is found until its fence closes */
    const foundAt = (x: number) => (t < SCAN.t0 ? 0 : t > SCAN.t1 ? 1 : smooth(clamp01((scanX - x - 0.3) / 0.6)));
    const crmAmt = foundAt(ais[0].x) * (1 - smooth(clamp01(fenceK[0] * 1.6))) * alive;
    const gptAmt = foundAt(ais[1].x) * (1 - smooth(clamp01(fenceK[1] * 1.6))) * alive;
    stream(flowCrm, t, crmAmt, 1500);
    stream(flowGpt, t, gptAmt, 1700);

    /* govern: the policy travels from the rack to each fence; the core turns */
    shot(pulseA, t, POLICY[0], 700, alive);
    shot(pulseB, t, POLICY[0] + 250, 800, alive);
    const turn = inOutCubic(seg(t, CORE_TURN[0], CORE_TURN[1])) * ((Math.PI * 2) / 3);
    coreSpin.rotation.set(-0.12, cam.az + turn, 0);

    /* labels for the page: found → contained → governed */
    labelState[0].a = foundAt(RACK.x) * alive;
    labelState[0].state = 0;
    FLAGGED.forEach((_, i) => {
      const L = labelState[i + 1];
      const arrived = POLICY[0] + (i ? 250 : 0) + 900;
      L.a = foundAt(ais[i].x) * alive;
      L.state = t >= arrived ? 2 : fenceK[i] > 0.6 ? 1 : 0;
    });

    for (let i = nCaster; i < NC; i++) floorU.uCB.value[i].z = 0;
  }

  // chip anchors (a chip ≈ 150×44 px hangs ≈ 56 px above its anchor): the rack's above
  // its top; each shadow AI's just above its own workstation's monitor (top at TOP + 0.52,
  // set back mz = −DESK.d / 2 + 0.13), so the chip names the computer it runs on
  const monAnchor = (d: { x: number; z: number }) => new THREE.Vector3(d.x, TOP + 0.6, d.z - DESK.d / 2 + 0.13);
  const labelPos = [
    new THREE.Vector3(RACK.x - 0.1, 2.05, RACK.z), // above the rack, clear of its top
    monAnchor(DESKS[FLAGGED[0].desk]), // crm-assistant, ws-sal-01
    monAnchor(DESKS[FLAGGED[1].desk]), // chatgpt.com, m.keller's ws-fin-01
  ];
  /** the wide framing was tuned with chips on the open floor beside the flagged desks;
   *  it still reserves those spots, so the shot (and the posters) keep their scale */
  const FRAME_CHIPS = [...labelPos, new THREE.Vector3(3.1, 0, -0.5), new THREE.Vector3(1.9, 0, 3.37)];
  /** what the wide framing must hold whole: the rack, the database, the front row's
   *  left desk and the two flagged desks (the chips are added in resize). The rest
   *  (the far-right desk, the floor, the blade's sweep) may bleed off the card. */
  const FIT: [number, number, number][] = [
    [RACK.x - 0.39, 0, RACK.z - 0.33],
    [RACK.x + 0.39, 1.62, RACK.z + 0.33],
    [DB.x - 0.42, 0, DB.z],
    [DESKS[2].x - DESK.w / 2, 0, DESKS[2].z + DESK.d / 2],
    [DESKS[2].x + 0.12, 0, DESKS[2].z + DESK.d / 2 + 0.5],
    [DESKS[3].x + 0.12, 0, DESKS[3].z + DESK.d / 2 + 0.5],
    [DESKS[1].x + DESK.w / 2, 1.04, DESKS[1].z - DESK.d / 2],
  ];
  const labelState: HeroLabel[] = labelPos.map(() => ({ x: 0, y: 0, a: 0, state: 0 }));
  const proj = new THREE.Vector3();

  // compile every material's program before the first frame, off the main thread where the
  // browser supports KHR_parallel_shader_compile (the first render then only links what the
  // transmission pass adds)
  await yieldToMain();
  await renderer.compileAsync(scene, camera);

  function resize(width: number, height: number, m: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    mode = m;
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    if (mode === "wide") {
      // a deep product shot: the key objects (rack, database, the flagged desks)
      // and all three chips fill the right of the card, right of 55.5% of the
      // width, above the step rail's strip (bottom 140 px); the rest bleeds off
      // the right edge. A lens shift (not a pan) keeps the view angle.
      camera.fov = 22;
      const [x0, x1, y0, y1] = [viewW * 0.555, viewW - 16, 24, viewH - 140];
      const r = new THREE.Vector3(Math.cos(cam.az), 0, -Math.sin(cam.az));
      const up = new THREE.Vector3(-Math.sin(cam.el) * Math.sin(cam.az), Math.cos(cam.el), -Math.sin(cam.el) * Math.cos(cam.az));
      let [u0, u1, v0, v1] = [0, 0, 0, 0];
      let s = 60;
      // twice: the chips' boxes (≈ 140 × 44 px, 34–78 px above the anchor) depend on the scale
      for (let pass = 0; pass < 2; pass++) {
        [u0, u1, v0, v1] = [Infinity, -Infinity, Infinity, -Infinity];
        const take = (u: number, v: number) => ([u0, u1, v0, v1] = [Math.min(u0, u), Math.max(u1, u), Math.min(v0, v), Math.max(v1, v)]);
        for (const [x, y, z] of FIT) {
          proj.set(x, y, z).sub(target);
          take(proj.dot(r), proj.dot(up));
        }
        for (const a of FRAME_CHIPS) {
          proj.copy(a).sub(target);
          const [u, v] = [proj.dot(r), proj.dot(up)];
          take(u - 72 / s, v + 80 / s);
          take(u + 72 / s, v + 30 / s);
        }
        // px per unit at the target's depth, with room for perspective and the camera's drift
        s = Math.max(1, Math.min((x1 - x0) / (u1 - u0), (y1 - y0) / (v1 - v0))) / 1.06;
      }
      cam.dist = viewH / 2 / s / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      // 10% closer than a whole fit, held to the rail's edge and the left limit, so
      // it fills the band above the rack and bleeds off the right
      s = Math.min(s * 1.1, (y1 - y0) / (v1 - v0) / 1.02);
      const cx = x0 - u0 * s; // where the target must land on the card
      const cy = y1 + v0 * s;
      camera.aspect = viewW / viewH;
      camera.setViewOffset(viewW, viewH, viewW / 2 - cx, viewH / 2 - cy, viewW, viewH);
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
      env.dispose();
      renderer.dispose();
    },
  };
}
