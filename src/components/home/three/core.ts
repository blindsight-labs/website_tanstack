/* Shared 3D material system for mockup D.
 *
 * Octane's premium feel comes from rendered glass and chrome, not CSS blur. This
 * module gives every 3D surface on the page the same studio lighting and the same
 * four materials, so the hero, the risk cards and any rendered symbol read as one
 * family:
 *
 *   glass     clear, refractive, thick-edged (the "transparency")
 *   frosted   same glass, rough, for panes that should blur what is behind
 *   chrome    polished metal, picks up grey studio reflections
 *   satin     brushed metal, darker, for secondary objects and symbols
 *   signal    the ONLY coloured material: brand violet, emissive. Use it for one
 *             thing only, the live signal (what Blindsight just found / acted on).
 *
 * Transmission (real refraction) only shows something if there is something behind
 * the glass, so scenes should include `backdrop()` — a plane carrying a faint
 * dot/character texture in the page's own background colour, like Octane's
 * dithered patterns behind its glass renders.
 *
 * Client-only: import this from inside useEffect / dynamic import, never at module
 * top level of an SSR-rendered route.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export { THREE, RoundedBoxGeometry };

export type Theme = "light" | "dark";

export const PALETTE = {
  light: { bg: "#F3F4F6", ink: "#0B0B0D", dot: "#C9CBD2" },
  dark: { bg: "#060607", ink: "#F4F4F6", dot: "#2A2B31" },
  // Brand signal. Moved off Tailwind indigo (#4F46E5/#6366F1) and violet (#8B5CF6).
  signal: "#6E4BFF",
  signalOnDark: "#A08CFF",
};

export function createRenderer(canvas?: HTMLCanvasElement, opts: { alpha?: boolean } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: opts.alpha ?? false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: true,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral (Khronos PBR) keeps the page white white when seen through glass;
  // ACES greys it into "milky plastic".
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  return renderer;
}

const envCache = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

/** A product-photography studio: dark grey walls, a few hard softboxes. Glass gets
 *  crisp bright rims and dark refracted edges; metal gets the light/dark banding of
 *  liquid chrome instead of a flat grey. */
function softboxStudio() {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(20, 12, 20),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#6E7077"), side: THREE.BackSide }),
  );
  scene.add(room);
  // black flags: give chrome and glass edges their dark bands
  const flag = (w: number, h: number, pos: [number, number, number], rot: [number, number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  flag(6, 12, [-9.8, 0, -5], [0, Math.PI / 2, 0]);
  flag(20, 3, [0, -5.8, 0], [Math.PI / 2, 0, 0]);
  flag(4, 10, [6, 0, -9.8], [0, 0, 0]);
  const box = (w: number, h: number, pos: [number, number, number], rot: [number, number, number], k: number) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
  };
  box(12, 4, [0, 5.8, 0], [Math.PI / 2, 0, 0], 4); // overhead key
  box(2.2, 9, [-9.6, 0.5, 3], [0, Math.PI / 2, 0], 3.2); // left strip
  box(1.4, 9, [9.6, 0.5, -2], [0, -Math.PI / 2, 0], 2.6); // right strip
  box(8, 2, [-3, -1, -9.6], [0, 0, 0], 1.6); // back fill, low
  box(7, 6, [2, 1, 9.6], [0, Math.PI, 0], 1.5); // front fill, soft
  return scene;
}

/** Neutral grey studio reflections — what makes metal read as "metallic grey". */
export function studioEnvironment(renderer: THREE.WebGLRenderer, kind: "softbox" | "room" = "softbox") {
  const cached = envCache.get(renderer);
  if (cached) return cached;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(kind === "softbox" ? softboxStudio() : new RoomEnvironment(), 0.02).texture;
  pmrem.dispose();
  envCache.set(renderer, env);
  return env;
}

