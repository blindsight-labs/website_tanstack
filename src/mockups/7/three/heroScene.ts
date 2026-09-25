/* Hero scene for mockup 6: the Blindsight mark, made real.
 *
 * The hub-and-orbit mark (from src/assets/ICON_Blindsight.svg, orbit radius = 1):
 * a central node (r 0.5) with three arms to three outer nodes (r 0.25) that sit
 * on an orbit ring broken into three arcs (a ±20° gap at each node, so every node
 * sits on the ring rather than being threaded through it). Nodes at 0°, 128°, 232°.
 *
 * Materials, Octane-style: the orbit arcs are clear glass tubes, the hub is a
 * thick glass lens with a chrome core (the "sight"), the arms satin metal, the
 * outer nodes chrome. It floats in front of a faint hairline grid, so the glass
 * visibly bends straight lines; the studio slowly turns, so reflections travel.
 *
 * Story: the mark is a dial. Each beat of the caption rail (01 See it · 02 Secure
 * it · 03 Govern it) turns it so the next outer node comes round to the front
 * (3 o'clock), and that node carries the page's one violet signal. The DOM audit
 * row seals during "Govern it". It also sways gently and leans towards the cursor.
 */
import { THREE, RoundedBoxGeometry, createRenderer, type Theme } from "./core";

export const LOOP_MS = 10400;
/** A calm frame for reduced motion: the mark in its canonical orientation. */
export const SETTLED_MS = 2900;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 5600, seal: 6800, out: 9700 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 600, t1: 3700 },
  { n: "02", label: "Secure it", t0: 3700, t1: 5400 },
  { n: "03", label: "Govern it", t0: 5400, t1: 9700 },
] as const;

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
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const backOut = (x: number) => {
  const c = 1.2;
  const u = x - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const deg = (d: number) => (d * Math.PI) / 180;

/* the mark (orbit radius = 1) */
const HUB_R = 0.5;
const NODE_R = 0.25;
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const TUBE = 0.1; // orbit band ≈ 0.22 wide in the SVG
const ARM_W = 0.17;

/* the dial: each beat after the first turns the next node round to 3 o'clock */
const TURN_MS = 950;
const DIAL = [
  { at: BEATS[1].t0, to: 128 }, // node 2 (232°) comes round
  { at: BEATS[2].t0, to: 232 }, // node 1 (128°)
  { at: BEATS[2].t1, to: 360 }, // back to node 0: one full turn per loop, seamless
];
const ACTIVE_BY_BEAT = [0, 2, 1];

/* ------------------------------------------------------------------ */
/* studio environment (per theme) — the same studio as mockup 5          */
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: grey(v), side: THREE.DoubleSide }));
    const az = deg(azDeg);
    const el = deg(elDeg);
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

/** The wall behind the mark: a hairline grid and a dot field fading out from the
 *  centre (straight lines for the glass to bend), plus a soft cast shadow. */
