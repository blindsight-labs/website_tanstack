/* Concept 6 · "The Lens" — the scene.

   One berg, built once and never moved: a faceted block of frosted ice whose tip stands above a
   hairline waterline. In front of it floats the Blindsight mark made physical: the orbit's three
   glass arcs and three chrome nodes rim a clear glass disc. That disc is the lens.

   How the reveal works (and why it is cheap): the water's murk is painted into the ice, its
   hairlines and the backdrop only in the final pass to the screen. For its glass materials
   three.js first renders the opaque scene into a texture that the glass refracts, and in that
   pass (no tone mapping, so no TONE_MAPPING define) the murk is left out. So wherever you look
   through the lens you see the berg as it is: sharp and lit. Outside it, below the reach of the
   light, the berg fades into the page.

   Every motion has a cause:
   - scroll → setProgress: the camera pulls back (the berg never moves; more of it enters the
     frame in height and width) while the lens travels and grows, one move, until its aperture
     holds the whole berg;
   - answers → setLight: how much the organization already sees sets how far the light reaches
     below the waterline, and how murky the rest is;
   - the violet inlay on one node is the risk the lens is flagging (the page names it).

   Client-only: imported dynamically from Concept6.tsx. Renders on demand. */
import { THREE, createRenderer, studioLights, type Theme } from "@/site/three/core";

export type Rect = { x0: number; y0: number; x1: number; y1: number };
/** Stage size (css px) and the screen rects the opening frame (the tip) and the closing frame
 *  (the whole lens) are fitted into. */
export type LensLayout = { W: number; H: number; r0: Rect; r1: Rect };

export type LensScene = {
  resize(l: LensLayout): void;
  /** 0 = the tip, framed tight · 1 = the whole berg inside the lens */
  setProgress(p: number): void;
  /** 0..1: how much of its AI exposure the organization already sees */
  setLight(v: number, instant: boolean): void;
  /** advance the light's easing; true while it is still moving */
  step(dtMs: number): boolean;
  render(): void;
  /** stage px of the flagging node (its centre and radius) and of the lens's centre */
  flag(): { x: number; y: number; r: number; cx: number; cy: number };
  /** stage px of the edge of the light, at the berg's left flank */
  gauge(): { x: number; y: number };
  dispose(): void;
};

export type LensOptions = {
  theme: Theme;
  /** the page colour behind the render (the sheet's) */
  surface: string;
  ink: string;
  signal: string;
};

