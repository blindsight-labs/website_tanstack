/* Risks — owner "top". Section 2: "What AI risk actually looks like."
   Four scenario cards, each with its own rendered glass/chrome object (renderOnce
   → <img>, no live canvases). One grid, varied composition: the object bleeds off
   a different card edge each time.

   Glass recipe (the founders' main ask): clear glass reads through its edges, so
   every object is thin or hollow, sits on a floor/wall carrying a faint hairline
   grid it can visibly bend, and is lit by a white cyclorama with narrow black
   flags. Printed text is flat ink, not metal. Violet appears exactly once in the
   whole section: the hidden instruction in card 02. */
import { useEffect, useRef, useState } from "react";
import type * as T from "three";

import type { BuildScene } from "./three/core";
import { risks, type RiskId } from "./content";
import { Label, useReveal, type SectionProps, type Theme } from "./shared";

type Core = typeof import("./three/core");
type Ctx = Parameters<BuildScene>[0];
type Tone = { theme: Theme; surface: string; dot: string; ink: string };

/* ------------------------------------------------------------------ */
/* Scene helpers                                                       */
/* ------------------------------------------------------------------ */

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Canvas texture in the card colour: a hairline grid + dot field fading out from
 *  `halo` (straight lines bending through a glass edge are what make glass read as
 *  clear), plus soft contact shadows baked in. World units on a square plane of
 *  side `extent` centred at the origin. */
