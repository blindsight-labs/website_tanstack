/* The assessment's iceberg, in the site's studio: one faceted clear-glass berg, eight glass
   capsules set into its flanks (one per risk, chrome bezels at the ends), a water surface that
   carries the brand's hairline grid, and the deep below it.

   Story rules (every motion has a cause):
   - an answer re-sorts the capsules (most visible at the top) and the berg floats to the height
     that leaves exactly the risks you can see above the waterline (a spring: buoyancy);
   - scroll moves the camera: in the header the page's section edge IS the waterline (the page
     turns dark exactly where the water starts), below it the camera stops at each capsule;
   - "With Blindsight" clears the water and seals the capsules runtime controls would cover;
     the seal ring carries the page's one violet signal.

   Client-only: imported dynamically from RiskAssessment.tsx. Renders on demand. */
import { THREE, createRenderer, studioLights, type Theme } from "@/site/three/core";

export const FOV = 30;
const FRONT_Z = 2.1; // the water's front face, just in front of the berg: one horizon
const CAP_Z = 0; // capsules sit round the berg's axis
const SLOT0 = 1.25; // first capsule below the peak
const SLOT_GAP = 1.0;
const HEIGHT = SLOT0 + 7 * SLOT_GAP + 1.2;
const RMAX = 2.35;
const TAU = Math.PI * 2;

export type Colors = { surface: string; deep: string; ink: string };
export type IcebergState = {
  /** risk index per slot, top to bottom */
  order: number[];
  /** how many slots are above the waterline */
  seen: number;
  /** sealed today, per risk */
  sealed: boolean[];
  /** sealed with runtime controls, per risk (shown while lens = 1) */
  sealedWith: boolean[];
  lens: 0 | 1;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Radius of the berg at t (0 = peak, 1 = keel). */
function profile(t: number) {
  const u = clamp01(t);
  const WAIST = 0.36; // widest point
  if (u < WAIST) return RMAX * Math.pow(u / WAIST, 0.9); // a mountain: straight-ish flanks to a point
  // under water the mass stays broad and ends blunt (not a gem's point)
  return RMAX * Math.pow(1 - Math.pow((u - WAIST) / (1 - WAIST), 2.8), 0.55);
}

/* deterministic smooth noise on the unit sphere: a few seeded plane waves */
function makeNoise(seed: number) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const waves = Array.from({ length: 7 }, (_, i) => {
    const v = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const f = 1.6 + i * 0.9;
    return { v: v.multiplyScalar(f), ph: rnd() * TAU, a: 1 / (1 + i * 0.7) };
  });
  const norm = waves.reduce((a, w) => a + w.a, 0);
  return (x: number, y: number, z: number) =>
    waves.reduce((acc, w) => acc + Math.sin(w.v.x * x + w.v.y * y + w.v.z * z + w.ph) * w.a, 0) /
    norm;
}

/** The hero's studio, re-lit for ice: a grey dome with black flags and narrow bright strips,
 *  so every facet catches a different band (crystal), never one flat grey (plastic). */
function bergEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: grey(dark ? 0.06 : 0.55) },
        hor: { value: grey(dark ? 0.02 : 0.3) },
        bot: { value: grey(dark ? 0.01 : 0.12) },
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
    m.position
      .set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el))
      .multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  if (dark) {
    panel(18, 5, 0, 78, 2.4);
    panel(2.2, 16, 52, 4, 4.2);
    panel(1.4, 16, -78, 4, 2.8);
    panel(1.2, 16, 168, 4, 3.2);
    panel(1.0, 16, -20, 10, 1.6);
    panel(12, 3.2, 215, 12, 0.2);
  } else {
    panel(18, 2, 0, 78, 2.4);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(2.6, 16, 20, 0, 0.02);
    panel(9, 1.3, 205, -6, 0.0);
    panel(2.2, 14, 58, 6, 2.8);
    panel(1.6, 14, -40, 8, 2.8);
    panel(1.0, 14, -8, 12, 1.8);
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

function bergGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const n1 = makeNoise(11);
  const n2 = makeNoise(29);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).normalize();
    const t = (1 - p.y) / 2;
    const rho = Math.hypot(p.x, p.z);
    const dx = rho < 1e-6 ? 0 : p.x / rho;
    const dz = rho < 1e-6 ? 0 : p.z / rho;
    // a jagged summit: the upper third carries more relief, and a second, lower peak
    const top = 1 - clamp01(t / 0.3);
    const relief = 0.16 + 0.24 * top;
    const r = profile(t) * (1 + relief * n1(p.x * 1.4, p.y * 1.4, p.z * 1.4)) + 0.02;
    const shoulder =
      top * 0.55 * Math.max(0, -dx * 0.8 + 0.2) * Math.sin(Math.PI * clamp01(t / 0.3));
    const y =
      -t * HEIGHT + 0.3 * n2(p.x, p.y, p.z) * Math.sin(Math.PI * clamp01(t * 1.15)) + shoulder;
    // lopsided below: one shoulder bulges out and the mass leans right, so it is no spindle
    const deep = clamp01((t - 0.3) / 0.3);
    const theta = Math.atan2(dz, dx);
    const rr =
      r *
      (1 +
        0.3 * deep * Math.max(0, Math.cos(theta - 0.25)) -
        0.08 * deep * Math.max(0, Math.cos(theta - 3.1)));
    const lean = 0.45 * Math.sin(Math.PI * clamp01((t - 0.3) / 0.7));
    pos.setXYZ(i, dx * rr + lean, Math.min(0, y), dz * rr * 0.78);
  }
  // chip it: seeded planes shear off whole sides, so the berg has a few big flat faces and a
  // lopsided, chiselled summit instead of a smooth cone
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cuts: { n: THREE.Vector3; p: THREE.Vector3 }[] = [];
  const addCut = (tc: number, a: number, tilt: number, k: number) => {
    const r = profile(tc) * k;
    cuts.push({
      n: new THREE.Vector3(Math.cos(a), tilt, Math.sin(a) * 1.1).normalize(),
      p: new THREE.Vector3(Math.cos(a) * r, -tc * HEIGHT, Math.sin(a) * r * 0.78),
    });
  };
  for (let i = 0; i < 3; i++)
    addCut(0.04 + rnd() * 0.08, rnd() * TAU, 0.9 + rnd() * 0.9, 0.6 + rnd() * 0.3); // summit
  for (let i = 0; i < 9; i++)
    addCut(
      0.15 + rnd() * 0.45,
      (i / 9) * TAU + rnd() * 0.5,
      -0.2 + rnd() * 0.7,
      0.8 + rnd() * 0.14,
    ); // flanks
  for (let i = 0; i < 5; i++)
    addCut(0.62 + rnd() * 0.3, (i / 5) * TAU + rnd(), -0.4 - rnd() * 0.6, 0.78 + rnd() * 0.15); // keel
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    for (const c of cuts) {
      const k = d.subVectors(p, c.p).dot(c.n);
      if (k > 0) p.addScaledVector(c.n, -k);
    }
    pos.setXYZ(i, p.x, Math.min(0, p.y), p.z);
  }
  geo.computeVertexNormals(); // non-indexed: flat facets
  return geo;
}

/** Local y of slot k (0 = the top slot). */
const slotY = (k: number) => -(SLOT0 + k * SLOT_GAP);
/** How far the berg floats up so that `seen` slots sit above the waterline. */
const riseFor = (seen: number) => (seen <= 0 ? 0.45 : SLOT0 + (seen - 0.5) * SLOT_GAP);

/* Slots alternate flanks and swing front/back, so no two neighbours share a side and the top
   two sit left and right of the summit (as sketched); none points at the camera (an end-on
   capsule reads as a blob). az: direction in the xz-plane, 0 = right, 90° = towards the camera. */
const AZ = [24, 156, 8, 172, 38, 142, -6, 186].map((d) => (d * Math.PI) / 180);
export const slotAz = (k: number) => AZ[k % AZ.length];