const TAU = Math.PI * 2;
const deg = (d: number) => (d * Math.PI) / 180;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** one confident move: slow out, slow in */
const smoother = (x: number) => {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const FOV = 20; // a long lens: the pull-back reads as a zoom, not a fly-through

/* the berg (world units; y = 0 is the waterline) */
const HB = 14; // peak to keel
const WL = 0.13; // share of the height above the water
const TOP = WL * HB;
const RMAX = 5;
const ZS = 0.58; // depth squash: the berg is broad to the camera, shallow front to back

/* the lens: the mark, orbit radius 1 */
const LENS_Z = 5; // just in front of the berg's deepest bulge
const TUBE = 0.1;
const GAP = 20; // half-gap of the orbit at each node, degrees
const NODE_A = [0, 128, 232];
const NODE_R = 0.25;
const FLAG = 1; // the node that carries the signal (upper left when the lens settles)
const DISC_R = 1 - TUBE + 0.005;
/** share of the lens radius that is flat, clear glass (inside the bevel) */
const CLEAR = 0.85;

/* where the lens starts: just under the waterline, over the tip's right flank */
const L0 = { x: 1.35, y: -1.15, r: 1.05 };
/* the opening frame: the tip, the waterline, a band of water and the small lens */
const TIP_RECT: Rect = { x0: -2.8, x1: 3.4, y0: -3.2, y1: 2.6 };

/* the light: how far it reaches below the waterline for visibility v (0..1) */
const litDepth = (v: number) => 0.2 + 2.3 * v;

/* ------------------------------------------------------------------ */
/* shaders                                                             */
/* ------------------------------------------------------------------ */
/* murk below the waterline: a thin lit band (w), then, below the edge of the light (x, soft
   over y), murk z that deepens to almost nothing seen at the keel */
const MURK_GLSL = /* glsl */ `
uniform vec4 uC6Murk;
uniform vec3 uC6Page;
float c6Murk( float y ) {
  float under = 1.0 - smoothstep( -0.04, 0.0, y );
  float lit = smoothstep( uC6Murk.x - uC6Murk.y, uC6Murk.x, y );
  float deep = clamp( ( uC6Murk.x - y ) / 12.0, 0.0, 1.0 );
  float below = mix( uC6Murk.z, 0.97, deep * deep );
  return under * mix( below, uC6Murk.w, lit );
}
`;

/* three's Khronos PBR Neutral at exposure 1: the refracted pass is rendered without tone
   mapping, so the ice tone-maps itself there and the lens (toneMapped: false) shows it exactly
   as it looks outside the lens */
const NEUTRAL_GLSL = /* glsl */ `
vec3 c6Neutral( vec3 color ) {
  const float StartCompression = 0.8 - 0.04;
  const float Desaturation = 0.15;
  float x = min( color.r, min( color.g, color.b ) );
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak < StartCompression ) return color;
  float d = 1.0 - StartCompression;
  float newPeak = 1.0 - d * d / ( peak + d - StartCompression );
  color *= newPeak / peak;
  float g = 1.0 - 1.0 / ( Desaturation * ( peak - newPeak ) + 1.0 );
  return mix( color, vec3( newPeak ), g );
}
`;

const WORLD_VERT = /* glsl */ `
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4( position, 1.0 );
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

/* ------------------------------------------------------------------ */
/* the berg                                                            */
/* ------------------------------------------------------------------ */
/** Radius of the berg at t (0 = peak, 1 = keel): a narrow tip, a mass that flares out just
 *  under the water, a broad blunt keel. */
function profile(t: number) {
  const u = clamp01(t);
  if (u < WL) return RMAX * 0.3 * Math.pow(u / WL, 0.8);
  if (u < 0.4) {
    const k = (u - WL) / (0.4 - WL);
    return RMAX * (0.3 + 0.7 * (1 - (1 - k) * (1 - k)));
  }
  return RMAX * Math.pow(Math.max(0, 1 - Math.pow((u - 0.4) / 0.6, 2.6)), 0.55);
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
  // 500 facets: enough rows for a chiselled tip, few enough to stay crystal, not smooth
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
    // a jagged summit: the tip carries more relief, and a second, lower peak on its left
    const top = 1 - clamp01(t / 0.16);
    const relief = 0.14 + 0.24 * top;
    const r = profile(t) * (1 + relief * n1(p.x * 1.4, p.y * 1.4, p.z * 1.4)) + 0.02;
    const shoulder =
      top * 0.45 * Math.max(0, -dx * 0.8 + 0.2) * Math.sin(Math.PI * clamp01(t / 0.16));
    const y =
      TOP - t * HB + 0.4 * n2(p.x, p.y, p.z) * Math.sin(Math.PI * clamp01(t * 1.1)) + shoulder;
    // lopsided below: one shoulder bulges out and the mass leans right, so it is no spindle
    const deep = clamp01((t - 0.3) / 0.3);
    const theta = Math.atan2(dz, dx);
    const rr =
      r *
      (1 +
        0.25 * deep * Math.max(0, Math.cos(theta - 0.25)) -
        0.08 * deep * Math.max(0, Math.cos(theta - 3.1)));
    const lean = 0.5 * Math.sin(Math.PI * clamp01((t - 0.3) / 0.7));
    pos.setXYZ(i, dx * rr + lean, Math.min(TOP, y), dz * rr * ZS);
  }
  // chip it: seeded planes shear off whole sides, so the berg has a few big flat faces and a
  // chiselled summit instead of a smooth cone
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cuts: { n: THREE.Vector3; p: THREE.Vector3 }[] = [];
  const addCut = (tc: number, a: number, tilt: number, k: number) => {
    const r = profile(tc) * k;
    cuts.push({
      n: new THREE.Vector3(Math.cos(a), tilt, (Math.sin(a) / ZS) * 0.8).normalize(),
      p: new THREE.Vector3(Math.cos(a) * r, TOP - tc * HB, Math.sin(a) * r * ZS),
    });
  };
  for (let i = 0; i < 3; i++)
    addCut(0.03 + rnd() * 0.06, rnd() * TAU, 0.9 + rnd() * 0.9, 0.6 + rnd() * 0.3); // summit
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
    pos.setXYZ(i, p.x, Math.min(TOP, p.y), p.z);
  }
  geo.computeVertexNormals(); // non-indexed: flat facets
  // the circle (in the camera's plane) that holds the whole berg: where the lens ends
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  let R = 0;
  for (let i = 0; i < pos.count; i++)
    R = Math.max(R, Math.hypot(pos.getX(i) - cx, pos.getY(i) - cy));
  return { geo, cx, cy, R };
}

/** The studio, re-lit for ice and glass: a grey dome with black flags and narrow bright strips,
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
    const az = deg(azDeg);
    const el = deg(elDeg);
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
export async function createLensScene(
  canvas: HTMLCanvasElement,
  opts: LensOptions,
): Promise<LensScene> {
  const dark = opts.theme === "dark";
  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  const page = new THREE.Color().setStyle(opts.surface);
  const ink = new THREE.Color().setStyle(opts.ink);
  renderer.setClearColor(page, 1);

  const scene = new THREE.Scene();
  const env = bergEnvironment(renderer, dark);
  scene.environment = env;
  studioLights(scene, opts.theme);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);

  const berg = bergGeometry();
  // the end of the move: the lens centred on the berg, its clear glass holding all of it (the
  // berg's front bulge sits nearer the camera, so it looks ~7% larger than its outline)
  const L1 = { x: berg.cx, y: berg.cy, r: (berg.R * 1.08) / CLEAR };

  // shared by every murky material; the values change, the objects do not
  const uMurk = { value: new THREE.Vector4(-litDepth(0.28), 0.45, 0.78, 0.1) };
  const uPage = { value: page.clone() };

  /* ---- the backdrop: a dot field in the page colour, faint, fading out away from the berg.
     Its pitch is fixed in the world, so the dots grow denser as the camera pulls back ---- */
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 170),
    new THREE.ShaderMaterial({
      uniforms: {
        uC6Murk: uMurk,
        uC6Page: uPage,
        uInk: { value: ink.clone() },
        uAlpha: { value: dark ? 0.22 : 0.15 },
        uPitch: { value: 0.5 },
        uCenter: { value: new THREE.Vector2(berg.cx, berg.cy + 1.5) },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uInk; uniform float uAlpha; uniform float uPitch; uniform vec2 uCenter;
        varying vec3 vW;
        void main() {
          vec2 f = fract( vW.xy / uPitch ) - 0.5;
          float px = 1.0 / max( fwidth( vW.x ), 1e-5 ); // device px per world unit
          float d = length( f ) * uPitch * px;
          float a = ( 1.0 - smoothstep( 0.9, 2.1, d ) ) * uAlpha;
          a *= 1.0 - smoothstep( 6.0, 14.0, distance( vW.xy, uCenter ) );
          #ifdef TONE_MAPPING
            // the murk on the wall lines up with the waterline at the berg's plane (z = 0)
            float yEff = cameraPosition.y + ( vW.y - cameraPosition.y ) * cameraPosition.z / ( cameraPosition.z - vW.z );
            a *= 1.0 - c6Murk( yEff );
          #endif
          gl_FragColor = vec4( mix( uC6Page, uInk, a ), 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  back.position.set(0, -5, -10);
  scene.add(back);

  /* ---- the waterline: one hairline, one horizon. Behind the berg's front, so on the ice the
     waterline is where the murk begins; kept ~1.2 css px thick at every zoom ---- */
  const wlGeo = new THREE.PlaneGeometry(52, 1, 4, 1);
  {
    const lineCol = page.clone().lerp(ink, dark ? 0.42 : 0.36);
    const cols: number[] = [];
    const pos = wlGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const c = Math.abs(pos.getX(i)) > 25 ? page : lineCol;
      cols.push(c.r, c.g, c.b);
    }
    wlGeo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  }
  const waterline = new THREE.Mesh(
    wlGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  );
  scene.add(waterline);

  /* ---- the berg: frosted ice, opaque, so the lens's glass can refract it ---- */
  const bergMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#7C7F88" : "#F2F3F6"),
    roughness: dark ? 0.4 : 0.46,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    flatShading: true,
    envMapIntensity: dark ? 1.35 : 1,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  bergMat.onBeforeCompile = (sh) => {
    sh.uniforms.uC6Murk = uMurk;
    sh.uniforms.uC6Page = uPage;
    sh.vertexShader =
      "varying vec3 vC6W;\n" +
      sh.vertexShader.replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\n vC6W = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;",
      );
    sh.fragmentShader =
      "varying vec3 vC6W;\n" +
      MURK_GLSL +
      NEUTRAL_GLSL +
      sh.fragmentShader.replace(
        "#include <tonemapping_fragment>",
        /* glsl */ `#include <tonemapping_fragment>
        #ifdef TONE_MAPPING
          gl_FragColor.rgb = mix( gl_FragColor.rgb, uC6Page, c6Murk( vC6W.y ) );
        #else
          gl_FragColor.rgb = c6Neutral( gl_FragColor.rgb );
        #endif`,
      );
  };
  const bergMesh = new THREE.Mesh(berg.geo, bergMat);
  scene.add(bergMesh);

  // the facets as quiet hairlines (opaque, so the lens sees them too)
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(berg.geo, 12),
    new THREE.ShaderMaterial({
      uniforms: {
        uC6Murk: uMurk,
        uC6Page: uPage,
        uCol: { value: page.clone().lerp(ink, 0.3) },
      },
      vertexShader: WORLD_VERT,
      fragmentShader:
        MURK_GLSL +
        /* glsl */ `
        uniform vec3 uCol;
        varying vec3 vW;
        void main() {
          vec3 c = uCol;
          #ifdef TONE_MAPPING
            c = mix( c, uC6Page, c6Murk( vW.y ) );
          #endif
          gl_FragColor = vec4( c, 1.0 );
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(edges);

  /* ---- the lens: the mark ---- */
  const lens = new THREE.Group();
  scene.add(lens);
  // glass that shows the refracted pass as is (it is tone-mapped already, see NEUTRAL_GLSL)
  const glass = (thickness: number) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness,
      ior: 1.5,
      specularIntensity: 1,
      envMapIntensity: dark ? 1.2 : 1,
      toneMapped: false,
    });
  const matArc = glass(0.3);
  const matDisc = glass(0.12);
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#E6E8EC" : "#ECEEF2"),
    metalness: 1,
    roughness: 0.08,
    envMapIntensity: 1.1,
  });

  // the clear disc inside the orbit
  lens.add(new THREE.Mesh(puck(DISC_R, 0.09, 0.045), matDisc));
  // the orbit: three glass arcs with rounded ends, a gap at each node
  const capGeo = new THREE.SphereGeometry(TUBE, 24, 12);
  NODE_A.forEach((a, i) => {
    const a0 = a + GAP;
    const a1 = (NODE_A[i + 1] ?? 360) - GAP;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1, TUBE, 20, 120, deg(a1 - a0)), matArc);
    arc.rotation.z = deg(a0);
    lens.add(arc);
    for (const e of [a0, a1]) {
      const cap = new THREE.Mesh(capGeo, matArc);
      cap.position.set(Math.cos(deg(e)), Math.sin(deg(e)), 0);
      lens.add(cap);
    }
  });
  // the nodes: chrome discs on the orbit
  const nodeGeo = puck(NODE_R, 0.22, 0.08);
  NODE_A.forEach((a) => {
    const n = new THREE.Mesh(nodeGeo, matChrome);
    n.position.set(Math.cos(deg(a)), Math.sin(deg(a)), 0.03);
    lens.add(n);
  });
  // the page's one violet: a small inlay on the flagging node, kept ~5 css px at every size
  const FLAG_P = new THREE.Vector3(Math.cos(deg(NODE_A[FLAG])), Math.sin(deg(NODE_A[FLAG])), 0.142);
  const inlay = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setStyle(opts.signal),
      toneMapped: false,
    }),
  );
  inlay.position.copy(FLAG_P);
  lens.add(inlay);

  /* ---- state ---- */
  let W = 1;
  let H = 1;
  type Fit = { s: number; wx: number; wy: number; sx: number; sy: number };
  let F0: Fit = { s: 100, wx: 0, wy: 0, sx: 0, sy: 0 };
  let F1: Fit = F0;
  let prog = 0;
  let light = 0.28;
  let lightT = 0.28;
  let sNow = 100; // css px per world unit at the berg's plane
  let lensR = L0.r;

  const fit = (world: Rect, screen: Rect): Fit => ({
    s: Math.max(
      1,
      Math.min(
        (screen.x1 - screen.x0) / (world.x1 - world.x0),
        (screen.y1 - screen.y0) / (world.y1 - world.y0),
      ),
    ),
    wx: (world.x0 + world.x1) / 2,
    wy: (world.y0 + world.y1) / 2,
    sx: (screen.x0 + screen.x1) / 2,
    sy: (screen.y0 + screen.y1) / 2,
  });
  // the closing frame: the whole mark (the 0° node reaches furthest right)
  const LENS_RECT: Rect = {
    x0: L1.x - 1.13 * L1.r,
    x1: L1.x + 1.28 * L1.r,
    y0: L1.y - 1.13 * L1.r,
    y1: L1.y + 1.13 * L1.r,
  };

  const applyLight = () => {
    uMurk.value.set(-litDepth(light), 0.45, 0.86 - 0.3 * light, 0.1);
  };

  const update = () => {
    const e = smoother(prog);
    // the camera: pulls straight back (never tilts); its optical centre slides from the tip's
    // frame to the closing frame, so the berg stays upright and head-on
    const s = F0.s * Math.pow(F1.s / F0.s, e);
    const wx = lerp(F0.wx, F1.wx, e);
    const wy = lerp(F0.wy, F1.wy, e);
    const sx = lerp(F0.sx, F1.sx, e);
    const sy = lerp(F0.sy, F1.sy, e);
    const f = H / (2 * Math.tan(deg(FOV) / 2));
    const cz = f / s;
    const FW = W + 2 * Math.abs(sx - W / 2);
    const FH = H + 2 * Math.abs(sy - H / 2);
    camera.position.set(wx, wy, cz);
    camera.rotation.set(0, 0, 0);
    camera.fov = (2 * Math.atan(FH / (2 * f)) * 180) / Math.PI;
    camera.aspect = FW / FH;
    camera.setViewOffset(FW, FH, FW / 2 - sx, FH / 2 - sy, W, H);
    camera.updateMatrixWorld();
    sNow = s;

    // the lens: one move from the tip's flank to the whole berg; placed at its depth so that
    // it lands exactly where the frame says (sizes are in the berg's plane)
    const tx = lerp(L0.x, L1.x, e);
    const ty = lerp(L0.y, L1.y, e);
    const R = L0.r * Math.pow(L1.r / L0.r, e);
    const k = (cz - LENS_Z) / cz;
    lens.position.set(wx + (tx - wx) * k, wy + (ty - wy) * k, LENS_Z);
    lens.scale.setScalar(R * k);
    // it comes in turned and tilted, and settles face-on as it arrives
    const u = 1 - e;
    lens.rotation.set(0.12 * u, -0.34 * u, deg(-60) * u);
    inlay.scale.setScalar(Math.min(0.11, 5 / (R * s)));
    lens.updateMatrixWorld(true);
    lensR = R;

    // the waterline stays a hairline at every zoom
    waterline.scale.y = 1.2 / s;
    waterline.position.set(wx, 0, 0);
  };

  const v3 = new THREE.Vector3();
  const toPx = (v: THREE.Vector3) => {
    v.project(camera);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };

  applyLight();

  return {
    resize(l) {
      W = Math.max(1, l.W);
      H = Math.max(1, l.H);
      renderer.setSize(W, H, false);
      F0 = fit(TIP_RECT, l.r0);
      F1 = fit(LENS_RECT, l.r1);
      update();
    },
    setProgress(p) {
      prog = clamp01(p);
    },
    setLight(v, instant) {
      lightT = clamp01(v);
      if (instant) {
        light = lightT;
        applyLight();
      }
    },
    step(dtMs) {
      const e = 1 - Math.exp(-Math.min(64, dtMs) / 220);
      light += (lightT - light) * e;
      const moving = Math.abs(lightT - light) > 0.0015;
      if (!moving) light = lightT;
      applyLight();
      update();
      return moving;
    },
    render() {
      renderer.render(scene, camera);
    },
    flag() {
      v3.copy(FLAG_P).setZ(0.14);
      lens.localToWorld(v3);
      const q = toPx(v3);
      v3.set(0, 0, 0);
      lens.localToWorld(v3);
      const c = toPx(v3);
      return { x: q.x, y: q.y, r: NODE_R * lensR * sNow, cx: c.x, cy: c.y };
    },
    gauge() {
      const y = -litDepth(light);
      const t = (TOP - y) / HB;
      v3.set(-profile(t) * 1.12 - 0.1, y, 0);
      return toPx(v3);
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      capGeo.dispose();
      nodeGeo.dispose();
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
