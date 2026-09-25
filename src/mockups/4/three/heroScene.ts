/* Hero scene for mockup D: "a company floor, scanned and secured".
 *
 * A product-photography tabletop, not an illustration: a white (or black) floor
 * plan printed with zone brackets and a fine dot grid, and on it real materials
 * lit by a studio: chrome capsules (people), frosted glass tiles (apps), clear
 * glass blocks with a chrome core (agents). Everything is grey or clear; the
 * only colour in the scene is the hidden instruction once it is found.
 *
 * Storyboard (time-based, LOOP_MS = 11 s, so it plays identically at 10 fps or 120):
 *   0.0–1.2 s  calm floor. An invoice (glass sheet, drawn large) glides in along
 *              the corridor towards agent:finance.
 *   1.2–4.2 s  a scan line sweeps the floor. Behind it the plan updates: two AI
 *              tools nobody registered print into view (wireframe → gunmetal)
 *              and the invoice's hidden line turns signal-violet (~2.7 s).
 *   4.3–5.4 s  smoked-glass enclosures settle over the unregistered tools.
 *   5.8–7.2 s  the hidden instruction lifts out of the invoice and dissolves.
 *   6.8–8.3 s  the clean invoice glides on into agent:finance; the agent's core
 *              turns once — it carries on.
 *   (DOM)      the audit-trail row types in at LOG_T.in and seals at LOG_T.seal.
 *  10.3–11 s   the map resets calmly for the next loop.
 *
 * Contact shadows are analytic (computed in the floor shader), so they stay
 * visible through the glass — the detail that makes the glass read as glass.
 */
import { THREE, RoundedBoxGeometry, createRenderer, type Theme } from "./core";

export const LOOP_MS = 11000;
/** A frame where everything has happened and nothing is moving (reduced motion). */
export const SETTLED_MS = 9700;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 7400, seal: 8600, out: 10400 };

export type HeroMode = "wide" | "narrow";
export type HeroOptions = { theme: Theme; bg: string; ink: string };
export type HeroScene = {
  resize(width: number, height: number, mode: HeroMode): void;
  render(timeMs: number): void;
  dispose(): void;
};

/* ------------------------------------------------------------------ */
/* timing                                                              */
/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inCubic = (x: number) => x * x * x;
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// 11 s loop: every beat is held long enough to be read (the found instruction
// stays violet ~3 s before it is lifted out).
const SCAN = { t0: 1200, t1: 4200, x0: -6.4, x1: 6.4 };
const DOC_IN: [number, number] = [0, 3000];
const DOC_GO: [number, number] = [6800, 7900];
const DOC_ABSORB: [number, number] = [7600, 8300];
const ENCLOSE: [number, number][] = [
  [4300, 5150],
  [4550, 5400],
];
const LIFT: [number, number] = [5800, 6500];
const DISSOLVE: [number, number] = [6300, 7200];
const CORE_TURN: [number, number] = [7900, 9500];
const RESET: [number, number] = [10300, 11000];