function backdropTexture(bg: THREE.Color, ink: THREE.Color, dark: boolean) {
  const W = 2048;
  const H = 1366; // plane is 12 × 8 world units
  const px = W / 12;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = `#${bg.getHexString()}`;
  g.fillRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2;
  const R = 3.6 * px;
  const fade = (x: number, y: number) => {
    const r = Math.hypot(x - cx, (y - cy) * 1.15) / R;
    return 1 - smooth(clamp01((r - 0.25) / 0.75));
  };
  // soft shadow, down and to the right of the mark
  const sh = g.createRadialGradient(cx + 0.28 * px, cy + 0.4 * px, 0, cx + 0.28 * px, cy + 0.4 * px, 1.7 * px);
  const k = dark ? 0.55 : 0.07;
  sh.addColorStop(0, `rgba(0,0,0,${k})`);
  sh.addColorStop(0.5, `rgba(0,0,0,${k * 0.4})`);
  sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh;
  g.fillRect(0, 0, W, H);
  // hairline grid every 0.25 units, drawn in short segments so it can fade
  const inkCss = `#${ink.getHexString()}`;
  g.strokeStyle = inkCss;
  g.lineWidth = 1.6;
  const step = 0.25 * px;
  const segL = step / 3;
  for (let y = cy % step; y < H; y += step)
    for (let x = 0; x < W; x += segL) {
      const f = fade(x + segL / 2, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.1 : 0.07);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + segL, y);
      g.stroke();
    }
  for (let x = cx % step; x < W; x += step)
    for (let y = 0; y < H; y += segL) {
      const f = fade(x, y + segL / 2);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.1 : 0.07);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + segL);
      g.stroke();
    }
  // dots at the half-steps
  g.fillStyle = inkCss;
  for (let y = (cy % step) + step / 2; y < H; y += step)
    for (let x = (cx % step) + step / 2; x < W; x += step) {
      const f = fade(x, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.24 : 0.16);
      g.beginPath();
      g.arc(x, y, 2.2, 0, Math.PI * 2);
      g.fill();
    }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
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

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.2 : 0.8);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);

  /* ---------- materials ---------- */
  const glass = (extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.35,
      ior: 1.5,
      dispersion: 0.03,
      attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"),
      attenuationDistance: 40,
      specularIntensity: 1,
      envMapIntensity: 1,
      ...extra,
    });
  const matArc = glass({ thickness: 0.22 });
  const matLens = glass({ thickness: 0.5 });
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#e6e8ec" : "#f3f4f6"),
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: 1,
  });
  const matSatin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#8a8c92" : "#c4c6cc"),
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1,
  });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");

  /* ---------- the wall behind ---------- */
  const wallTex = backdropTexture(bg, ink, dark);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false }));
  wall.position.set(0, 0, -1.3);
  scene.add(wall);

  /* ---------- the mark ---------- */
  const rig = new THREE.Group(); // sway + cursor lean
  const dial = new THREE.Group(); // the in-plane turn
  rig.add(dial);
  scene.add(rig);

  // orbit: three clear-glass arcs with rounded ends
  const capGeo = new THREE.SphereGeometry(TUBE, 32, 16);
  NODE_A.forEach((a, i) => {
    const a0 = a + GAP;
    const a1 = (NODE_A[i + 1] ?? 360) - GAP;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1, TUBE, 28, 160, deg(a1 - a0)), matArc);
    arc.rotation.z = deg(a0);
    dial.add(arc);
    for (const e of [a0, a1]) {
      const cap = new THREE.Mesh(capGeo, matArc);
      cap.position.set(Math.cos(deg(e)), Math.sin(deg(e)), 0);
      dial.add(cap);
    }
  });

  // arms: satin bars from the hub's rim to under each node (starting inside the
  // lens, their ends showed through the glass as stray chrome blocks)
  const armIn = HUB_R - 0.03;
  const armLen = 1 - NODE_R * 0.4 - armIn;
  const armGeo = new RoundedBoxGeometry(armLen, ARM_W, 0.1, 3, 0.04);
  NODE_A.forEach((a) => {
    const arm = new THREE.Mesh(armGeo, matSatin);
    const mid = armIn + armLen / 2;
    arm.position.set(Math.cos(deg(a)) * mid, Math.sin(deg(a)) * mid, -0.04);
    arm.rotation.z = deg(a);
    dial.add(arm);
  });

  // hub: a thick glass lens with a chrome core — the "sight"
  dial.add(new THREE.Mesh(puck(HUB_R, 0.34, 0.12), matLens));
  dial.add(new THREE.Mesh(new THREE.SphereGeometry(0.19, 48, 32), matChrome));

  // outer nodes: chrome discs on the orbit, each with a (hidden) signal inlay
  const nodeGeo = puck(NODE_R, 0.22, 0.08);
  const inlayGeo = new THREE.CircleGeometry(0.075, 48);
  const inlays = NODE_A.map((a) => {
    const n = new THREE.Mesh(nodeGeo, matChrome);
    n.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0.03);
    dial.add(n);
    const mat = new THREE.MeshBasicMaterial({ color: signalCol, transparent: true, opacity: 0, toneMapped: false });
    const inlay = new THREE.Mesh(inlayGeo, mat);
    inlay.position.set(n.position.x, n.position.y, 0.03 + 0.112);
    inlay.visible = false;
    dial.add(inlay);
    return { inlay, mat };
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

  /* ---------- per-frame ---------- */
  let viewW = 1;
  let viewH = 1;
  let lastAbs = -1;

  function dialAngle(t: number) {
    let base = 0;
    let a = 0;
    for (const d of DIAL) {
      const k = seg(t, d.at, d.at + TURN_MS);
      if (k <= 0) break;
      a = base + (d.to - base) * backOut(k);
      base = d.to;
    }
    return a % 360;
  }
  /** 0..1: how "on" the front node's violet inlay is */
  function signalAt(t: number) {
    const b = BEATS.findIndex((x) => t >= x.t0 && t < x.t1);
    if (b < 0) return { node: -1, k: 0 };
    const on = b === 0 ? BEATS[0].t0 + 300 : DIAL[b - 1].at + TURN_MS * 0.7;
    const off = BEATS[b].t1 - 150;
    const k = smooth(seg(t, on, on + 400)) * (1 - smooth(seg(t, off, off + 150)));
    return { node: ACTIVE_BY_BEAT[b], k };
  }

  function update(tAbs: number) {
    const t = ((tAbs % LOOP_MS) + LOOP_MS) % LOOP_MS;
    const dt = lastAbs < 0 ? 16 : Math.min(64, Math.abs(tAbs - lastAbs));
    lastAbs = tAbs;
    const ph = (t / LOOP_MS) * Math.PI * 2;

    // first appearance: it turns in and settles (only on the very first loop)
    const intro = outCubic(seg(tAbs, 0, 1800));

    // cursor lean, eased
    const e = 1 - Math.pow(0.002, dt / 1000);
    lean.x += (lean.tx - lean.x) * e;
    lean.y += (lean.ty - lean.y) * e;

    rig.rotation.set(
      -0.16 + Math.sin(ph + 1.1) * 0.05 + lean.y * 0.12,
      -0.32 + Math.sin(ph) * 0.14 + lean.x * 0.2 - (1 - intro) * 0.9,
      0,
    );
    rig.position.y = Math.sin(ph * 2) * 0.03;
    rig.scale.setScalar(0.9 + 0.1 * intro);
    dial.rotation.z = deg(dialAngle(t)) - (1 - intro) * 0.6;

    // the one violet: the front node's inlay, once the turn has settled
    const sig = signalAt(t);
    inlays.forEach((x, i) => {
      x.mat.opacity = i === sig.node ? sig.k : 0;
      x.inlay.visible = x.mat.opacity > 0.01;
    });

    // the studio turns slowly, so reflections travel over glass and chrome
    scene.environmentRotation.set(0, Math.sin(ph) * 0.5, 0);
  }

  function resize(width: number, height: number, m: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    camera.aspect = viewW / viewH;
    if (m === "wide") {
      camera.fov = 22;
      // the mark sits right of the copy: a lens shift, so perspective stays straight
      const dx = Math.round(viewW * 0.25);
      const dy = Math.round(viewH * 0.02);
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
  }

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels: () => [],
    dispose() {
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      wallTex.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
