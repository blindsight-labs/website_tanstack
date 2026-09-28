/* Concept 1 — "The Pull-back": the render. One faceted clear-glass berg in the site's studio,
   standing still; a backdrop that is the page's white above the waterline and the deep's black
   below it; the waterline itself, drawn round the berg's glass as one hairline.

   The only things that change between frames: the camera (scroll: dolly back + a slightly
   wider lens, see frame.ts) and the water level (answers). Rendered on demand by Concept1.tsx.
   Client-only: imported dynamically. */
import { THREE, createRenderer, studioLights, pixelRatio, type Theme } from "@/site/three/core";

import { KEEL, PEAK, type Cam } from "./frame";

export type SceneColors = {
  /** the studio above the water (the sheet's white) */
  above: string;
  /** the deep */
  below: string;
  /** hairlines above the water */
  ink: string;
};

export type BergScene = {
  resize(w: number, h: number): void;
  render(cam: Cam, water: number): void;
  dispose(): void;
};

const TAU = Math.PI * 2;
const HEIGHT = PEAK - KEEL;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Radius of the berg at t (0 = peak, 1 = keel): a small, steep summit, then the mass spreads
 *  out under it, far wider than the tip, and ends blunt. */
function profile(t: number) {
  const u = clamp01(t);
  const TIP = 0.14;
  const WAIST = 0.44;
  const R_TIP = 1.45;
  const R_MAX = 7.2;
  if (u < TIP) return R_TIP * Math.pow(u / TIP, 0.85);
  if (u < WAIST) {
    const k = (u - TIP) / (WAIST - TIP);
    return R_TIP + (R_MAX - R_TIP) * (1 - Math.pow(1 - k, 2.1));
  }
  const k = (u - WAIST) / (1 - WAIST);
  return R_MAX * Math.pow(1 - Math.pow(k, 2.4), 0.5);
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

function bergGeometry() {
  const geo = new THREE.IcosahedronGeometry(1, 4);
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
    // a jagged summit: the upper part carries more relief, and a second, lower peak
    const top = 1 - clamp01(t / 0.2);
    const relief = 0.12 + 0.2 * top;
    const r = profile(t) * (1 + relief * n1(p.x * 1.4, p.y * 1.4, p.z * 1.4)) + 0.02;
    const shoulder =
      top * 0.9 * Math.max(0, -dx * 0.8 + 0.2) * Math.sin(Math.PI * clamp01(t / 0.2));
    const y =
      -t * HEIGHT + 0.55 * n2(p.x, p.y, p.z) * Math.sin(Math.PI * clamp01(t * 1.1)) + shoulder;
    // lopsided below: one side bulges and the mass leans right, so it is no spindle
    const deep = clamp01((t - 0.16) / 0.3);
    const theta = Math.atan2(dz, dx);
    const rr =
      r *
      (1 +
        0.22 * deep * Math.max(0, Math.cos(theta - 0.3)) -
        0.08 * deep * Math.max(0, Math.cos(theta - 3.0)));
    const lean = 0.9 * Math.sin(Math.PI * clamp01((t - 0.2) / 0.8));
    pos.setXYZ(i, dx * rr + lean, Math.min(0, y), dz * rr * 0.78);
  }
  // chip it: seeded planes shear off whole sides, so the ice has big flat faces and a
  // chiselled summit instead of a smooth, lathed shape
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
  for (let i = 0; i < 4; i++)
    addCut(0.03 + rnd() * 0.07, (i / 4) * TAU + rnd() * 0.8, 1.0 + rnd() * 1.0, 0.6 + rnd() * 0.3); // summit
  for (let i = 0; i < 7; i++)
    addCut(0.1 + rnd() * 0.08, (i / 7) * TAU + rnd() * 0.6, 0.1 + rnd() * 0.5, 0.82 + rnd() * 0.12); // the tip's flanks
  for (let i = 0; i < 12; i++)
    addCut(
      0.2 + rnd() * 0.22,
      (i / 12) * TAU + rnd() * 0.4,
      0.35 + rnd() * 0.6,
      0.84 + rnd() * 0.12,
    ); // the skirt
  for (let i = 0; i < 8; i++)
    addCut(0.5 + rnd() * 0.42, (i / 8) * TAU + rnd() * 0.6, -0.3 - rnd() * 0.7, 0.8 + rnd() * 0.14); // keel
  const d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    for (const c of cuts) {
      const k = d.subVectors(p, c.p).dot(c.n);
      if (k > 0) p.addScaledVector(c.n, -k);
    }
    pos.setXYZ(i, p.x, Math.min(0, p.y), p.z);
  }
  // exactly PEAK..KEEL, so the ruler and the waterline maths hold
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  geo.translate(0, PEAK - bb.max.y, 0);
  geo.scale(1, HEIGHT / Math.max(1e-3, bb.max.y - bb.min.y), 1);
  geo.computeVertexNormals(); // non-indexed: flat facets
  return geo;
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

