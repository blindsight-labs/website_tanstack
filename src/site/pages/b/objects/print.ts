/* Version B · print and the mark. On-object type is flat ink on a canvas plane (like real
   print, seen through and bent by the glass), never floating. The mark is the logo's own
   geometry (as src/site/seq/scene.ts builds it): a hub, three arms to three nodes, three
   orbit arcs; here a thick glass bezel with the hub as a real lens. */
import type * as T from "three";

import { THREE } from "@/site/three/core";
import { TAU, deg, glass, chrome, type Tone } from "./kit";

type Align = "left" | "center" | "right";
/** `opaque`: alpha-tested instead of blended. three.js leaves transparent meshes out of the
 *  transmission pass, so print seen THROUGH glass (a lower card, the floor under a lens)
 *  must be opaque or it vanishes. Print seen directly stays blended (smoother edges). */
type WordOpts = { weight?: number; align?: Align; opacity?: number; box?: boolean; sans?: boolean; track?: number; opaque?: boolean };

const MONO = `"IBM Plex Mono", ui-monospace, monospace`;
const SANS = `"IBM Plex Sans", system-ui, sans-serif`;

function planeFor(c: HTMLCanvasElement, h: number, align: Align, opacity: number, opaque = false) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const ww = h * (c.width / c.height);
  const geo = new THREE.PlaneGeometry(ww, h);
  if (align === "left") geo.translate(ww / 2, 0, 0);
  if (align === "right") geo.translate(-ww / 2, 0, 0);
  const mat = opaque
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: false, alphaTest: 0.5, toneMapped: false })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 2;
  return m;
}

/** One line of type printed in the XY plane (rotate it onto its face). `h`: the line's world
 *  height. `box`: a hairline rubber-stamp border. */
export function words(str: string, h: number, color: string, o: WordOpts = {}) {
  const px = 96;
  const pad = o.box ? px * 0.42 : px * 0.06;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing?: string };
  const setFont = () => {
    g.font = `${o.weight ?? 500} ${px}px ${o.sans ? SANS : MONO}`;
    g.letterSpacing = `${Math.round(px * (o.track ?? (o.sans ? -0.01 : 0.06)))}px`;
  };
  setFont();
  const tw = g.measureText(str).width;
  c.width = Math.ceil(tw + pad * 2);
  c.height = Math.ceil(px * 1.25 + (o.box ? pad * 0.9 : 0));
  setFont();
  g.fillStyle = color;
  g.textBaseline = "middle";
  g.fillText(str, pad, c.height / 2 + px * 0.04);
  if (o.box) {
    g.strokeStyle = color;
    g.lineWidth = px * 0.07;
    const i = g.lineWidth;
    g.beginPath();
    g.roundRect(i, i, c.width - 2 * i, c.height - 2 * i, px * 0.12);
    g.stroke();
  }
  return planeFor(c, h, o.align ?? "left", o.opacity ?? 1, o.opaque);
}