function dotsTexture(bg: string, dot: string, alpha: number, cell = 48) {
  const c = document.createElement("canvas");
  c.width = c.height = cell;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, cell, cell);
  g.globalAlpha = alpha;
  g.fillStyle = dot;
  g.beginPath();
  g.arc(cell / 2, cell / 2, cell / 22, 0, TAU);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

type Capsule = {
  group: THREE.Group;
  chrome: THREE.MeshPhysicalMaterial;
  tube: THREE.MeshPhysicalMaterial;
  dim: number;
  dimT: number;
  seal: THREE.Mesh;
  sealWith: THREE.Group;
  pos: THREE.Vector3;
  rotY: number;
  targetPos: THREE.Vector3;
  targetRotY: number;
  seal0: number;
  sealT: number;
  with0: number;
  withT: number;
};

export type IcebergScene = {
  resize(w: number, h: number): void;
  setState(s: IcebergState, instant?: boolean): void;
  /** Camera height (and distance) for the frame. */
  setCamera(y: number, z: number): void;
  /** Advance the springs; true while anything is still moving. */
  step(dtMs: number): boolean;
  render(): void;
  /** screen px of risk i's outer bezel (x, y) and of its middle (cx, cy) */
  anchor(i: number): { x: number; y: number; cx: number; cy: number };
  /** the default camera distance for this viewport */
  camZ(): number;
  /** camera y that puts world height `y` (at depth z) at screen y `sy` px, for camera distance `camZ` */
  camFor(y: number, z: number, sy: number, camZ: number): number;
  /** camera y that puts the water's front edge at screen y `sy` */
  camForWaterline(sy: number, camZ: number): number;
  /** target world y of slot k for the current state */
  slotWorldY(k: number): number;
  /** target world y of the peak and the keel */
  bounds(): { top: number; bottom: number };
  /** turn the berg (radians, scroll-driven: brings the risk being read round to its card) */
  setSpin(r: number): void;
  /** the risk being read; the others step back. null = none */
  setFocus(risk: number | null): void;
  /** 0..1: how far into the finale (murky water "today") */
  setMurk(k: number): void;
  /** heading (radians) of slot k, before any spin */
  slotAz(k: number): number;
  /** 0 = the world above the water is lit (header); 1 = seen from the deep, it is dark too */
  setDeep(k: number): boolean;
  frontZ: number;
  capZ: number;
  dispose(): void;
};

