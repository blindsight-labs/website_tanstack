/* Version B · the object kit. The landing's product-shot studio (src/site/Risks.tsx) ported
   for the page headers: the same white cyclorama / black room, the same floor carrying a
   hairline grid and dot field that clear glass visibly bends, the same glass / chrome / satin,
   and print as flat ink (never metal). Violet stays one small signal.
   Client-only: this folder is imported dynamically from ../Still.tsx. */
import type * as T from "three";

import { THREE } from "@/site/three/core";

export type Theme = "light" | "dark";
export type Tone = { theme: Theme; surface: string; dot: string; ink: string };
export type Ctx = { scene: T.Scene; camera: T.PerspectiveCamera; env: T.Texture; theme: Theme };

export const TAU = Math.PI * 2;
export const deg = (d: number) => (d * Math.PI) / 180;
export const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ------------------------------------------------------------------ */
/* the surface: hairline grid + dot field fading out from a halo        */
/* ------------------------------------------------------------------ */
type Shadow = { x: number; y: number; rx: number; ry: number; a: number; rot?: number };
export type SurfaceOpts = {
  extent: number;
  halo: { x: number; y: number; r: number };
  shadows?: Shadow[];
  step?: number;
  grid?: number;
  /** overall strength of the grid and dots (walls default to 0.55: print on glass wins) */
  alpha?: number;
  /** a quiet ellipse (grid and dots × k) under a flat glass piece, so it doesn't read as graph paper */
  quiet?: { x: number; y: number; rx: number; ry: number; k: number };
  /** walls only: the pattern fades out between these heights above the floor */
  wallFade?: [number, number];
};