function surfaceTexture(
  core: Core,
  tone: Tone,
  o: {
    extent: number;
    halo: { x: number; y: number; r: number };
    shadows?: { x: number; y: number; rx: number; ry: number; a: number; rot?: number }[];
    step?: number;
    grid?: number;
  },
) {
  const { THREE } = core;
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
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  const cx = px(o.halo.x);
  const cy = px(o.halo.y);
  const R = o.halo.r * scale;
  const fade = (x: number, y: number) => 1 - smooth(0.2, 1, Math.hypot(x - cx, y - cy) / R);

  // hairline grid: drawn as short segments so it fades with the halo
  const gs = (o.grid ?? 0.5) * scale;
  g.strokeStyle = tone.ink;
  g.lineWidth = Math.max(1, scale * 0.006);
  const seg = gs / 4;
  for (let k = gs / 2; k < size; k += gs) {
    for (let t = 0; t < size; t += seg) {
      const fh = fade(t + seg / 2, k);
      if (fh > 0.02) {
        g.globalAlpha = fh * (tone.theme === "light" ? 0.16 : 0.2);
        g.beginPath();
        g.moveTo(t, k);
        g.lineTo(t + seg, k);
        g.stroke();
      }
      const fv = fade(k, t + seg / 2);
      if (fv > 0.02) {
        g.globalAlpha = fv * (tone.theme === "light" ? 0.16 : 0.2);
        g.beginPath();
        g.moveTo(k, t);
        g.lineTo(k, t + seg);
        g.stroke();
      }
    }
  }

  // dots between the lines
  const step = (o.step ?? 0.125) * scale;
  g.fillStyle = tone.dot;
  for (let y = step / 2; y < size; y += step)
    for (let x = step / 2; x < size; x += step) {
      const f = fade(x, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * 0.9;
      g.beginPath();
      g.arc(x, y, Math.max(1.1, step * 0.08), 0, Math.PI * 2);
      g.fill();
    }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function floor(core: Core, tone: Tone, o: Parameters<typeof surfaceTexture>[2]) {
  const { THREE } = core;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(o.extent, o.extent),
    new THREE.MeshBasicMaterial({ map: surfaceTexture(core, tone, o), toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2; // texture y (down) → world +z (towards camera)
  return m;
}

/* Product-shot studios, painted procedurally into an HDR equirect (three turns it
   into a PMREM on the shared renderer). Light: a white cyclorama — bright floor,
   white walls, one narrow overhead strip (a big overhead cap flashes every top face
   white) — with narrow black flags at grazing angles, so clear glass gets a thin
   dark outline and chrome its black/white banding. Dark: a black room with a few
   strip softboxes, so glass is defined only by its bright rims. */
const envCache: Partial<Record<Theme, T.Texture>> = {};
const angDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
const inBand = (a: number, c: number, w: number) => Math.abs(angDiff(a, c)) < w / 2;
const soft = (x: number, edge: number, w: number) => 1 - smooth(edge - w, edge + w, x);

function lightStudio(a: number, l: number) {
  let v = l < 0 ? 0.76 + 0.12 * smooth(-50, -1, l) : 0.94 + 0.08 * smooth(5, 60, l);
  v *= 1 - 0.85 * soft(Math.abs(l + 5), 4, 2); // floor/wall seam: the horizon chrome picks up
  if (inBand(a, 95, 12) && l > -6 && l < 34) v = 0.02; // grazing black flags: glass edges go dark
  if (inBand(a, -95, 12) && l > -6 && l < 40) v = 0.02;
  if (inBand(a, 180, 10) && l > -6 && l < 22) v = 0.03;
  if (inBand(a, 0, 8) && l > -6 && l < 26) v = 0.03;
  if (l > 74) v = 1.4; // narrow overhead strip
  if (inBand(a, -38, 9) && l > 4 && l < 48) v = 4; // tall strips behind the set
  if (inBand(a, -142, 7) && l > 4 && l < 44) v = 3.2;
  if (inBand(a, 118, 12) && l > 10 && l < 32) v = 2; // small front fill
  return v;
}

function darkStudio(a: number, l: number) {
  let v = l < 0 ? 0.004 : 0.01 + 0.035 * soft(Math.abs(l), 18, 14);
  if (l > 74) v = 0.5;
  if (inBand(a, -38, 8) && l > 2 && l < 46) v = 4.2;
  if (inBand(a, -142, 6) && l > 2 && l < 42) v = 3;
  if (inBand(a, 120, 9) && l > 8 && l < 30) v = 1.4;
  if (inBand(a, 20, 4) && l > 0 && l < 36) v = 1.8;
  return v;
}

function studio(core: Core, theme: Theme) {
  const hit = envCache[theme];
  if (hit) return hit;
  const { THREE } = core;
  const W = 512;
  const H = 256;
  const data = new Uint16Array(W * H * 4);
  const h = THREE.DataUtils.toHalfFloat;
  const one = h(1);
  for (let j = 0; j < H; j++) {
    const l = ((j + 0.5) / H - 0.5) * 180; // latitude, deg (row 0 = straight down)
    for (let i = 0; i < W; i++) {
      const a = ((i + 0.5) / W - 0.5) * 360; // azimuth: 0 = +x, 90 = +z (camera side), -90 = back
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

function setup(core: Core, ctx: Ctx, tone: Tone) {
  const { THREE } = core;
  ctx.scene.background = new THREE.Color(tone.surface);
  ctx.scene.environment = studio(core, tone.theme);
  const key = new THREE.DirectionalLight(0xffffff, tone.theme === "light" ? 0.6 : 0.9);
  key.position.set(3, 6, 5);
  ctx.scene.add(key);
}

/** Every card shares one camera language: same elevation, same lens. */
const ELEV = 28;
function aim(ctx: Ctx, target: [number, number, number], dist: number, azimuthDeg: number, fov = 30) {
  const { camera } = ctx;
  const e = (ELEV * Math.PI) / 180;
  const a = (azimuthDeg * Math.PI) / 180;
  camera.fov = fov;
  camera.position.set(
    target[0] + Math.sin(a) * Math.cos(e) * dist,
    target[1] + Math.sin(e) * dist,
    target[2] + Math.cos(a) * Math.cos(e) * dist,
  );
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
}

/* Materials: un-tone-mapped so white seen through glass stays the card's white. */
function glass(core: Core, theme: Theme, thickness: number) {
  const m = core.materials.glass(theme);
  m.thickness = thickness;
  m.dispersion = 0.02;
  m.envMapIntensity = 1;
  m.attenuationColor.set(theme === "light" ? "#F2F3F5" : "#9A9A9E");
  m.attenuationDistance = 40;
  m.toneMapped = false;
  return m;
}
function chrome(core: Core) {
  const m = core.materials.chrome();
  m.color.set("#E4E5E9");
  m.roughness = 0.06;
  m.envMapIntensity = 1;
  m.toneMapped = false;
  return m;
}
function satin(core: Core) {
  const m = core.materials.satin();
  m.color.set("#9A9CA4");
  m.roughness = 0.28;
  m.envMapIntensity = 1;
  m.toneMapped = false;
  return m;
}
/** Printed text: flat, unlit ink mixed against the card surface (opaque, so it
 *  is seen through and bent by the glass like real print). */
function ink(core: Core, tone: Tone, k = 0.45) {
  const { THREE } = core;
  // print reads weaker on white than on black: push it a little darker in light
  const kk = tone.theme === "light" ? Math.min(1, k * 1.3) : k;
  const c = new THREE.Color(tone.ink).lerp(new THREE.Color(tone.surface), 1 - kk);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}
function signal(core: Core, theme: Theme, k = 1) {
  const m = core.materials.signal(theme, theme === "dark" ? 0.5 * k : k);
  m.toneMapped = false;
  return m;
}

/** A flat printed line lying on a sheet's face. */
function bar(core: Core, parent: T.Object3D, x0: number, y: number, w: number, h: number, z: number, mat: T.Material, depth = 0.004) {
  const { THREE } = core;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), mat);
  m.position.set(x0 + w / 2, y, z);
  parent.add(m);
  return m;
}

/** A page of print: a heading line and at most six body lines. */
function print(core: Core, parent: T.Object3D, W: number, H: number, face: number, mat: T.Material, strong: T.Material, rows: number[], strongAt = -1) {
  const x0 = -W / 2 + 0.22;
  bar(core, parent, x0, H / 2 - 0.3, W * 0.36, 0.05, face, strong);
  rows.slice(0, 6).forEach((w, i) => {
    const y = H / 2 - 0.58 - i * 0.2;
    bar(core, parent, x0, y, w, i === strongAt ? 0.026 : 0.016, face, i === strongAt ? strong : mat);
  });
}

/* ------------------------------------------------------------------ */
/* 01 · Data leaves through a prompt                                   */
/* A thin glass contract sliding out through a low chrome slot.        */
/* ------------------------------------------------------------------ */
function sceneLeak(core: Core, ctx: Ctx, tone: Tone) {
  const { THREE } = core;
  const { scene } = ctx;
  setup(core, ctx, tone);
  scene.add(
    floor(core, tone, {
      extent: 16,
      halo: { x: -0.2, y: -0.4, r: 3.6 },
      shadows: [{ x: 0.6, y: 0.3, rx: 3.3, ry: 0.7, a: 0.12 }],
    }),
  );

  // the slot: two low brushed-metal rails and a dark throat between them (mirror
  // chrome streaked the rails with the studio's black flags: the heaviest thing
  // on the page)
  const cm = chrome(core);
  cm.color.set("#D6D8DD");
  cm.roughness = 0.24;
  const L = 5.6;
  const H = 0.12;
  const D = 0.46;
  const gap = 0.12;
  const cx = 0.9;
  const rail = core.slab(L, H, D, 0.05, 6);
  const front = new THREE.Mesh(rail, cm);
  front.position.set(cx, H / 2, gap / 2 + D / 2);
  const back = new THREE.Mesh(rail, cm);
  back.position.set(cx, H / 2, -(gap / 2 + D / 2));
  const throat = new THREE.Mesh(
    new THREE.BoxGeometry(L - 0.2, 0.02, gap + 0.02),
    new THREE.MeshBasicMaterial({ color: tone.theme === "light" ? 0x1a1b1f : 0x000000 }),
  );
  throat.position.set(cx, H - 0.005, 0);
  scene.add(front, back, throat);

  // the contract: thin clear glass, flat print
  const W = 2.3;
  const Hd = 3.2;
  const Td = 0.03;
  const doc = new THREE.Group();
  doc.add(new THREE.Mesh(core.slab(W, Hd, Td, 0.012, 3), glass(core, tone.theme, 0.12)));
  const face = Td / 2 + 0.003;
  print(core, doc, W, Hd, face, ink(core, tone, 0.4), ink(core, tone, 0.75), [1.7, 1.6, 1.72, 1.1, 1.66, 1.4]);
  const tilt = -0.16;
  const cy = H + Hd / 2 - 1.05;
  doc.rotation.x = tilt;
  const localY = (H - cy) / Math.cos(tilt);
  doc.position.set(0, cy, -localY * Math.sin(tilt));
  scene.add(doc);

  // framed so the sheet leaves through the top edge of the card
  aim(ctx, [0.1, 1.55, 0], 8.4, 16);
}

/* ------------------------------------------------------------------ */
/* 02 · An attack hidden in a document                                 */
/* A glass invoice lying on the desk; the hidden instruction is sealed */
/* inside the glass — the section's one violet line.                   */
/* ------------------------------------------------------------------ */
function sceneInvoice(core: Core, ctx: Ctx, tone: Tone) {
  const { THREE } = core;
  const { scene } = ctx;
  setup(core, ctx, tone);
  scene.add(
    floor(core, tone, {
      extent: 16,
      halo: { x: 0.4, y: 0.2, r: 3.6 },
      shadows: [{ x: 0.5, y: 0.35, rx: 1.9, ry: 1.5, a: 0.08 }],
    }),
  );

  const W = 2.7;
  const Hh = 3.5;
  const Tk = 0.14; // thick enough for its edges to catch a rim
  const inv = new THREE.Group();
  inv.add(new THREE.Mesh(core.slab(W, Hh, Tk, 0.06, 5), glass(core, tone.theme, 0.4)));
  const face = Tk / 2 + 0.003;
  const soft = ink(core, tone, 0.4);
  const strong = ink(core, tone, 0.75);
  const L = -W / 2 + 0.24;
  const R = W / 2 - 0.24;
  const mark = new THREE.Mesh(core.slab(0.3, 0.3, 0.05, 0.05, 3), chrome(core));
  mark.position.set(L + 0.15, Hh / 2 - 0.38, face + 0.02);
  inv.add(mark);
  bar(core, inv, R - 0.84, Hh / 2 - 0.3, 0.84, 0.05, face, strong);
  bar(core, inv, R - 0.56, Hh / 2 - 0.48, 0.56, 0.016, face, soft);
  const items = [1.18, 0.96, 1.3, 1.06, 0.88];
  items.forEach((w, i) => {
    const y = Hh / 2 - 1.1 - i * 0.26;
    bar(core, inv, L, y, w, 0.016, face, soft);
    bar(core, inv, R - 0.32, y, 0.32, 0.016, face, soft);
  });
  // the hidden instruction: inside the glass, between items 2 and 3
  bar(core, inv, L + 0.02, Hh / 2 - 1.1 - 2.5 * 0.26, W - 0.52, 0.02, 0, signal(core, tone.theme, 1), 0.01);
  bar(core, inv, L, Hh / 2 - 2.6, R - L, 0.008, face, soft);
  bar(core, inv, R - 0.6, Hh / 2 - 2.82, 0.6, 0.05, face, strong);

  // lying flat, turned a little; bleeds off the right edge of the card
  inv.rotation.set(-Math.PI / 2, 0, 0.42);
  inv.position.set(0.9, Tk / 2 + 0.01, 0.1);
  scene.add(inv);

  aim(ctx, [0.55, 0.1, 0.2], 6.4, 12);
}

/* ------------------------------------------------------------------ */
/* 03 · A poisoned source                                              */
/* A neat stack of glass knowledge pages; one has been pulled out of   */
/* line, and its altered passage is printed darker.                    */
/* ------------------------------------------------------------------ */
function sceneStack(core: Core, ctx: Ctx, tone: Tone) {
  const { THREE } = core;
  const { scene } = ctx;
  setup(core, ctx, tone);
  scene.add(
    floor(core, tone, {
      extent: 16,
      halo: { x: 0.2, y: 0.2, r: 3.8 },
      shadows: [
        { x: -0.2, y: 0.2, rx: 1.8, ry: 2.1, a: 0.035 },
        { x: 1.3, y: 0.5, rx: 1.3, ry: 1.2, a: 0.02, rot: -0.2 },
      ],
    }),
  );
  const W = 2.2;
  const D = 2.8;
  const Tk = 0.06; // thick enough for every page edge to carry a dark flag line
  const pitch = 0.13;
  const g = glass(core, tone.theme, 0.12);
  const soft = ink(core, tone, 0.35);
  const strong = ink(core, tone, 0.8);
  // on white, clear sheets vanish: each page carries a printed hairline border
  const edge = ink(core, tone, 0.3);
  const EW = 0.014;
  const n = 6;
  const odd = 3;
  const group = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const page = new THREE.Group();
    page.add(new THREE.Mesh(core.slab(W, Tk, D, 0.018, 3), g));
    page.position.y = Tk / 2 + 0.02 + i * pitch;
    const holder = new THREE.Group();
    holder.rotation.x = -Math.PI / 2; // print on the top face
    page.add(holder);
    const fz = Tk / 2 + 0.002;
    bar(core, holder, -W / 2, D / 2 - EW / 2, W, EW, fz, edge);
    bar(core, holder, -W / 2, -D / 2 + EW / 2, W, EW, fz, edge);
    bar(core, holder, -W / 2, 0, EW, D, fz, edge);
    bar(core, holder, W / 2 - EW, 0, EW, D, fz, edge);
    if (i === n - 1) print(core, holder, W, D, Tk / 2 + 0.003, soft, soft, [1.7, 1.6, 1.72, 1.1]);
    if (i === odd) {
      print(core, holder, W, D, Tk / 2 + 0.003, soft, strong, [1.72, 1.6, 1.7, 1.66, 1.2, 1.7], 3);
      page.position.x = 1.25;
      page.position.z = 0.32;
      page.position.y += 0.02;
      page.rotation.y = -0.24;
    }
    group.add(page);
  }
  group.scale.setScalar(1.35);
  scene.add(group);

  // the stack fills the card with every corner in frame; only the pulled-out page
  // comes close to the right edge
  aim(ctx, [0.55, 0.45, 0.3], 8.9, 22);
}

/* ------------------------------------------------------------------ */
/* 04 · AI nobody registered                                           */
/* A chrome connector pushed into one clear glass block (the CRM). The */
/* cable runs out of frame: someone plugged it in from elsewhere.      */
/* ------------------------------------------------------------------ */
function sceneConnector(core: Core, ctx: Ctx, tone: Tone) {
  const { THREE } = core;
  const { scene } = ctx;
  setup(core, ctx, tone);
  scene.add(
    floor(core, tone, {
      extent: 16,
      halo: { x: 0.3, y: 0.0, r: 3.8 },
      shadows: [
        { x: 0.1, y: 0.15, rx: 1.6, ry: 1.5, a: 0.12 },
        { x: -1.9, y: 0.9, rx: 1.4, ry: 0.45, a: 0.07, rot: 0.5 },
      ],
    }),
  );

  // the CRM: a thin clear glass tablet, every customer record printed on it
  // (thick solid glass always goes grey — thin glass stays clear)
  const Sx = 2.6;
  const Sz = 2.0;
  const Hb = 0.34;
  const dir = new THREE.Vector3(-1, 0, 0.62).normalize();
  const turn = Math.atan2(dir.z, -dir.x); // so the tablet's -x edge looks straight at the plug
  const tablet = new THREE.Group();
  tablet.add(new THREE.Mesh(core.slab(Sx, Hb, Sz, 0.1, 5), glass(core, tone.theme, 0.5)));
  const holder = new THREE.Group();
  holder.rotation.x = -Math.PI / 2; // records printed on the top face
  tablet.add(holder);
  const rec = ink(core, tone, 0.4);
  const recStrong = ink(core, tone, 0.7);
  for (let i = 0; i < 7; i++) {
    const y = Sz / 2 - 0.3 - i * 0.22;
    bar(core, holder, -Sx / 2 + 0.26, y, 0.5, 0.016, Hb / 2 + 0.003, recStrong);
    bar(core, holder, -Sx / 2 + 0.9, y, 0.9 + ((i * 37) % 5) * 0.08, 0.016, Hb / 2 + 0.003, rec);
    bar(core, holder, Sx / 2 - 0.62, y, 0.36, 0.016, Hb / 2 + 0.003, rec);
  }
  tablet.position.y = Hb / 2;
  tablet.rotation.y = turn;
  scene.add(tablet);

  const cm = chrome(core);
  const st = satin(core);
  const midY = Hb / 2;
  const plug = new THREE.Group();
  const body = new THREE.Mesh(core.slab(0.78, 0.26, 0.44, 0.1, 6), cm);
  const tip = new THREE.Mesh(core.slab(0.46, 0.12, 0.28, 0.03, 3), cm);
  tip.position.x = 0.52; // runs into the glass edge
  const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 32), st);
  boot.rotation.z = Math.PI / 2;
  boot.position.x = -0.52;
  plug.add(body, tip, boot);
  plug.rotation.y = turn;
  const c = dir.clone().multiplyScalar(Sx * 0.5 + 0.42);
  plug.position.set(c.x, midY, c.z);
  scene.add(plug);

  const back = new THREE.Vector3(-0.66, 0, 0).applyEuler(plug.rotation).add(plug.position);
  const away = dir.clone();
  const curve = new THREE.CatmullRomCurve3([
    back,
    back.clone().add(away.clone().multiplyScalar(0.4)).setY(midY),
    back.clone().add(away.clone().multiplyScalar(0.9)).setY(0.08),
    back.clone().add(away.clone().multiplyScalar(1.5)).add(new THREE.Vector3(0, 0, 0.35)).setY(0.07),
    back.clone().add(away.clone().multiplyScalar(3.2)).add(new THREE.Vector3(0, 0, 1.4)).setY(0.07),
    back.clone().add(away.clone().multiplyScalar(6)).add(new THREE.Vector3(0, 0, 3.2)).setY(0.07),
  ]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.07, 20, false), st));

  aim(ctx, [-0.2, 0.2, 0.2], 6.6, -20);
}