export async function createIcebergScene(
  canvas: HTMLCanvasElement,
  opts: { theme: Theme; colors: Colors; reduce: boolean },
): Promise<IcebergScene> {
  const { theme, colors, reduce } = opts;
  const renderer = createRenderer(canvas);
  renderer.setClearColor(new THREE.Color(colors.surface), 1);
  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, theme === "dark");
  scene.environment = env;
  studioLights(scene, theme);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
  let W = 1;
  let H = 1;
  let cz = 12;

  const disposables: { dispose(): void }[] = [env];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  /* ---- the room: light above the waterline, the deep below ---- */
  const upTex = keep(dotsTexture(colors.surface, colors.ink, theme === "light" ? 0.16 : 0.3));
  upTex.repeat.set(120 / 0.42, 60 / 0.42);
  const upMat = keep(new THREE.MeshBasicMaterial({ map: upTex, toneMapped: false }));
  const up = new THREE.Mesh(keep(new THREE.PlaneGeometry(120, 60)), upMat);
  up.position.set(0, 30, -12);
  const downTex = keep(dotsTexture(colors.deep, "#ffffff", theme === "light" ? 0.13 : 0.1));
  downTex.repeat.set(120 / 0.42, 90 / 0.42);
  const down = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(120, 90)),
    keep(new THREE.MeshBasicMaterial({ map: downTex, toneMapped: false })),
  );
  down.position.set(0, -45, -12);
  scene.add(up, down);
  // the backdrop's dots fade out towards the horizon, so the plain water surface meets them
  // without a band (one horizon: the page edge)
  const fadeUp = (() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#000"); // alphaMap reads the green channel
    grd.addColorStop(1, "#fff");
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 256);
    return keep(new THREE.CanvasTexture(c));
  })();
  const veilMat = keep(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.surface),
      alphaMap: fadeUp,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const veil = new THREE.Mesh(keep(new THREE.PlaneGeometry(120, 3)), veilMat);
  veil.position.set(0, 1.5, -11.95);
  scene.add(veil);

  // the water surface: plain page colour, so the page edge is the only horizon; from below it
  // is invisible
  const SW = 70;
  const SD = FRONT_Z + 12;
  const surfMat = keep(
    new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.surface), toneMapped: false }),
  );
  const surface = new THREE.Mesh(keep(new THREE.PlaneGeometry(SW, SD)), surfMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(0, 0, FRONT_Z - SD / 2);
  scene.add(surface);
  // …and from below it is the deep's ceiling (only its back face exists for the camera)
  const under = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(SW, SD)),
    keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(colors.deep), toneMapped: false })),
  );
  under.rotation.x = Math.PI / 2;
  under.position.set(0, -0.002, FRONT_Z - SD / 2);
  scene.add(under);

  // "the deep": a multiply tint that turns the lit world above the water into the deep's colour
  const sc = new THREE.Color(colors.surface);
  const dc = new THREE.Color(colors.deep);
  const deepTint = new THREE.Color(
    Math.min(1, dc.r / Math.max(sc.r, 1e-3)),
    Math.min(1, dc.g / Math.max(sc.g, 1e-3)),
    Math.min(1, dc.b / Math.max(sc.b, 1e-3)),
  );
  const inkColor = new THREE.Color(colors.ink);
  const lightInk = new THREE.Color("#ececf1");
  const edgeTop = inkColor.clone();
  let deep = 0;

  // the waterline as a hairline: only seen from the deep (in the header the page edge is the line)
  const fadeTex = (() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 1;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 256, 0);
    grd.addColorStop(0, "#000");
    grd.addColorStop(0.3, "#fff");
    grd.addColorStop(0.7, "#fff");
    grd.addColorStop(1, "#000");
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 1);
    return keep(new THREE.CanvasTexture(c));
  })();
  const lineMat = keep(
    new THREE.MeshBasicMaterial({
      color: lightInk,
      alphaMap: fadeTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const waterline = new THREE.Mesh(keep(new THREE.PlaneGeometry(6.5, 0.014)), lineMat);
  waterline.position.set(0, 0, FRONT_Z + 0.01);
  waterline.renderOrder = 11;
  scene.add(waterline);

  // the water's front face: dims what is under water (clears in "With Blindsight")
  const frontMat = keep(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.deep),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const front = new THREE.Mesh(keep(new THREE.PlaneGeometry(120, 90)), frontMat);
  front.position.set(0, -45, FRONT_Z);
  front.renderOrder = 10;
  scene.add(front);

  /* ---- the berg ---- */
  const berg = new THREE.Group();
  scene.add(berg);
  const bergMat = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      // a thin refraction offset: a thick one bends the deep up into the tip just above the
      // waterline (a dark strip)
      thickness: 0.55,
      ior: 1.36,
      dispersion: 0.04,
      flatShading: true,
      attenuationColor: new THREE.Color(theme === "light" ? "#D9DCE1" : "#C9CBD1"),
      attenuationDistance: theme === "light" ? 10 : 30,
      specularIntensity: 1,
      envMapIntensity: theme === "light" ? 1.15 : 1.5,
    }),
  );
  const bergGeo = keep(bergGeometry());
  const bergMesh = new THREE.Mesh(bergGeo, bergMat);
  berg.add(bergMesh);

  // each slot's capsule is set into the real (chipped) surface: a ray from the axis finds it
  const probe = new THREE.Mesh(bergGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const ray = new THREE.Raycaster();
  const poses = Array.from({ length: 8 }, (_, k) => {
    const y = slotY(k);
    const az = slotAz(k);
    const dir = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
    ray.set(new THREE.Vector3(0, y, 0), dir);
    const hit = ray.intersectObject(probe, false)[0];
    const d = hit ? hit.distance : profile(-y / HEIGHT) * 0.85;
    // a third of the capsule is in the ice
    return {
      pos: dir
        .clone()
        .multiplyScalar(d + 0.16)
        .setY(y),
      rotY: -az,
    };
  });
  (probe.material as THREE.Material).dispose();

  // the facets as hairlines: ink above the waterline, light below it; the back edges show
  // faintly through the glass (that is what makes it read as clear)
  const edgeGeo = keep(new THREE.EdgesGeometry(bergGeo, 8));
  const edgeMat = (opacity: number, through: boolean) =>
    keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: !through,
        uniforms: {
          top: { value: edgeTop },
          bottom: { value: new THREE.Color("#ececf1") },
          opacity: { value: opacity },
          underOpacity: { value: opacity * (theme === "light" ? 0.7 : 1) },
        },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vY = w.y;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 top; uniform vec3 bottom; uniform float opacity; uniform float underOpacity;
          varying float vY;
          void main() {
            bool under = vY < 0.0;
            gl_FragColor = vec4(under ? bottom : top, under ? underOpacity : opacity);
          }`,
      }),
    );
  const EDGE_FRONT = theme === "light" ? 0.27 : 0.34;
  const EDGE_BACK = theme === "light" ? 0.08 : 0.12;
  const edgesFront = new THREE.LineSegments(edgeGeo, edgeMat(EDGE_FRONT, false));
  const edgesBack = new THREE.LineSegments(edgeGeo, edgeMat(EDGE_BACK, true));
  const edgeU = (l: THREE.LineSegments) => (l.material as THREE.ShaderMaterial).uniforms;
  edgesFront.renderOrder = 6;
  edgesBack.renderOrder = 4;
  berg.add(edgesBack, edgesFront);

  /* ---- capsules ---- */
  const chromeBase = keep(
    new THREE.MeshPhysicalMaterial({
      color: "#D9DADF",
      metalness: 1,
      roughness: 0.08,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.4,
    }),
  );
  const tubeBase = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: theme === "light" ? 0.34 : 0.26,
      specularIntensity: 1,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.8,
      depthWrite: false,
    }),
  );
  const signal = keep(
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(theme === "light" ? "#5546E0" : "#7C6CF5"),
      toneMapped: false,
    }),
  );
  const LEN = 1.0;
  const R = 0.19;
  const bodyGeo = keep(new THREE.CylinderGeometry(R, R, LEN, 56, 1, true));
  const bezelGeo = keep(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.08, 56));
  const sealGeo = keep(new THREE.CylinderGeometry(R + 0.022, R + 0.022, 0.12, 56));
  const ringGeo = keep(new THREE.TorusGeometry(R + 0.024, 0.009, 8, 72));

  const capsules: Capsule[] = Array.from({ length: 8 }, () => {
    // own materials, so the capsules not being talked about can step back (focus)
    const chrome = keep(chromeBase.clone());
    const tube = keep(tubeBase.clone());
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.rotation.z = -Math.PI / 2; // cylinder axis y → local x (outward)
    const body = new THREE.Mesh(bodyGeo, tube);
    body.renderOrder = 5;
    const b1 = new THREE.Mesh(bezelGeo, chrome);
    b1.position.y = LEN / 2;
    // no bezel on the inner end: it is set in the ice, and through the glass it read as a ghost cap
    inner.add(body, b1);
    const seal = new THREE.Mesh(sealGeo, chrome);
    seal.position.x = 0.2;
    seal.rotation.z = -Math.PI / 2;
    const sealWith = new THREE.Group();
    const sw = new THREE.Mesh(sealGeo, chrome);
    sw.rotation.z = -Math.PI / 2;
    const ring = new THREE.Mesh(ringGeo, signal);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = 0.065;
    sealWith.add(sw, ring);
    sealWith.position.x = 0.2;
    g.add(inner, seal, sealWith);
    berg.add(g);
    return {
      group: g,
      chrome,
      tube,
      dim: 0,
      dimT: 0,
      seal,
      sealWith,
      pos: new THREE.Vector3(),
      rotY: 0,
      targetPos: new THREE.Vector3(),
      targetRotY: 0,
      seal0: 0,
      sealT: 0,
      with0: 0,
      withT: 0,
    };
  });

  /* ---- springs ---- */
  let rise = 0;
  let riseV = 0;
  let riseT = 0;
  let lens = 0;
  let lensT = 0;
  let camY = 0;
  let camZv = cz;
  let first = true;
  let spin = 0;
  let murk = 0;
  const sunk: boolean[] = Array(8).fill(false);
  const TUBE_OPACITY = tubeBase.opacity;
  const CHROME = chromeBase.color.clone();

  const setState = (s: IcebergState, instant = false) => {
    riseT = riseFor(s.seen);
    lensT = s.lens;
    s.order.forEach((risk, k) => {
      sunk[risk] = k >= s.seen;
      const c = capsules[risk];
      const pose = poses[k];
      c.targetPos.copy(pose.pos);
      // the same heading, taken the short way round from where the capsule points now
      c.targetRotY = pose.rotY + TAU * Math.round((c.rotY - pose.rotY) / TAU);
      c.sealT = s.sealed[risk] ? 1 : 0;
      c.withT = !s.sealed[risk] && s.sealedWith[risk] ? 1 : 0;
    });
    if (instant || first || reduce) {
      rise = riseT;
      riseV = 0;
      lens = lensT;
      capsules.forEach((c) => {
        c.pos.copy(c.targetPos);
        c.rotY = c.targetRotY;
        c.seal0 = c.sealT;
        c.with0 = c.withT;
      });
      first = false;
    }
  };

  const apply = () => {
    berg.position.y = rise;
    berg.rotation.y = spin;
    // the finale's "today": the water is murky; "With Blindsight" clears it
    const m = murk * (1 - lens);
    frontMat.opacity = (0.5 + 0.32 * m) * (1 - lens);
    front.visible = frontMat.opacity > 0.005;
    // clear water: the whole berg's facets come up, the back edges most (you see through it)
    edgeU(edgesFront).underOpacity.value = EDGE_FRONT * 0.42 * (1 + 1.7 * lens) * (1 - 0.55 * m);
    edgeU(edgesFront).opacity.value = EDGE_FRONT * (1 + 0.5 * lens);
    edgeU(edgesBack).underOpacity.value = EDGE_BACK * 0.6 * (1 + 3.2 * lens) * (1 - 0.6 * m);
    edgeU(edgesBack).opacity.value = EDGE_BACK * (1 + 1.6 * lens);
    const sn = Math.sin(spin);
    const cs = Math.cos(spin);
    capsules.forEach((c, i) => {
      const dim = Math.max(c.dim, sunk[i] ? m : 0);
      c.chrome.color.copy(CHROME).multiplyScalar(1 - 0.72 * dim);
      c.chrome.envMapIntensity = 1.4 * (1 - 0.6 * dim);
      c.tube.opacity = TUBE_OPACITY * (1 - 0.7 * dim);
      // a stepped-back capsule behind the berg, or end-on to the camera, only reads as a bubble
      // through the glass: hide it (only side-on ones stay, as context)
      const xw = c.pos.x * cs + c.pos.z * sn;
      const zw = -c.pos.x * sn + c.pos.z * cs;
      const sideOn = Math.abs(xw) > 0.72 * Math.hypot(xw, zw);
      c.group.visible = !(c.dim > 0.5 && (zw < -0.1 || !sideOn));
      c.group.position.copy(c.pos);
      c.group.rotation.set(0, c.rotY, 0);
      c.seal.visible = c.seal0 > 0.02;
      c.seal.scale.set(1, Math.max(0.001, c.seal0), 1);
      const w = c.with0 * lens;
      c.sealWith.visible = w > 0.02;
      c.sealWith.scale.setScalar(0.6 + 0.4 * w);
    });
  };

  const step = (dtMs: number) => {
    const dt = Math.min(0.05, dtMs / 1000);
    // buoyancy: a slightly under-damped spring
    const k = 70;
    const damp = 11;
    riseV += (-(rise - riseT) * k - riseV * damp) * dt;
    rise += riseV * dt;
    const e = 1 - Math.exp(-dt / 0.2);
    const eSlow = 1 - Math.exp(-dt / 0.45);
    lens += (lensT - lens) * eSlow;
    let moving =
      Math.abs(rise - riseT) > 0.001 || Math.abs(riseV) > 0.001 || Math.abs(lens - lensT) > 0.002;
    capsules.forEach((c) => {
      c.pos.lerp(c.targetPos, e);
      c.rotY += (c.targetRotY - c.rotY) * e;
      c.seal0 += (c.sealT - c.seal0) * e;
      c.with0 += (c.withT - c.with0) * e;
      c.dim += (c.dimT - c.dim) * e;
      if (Math.abs(c.dim - c.dimT) > 0.005) moving = true;
      if (c.pos.distanceToSquared(c.targetPos) > 1e-6 || Math.abs(c.rotY - c.targetRotY) > 1e-3)
        moving = true;
      if (Math.abs(c.seal0 - c.sealT) > 0.005 || Math.abs(c.with0 - c.withT) > 0.005) moving = true;
    });
    if (!moving) {
      rise = riseT;
      riseV = 0;
      lens = lensT;
    }
    apply();
    return moving;
  };

  const f = () => H / (2 * Math.tan(((FOV / 2) * Math.PI) / 180));
  const layout = () => {
    const aspect = W / H;
    cz = aspect < 1 ? 14 + (1 - aspect) * 11 : 14;
    camera.aspect = aspect;
    // wide: the berg stands in the right half (the copy has the left); narrow: centred
    const dx = W >= 900 ? W * 0.19 : 0;
    camera.setViewOffset(W, H, -dx, 0, W, H);
    camera.updateProjectionMatrix();
  };

  const v = new THREE.Vector3();
  const api: IcebergScene = {
    resize(w, h) {
      W = Math.max(1, w);
      H = Math.max(1, h);
      renderer.setSize(W, H, false);
      layout();
    },
    setState,
    setCamera(y, z) {
      camY = y;
      camZv = z;
    },
    step,
    render() {
      camera.position.set(0, camY, camZv);
      camera.lookAt(0, camY, 0);
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
    },
    anchor(i) {
      const c = capsules[i];
      c.group.updateMatrixWorld();
      camera.position.set(0, camY, camZv);
      camera.lookAt(0, camY, 0);
      camera.updateMatrixWorld();
      v.set(LEN / 2 + 0.06, 0, 0)
        .applyMatrix4(c.group.matrixWorld)
        .project(camera);
      const x = ((v.x + 1) / 2) * W;
      const y = ((1 - v.y) / 2) * H;
      v.set(0, 0, 0).applyMatrix4(c.group.matrixWorld).project(camera);
      return { x, y, cx: ((v.x + 1) / 2) * W, cy: ((1 - v.y) / 2) * H };
    },
    camZ: () => cz,
    camFor: (y, z, sy, camZ) => y + ((sy - H / 2) * (camZ - z)) / f(),
    camForWaterline: (sy, camZ) => ((sy - H / 2) * (camZ - FRONT_Z)) / f(),
    slotWorldY: (k) => riseT + slotY(k),
    bounds: () => ({ top: riseT, bottom: riseT - HEIGHT }),
    setSpin(r) {
      spin = r;
      berg.rotation.y = r;
    },
    setMurk(k) {
      murk = k;
    },
    setFocus(risk) {
      capsules.forEach((c, i) => (c.dimT = risk === null || i === risk ? 0 : 1));
    },
    slotAz,
    setDeep(k) {
      if (Math.abs(k - deep) < 1e-4) return false;
      deep = k;
      const one = new THREE.Color(1, 1, 1);
      upMat.color.copy(one).lerp(deepTint, k);
      surfMat.color.copy(sc).lerp(dc, k);
      veilMat.color.copy(sc).lerp(dc, k);
      edgeTop.copy(inkColor).lerp(lightInk, k);
      lineMat.opacity = 0.32 * k;
      return true;
    },
    frontZ: FRONT_Z,
    capZ: CAP_Z,
    dispose() {
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
  return api;
}