function surfaceTexture(tone: Tone, o: SurfaceOpts) {
  const size = 1536;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const px = (u: number) => ((u + o.extent / 2) / o.extent) * size;
  const scale = size / o.extent;
  g.fillStyle = tone.surface;
  g.fillRect(0, 0, size, size);
  for (const s of o.shadows ?? []) {
    g.save();
    g.translate(px(s.x), px(s.y));
    g.rotate(s.rot ?? 0);
    g.scale(1, s.ry / s.rx);
    const rad = s.rx * scale;
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    const k = tone.theme === "light" ? s.a * 1.5 : s.a * 0.9;
    grd.addColorStop(0, `rgba(0,0,0,${k})`);
    grd.addColorStop(0.45, `rgba(0,0,0,${k * 0.45})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, rad, 0, TAU);
    g.fill();
    g.restore();
  }
  const cx = px(o.halo.x);
  const cy = px(o.halo.y);
  const R = o.halo.r * scale;
  const alpha = o.alpha ?? 1;
  const q = o.quiet;
  const wf = o.wallFade;
  const fade = (x: number, y: number) => {
    let f = (1 - smooth(0.2, 1, Math.hypot(x - cx, y - cy) / R)) * alpha;
    if (q) {
      const d = Math.hypot((x / scale - o.extent / 2 - q.x) / q.rx, (y / scale - o.extent / 2 - q.y) / q.ry);
      f *= 1 - (1 - q.k) * (1 - smooth(0.7, 1.15, d));
    }
    if (wf) f *= 1 - smooth(wf[0], wf[1], o.extent - y / scale);
    return f;
  };
  const gs = (o.grid ?? 0.5) * scale;
  g.strokeStyle = tone.ink;
  g.lineWidth = Math.max(1, scale * 0.006);
  const seg = gs / 4;
  const ga = tone.theme === "light" ? 0.16 : 0.2;
  for (let k = gs / 2; k < size; k += gs) {
    for (let t = 0; t < size; t += seg) {
      const fh = fade(t + seg / 2, k);
      if (fh > 0.02) {
        g.globalAlpha = fh * ga;
        g.beginPath();
        g.moveTo(t, k);
        g.lineTo(t + seg, k);
        g.stroke();
      }
      const fv = fade(k, t + seg / 2);
      if (fv > 0.02) {
        g.globalAlpha = fv * ga;
        g.beginPath();
        g.moveTo(k, t);
        g.lineTo(k, t + seg);
        g.stroke();
      }
    }
  }
  const step = (o.step ?? 0.125) * scale;
  g.fillStyle = tone.dot;
  for (let y = step / 2; y < size; y += step)
    for (let x = step / 2; x < size; x += step) {
      const f = fade(x, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * 0.9;
      g.beginPath();
      g.arc(x, y, Math.max(1.1, step * 0.08), 0, TAU);
      g.fill();
    }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const surfCache = new Map<string, T.Texture>();
function surface(tone: Tone, o: SurfaceOpts) {
  const key = JSON.stringify([tone, o]);
  let map = surfCache.get(key);
  if (!map) {
    map = surfaceTexture(tone, o);
    surfCache.set(key, map);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(o.extent, o.extent), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
}

/** The floor (y = 0). Texture y (down) → world +z (towards the camera). */
export function floor(tone: Tone, o: SurfaceOpts) {
  const m = surface(tone, o);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** A back wall at z = `z`, standing on the floor: upright glass needs a grid behind it to bend.
 *  `halo.y` is a height above the floor; texture y runs down the wall. */
export function wall(
  tone: Tone,
  z: number,
  o: { extent: number; halo: { x: number; y: number; r: number }; step?: number; grid?: number; alpha?: number },
) {
  // quieter than the floor, and gone by ≈3.8 up: it is there to be bent by the glass, never
  // to compete with what is printed on it
  const m = surface(tone, {
    ...o,
    alpha: o.alpha ?? 0.55,
    wallFade: [2.4, 3.8],
    halo: { x: o.halo.x, y: o.extent / 2 - o.halo.y, r: o.halo.r },
  });
  m.position.set(0, o.extent / 2, z);
  return m;
}

/* ------------------------------------------------------------------ */
/* the studios: white cyclorama with black flags / black room          */
/* ------------------------------------------------------------------ */
const envCache: Partial<Record<Theme, T.Texture>> = {};
const angDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
const inBand = (a: number, c: number, w: number) => Math.abs(angDiff(a, c)) < w / 2;
const soft = (x: number, edge: number, w: number) => 1 - smooth(edge - w, edge + w, x);

function lightStudio(a: number, l: number) {
  let v = l < 0 ? 0.76 + 0.12 * smooth(-50, -1, l) : 0.94 + 0.08 * smooth(5, 60, l);
  v *= 1 - 0.85 * soft(Math.abs(l + 5), 4, 2);
  if (inBand(a, 95, 12) && l > -6 && l < 34) v = 0.02;
  if (inBand(a, -95, 12) && l > -6 && l < 40) v = 0.02;
  if (inBand(a, 180, 10) && l > -6 && l < 22) v = 0.03;
  if (inBand(a, 0, 8) && l > -6 && l < 26) v = 0.03;
  if (l > 74) v = 1.4;
  if (inBand(a, -38, 9) && l > 4 && l < 48) v = 4;
  if (inBand(a, -142, 7) && l > 4 && l < 44) v = 3.2;
  if (inBand(a, 118, 12) && l > 10 && l < 32) v = 2;
  return v;
}
function darkStudio(a: number, l: number) {
  let v = l < 0 ? 0.004 : 0.01 + 0.035 * soft(Math.abs(l), 18, 14);
  if (l > 74) v = 0.5;
  if (inBand(a, -38, 8) && l > 2 && l < 46) v = 4.2;
  if (inBand(a, -142, 6) && l > 2 && l < 42) v = 3;
  if (inBand(a, 120, 9) && l > 8 && l < 30) v = 1.4;
  if (inBand(a, 20, 4) && l > 0 && l < 36) v = 1.8;
  if (inBand(a, -156, 5) && l > 8 && l < 40) v = 2.4; // a rim strip behind-left: spheres keep an edge
  return v;
}
function studio(theme: Theme) {
  const hit = envCache[theme];
  if (hit) return hit;
  const W = 512;
  const H = 256;
  const data = new Uint16Array(W * H * 4);
  const h = THREE.DataUtils.toHalfFloat;
  const one = h(1);
  for (let j = 0; j < H; j++) {
    const l = ((j + 0.5) / H - 0.5) * 180;
    for (let i = 0; i < W; i++) {
      const a = ((i + 0.5) / W - 0.5) * 360;
      const v = h(theme === "light" ? lightStudio(a, l) : darkStudio(a, l));
      const k = (j * W + i) * 4;
      data[k] = v;
      data[k + 1] = v;
      data[k + 2] = v;
      data[k + 3] = one;
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  envCache[theme] = tex;
  return tex;
}

export function setup(ctx: Ctx, tone: Tone) {
  ctx.scene.background = new THREE.Color(tone.surface);
  ctx.scene.environment = studio(tone.theme);
  const key = new THREE.DirectionalLight(0xffffff, tone.theme === "light" ? 0.6 : 0.9);
  key.position.set(3, 6, 5);
  ctx.scene.add(key);
}

/** One camera language for every header: a 30° lens, a low 3/4 view. */
export function aim(ctx: Ctx, target: [number, number, number], dist: number, azimuthDeg: number, elevDeg = 24, fov = 30) {
  const { camera } = ctx;
  const e = deg(elevDeg);
  const a = deg(azimuthDeg);
  camera.fov = fov;
  camera.position.set(
    target[0] + Math.sin(a) * Math.cos(e) * dist,
    target[1] + Math.sin(e) * dist,
    target[2] + Math.cos(a) * Math.cos(e) * dist,
  );
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
}

/* ------------------------------------------------------------------ */
/* materials (un-tone-mapped: white seen through glass stays white)     */
/* ------------------------------------------------------------------ */
export function glass(theme: Theme, thickness: number) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness,
    ior: 1.5,
    dispersion: 0.02,
    attenuationColor: new THREE.Color(theme === "light" ? "#F2F3F5" : "#9A9A9E"),
    attenuationDistance: 40,
    specularIntensity: 1,
    envMapIntensity: 1,
    toneMapped: false,
  });
}
/** Smoked glass: the same glass, absorbing (for secondary pieces). */
export function smoke(theme: Theme, thickness = 0.3) {
  const m = glass(theme, thickness);
  m.attenuationColor.set(theme === "light" ? "#9A9DA4" : "#6C7079");
  m.attenuationDistance = 0.9;
  return m;
}
export function chrome(theme: Theme = "light") {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme === "light" ? "#E4E5E9" : "#D6D8DD"),
    metalness: 1,
    roughness: 0.06,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1,
    toneMapped: false,
  });
}
export function satin() {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#9A9CA4"), metalness: 1, roughness: 0.28, envMapIntensity: 1, toneMapped: false });
}
export function graphite(theme: Theme) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme === "light" ? "#2d2e33" : "#1c1d21"),
    roughness: 0.32,
    metalness: 0.15,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
    toneMapped: false,
  });
}
/** A solid sheet of paper (clear glass over paper would vanish). */
export function paper(theme: Theme) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme === "light" ? "#fdfdfd" : "#2e2f35"),
    roughness: theme === "light" ? 0.42 : 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.9,
    toneMapped: false,
  });
}

/** Ink mixed k of the way from the surface: print reads weaker on white, so push it in light. */
export function inkCss(tone: Tone, k: number) {
  const kk = tone.theme === "light" ? Math.min(1, k * 1.3) : k;
  return "#" + new THREE.Color(tone.ink).lerp(new THREE.Color(tone.surface), 1 - kk).getHexString();
}
export function ink(tone: Tone, k = 0.45) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(inkCss(tone, k)), toneMapped: false });
}
export const signalCss = (theme: Theme) => (theme === "dark" ? "#a08cff" : "#6e4bff");

/** A flat printed line on a face (XY plane at z). */
export function bar(parent: T.Object3D, x0: number, y: number, w: number, h: number, z: number, mat: T.Material, depth = 0.004) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat);
  m.position.set(x0 + w / 2, y, z);
  parent.add(m);
  return m;
}
/** A dashed hairline rectangle (an empty entry), left edge at x0. */
export function dashedRect(parent: T.Object3D, x0: number, cy: number, w: number, h: number, z: number, mat: T.Material) {
  const d = 0.05;
  const gap = 0.032;
  const t = 0.009;
  for (let x = 0; x < w - 0.001; x += d + gap) {
    const dw = Math.min(d, w - x);
    bar(parent, x0 + x, cy + h / 2 - t / 2, dw, t, z, mat);
    bar(parent, x0 + x, cy - h / 2 + t / 2, dw, t, z, mat);
  }
  for (let y = 0; y < h - 0.001; y += d + gap) {
    const dh = Math.min(d, h - y);
    bar(parent, x0, cy + h / 2 - y - dh / 2, t, dh, z, mat);
    bar(parent, x0 + w - t, cy + h / 2 - y - dh / 2, t, dh, z, mat);
  }
}