/* ------------------------------------------------------------------ */

const SCENES: Record<RiskId, { build: (core: Core, ctx: Ctx, tone: Tone) => void; w: number; h: number }> = {
  "prompt-leak": { build: sceneLeak, w: 520, h: 540 },
  "hidden-instruction": { build: sceneInvoice, w: 560, h: 360 },
  "poisoned-source": { build: sceneStack, w: 560, h: 360 },
  "unregistered-ai": { build: sceneConnector, w: 520, h: 540 },
};

const LAYOUT = ["a", "b", "c", "d"] as const;
const VERSION = "v8";

export function Risks({ theme }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const [imgs, setImgs] = useState<Record<string, string>>({});
  useReveal(ref);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    let started = false;

    const run = async () => {
      if (started) return;
      started = true;
      const core = await import("./three/core");
      const css = getComputedStyle(el);
      const tone: Tone = {
        theme,
        surface: css.getPropertyValue("--surface").trim() || (theme === "dark" ? "#0d0d10" : "#ffffff"),
        dot: css.getPropertyValue("--ink-4").trim() || (theme === "dark" ? "#3c3e45" : "#b4b7bf"),
        ink: css.getPropertyValue("--ink").trim() || (theme === "dark" ? "#f4f4f6" : "#0b0b0d"),
      };
      for (const r of risks) {
        if (cancelled) return;
        // one render per frame so the page never stalls on all four at once
        await new Promise((res) => requestAnimationFrame(() => res(null)));
        if (cancelled) return;
        const s = SCENES[r.id];
        try {
          const url = core.renderOnce(`risk-${r.id}-${VERSION}`, (ctx) => s.build(core, ctx, tone), {
            width: s.w,
            height: s.h,
            theme,
          });
          setImgs((p) => ({ ...p, [`${theme}:${r.id}`]: url }));
        } catch (err) {
          console.warn("[risks] render failed", r.id, err);
        }
      }
    };

    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          void run();
        }
      },
      { rootMargin: "1200px 0px" },
    );
    io.observe(el);
    const t = window.setTimeout(() => void run(), 2200);
    return () => {
      cancelled = true;
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [theme]);

  return (
    <section ref={ref} id="risks" className="mD-section mT-risks" aria-labelledby="mT-risks-h">
      <div className="mD-container">
        <header className="mT-risks__head" data-reveal>
          <Label>The new risks</Label>
          <h2 id="mT-risks-h" className="mD-h1">
            What AI risk actually looks like.
          </h2>
        </header>

        <ul role="list" className="mT-risks__grid">
          {risks.map((r, i) => {
            const src = imgs[`${theme}:${r.id}`];
            return (
              <li key={r.id} className={`mT-risk mT-risk--${LAYOUT[i]}`} data-reveal>
                <div className="mT-risk__fig" aria-hidden="true">
                  {src && <img src={src} alt="" className="mT-risk__img" draggable={false} />}
                </div>
                <div className="mT-risk__text">
                  <h3 className="mD-h3">{r.title}</h3>
                  <p>{r.scenario}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