/* ------------------------------------------------------------------ */
/* floor plan (world units; the floor is y = 0)                        */
/* ------------------------------------------------------------------ */
const PLAN = { x0: -8, z0: -6, w: 16, d: 12, px: 128 };
const ZONES = [
  { name: "FINANCE", x0: -4.55, x1: -0.55, z0: -2.95, z1: -0.2 },
  { name: "SALES", x0: 0.15, x1: 4.55, z0: -2.95, z1: -0.2 },
  // labelled mid-edge (labelX): the left end sits under the headline, where only a
  // stray "…ATIONS" survived the canvas fade, and the right end leaves the frame
  { name: "OPERATIONS", x0: -4.55, x1: 4.55, z0: 1.05, z1: 3.4, labelX: 0.9 },
];
const AGENTS = [
  { name: "agent:finance", x: -1.75, z: -1.4 },
  { name: "agent:support", x: 2.8, z: 2.2 },
];
// fewer, larger things: a calm floor reads as a scene, not a diorama
const TILES = [
  { x: -3.45, z: -1.95 },
  { x: 1.2, z: -1.95 },
];
const PEOPLE: [number, number][] = [
  [-3.0, -0.75],
  [3.35, -2.25],
  [0.95, 2.75],
];
const SHADOW_AI = [
  { label: "chatgpt.com", x: -0.4, z: 2.6 },
  { label: "crm-assistant", x: 2.3, z: -1.0 },
];
/** The invoice is the protagonist: drawn larger than life. */
const DOC_SCALE = 1.65;
const CORRIDOR_Z = 0.42;
const DOC_START = new THREE.Vector3(8.4, 0.62, CORRIDOR_Z);
const DOC_HOVER = new THREE.Vector3(0.55, 0.62, CORRIDOR_Z);
const DOC_CTRL = new THREE.Vector3(-0.9, 1.9, -0.25);
const DOC_ABOVE = new THREE.Vector3(AGENTS[0].x, 1.4, AGENTS[0].z);
const DOC_END = new THREE.Vector3(AGENTS[0].x, 0.5, AGENTS[0].z);

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
        // every grazing glass face mirror white (milky acrylic). The floor is an
        // unlit shader, so the page itself stays white.
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
    panel(18, 6, 0, 78, 2.6); // overhead key
    panel(2.2, 16, 52, 4, 4.2); // strip, camera side: bright rims facing us
    panel(1.4, 16, -78, 4, 2.6); // left strip
    panel(1.2, 16, 168, 4, 3.4); // back rim strip
    panel(12, 3.2, 215, 12, 0.22); // soft grey card behind: metallic greys, not pure black
    panel(24, 9, 180, 34, 0.3); // broad grey card overhead-behind: glass faces carry a sheen, not black
    panel(10, 3, 20, -30, 0.12); // low fill for chrome sides
  } else {
    panel(18, 2, 0, 78, 2.2); // overhead: a strip, not a broad cap (that flashes faces white)
    panel(3.2, 16, -74, 0, 0.0); // black flag, left
    panel(2.2, 16, 122, 0, 0.0); // black flag, right-back
    panel(9, 1.3, 205, -6, 0.0); // black horizon strip, far side: dark glass edges
    panel(6, 1.1, 40, -26, 0.05); // dark band low on the camera side: chrome banding
    panel(2.2, 14, 58, 6, 2.6); // bright strip, camera right
    panel(1.6, 14, -40, 8, 2.6); // bright strip, left-back: a second rim
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
const NC = 18;

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

    // fine dot grid (fades before it can alias)
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

    // hairline grid every 0.5 units: straight lines for the glass to bend
    vec2 gq = abs(fract(p / 0.5 + 0.5) - 0.5) * 0.5;
    vec2 gw = fwidth(p) * 0.9;
    float grid = max(1.0 - smoothstep(gw.x * 0.5, gw.x * 1.5, gq.x), 1.0 - smoothstep(gw.y * 0.5, gw.y * 1.5, gq.y));
    grid *= 1.0 - smoothstep(0.02, 0.05, fw);

    // dark only: a soft pool of light on the floor under the scene, so clear
    // glass has something brighter than black to refract (reads as glass,
    // not black plastic)
    float pool = (1.0 - smoothstep(0.0, uPool.z, length(p - uPool.xy))) * uPool.w;
    vec3 bg = mix(uBg, vec3(1.0), pool);

    vec3 col = mix(bg, uShade, clamp(sh, 0.0, uShadeMax));
    float ink = clamp(base * uInkAmt + hid * behind * uInkAmt * 1.5 + dots * uDotAmt + grid * uGridAmt, 0.0, 1.0);
    col = mix(col, uInk, ink);

    // the scan: one crisp hairline (a glass blade rides on it) and, in dark only,
    // a faint wash trailing behind it
    float sd = p.x - uScanX;
    float lw = fwidth(sd);
    float line = 1.0 - smoothstep(lw * 0.5, lw * 2.0, abs(sd));
    float wash = sd < 0.0 ? exp(sd * 2.0) : 0.0;
    col = mix(col, uInk, (line * uScanLine + wash * uScanWash) * uScan);

    // the plan dissolves into the sheet: no visible edge anywhere
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

  /* base plan: what the company already knows about */
  const base = mk();
  {
    const g = base.g;
    // registration crosses on a 1-unit lattice
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
    // zones: corner brackets only, plus a mono name
    g.globalAlpha = 1;
    g.lineWidth = 3;
    const L = 0.34 * PLAN.px;
    for (const zn of ZONES) {
      const x0 = X(zn.x0);
      const x1 = X(zn.x1);
      const z0 = Z(zn.z0);
      const z1 = Z(zn.z1);
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
      mono(g, 22);
      const lx = zn.labelX !== undefined ? X(zn.labelX) : x0 + 0.16 * PLAN.px;
      g.fillText(zn.name, lx, z0 + 0.14 * PLAN.px);
    }
    // agent names, printed in front of each block
    mono(g, 18, 400);
    for (const a of AGENTS) g.fillText(a.name, X(a.x - 0.5), Z(a.z + 0.66));
    // the corridor the invoice travels along: a fine dashed guide
    g.globalAlpha = 0.7;
    g.lineWidth = 2;
    g.setLineDash([10, 12]);
    g.beginPath();
    g.moveTo(X(-0.35), Z(CORRIDOR_Z));
    g.lineTo(X(7.5), Z(CORRIDOR_Z));
    g.stroke();
    g.setLineDash([]);
  }

  /* hidden plan: what the scan finds */
  const hidden = mk();
  {
    const g = hidden.g;
    g.lineWidth = 3;
    for (const s of SHADOW_AI) {
      const half = 0.72 * PLAN.px;
      g.setLineDash([14, 10]);
      g.strokeRect(X(s.x) - half, Z(s.z) - half, half * 2, half * 2);
      g.setLineDash([]);
      mono(g, 17, 500);
      g.fillText("UNREGISTERED", X(s.x) - half, Z(s.z) + half + 0.1 * PLAN.px);
      mono(g, 17, 400);
      g.fillText(s.label, X(s.x) - half, Z(s.z) + half + 0.3 * PLAN.px);
    }
  }
  return { base: dataTexture(base.c), hidden: dataTexture(hidden.c) };
}