/** a colour as a plain sRGB triple, for shader code that runs after the colour-space chunk */
const srgb = (c: THREE.Color) => {
  const o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, THREE.SRGBColorSpace);
  return new THREE.Vector3(o.r, o.g, o.b);
};

const color = (css: string, fallback: string) => {
  const c = new THREE.Color(fallback);
  try {
    if (css) c.setStyle(css);
  } catch {
    /* keep the fallback */
  }
  return c;
};

export async function createBergScene(
  canvas: HTMLCanvasElement,
  opts: { theme: Theme; colors: SceneColors },
): Promise<BergScene> {
  const { theme } = opts;
  const dark = theme === "dark";
  const renderer = createRenderer(canvas);
  // the stage is full-bleed: keep the fill rate sane on an integrated GPU
  renderer.setPixelRatio(pixelRatio(1.5));
  renderer.transmissionResolutionScale = 0.75;
  const above = color(opts.colors.above, dark ? "#0d0d10" : "#ffffff");
  const below = color(opts.colors.below, dark ? "#16161a" : "#060607");
  const ink = color(opts.colors.ink, dark ? "#f4f4f6" : "#0b0b0d");
  const light = new THREE.Color("#f4f4f6");
  renderer.setClearColor(above, 1);

  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, dark);
  scene.environment = env;
  studioLights(scene, theme);
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 400);
  const disposables: { dispose(): void }[] = [env];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const water = { value: -2.8 };

  /* ---- the studio: one backdrop, the page's white above the waterline, the deep below ----
     The split is where the eye's ray crosses the waterline at the berg's centre plane, so the
     backdrop's edge and the berg's waterline read as ONE horizon from any camera distance.
     A faint dot field gives the glass something to bend. */
  const backdrop = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(420, 320)),
    keep(
      new THREE.ShaderMaterial({
        uniforms: {
          water,
          above: { value: above },
          below: { value: below },
          dotAbove: { value: ink.clone() },
          dotBelow: { value: light.clone() },
          aAbove: { value: dark ? 0.2 : 0.13 },
          aBelow: { value: dark ? 0.1 : 0.14 },
          spacing: { value: 0.5 },
          lineCol: { value: ink.clone() },
          lineA: { value: dark ? 0.32 : 0.0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float water; uniform vec3 above; uniform vec3 below;
          uniform vec3 dotAbove; uniform vec3 dotBelow; uniform float aAbove; uniform float aBelow;
          uniform float spacing; uniform vec3 lineCol; uniform float lineA;
          varying vec3 vW;
          void main() {
            float k = cameraPosition.z / (cameraPosition.z - vW.z);
            float y0 = cameraPosition.y + (vW.y - cameraPosition.y) * k;
            bool under = y0 < water;
            vec3 col = under ? below : above;
            // dots: a constant ~2px, fading out once the grid gets denser than ~8px
            float px = max(fwidth(vW.x), 1e-5);
            vec2 c = (fract(vW.xy / spacing) - 0.5) * spacing;
            float d = length(c);
            float r = px * 1.05;
            float dotm = 1.0 - smoothstep(r - px * 0.6, r + px * 0.6, d);
            dotm *= smoothstep(6.0, 11.0, spacing / px);
            col = mix(col, under ? dotBelow : dotAbove, dotm * (under ? aBelow : aAbove));
            // the horizon as a hairline (dark theme: the two greys are close)
            float fw = max(fwidth(y0), 1e-5);
            float line = 1.0 - smoothstep(0.0, fw * 1.2, abs(y0 - water));
            col = mix(col, lineCol, line * lineA);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    ),
  );
  backdrop.position.set(0, -10, -16);
  scene.add(backdrop);

  /* ---- the berg ---- */
  const bergGeo = keep(bergGeometry());
  const bergMat = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      // a thin refraction offset: a thick one bends the deep up into the tip just above the
      // waterline (a dark strip)
      thickness: 0.7,
      ior: 1.31,
      dispersion: 0.03,
      flatShading: true,
      attenuationColor: new THREE.Color(dark ? "#C9CBD1" : "#D9DCE1"),
      attenuationDistance: dark ? 30 : 12,
      specularIntensity: 1,
      envMapIntensity: dark ? 1.5 : 1.15,
    }),
  );
  // the waterline, drawn round the glass: one hairline where the surface crosses the water
  const ringCol = srgb(dark ? light : ink);
  const ringA = dark ? 0.5 : 0.55;
  bergMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWater = water;
    shader.uniforms.uRingCol = { value: ringCol };
    shader.uniforms.uRingA = { value: ringA };
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying float vBergY;\nvoid main() {")
      .replace(
        "#include <project_vertex>",
        "#include <project_vertex>\n\tvBergY = (modelMatrix * vec4(transformed, 1.0)).y;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        "uniform float uWater;\nuniform vec3 uRingCol;\nuniform float uRingA;\nvarying float vBergY;\nvoid main() {",
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        {
          float fw = max(fwidth(vBergY), 1e-5);
          float ring = 1.0 - smoothstep(0.0, fw * 1.4, abs(vBergY - uWater));
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uRingCol, ring * uRingA);
        }`,
      );
  };
  const berg = new THREE.Mesh(bergGeo, bergMat);
  scene.add(berg);

  // the facets as quiet hairlines: ink above the waterline, light below it
  const edgeGeo = keep(new THREE.EdgesGeometry(bergGeo, 16));
  const edgeMat = (aAbove: number, aBelow: number, through: boolean) =>
    keep(
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: !through,
        uniforms: {
          water,
          top: { value: ink.clone() },
          bottom: { value: light.clone() },
          aTop: { value: aAbove },
          aBottom: { value: aBelow },
        },
        vertexShader: /* glsl */ `
          varying float vY;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vY = w.y;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float water; uniform vec3 top; uniform vec3 bottom; uniform float aTop; uniform float aBottom;
          varying float vY;
          void main() {
            bool under = vY < water;
            gl_FragColor = vec4(under ? bottom : top, under ? aBottom : aTop);
            #include <colorspace_fragment>
          }`,
      }),
    );
  const edgesFront = new THREE.LineSegments(
    edgeGeo,
    edgeMat(dark ? 0.3 : 0.22, dark ? 0.22 : 0.26, false),
  );
  const edgesBack = new THREE.LineSegments(
    edgeGeo,
    edgeMat(dark ? 0.08 : 0.06, dark ? 0.06 : 0.07, true),
  );
  edgesBack.renderOrder = 4;
  edgesFront.renderOrder = 6;
  scene.add(edgesBack, edgesFront);

  let W = 1;
  let H = 1;
  return {
    resize(w, h) {
      W = Math.max(1, Math.round(w));
      H = Math.max(1, Math.round(h));
      renderer.setSize(W, H, false);
    },
    render(cam, waterY) {
      water.value = waterY;
      camera.fov = cam.fov;
      camera.aspect = W / H;
      camera.position.set(0, cam.camY, cam.D);
      camera.rotation.set(0, 0, 0);
      // the frame maths is in stage px; the canvas may be a few px off while resizing
      const sx = W / Math.max(1, cam.W);
      const sy = H / Math.max(1, cam.H);
      camera.setViewOffset(W, H, cam.offX * sx, cam.offY * sy, W, H);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      renderer.render(scene, camera);
    },
    dispose() {
      disposables.forEach((x) => x.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