export const materials = {
  /* Clear glass reads as glass through its EDGES, not its faces: no roughness,
     no clearcoat (a second grey reflection = "milky"), almost no absorption
     (short attenuation distances turn slabs into smoked resin), minimal
     dispersion. Pair it with a studio that is mostly dark with narrow bright
     strips, and put something with contrast behind it to refract. */
  glass: (theme: Theme = "light") =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.6,
      ior: 1.5,
      dispersion: 0.02,
      clearcoat: 0,
      attenuationColor: new THREE.Color(theme === "light" ? "#F2F3F5" : "#9A9A9E"),
      attenuationDistance: 40,
      specularIntensity: 1,
      envMapIntensity: 1,
    }),
  frosted: (theme: Theme = "light") =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.42,
      transmission: 1,
      thickness: 1.2,
      ior: 1.45,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
      attenuationColor: new THREE.Color(theme === "light" ? "#EEF0F5" : "#7D8494"),
      attenuationDistance: 3,
      envMapIntensity: theme === "light" ? 1 : 1.4,
    }),
  chrome: () =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#D9DADF"),
      metalness: 1,
      roughness: 0.1,
      clearcoat: 0.4,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.35,
    }),
  satin: () =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#8E9099"),
      metalness: 1,
      roughness: 0.34,
      envMapIntensity: 1.1,
    }),
  signal: (theme: Theme = "light", intensity = 1.6) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme === "light" ? PALETTE.signal : PALETTE.signalOnDark),
      emissive: new THREE.Color(theme === "light" ? PALETTE.signal : PALETTE.signalOnDark),
      emissiveIntensity: intensity,
      roughness: 0.3,
      metalness: 0,
    }),
};

/** Canvas texture of faint dots / mono characters, tinted to the page background. */
export function patternTexture(theme: Theme, kind: "dots" | "chars" = "dots", size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const pal = PALETTE[theme];
  g.fillStyle = pal.bg;
  g.fillRect(0, 0, size, size);
  g.fillStyle = pal.dot;
  const step = kind === "dots" ? 16 : 18;
  if (kind === "dots") {
    for (let y = step / 2; y < size; y += step)
      for (let x = step / 2; x < size; x += step) {
        g.beginPath();
        g.arc(x, y, 1.3, 0, Math.PI * 2);
        g.fill();
      }
  } else {
    const glyphs = "$#@%&*+=-:.01";
    g.font = "12px 'IBM Plex Mono', monospace";
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = step; y < size; y += step)
      for (let x = 4; x < size; x += 11) {
        const d = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
        if (rnd() > 1.15 - d) continue;
        g.globalAlpha = 0.25 + rnd() * 0.5;
        g.fillText(glyphs[Math.floor(rnd() * glyphs.length)], x, y);
      }
    g.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A flat backdrop in the page colour so transmissive glass has something to refract. */
export function backdrop(theme: Theme, w = 30, h = 20, kind: "dots" | "chars" = "dots", z = -2) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: patternTexture(theme, kind), toneMapped: false }),
  );
  mesh.position.z = z;
  return mesh;
}

export function slab(w: number, h: number, d: number, r = 0.08, seg = 6) {
  return new RoundedBoxGeometry(w, h, d, seg, r);
}

/** Soft key + rim lights; most of the look comes from the environment map. */
export function studioLights(scene: THREE.Scene, theme: Theme) {
  const key = new THREE.DirectionalLight(0xffffff, theme === "light" ? 1.4 : 2.2);
  key.position.set(3, 5, 6);
  const rim = new THREE.DirectionalLight(0xffffff, theme === "light" ? 0.8 : 1.6); // neutral: no blue cast
  rim.position.set(-6, 2, -3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, theme === "light" ? 0.35 : 0.15));
}

/* ------------------------------------------------------------------ */
/* Render-once: a shared offscreen renderer that turns a small scene   */
/* into a PNG data URL. Use for static objects (risk-card renders,     */
/* metallic symbols) so the page doesn't hold a dozen live WebGL       */
/* contexts. Results are cached by key.                                */
/* ------------------------------------------------------------------ */
let offscreen: THREE.WebGLRenderer | null = null;
const imageCache = new Map<string, string>();

export type BuildScene = (ctx: {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  env: THREE.Texture;
  theme: Theme;
}) => void;

export function renderOnce(
  key: string,
  build: BuildScene,
  opts: { width: number; height: number; theme: Theme; fov?: number; transparent?: boolean },
): string {
  const cacheKey = `${key}:${opts.theme}:${opts.width}x${opts.height}`;
  const hit = imageCache.get(cacheKey);
  if (hit) return hit;
  if (!offscreen) offscreen = createRenderer(undefined, { alpha: true });
  const r = offscreen;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  r.setPixelRatio(dpr);
  r.setSize(opts.width, opts.height, false);
  const scene = new THREE.Scene();
  const env = studioEnvironment(r);
  scene.environment = env;
  if (!opts.transparent) scene.background = new THREE.Color(PALETTE[opts.theme].bg);
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 30, opts.width / opts.height, 0.1, 100);
  camera.position.set(0, 0, 10);
  build({ scene, camera, env, theme: opts.theme });
  r.setClearColor(0x000000, opts.transparent ? 0 : 1);
  r.render(scene, camera);
  const url = r.domElement.toDataURL("image/png");
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
  });
  imageCache.set(cacheKey, url);
  return url;
}