/* ------------------------------------------------------------------ */
/* the invoice: text lines as an opaque cut-out (so the glass refracts  */
/* them) and the hidden line as separate dashes that can leave.         */
/* ------------------------------------------------------------------ */
const DOC_W = 0.9;
const DOC_D = 1.18;
const HIDDEN_ROW_Z = 0.07;
const DASHES = [0.11, 0.07, 0.13, 0.05, 0.1, 0.08];

function docTextTexture() {
  const W = 256;
  const H = 336; // plane is 0.76 × 1.0 units
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#fff";
  const row = (z: number, x0: number, len: number, h = 7) => {
    const py = (z + 0.5) * H;
    const px = ((x0 + 0.38) / 0.76) * W;
    g.fillRect(px, py - h / 2, (len / 0.76) * W, h);
  };
  row(-0.4, -0.3, 0.22, 14); // header
  row(-0.4, 0.18, 0.12, 14);
  row(-0.22, -0.3, 0.58);
  row(-0.12, -0.3, 0.5);
  row(-0.02, -0.3, 0.55);
  // HIDDEN_ROW_Z (0.07) is left empty: the dashes live there
  row(0.17, -0.3, 0.44);
  row(0.27, -0.3, 0.56);
  row(0.4, 0.06, 0.24, 10); // total
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
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
  scene.environmentRotation.set(0, 0, 0);

  // one soft key for a crisp specular glint on glass and chrome
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 0.8);
  key.position.set(-3, 8, 4);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 200);
  const target = new THREE.Vector3(0.35, 0.25, 0.25);
  const cam = { az: 0.66, el: 0.56, dist: 21 };

  /* ---------- materials ---------- */
  // clear glass: no roughness, near-neutral, barely absorbing — the edges do the work
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
  // thin optical thickness: the chrome core inside stays a hex instead of
  // refracting into a different squiggle every frame
  const matAgent = glass({ thickness: 0.12 });
  // app tiles: clear glass too (frosted read as soap)
  const matFrost = glass({ thickness: 0.3 });
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#e6e8ec" : "#f3f4f6"),
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1,
  });
  const clipPlanes = SHADOW_AI.map(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));
  const matGun = SHADOW_AI.map(
    (_, i) =>
      new THREE.MeshPhysicalMaterial({
        // satin grey, neutral; lighter on white, where a mid-grey metal mirroring the
        // grey studio prints as a near-black lump
        color: new THREE.Color(dark ? "#85878C" : "#C9CBD1"),
        metalness: 1,
        roughness: 0.24,
        clearcoat: 0.5,
        clearcoatRoughness: 0.15,
        clippingPlanes: [clipPlanes[i]],
        side: THREE.DoubleSide,
      }),
  );
  const matEnclose = ENCLOSE.map(() =>
    glass({
      // smoked-clear, neutral grey (no blue cast): you can still see the metal inside
      thickness: 1.2,
      // light smoke: the contained metal should read as grey behind glass, not as
      // a dark mass sitting on a white page
      attenuationColor: new THREE.Color(dark ? "#8A8A8E" : "#B2B4B8"),
      attenuationDistance: dark ? 3.2 : 5,
      transparent: true,
      opacity: 0,
    }),
  );
  const matDoc = glass({ thickness: 0.06, roughness: 0.02, transparent: true });
  const textGrey = new THREE.Color(dark ? "#7d808a" : "#a7aab1");
  const matDocText = new THREE.MeshBasicMaterial({
    color: textGrey,
    alphaMap: docTextTexture(),
    alphaTest: 0.5,
    toneMapped: false,
  });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");
  const matDash = new THREE.MeshStandardMaterial({
    color: textGrey.clone(),
    emissive: new THREE.Color(0x000000),
    roughness: 0.4,
    metalness: 0,
  });
  const matWire = SHADOW_AI.map(
    () => new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false }),
  );

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
    // dark: a quiet grid and a soft pool (brighter reads as a neon "Tron" floor)
    uGridAmt: { value: dark ? 0.04 : 0.1 },
    uPool: { value: new THREE.Vector4(0.4, 0.2, 7.5, dark ? 0.045 : 0) },
    uScanLine: { value: dark ? 0.6 : 0.32 },
    uScanWash: { value: dark ? 0.05 : 0.0 },
    uCA: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uCB: { value: Array.from({ length: NC }, () => new THREE.Vector4()) },
    uFade: { value: new THREE.Vector4(0.1, 0.35, 4.4, 8.2) },
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

  /* ---------- people: low machined chrome pucks (one instanced mesh) ---------- */
  const puckProfile: THREE.Vector2[] = [];
  {
    const R = 0.24;
    const H = 0.11;
    const b = 0.035; // rounded edge
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
  const people = new THREE.InstancedMesh(new THREE.LatheGeometry(puckProfile, 64), matChrome, PEOPLE.length);
  {
    const m = new THREE.Matrix4();
    PEOPLE.forEach(([x, z], i) => {
      m.makeTranslation(x, 0, z);
      people.setMatrixAt(i, m);
    });
    people.instanceMatrix.needsUpdate = true;
  }
  scene.add(people);

  /* ---------- apps: frosted tiles, a chrome glyph inside each ---------- */
  const tileGeo = new RoundedBoxGeometry(1.15, 0.16, 1.15, 5, 0.07);
  const glyphs: THREE.Mesh[] = [];
  TILES.forEach((t, i) => {
    const tile = new THREE.Mesh(tileGeo, matFrost);
    tile.position.set(t.x, 0.08, t.z);
    scene.add(tile);
    const glyphGeo =
      i === 0
        ? new THREE.TorusGeometry(0.2, 0.045, 24, 64)
        : i === 1
          ? new RoundedBoxGeometry(0.46, 0.08, 0.12, 3, 0.04)
          : new THREE.SphereGeometry(0.11, 32, 16);
    const glyph = new THREE.Mesh(glyphGeo, matChrome);
    glyph.position.set(t.x, 0.08, t.z);
    if (i === 0) glyph.rotation.x = -Math.PI / 2;
    if (i === 1) glyph.rotation.y = 0.0;
    scene.add(glyph);
    glyphs.push(glyph);
  });

  /* ---------- agents: clear glass blocks with a chrome core ---------- */
  const agentGeo = new RoundedBoxGeometry(1.0, 1.0, 1.0, 6, 0.16);
  // the agent's core: a small chrome hex (the brand marker, made real). A torus
  // refracted through thick glass read as "chrome worms"; a compact solid stays legible.
  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const ang = Math.PI / 6 + (i * Math.PI) / 3;
    const hx = Math.cos(ang) * 0.2;
    const hy = Math.sin(ang) * 0.2;
    if (i === 0) hexShape.moveTo(hx, hy);
    else hexShape.lineTo(hx, hy);
  }
  hexShape.closePath();
  const coreGeo = new THREE.ExtrudeGeometry(hexShape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 1,
  });
  coreGeo.center();
  coreGeo.computeVertexNormals();
  const cores: THREE.Group[] = [];
  AGENTS.forEach((a) => {
    const block = new THREE.Mesh(agentGeo, matAgent);
    block.position.set(a.x, 0.5, a.z);
    scene.add(block);
    const spin = new THREE.Group();
    spin.position.set(a.x, 0.5, a.z);
    const core = new THREE.Mesh(coreGeo, matChrome);
    core.rotation.x = -0.35;
    spin.add(core);
    scene.add(spin);
    cores.push(spin);
  });

  /* ---------- unregistered AI: wireframe → printed gunmetal ---------- */
  const shadowGeo = new RoundedBoxGeometry(0.6, 0.6, 0.6, 4, 0.08);
  const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.64, 0.64, 0.64));
  const shadowAi = SHADOW_AI.map((s, i) => {
    const body = new THREE.Mesh(shadowGeo, matGun[i]);
    body.position.set(s.x, 0.3, s.z);
    body.rotation.y = 0.18 * (i ? -1 : 1);
    const wire = new THREE.LineSegments(wireGeo, matWire[i]);
    wire.position.set(s.x, 0.32, s.z);
    wire.rotation.y = body.rotation.y;
    scene.add(body, wire);
    return { body, wire };
  });

  /* ---------- enclosures: smoked glass that settles over them ---------- */
  const encGeo = new RoundedBoxGeometry(1.16, 1.0, 1.16, 6, 0.14);
  const enclosures = SHADOW_AI.map((s, i) => {
    const m = new THREE.Mesh(encGeo, matEnclose[i]);
    m.position.set(s.x, 4, s.z);
    m.rotation.y = 0.18 * (i ? -1 : 1);
    m.visible = false;
    scene.add(m);
    return m;
  });

  /* ---------- the invoice ---------- */
  const doc = new THREE.Group();
  const docSheet = new THREE.Mesh(new RoundedBoxGeometry(DOC_W, 0.045, DOC_D, 2, 0.02), matDoc);
  const docText = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 1.0), matDocText);
  docText.rotation.x = -Math.PI / 2;
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matDash, DASHES.length);
  doc.add(docSheet, docText, dashes);
  scene.add(doc);
  const dashX: number[] = [];
  {
    let x = -0.3;
    for (const w of DASHES) {
      dashX.push(x + w / 2);
      x += w + 0.028;
    }
  }
  const dashDrift = DASHES.map((_, i) => ({
    dx: (i - DASHES.length / 2) * 0.05,
    dz: ((i * 37) % 7) * 0.012 - 0.036,
    rot: ((i * 53) % 9) * 0.07 - 0.28,
  }));

  /* ---------- scan blade: a thin sheet of clear glass riding the scan line;
     it bends the floor grid as it passes (never a dark painted plane) ---------- */
  const matBlade = glass({ thickness: 0.06, transparent: true, opacity: 0 });
  const blade = new THREE.Mesh(new RoundedBoxGeometry(0.03, 1.1, 7.2, 2, 0.012), matBlade);
  blade.position.set(-99, 0.55, 0.25);
  scene.add(blade);

  /* ---------- per-frame ---------- */
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const tmpE = new THREE.Euler();
  const tmpS = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const docPos = new THREE.Vector3();
  const bez = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, k: number, out: THREE.Vector3) => {
    const u = 1 - k;
    return out.set(
      u * u * a.x + 2 * u * k * b.x + k * k * c.x,
      u * u * a.y + 2 * u * k * b.y + k * k * c.y,
      u * u * a.z + 2 * u * k * b.z + k * k * c.z,
    );
  };

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

    /* scan */
    const sp = seg(t, SCAN.t0, SCAN.t1);
    const scanX = lerp(SCAN.x0, SCAN.x1, inOutCubic(sp));
    const scanVis = smooth(seg(t, SCAN.t0, SCAN.t0 + 300)) * (1 - smooth(seg(t, SCAN.t1 - 350, SCAN.t1)));
    floorU.uScanX.value = scanX;
    floorU.uScan.value = scanVis;
    floorU.uHidX.value = t < SCAN.t0 ? -99 : t > SCAN.t1 ? 99 : scanX;
    floorU.uHidAmt.value = 1 - smooth(reset);
    blade.position.x = scanX;
    matBlade.opacity = scanVis;
    blade.visible = scanVis > 0.001;

    /* reset casters, then add static ones */
    nCaster = 0;
    for (const [x, z] of PEOPLE) caster(x, z, 0.24, 0.24, 0.24, 0.16, dark ? 0.7 : 0.24);
    for (const tl of TILES) caster(tl.x, tl.z, 0.575, 0.575, 0.1, 0.16, dark ? 0.55 : 0.16);
    for (const a of AGENTS) caster(a.x, a.z, 0.5, 0.5, 0.16, 0.3, dark ? 0.55 : 0.14);

    /* unregistered AI */
    SHADOW_AI.forEach((s, i) => {
      const passed = scanX - s.x;
      let printed = t < SCAN.t0 ? 0 : t > SCAN.t1 ? 1 : clamp01((passed - 0.05) / 0.9);
      printed *= 1 - smooth(seg(t, RESET[0], RESET[0] + 450));
      const wireIn = t >= SCAN.t0 && t <= SCAN.t1 ? smooth(clamp01((passed + 0.5) / 0.5)) * (1 - smooth(clamp01((passed - 1.1) / 1.2))) : 0;
      const wireOut = Math.sin(Math.PI * seg(t, RESET[0], RESET[0] + 600)) * 0.7;
      const { body, wire } = shadowAi[i];
      clipPlanes[i].constant = printed * 0.62 + 0.0001;
      body.visible = printed > 0.001;
      matWire[i].opacity = Math.max(wireIn, wireOut) * (dark ? 0.7 : 0.55);
      wire.visible = matWire[i].opacity > 0.001;
      if (printed > 0) caster(s.x, s.z, 0.3, 0.3, 0.08, 0.2, (dark ? 0.7 : 0.32) * smooth(printed));

      /* enclosure */
      const [e0, e1] = ENCLOSE[i];
      const down = outCubic(seg(t, e0, e1));
      const up = inCubic(seg(t, RESET[0] + 100, RESET[1]));
      const enc = enclosures[i];
      const settle = t > e1 ? Math.sin(Math.min(1, (t - e1) / 220) * Math.PI) * 0.025 * (1 - seg(t, e1, e1 + 220)) : 0;
      enc.position.y = lerp(4.2, 0.5, down) + settle + up * 3.2;
      const op = smooth(seg(t, e0, e0 + 320)) * (1 - smooth(seg(t, RESET[0] + 100, RESET[1] - 100)));
      matEnclose[i].opacity = op;
      enc.visible = op > 0.002;
      if (op > 0.01) caster(s.x, s.z, 0.58, 0.58, 0.14, 0.28, (dark ? 0.45 : 0.12) * down * (1 - up));
    });

    /* invoice path */
    if (t < DOC_IN[1]) {
      docPos.lerpVectors(DOC_START, DOC_HOVER, outCubic(seg(t, DOC_IN[0], DOC_IN[1])));
    } else if (t < DOC_GO[0]) {
      docPos.copy(DOC_HOVER);
    } else if (t < DOC_ABSORB[0]) {
      bez(DOC_HOVER, DOC_CTRL, DOC_ABOVE, inOutCubic(seg(t, DOC_GO[0], DOC_ABSORB[0])), docPos);
    } else {
      docPos.lerpVectors(DOC_ABOVE, DOC_END, inCubic(seg(t, DOC_ABSORB[0], DOC_ABSORB[1])));
    }
    const hoverAmt = seg(t, DOC_IN[1] - 800, DOC_IN[1]) * (1 - seg(t, DOC_GO[0], DOC_GO[0] + 300));
    docPos.y += Math.sin((t / 1000) * Math.PI * 1.1) * 0.035 * hoverAmt;
    doc.position.copy(docPos);
    const absorb = seg(t, DOC_ABSORB[0], DOC_ABSORB[1]);
    const docScale = lerp(1, 0.25, inCubic(absorb)) * DOC_SCALE;
    doc.scale.setScalar(docScale);
    doc.visible = absorb < 0.999;
    doc.rotation.set(-0.1 + hoverAmt * 0.04, 0.08, 0.05);
    matDoc.opacity = 1 - smooth(seg(absorb, 0.5, 1));
    if (doc.visible)
      caster(docPos.x, docPos.z, DOC_W / 2 * docScale, DOC_D / 2 * docScale, 0.03, 0.45 + docPos.y * 0.2, (dark ? 0.35 : 0.1) * (1 - absorb) * clamp01(1.4 - docPos.y * 0.4));

    /* hidden instruction: grey → found → lifted out → dissolved */
    const found = t < SCAN.t0 ? 0 : t > SCAN.t1 ? 1 : smooth(clamp01((scanX - docPos.x + 0.1) / 0.5));
    const lift = outCubic(seg(t, LIFT[0], LIFT[1]));
    const sig = found * (t < DISSOLVE[1] ? 1 : 0);
    matDash.color.copy(textGrey).lerp(signalCol, sig);
    matDash.emissive.copy(signalCol).multiplyScalar(sig * (dark ? 0.9 : 0.75));
    DASHES.forEach((w, i) => {
      const d = dashDrift[i];
      const k = seg(t, DISSOLVE[0] + i * 70, DISSOLVE[0] + 420 + i * 70);
      const s = t >= DISSOLVE[1] ? 0 : 1 - smooth(k);
      // lifted up and out towards the camera (+x, +z), away from agent:finance,
      // so the stripped instruction visibly leaves instead of flowing into it
      tmpP.set(
        dashX[i] + d.dx * lift + 0.32 * lift + 0.3 * k,
        lift * 0.42 + k * 0.16,
        HIDDEN_ROW_Z + d.dz * lift + 0.4 * lift + 0.28 * k,
      );
      tmpE.set(0, d.rot * lift, 0);
      tmpQ.setFromEuler(tmpE);
      tmpS.set(w * Math.max(s, 0.0001), 0.03 * Math.max(s, 0.0001), 0.05 * Math.max(s, 0.0001));
      tmpM.compose(tmpP, tmpQ, tmpS);
      dashes.setMatrixAt(i, tmpM);
    });
    dashes.instanceMatrix.needsUpdate = true;
    // after the lift the dashes are in world space above the sheet; keep them
    // un-scaled by the absorb (they are gone by then anyway)

    /* agents: the core holds still (a hex, legible) and turns once when the
       clean invoice lands — the agent carries on */
    cores.forEach((c, i) => {
      const extra = i === 0 ? inOutCubic(seg(t, CORE_TURN[0], CORE_TURN[1])) * (Math.PI / 3) * 2 : 0;
      c.rotation.y = 0.5 + extra;
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
      cam.dist = 16.5;
      // push the composition right so the headline sits in a clear area
      // (a lens shift, not a camera pan: perspective stays straight).
      // The scene centre lands at ~76% of the width, clear of the copy; closer
      // camera = larger objects that bleed off the top and right edges.
      const dx = Math.round(viewW * 0.26);
      const dy = Math.round(viewH * 0.03);
      camera.aspect = (viewW + 2 * dx) / (viewH + 2 * dy);
      camera.setViewOffset(viewW + 2 * dx, viewH + 2 * dy, 0, 2 * dy, viewW, viewH);
    } else {
      camera.fov = 24;
      const vHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const hHalf = vHalf * camera.aspect;
      cam.dist = Math.max(3.4 / vHalf, 5.6 / hHalf) * 1.0;
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
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      tex.base.dispose();
      tex.hidden.dispose();
      matDocText.alphaMap?.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