/** `words` lying flat, face up, reading along +x. */
export function flatWords(str: string, h: number, color: string, o: WordOpts = {}) {
  const m = words(str, h, color, o);
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** A block of sans lines (a headline set on an object), top-left anchored at (0, 0);
 *  `lh` is the world height of one line. Returns the mesh and its world height. */
export function textBlock(lines: string[], lh: number, color: string, o: { weight?: number; mono?: boolean; opaque?: boolean } = {}) {
  const px = 96;
  const lead = 1.18;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")! as CanvasRenderingContext2D & { letterSpacing?: string };
  const setFont = () => {
    g.font = `${o.weight ?? 400} ${px}px ${o.mono ? MONO : SANS}`;
    g.letterSpacing = o.mono ? `${Math.round(px * 0.05)}px` : `${Math.round(-px * 0.02)}px`;
  };
  setFont();
  const tw = Math.max(1, ...lines.map((l) => g.measureText(l).width));
  c.width = Math.ceil(tw + px * 0.2);
  c.height = Math.ceil(px * lead * lines.length + px * 0.2);
  setFont();
  g.fillStyle = color;
  g.textBaseline = "middle";
  lines.forEach((l, i) => g.fillText(l, px * 0.06, px * 0.1 + px * lead * (i + 0.5)));
  const h = lh * lead * lines.length + lh * 0.2;
  const m = planeFor(c, h, "left", 1, o.opaque);
  m.geometry.translate(0, -h / 2, 0);
  return { mesh: m, h, w: h * (c.width / c.height) };
}

/** Greedy wrap by character count (for headlines printed on objects). */
export function wrap(text: string, max: number, lines: number) {
  const out: string[] = [];
  let cur = "";
  for (const w of text.split(/\s+/)) {
    if ((cur + " " + w).trim().length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = kept[lines - 1].replace(/[,.;:]?$/, "…");
    return kept;
  }
  return out;
}

/** A soft contact shadow: a radial blob on a plane (XY; rotate it flat). It MULTIPLIES onto
 *  what is under it (white = no change) from the opaque list, so it also shows through glass:
 *  a blended (transparent) blob is left out of the transmission pass and the glass would cut
 *  a clean hole in it. renderOrder 1: after the floor. */
export function shadowBlob(w: number, h: number, alpha: number) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 128, 128);
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, `rgba(0,0,0,${alpha})`);
  grd.addColorStop(0.5, `rgba(0,0,0,${alpha * 0.4})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: false,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  m.renderOrder = 1;
  return m;
}

/* ------------------------------------------------------------------ */
/* shapes                                                               */
/* ------------------------------------------------------------------ */
export function extrude(shape: T.Shape, depth: number, bev: number, curveSegments = 64) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments });
  g.translate(0, 0, -depth / 2);
  return g;
}

export function roundRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const [x0, y0, x1, y1] = [-w / 2, -h / 2, w / 2, h / 2];
  s.moveTo(x0 + r, y0);
  s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
  s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** A flat mitred ribbon along a shape's outline at z (the 1 px ink rim that holds clear glass
 *  on white): offsets o0..o1 outward from the outline. */
export function outlineRibbon(shape: T.Shape, o0: number, o1: number, z: number) {
  const raw = shape.getPoints(28);
  const pts = raw.filter((p, i) => i === 0 || p.distanceTo(raw[i - 1]) > 1e-6);
  if (pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const sgn = THREE.ShapeUtils.isClockWise(pts) ? -1 : 1;
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n];
    const b = pts[i];
    const c = pts[(i + 1) % n];
    const l1 = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const l2 = Math.hypot(c.x - b.x, c.y - b.y) || 1;
    const n1x = (sgn * (b.y - a.y)) / l1;
    const n1y = (-sgn * (b.x - a.x)) / l1;
    const n2x = (sgn * (c.y - b.y)) / l2;
    const n2y = (-sgn * (c.x - b.x)) / l2;
    const ml = Math.hypot(n1x + n2x, n1y + n2y) || 1;
    const mx = (n1x + n2x) / ml;
    const my = (n1y + n2y) / ml;
    const k = 1 / Math.max(0.5, mx * n1x + my * n1y);
    pos.push(b.x + mx * o0 * k, b.y + my * o0 * k, z, b.x + mx * o1 * k, b.y + my * o1 * k, z);
    const j = i * 2;
    const jn = ((i + 1) % n) * 2;
    idx.push(j, j + 1, jn, jn, j + 1, jn + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function rimMaterial(tone: Tone, opacity: number) {
  return new THREE.MeshBasicMaterial({
    color: new THREE.Color(tone.theme === "dark" ? "#ffffff" : tone.ink),
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/** Clear glass with a closed ink rim on its front (and a faint tint so it holds at a glance). */
export function rimmedSlab(
  shape: T.Shape,
  depth: number,
  bev: number,
  mat: T.Material,
  tone: Tone,
  rimW = 0.014,
  o: { rim?: number; tint?: number } = {},
) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(extrude(shape, depth, bev), mat));
  const zf = depth / 2 + bev + 0.003;
  g.add(new THREE.Mesh(outlineRibbon(shape, bev - rimW, bev, zf), rimMaterial(tone, o.rim ?? (tone.theme === "dark" ? 0.75 : 0.7))));
  const tint = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), rimMaterial(tone, o.tint ?? (tone.theme === "dark" ? 0.06 : 0.04)));
  tint.position.z = zf - 0.001;
  g.add(tint);
  return g;
}

/* ------------------------------------------------------------------ */
/* the mark (mark units: orbit radius = 1)                              */
/* ------------------------------------------------------------------ */
const [HUB_R, NODE_R, BAND, ARM_W] = [0.5, 0.25, 0.22, 0.17];
const NODE_A = [0, 128, 232];
const GAP = 20;
export const MARK_R = 1 + BAND / 2;

function disc(r: number, x = 0, y = 0) {
  const s = new THREE.Shape();
  s.absarc(x, y, r, 0, TAU, false);
  return s;
}
/** hub, three arms and three node discs as ONE outline, inset by the bevel */
function coreShape(bev: number, hole = 0) {
  const [hr, nr, hw] = [HUB_R - bev, NODE_R - bev, ARM_W / 2 - bev];
  const [ah, an] = [Math.asin(hw / hr), Math.asin(hw / nr)];
  const u = 1 - Math.sqrt(nr * nr - hw * hw);
  const A = NODE_A.map(deg);
  const s = new THREE.Shape();
  A.forEach((a, i) => {
    const [c, sn] = [Math.cos(a), Math.sin(a)];
    const from = (i ? A[i - 1] : A[A.length - 1] - TAU) + ah;
    if (!i) s.moveTo(hr * Math.cos(from), hr * Math.sin(from));
    s.absarc(0, 0, hr, from, a - ah, false);
    s.lineTo(c * u + sn * hw, sn * u - c * hw);
    s.absarc(c, sn, nr, a + Math.PI + an, a + Math.PI - an + TAU, false);
    s.lineTo(hr * Math.cos(a + ah), hr * Math.sin(a + ah));
  });
  s.closePath();
  if (hole > 0) {
    const h = new THREE.Path();
    h.absarc(0, 0, hole + bev, 0, TAU, true);
    s.holes.push(h);
  }
  return s;
}
function arcShape(a0: number, a1: number, bev: number) {
  const hw = BAND / 2 - bev;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  return sh;
}
const arcs = (bev: number) => NODE_A.map((a, i) => arcShape(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP), bev));
export const markNodes = NODE_A.map((a) => [Math.cos(deg(a)), Math.sin(deg(a))] as const);

/** The mark as a glass object facing +z: a thick glass bezel (rimmed), the hub a real biconvex
 *  lens in a chrome ring, chrome bezels round the nodes. */
export function glassMark(
  tone: Tone,
  o: { depth?: number; lens?: boolean; rimW?: number; rim?: number; tint?: number; body?: boolean } = {},
) {
  const depth = o.depth ?? 0.1;
  const bev = 0.03;
  const LENS = 0.3;
  const g = new THREE.Group();
  const clear = glass(tone.theme, 0.35);
  clear.ior = 1.45;
  if (o.body && tone.theme === "light") {
    // on white, clear glass needs a little body to hold: a faint grey through its thickness
    clear.attenuationColor.set("#CFD2D8");
    clear.attenuationDistance = 1.6;
  }
  const lens = o.lens ?? true;
  const rim = { rim: o.rim, tint: o.tint };
  g.add(rimmedSlab(coreShape(bev, lens ? LENS : 0), depth, bev, clear, tone, o.rimW, rim));
  arcs(bev * 0.6).forEach((s) => g.add(rimmedSlab(s, depth * 0.7, bev * 0.6, clear, tone, o.rimW, rim)));
  const cm = chrome(tone.theme);
  const zf = depth / 2 + bev;
  if (lens) {
    const lensGlass = glass(tone.theme, 0.8);
    lensGlass.ior = 1.52;
    const body = new THREE.Mesh(new THREE.SphereGeometry(LENS, 64, 32), lensGlass);
    body.scale.z = (depth + 2 * bev + 0.12) / (2 * LENS);
    g.add(body);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(LENS + bev * 0.6, 0.024, 16, 128), cm);
    ring.scale.z = 1.6;
    g.add(ring);
  }
  const bz = new THREE.TorusGeometry(NODE_R - 0.06, 0.014, 12, 96);
  markNodes.forEach(([x, y]) => {
    const m = new THREE.Mesh(bz, cm);
    m.position.set(x, y, zf - 0.006);
    m.scale.z = 0.6;
    g.add(m);
  });
  return g;
}

/** The mark as a blind emboss: a shallow relief in the plate's own material (colourless). */
export function embossMark(mat: T.Material, height = 0.02) {
  const g = new THREE.Group();
  const bev = 0.012;
  g.add(new THREE.Mesh(extrude(coreShape(bev), height, bev, 48), mat));
  arcs(bev).forEach((s) => g.add(new THREE.Mesh(extrude(s, height, bev, 48), mat)));
  return g;
}

export { disc };
