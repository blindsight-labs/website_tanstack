/* Sequence — owner "sequence". Section 3: "See it, secure it, prove it."
 *
 * ONE continuous sticky sequence. The four problems from the Risks section are
 * the thread, rendered as the same four objects (contract in a chrome slot, glass
 * invoice with a sealed-in line, a stack of glass knowledge pages, a connector in
 * a glass records block), standing on a dotted map of the company's AI.
 *
 *   See     p 0.00–0.34  a glass scan blade crosses the map; each problem resolves
 *                        from a dashed ghost into glass/chrome, gets labelled and a
 *                        decision (Block / Approve / Protect / Onboard).
 *   Secure  p 0.34–0.67  each is handled in turn: pseudonymised, stripped,
 *                        quarantined, paused.
 *   Prove   p 0.67–1.00  each handling seals (chrome hex) into an audit entry, in
 *                        time order; then the frameworks it is logged for.
 *
 * Violet (--signal) is only ever on the item being acted on at that moment.
 * Desktop: ONE live WebGL canvas behind the sticky sheet, rendered on demand
 * (scroll), never in a loop. Phone / reduced motion: stacked stages with
 * renderOnce stills of each settled state + the same product panel.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type * as T from "three";

import { risks, sequence, type RiskId } from "./content";
import { Label, type SectionProps, type Theme } from "./shared";

type Core = typeof import("./three/core");
type V3 = [number, number, number];

/* ================================================================== */
/* Story data                                                          */
/* ================================================================== */

const STAGES = sequence.stages;
const DECISIONS = STAGES[0].decisions ?? ["Block", "Approve", "Protect", "Onboard"];
const FRAMEWORKS = STAGES[2].frameworks ?? [];
const CLAUSES = sequence.tagline.split(/(?<=,)\s+/); // "See it," "secure it," "prove it."

/** What Blindsight decides (See) and does (Secure) for each scenario. */
const ACT: Record<RiskId, { decision: number; doing: string; done: string }> = {
  "prompt-leak": { decision: 2, doing: "Pseudonymising", done: "Pseudonymised" },
  "hidden-instruction": { decision: 2, doing: "Stripping", done: "Stripped" },
  "poisoned-source": { decision: 2, doing: "Quarantining", done: "Quarantined" },
  "unregistered-ai": { decision: 0, doing: "Pausing", done: "Paused" },
};

const ITEMS = risks.map((r, i) => {
  const th = sequence.thread[r.id];
  const [policy = "", verdict = "", time = ""] = th.prove.split(" · ");
  return {
    ...r,
    i,
    n: String(i + 1).padStart(2, "0"),
    act: ACT[r.id],
    th,
    audit: { policy: policy.replace(/^policy\s+/, ""), verdict, time, subject: th.see.split(" ")[0] },
  };
});

/** The audit trail is a ledger: entries in the order they happened. */
const AUDIT_ORDER = [...ITEMS].sort((a, b) => a.audit.time.localeCompare(b.audit.time)).map((x) => x.i);

/* ---------------- timeline (p = scroll progress 0..1) ---------------- */
const TL = {
  stage: [0.34, 0.67] as const,
  scan: [0.03, 0.29] as const,
  found: [0.08, 0.13, 0.18, 0.23],
  handle: [0.37, 0.44, 0.51, 0.58],
  handleDur: 0.055,
  sealDur: 0.035,
  evidence: 0.94,
};
const SEAL: number[] = [];
AUDIT_ORDER.forEach((i, k) => (SEAL[i] = 0.71 + k * 0.06));
/** Settled end state of each stage (stills, reduced motion). */
const SETTLED = [0.3, 0.66, 1];
/** Playback: ms per stage, and the hold on the finished state before it loops. */
const STAGE_MS = [5200, 5200, 6000];
const HOLD_MS = 3200;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) => t * t * (3 - 2 * t);
const backOut = (t: number) => {
  const c = 1.5;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

type Stage = 0 | 1 | 2;
const stageOf = (p: number): Stage => (p < TL.stage[0] ? 0 : p < TL.stage[1] ? 1 : 2);
const BOUNDS = [0, TL.stage[0], TL.stage[1], 1];
const stageLocal = (p: number, k: number) => seg(p, BOUNDS[k], BOUNDS[k + 1]);

/** The item being acted on right now (the only thing allowed to be violet), or -1. */
function currentAt(p: number) {
  const st = stageOf(p);
  if (st === 0) {
    for (let i = 3; i >= 0; i--) if (p >= TL.found[i]) return p < (TL.found[i + 1] ?? TL.scan[1]) ? i : -1;
    return -1;
  }
  if (st === 1) return TL.handle.findIndex((h) => p >= h && p < h + 0.07);
  return SEAL.findIndex((s) => p >= s && p < s + 0.06);
}

type Snap = {
  stage: Stage;
  found: boolean[];
  acting: number;
  handled: boolean[];
  sealed: boolean[];
  current: number;
  evidence: boolean;
};
function snapAt(p: number): Snap {
  return {
    stage: stageOf(p),
    found: TL.found.map((f) => p >= f),
    acting: TL.handle.findIndex((h) => p >= h && p < h + TL.handleDur),
    handled: TL.handle.map((h) => p >= h + TL.handleDur * 0.8),
    sealed: SEAL.map((s) => p >= s + TL.sealDur * 0.5),
    current: currentAt(p),
    evidence: p >= TL.evidence,
  };
}
const count = (b: boolean[]) => b.filter(Boolean).length;

function tagState(i: number, s: Snap) {
  const it = ITEMS[i];
  if (s.stage === 2 && s.sealed[i]) return `Sealed · ${it.audit.policy}`;
  if (s.stage >= 1 && s.handled[i]) return it.act.done;
  if (s.stage === 1 && s.acting === i) return `${it.act.doing}…`;
  return `Found · ${DECISIONS[it.act.decision]}`;
}

/* ================================================================== */
/* 3D — one world, used by the live canvas and by the stills           */
/* ================================================================== */

type Rect = { x: number; y: number; w: number; h: number };
type Anchor = { x: number; y: number; above: boolean };
type Tone = { theme: Theme; surface: string; dot: string };
type Layout = "wide" | "square";

/* Four objects standing on a map. Positions are on the floor (x right, z towards
   the camera). "wide" zig-zags front/back left→right so the scan blade meets
   them in story order; "square" is a 2×2 for narrow stills. */
const LAYOUT: Record<Layout, { pos: [number, number][]; above: boolean[]; elev: number }> = {
  wide: {
    // narrower and deeper: the stage is width-limited, so a tighter spread lets
    // the camera come closer and the objects render larger
    // a clean 2 × 2: front row 01 and 03 (callouts below), back row 02 and 04
    // (callouts above) — no object or callout overlaps another
    pos: [
      [-2.0, 1.55],
      [-1.9, -1.75],
      [2.15, 1.55],
      [1.9, -1.75],
    ],
    above: [false, true, false, true],
    elev: 0.6, // a little higher: the 2 × 2 rows separate cleanly
  },
  square: {
    pos: [
      [-1.25, -1.05],
      [1.2, -1.15],
      [-1.2, 1.15],
      [1.3, 1.05],
    ],
    above: [true, true, false, false],
    elev: 0.62,
  },
};

/* ---------- studio: white cyclorama + black flags (light), black room + strips (dark).
   Same recipe as the Risks renders so the four objects read as the same objects. */
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const angDiff = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;
const inBand = (a: number, c: number, w: number) => Math.abs(angDiff(a, c)) < w / 2;
const soft = (x: number, edge: number, w: number) => 1 - smooth(edge - w, edge + w, x);

/* Same studio as the Risks cards (kept in step by hand): narrow overhead strip,
   grazing black flags, bright floor — clear glass keeps thin dark outlines
   instead of flashing white. */
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
  if (inBand(a, -38, 8) && l > 2 && l < 46) v = 5;
  if (inBand(a, -142, 6) && l > 2 && l < 42) v = 4;
  if (inBand(a, 120, 9) && l > 8 && l < 30) v = 2.4; // camera-side rim strips: glass stays visible on black
  if (inBand(a, 60, 5) && l > 4 && l < 40) v = 3;
  if (inBand(a, 20, 4) && l > 0 && l < 36) v = 1.8;
  return v;
}
const studioCache: Partial<Record<Theme, T.Texture>> = {};
function studio(core: Core, theme: Theme) {
  const hit = studioCache[theme];
  if (hit) return hit;
  const { THREE } = core;
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
      data[k] = data[k + 1] = data[k + 2] = v;
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
  studioCache[theme] = tex;
  return tex;
}

/** The map: a dot field in the sheet colour, fading out from the objects, with
 *  soft contact shadows baked in (so the glass refracts them too). */
function mapTexture(core: Core, tone: Tone, extent: number, blobs: { x: number; z: number; rx: number; rz: number; a: number }[]) {
  const { THREE } = core;
  const size = 2048;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const px = (u: number) => ((u + extent / 2) / extent) * size;
  const scale = size / extent;
  g.fillStyle = tone.surface;
  g.fillRect(0, 0, size, size);
  for (const s of blobs) {
    g.save();
    g.translate(px(s.x), px(s.z));
    g.scale(1, s.rz / s.rx);
    const rad = s.rx * scale;
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    const k = tone.theme === "light" ? s.a : s.a * 0.9;
    grd.addColorStop(0, `rgba(0,0,0,${k})`);
    grd.addColorStop(0.45, `rgba(0,0,0,${k * 0.45})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, rad, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  const step = 0.16 * scale;
  g.fillStyle = tone.dot;
  for (let y = step / 2; y < size; y += step)
    for (let x = step / 2; x < size; x += step) {
      const u = (x / size - 0.5) * extent;
      const v = (y / size - 0.5) * extent;
      // elliptical halo around the objects, wider than deep
      const d = Math.hypot(u / 5.6, v / 3.3);
      const f = 1 - smooth(0.45, 1, d);
      if (f < 0.02) continue;
      g.globalAlpha = f;
      g.beginPath();
      g.arc(x, y, Math.max(1.1, step * 0.085), 0, Math.PI * 2);
      g.fill();
    }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

type Obj = {
  g: T.Group;
  base: V3; // resting rotation
  solids: T.Object3D[];
  ghost: T.LineSegments;
  seal: T.Mesh;
  box: T.Box3; // local bounds, all parts shown
  set(r: number, a: number, sig: boolean): void;
};

type World = {
  update(p: number): void;
  fit(camera: T.PerspectiveCamera, W: number, H: number, stage: Rect): void;
  anchors(camera: T.PerspectiveCamera, W: number, H: number): Anchor[];
  dispose(): void;
};

function buildWorld(core: Core, scene: T.Scene, tone: Tone, layout: Layout): World {
  const { THREE } = core;
  const theme = tone.theme;
  const L = LAYOUT[layout];
  const trash: { dispose(): void }[] = [];
  const keep = <X extends { dispose(): void }>(x: X): X => {
    trash.push(x);
    return x;
  };

  scene.environment = studio(core, theme);
  scene.background = new THREE.Color(tone.surface);
  const key = new THREE.DirectionalLight(0xffffff, theme === "light" ? 0.6 : 0.9);
  key.position.set(3, 6, 5);
  scene.add(key);

  /* materials: core recipes, un-tone-mapped so white through glass stays white */
  const glass = (thickness: number) => {
    const m = keep(core.materials.glass(theme));
    m.thickness = thickness;
    m.dispersion = 0.02;
    m.envMapIntensity = 1;
    m.attenuationColor.set(theme === "light" ? "#F2F3F5" : "#9A9A9E");
    m.attenuationDistance = 40;
    m.toneMapped = false;
    return m;
  };
  const chrome = keep(core.materials.chrome());
  chrome.color.set("#E4E5E9");
  chrome.roughness = 0.06;
  chrome.envMapIntensity = 1;
  chrome.toneMapped = false;
  const sealChrome = keep(chrome.clone());
  sealChrome.flatShading = true;
  const satin = keep(core.materials.satin());
  satin.color.set("#9A9CA4");
  satin.roughness = 0.28;
  satin.envMapIntensity = 1;
  satin.toneMapped = false;
  // printed lines: metal-grey on white; on black, satin mirrors the dark room and
  // the print disappears, so it becomes flat light ink (as in the risk cards)
  const printMat: T.Material =
    theme === "light"
      ? satin
      : keep(new THREE.MeshBasicMaterial({ color: new THREE.Color("#F4F4F6").lerp(new THREE.Color(tone.surface), 0.42), toneMapped: false }));
  const signal = keep(core.materials.signal(theme, 1.1));
  signal.toneMapped = false;
  // quarantine: smoked glass, the same containment language as the hero
  const frosted = glass(0.9);
  frosted.attenuationColor.set(theme === "light" ? "#8D9199" : "#6C7079");
  frosted.attenuationDistance = theme === "light" ? 1.6 : 1.4;
  const throatMat = keep(new THREE.MeshBasicMaterial({ color: theme === "light" ? 0x1a1b1f : 0x000000 }));

  const add = (parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) => {
    keep(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    parent.add(m);
    return m;
  };
  /** printed line on a face: x0 = left edge */
  const bar = (parent: T.Object3D, x0: number, y: number, w: number, h: number, z: number, mat: T.Material, depth = 0.012) =>
    add(parent, new THREE.BoxGeometry(w, h, depth), mat, [x0 + w / 2, y, z]);

  /** dashed hairline boxes: the thing is there, but nobody can see it yet */
  const ghostOf = (parent: T.Object3D, box: T.Box3) => {
    const size = box.getSize(new THREE.Vector3());
    const ctr = box.getCenter(new THREE.Vector3());
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(size.x, size.y, size.z));
    edges.translate(ctr.x, ctr.y, ctr.z);
    keep(edges);
    const mat = keep(
      new THREE.LineDashedMaterial({
        color: new THREE.Color(theme === "light" ? "#0B0B0D" : "#F4F4F6"),
        dashSize: 0.07,
        gapSize: 0.06,
        transparent: true,
        opacity: 0.4,
        toneMapped: false,
      }),
    );
    const ls = new THREE.LineSegments(edges, mat);
    ls.computeLineDistances();
    parent.add(ls);
    return ls;
  };

  const sealGeo = keep(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 6, 1));

  /* ---------------- 01 · contract half-way into a chrome slot ---------------- */
  function contract() {
    const g = new THREE.Group();
    const S = 0.5; // build at the Risks scale, then shrink
    const inner = new THREE.Group();
    inner.scale.setScalar(S);
    g.add(inner);
    const Ls = 4.4;
    const H = 0.46;
    const D = 0.56;
    const gap = 0.2;
    const cx = 0.7;
    const lip = core.slab(Ls, H, D, 0.16, 8);
    const front = add(inner, lip, chrome, [cx, H / 2, gap / 2 + D / 2]);
    const back = add(inner, core.slab(Ls, H, D, 0.16, 8), chrome, [cx, H / 2, -(gap / 2 + D / 2)]);
    const capL = add(inner, core.slab(0.6, H, gap + 0.36, 0.12, 4), chrome, [cx - Ls / 2 + 0.3, H / 2, 0]);
    const throat = add(inner, new THREE.BoxGeometry(Ls - 0.6, H * 0.8, gap + 0.06), throatMat, [cx + 0.3, H * 0.4 - 0.03, 0]);

    const W = 2.2;
    const Hd = 2.9;
    const Td = 0.08;
    const doc = new THREE.Group();
    add(doc, core.slab(W, Hd, Td, 0.04, 4), glass(0.6));
    const face = Td / 2 + 0.006;
    const x0 = -W / 2 + 0.24;
    bar(doc, x0, Hd / 2 - 0.3, 0.62, 0.1, face, printMat);
    bar(doc, W / 2 - 0.24 - 0.34, Hd / 2 - 0.3, 0.34, 0.05, face, printMat);
    const rows = [1.72, 1.64, 1.7, 0.98, 1.68, 1.52, 1.7, 1.2, 1.66, 1.4];
    const SENS = 3;
    let sens: T.Mesh | null = null;
    rows.forEach((w, i) => {
      const y = Hd / 2 - 0.6 - i * 0.165;
      if (i === SENS) sens = bar(doc, x0, y, w, 0.05, face, printMat);
      else bar(doc, x0, y, w, 0.035, face, printMat);
    });
    // pseudonym tokens that replace the sensitive line
    const tokY = Hd / 2 - 0.6 - SENS * 0.165;
    const tokW = rows[SENS];
    const tokGeo = keep(core.slab(0.16, 0.09, 0.03, 0.02, 2));
    const tokens: T.Mesh[] = [];
    for (let k = 0; k < 5; k++) {
      const t = new THREE.Mesh(tokGeo, chrome);
      t.position.set(x0 + 0.08 + k * (tokW / 5) + 0.02, tokY, face + 0.01);
      doc.add(t);
      tokens.push(t);
    }
    const tilt = -0.2;
    const cy0 = H + Hd / 2 - 0.95;
    doc.rotation.x = tilt;
    const place = (cy: number) => {
      const localY = (H - cy) / Math.cos(tilt);
      doc.position.set(0, cy, -localY * Math.sin(tilt));
    };
    place(cy0);
    inner.add(doc);
    inner.position.x = -0.35;

    const box = new THREE.Box3().setFromObject(g);
    const ghost = ghostOf(g, box);
    const seal = new THREE.Mesh(sealGeo, sealChrome);
    seal.position.set(box.max.x - 0.1, box.max.y + 0.05, 0.2);
    g.add(seal);
    const o: Obj = {
      g,
      base: [0, 0.32, 0],
      solids: [front, back, capL, throat, doc],
      ghost,
      seal,
      box,
      set(r, a, sig) {
        const collapse = ease(seg(a, 0, 0.45));
        const s = sens as unknown as T.Mesh;
        s.scale.x = Math.max(0.001, 1 - collapse);
        s.position.x = x0 + (tokW / 2) * (1 - collapse) + 0.001;
        s.visible = collapse < 0.999;
        s.material = sig && a < 0.45 ? signal : printMat;
        tokens.forEach((t, k) => {
          const tk = ease(seg(a, 0.3 + k * 0.07, 0.55 + k * 0.07));
          t.visible = r > 0.02 && tk > 0.001;
          t.scale.setScalar(Math.max(0.001, tk));
        });
        place(cy0 - 0.55 * ease(seg(a, 0.6, 1)));
      },
    };
    return o;
  }

  /* ---------------- 02 · glass invoice, instruction sealed inside ---------------- */
  function invoice() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.scale.setScalar(0.46);
    g.add(inner);
    const W = 2.6;
    const H = 3.4;
    const Tk = 0.22;
    const inv = new THREE.Group();
    add(inv, core.slab(W, H, Tk, 0.09, 8), glass(1.2));
    const face = Tk / 2 + 0.006;
    const Lx = -W / 2 + 0.26;
    const Rx = W / 2 - 0.26;
    add(inv, core.slab(0.34, 0.34, 0.06, 0.07, 4), chrome, [Lx + 0.17, H / 2 - 0.4, face + 0.02]);
    bar(inv, Rx - 0.86, H / 2 - 0.3, 0.86, 0.12, face, printMat);
    bar(inv, Rx - 0.56, H / 2 - 0.5, 0.56, 0.035, face, printMat);
    bar(inv, Lx, H / 2 - 0.86, 0.72, 0.035, face, printMat);
    bar(inv, Lx, H / 2 - 0.98, 0.52, 0.035, face, printMat);
    [1.18, 0.96, 1.3, 1.06, 0.88].forEach((w, i) => {
      const y = H / 2 - 1.34 - i * 0.24;
      bar(inv, Lx, y, w, 0.04, face, printMat);
      bar(inv, Rx - 0.34, y, 0.34, 0.04, face, printMat);
    });
    const hy = H / 2 - 1.34 - 2.5 * 0.24;
    const hidden = bar(inv, Lx + 0.02, hy, W - 0.56, 0.028, 0, printMat, 0.02);
    const hx = hidden.position.x;
    bar(inv, Lx, H / 2 - 2.62, Rx - Lx, 0.012, face, printMat);
    bar(inv, Lx, H / 2 - 2.84, 0.46, 0.06, face, printMat);
    bar(inv, Rx - 0.62, H / 2 - 2.84, 0.62, 0.11, face, chrome, 0.03);
    inv.position.set(0, H / 2 + 0.02, 0);
    inv.rotation.x = -0.05;
    inner.add(inv);
    // the agent reading it: a chrome sphere at its foot
    const agent = add(inner, new THREE.SphereGeometry(0.48, 48, 32), chrome, [1.55, 0.48, 0.55]);

    const box = new THREE.Box3().setFromObject(g);
    const ghost = ghostOf(g, box);
    const seal = new THREE.Mesh(sealGeo, sealChrome);
    seal.position.set(box.max.x - 0.25, box.max.y + 0.05, 0.1);
    g.add(seal);
    return {
      g,
      base: [0, -0.34, 0],
      solids: [inv, agent],
      ghost,
      seal,
      box,
      set(r, a, sig) {
        const lift = ease(seg(a, 0, 0.5));
        const fade = ease(seg(a, 0.5, 0.92));
        hidden.visible = r > 0.5 && fade < 0.999;
        hidden.material = sig && fade < 0.6 ? signal : printMat;
        hidden.position.set(hx + 0.5 * lift, hy + 0.55 * lift, 1.1 * lift);
        hidden.rotation.z = 0.12 * lift;
        hidden.scale.set(Math.max(0.001, 1 - fade), Math.max(0.001, 1 - fade * 0.6), 1);
        agent.position.x = 1.55 + 0.3 * ease(seg(a, 0.6, 1));
      },
    } satisfies Obj;
  }

  /* ---------------- 03 · stack of glass knowledge pages, one pulled out ---------------- */
  function pages() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.scale.setScalar(0.5);
    g.add(inner);
    const W = 2.2;
    const D = 2.8;
    const Tk = 0.06;
    const pitch = 0.15;
    const gm = glass(0.4);
    const top = Tk / 2 + 0.005;
    const lines = (page: T.Group, rows: number[], skip = -1) => {
      const x0 = -W / 2 + 0.24;
      const holder = new THREE.Group();
      holder.rotation.x = -Math.PI / 2;
      page.add(holder);
      bar(holder, x0, D / 2 - 0.32, 0.72, 0.09, top, printMat, 0.01);
      rows.forEach((w, i) => {
        if (i === skip) return;
        bar(holder, x0, D / 2 - 0.6 - i * 0.19, w, 0.035, top, printMat, 0.01);
      });
      return holder;
    };
    const n = 5;
    const odd = 2;
    const solids: T.Object3D[] = [];
    let pulled: T.Group | null = null;
    for (let i = 0; i < n; i++) {
      const page = new THREE.Group();
      add(page, core.slab(W, Tk, D, 0.028, 4), gm);
      page.position.y = Tk / 2 + 0.02 + i * pitch;
      if (i === n - 1) lines(page, [1.72, 1.6, 1.7, 1.1]);
      if (i === odd) pulled = page;
      inner.add(page);
      solids.push(page);
    }
    const pg = pulled as unknown as T.Group;
    const rowsOdd = [1.72, 1.6, 1.7, 1.66, 1.2, 1.7, 1.5, 1.64, 1.3, 1.6, 1.0];
    const BAD = 4;
    const holder = lines(pg, rowsOdd, BAD);
    // the altered passage: its own mesh so it can leave the page
    const passage = bar(holder, -W / 2 + 0.24, D / 2 - 0.6 - BAD * 0.19, rowsOdd[BAD], 0.05, top, printMat, 0.01);
    const out = { x: 1.3, z: 0.34, y: pg.position.y + 0.02, ry: -0.24 };
    const home = { x: 0, z: 0, y: pg.position.y, ry: 0 };
    const pose = (k: number) => {
      pg.position.set(out.x + (home.x - out.x) * k, out.y + (home.y - out.y) * k, out.z + (home.z - out.z) * k);
      pg.rotation.set(0, out.ry * (1 - k), 0.03 * (1 - k));
    };
    pose(0);
    // quarantine: a frosted block beside the stack; the passage ends up inside it
    const qPos = new THREE.Vector3(2.75, 0.62, -0.55);
    const cube = add(inner, core.slab(1.05, 1.05, 1.05, 0.16, 5), frosted, [qPos.x, qPos.y, qPos.z]);
    // passage start pose, in inner space
    inner.updateMatrixWorld(true);
    const m0 = new THREE.Matrix4().copy(inner.matrixWorld).invert().multiply(passage.matrixWorld);
    const p0 = new THREE.Vector3();
    const q0 = new THREE.Quaternion();
    const s0 = new THREE.Vector3();
    m0.decompose(p0, q0, s0);
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2 + 0.5, 0.5, 0.25));
    holder.remove(passage);
    inner.add(passage);
    passage.position.copy(p0);
    passage.quaternion.copy(q0);
    const tmpP = new THREE.Vector3();

    const box = new THREE.Box3().setFromObject(g);
    const ghost = ghostOf(g, box);
    const seal = new THREE.Mesh(sealGeo, sealChrome);
    seal.position.set(box.max.x - 0.2, box.max.y + 0.2, 0.1);
    g.add(seal);
    return {
      g,
      base: [0.1, 0.4, 0],
      solids,
      ghost,
      seal,
      box,
      set(r, a, sig) {
        const move = ease(seg(a, 0, 0.5));
        const q = ease(seg(a, 0.15, 0.5));
        tmpP.copy(p0).lerp(qPos, move);
        tmpP.y += 1.0 * Math.sin(Math.PI * move);
        passage.position.copy(tmpP);
        passage.quaternion.copy(q0).slerp(q1, move);
        passage.scale.setScalar(1 - 0.35 * move);
        passage.visible = r > 0.5;
        passage.material = sig && move < 0.9 ? signal : printMat;
        cube.visible = r > 0.02 && q > 0.001;
        cube.scale.setScalar(Math.max(0.001, q));
        pose(ease(seg(a, 0.5, 1)));
      },
    } satisfies Obj;
  }

  /* ---------------- 04 · connector plugged into a glass records block ---------------- */
  function records() {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.scale.setScalar(0.5);
    g.add(inner);
    const R = 1.2;
    const h = 0.5;
    const b = 0.12;
    const prof: T.Vector2[] = [new THREE.Vector2(0, -h / 2)];
    for (let i = 0; i <= 8; i++) {
      const an = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
      prof.push(new THREE.Vector2(R - b + Math.cos(an) * b, -h / 2 + b + Math.sin(an) * b));
    }
    for (let i = 0; i <= 8; i++) {
      const an = (i / 8) * (Math.PI / 2);
      prof.push(new THREE.Vector2(R - b + Math.cos(an) * b, h / 2 - b + Math.sin(an) * b));
    }
    prof.push(new THREE.Vector2(0, h / 2));
    const puck = keep(new THREE.LatheGeometry(prof, 96));
    const spacer = keep(new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.07, 96));
    const gm = glass(1.0);
    const pitch = h + 0.08;
    const solids: T.Object3D[] = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(puck, gm);
      p.position.y = h / 2 + i * pitch;
      inner.add(p);
      solids.push(p);
      if (i < 2) {
        const s = new THREE.Mesh(spacer, chrome);
        s.position.y = h + i * pitch + 0.04;
        inner.add(s);
        solids.push(s);
      }
    }
    const dir = new THREE.Vector3(-1, 0, 0.62).normalize();
    const midY = h / 2 + pitch;
    const rig = new THREE.Group(); // plug + cable move together when paused
    const plug = new THREE.Group();
    add(plug, core.slab(0.86, 0.42, 0.56, 0.13, 6), chrome);
    add(plug, core.slab(0.5, 0.2, 0.36, 0.04, 3), chrome, [0.58, 0, 0]);
    add(plug, new THREE.CylinderGeometry(0.15, 0.17, 0.34, 32), satin, [-0.58, 0, 0], [0, 0, Math.PI / 2]);
    const led = add(plug, new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), satin, [-0.18, 0.215, 0]);
    plug.rotation.y = Math.atan2(dir.z, -dir.x);
    const c = dir.clone().multiplyScalar(R + 0.42);
    plug.position.set(c.x, midY, c.z);
    rig.add(plug);
    const backP = new THREE.Vector3(-0.78, 0, 0).applyEuler(plug.rotation).add(plug.position);
    const curve = new THREE.CatmullRomCurve3([
      backP,
      backP.clone().add(dir.clone().multiplyScalar(0.45)).setY(midY - 0.08),
      backP.clone().add(dir.clone().multiplyScalar(0.95)).setY(0.3),
      backP.clone().add(dir.clone().multiplyScalar(1.5)).add(new THREE.Vector3(0, 0, 0.35)).setY(0.1),
      backP.clone().add(dir.clone().multiplyScalar(2.6)).add(new THREE.Vector3(0, 0, 1.0)).setY(0.1),
    ]);
    add(rig, new THREE.TubeGeometry(curve, 96, 0.1, 16, false), satin);
    inner.add(rig);
    solids.push(rig);

    const box = new THREE.Box3().setFromObject(g);
    const ghost = ghostOf(g, box);
    const seal = new THREE.Mesh(sealGeo, sealChrome);
    seal.position.set(box.max.x - 0.05, box.max.y + 0.2, 0);
    g.add(seal);
    return {
      g,
      base: [0, 0.45, 0],
      solids,
      ghost,
      seal,
      box,
      set(r, a, sig) {
        const out = ease(seg(a, 0, 0.8));
        rig.position.copy(dir).multiplyScalar(0.62 * out);
        led.material = sig && a < 0.7 ? signal : satin;
      },
    } satisfies Obj;
  }

  const objs: Obj[] = [contract(), invoice(), pages(), records()];
  objs.forEach((o, i) => {
    const [x, z] = L.pos[i];
    o.g.position.set(x, 0, z);
    o.g.rotation.set(...o.base);
    scene.add(o.g);
  });

  /* the map floor */
  const blobs = objs.map((o, i) => {
    const s = o.box.getSize(new THREE.Vector3());
    return { x: L.pos[i][0], z: L.pos[i][1], rx: Math.max(s.x, s.z) * 0.62, rz: Math.min(s.x, s.z) * 0.55, a: 0.1 };
  });
  const EXT = 22;
  const mapTex = keep(mapTexture(core, tone, EXT, blobs));
  const floorMat = keep(new THREE.MeshBasicMaterial({ map: mapTex, toneMapped: false }));
  const floor = add(scene, new THREE.PlaneGeometry(EXT, EXT), floorMat, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  floor.renderOrder = -1;

  /* the scan, as on the hero floor: a 30% ink hairline drawn across the map with
     a faint wash trailing it. (A standing glass sheet reads as a shard here: this
     camera looks straight down the scan direction, so it is always edge-on.) */
  let blade: T.Object3D | null = null;
  if (layout === "wide") {
    const inkCol = new THREE.Color(theme === "light" ? "#0B0B0D" : "#F4F4F6");
    const hair = inkCol.clone().lerp(new THREE.Color(tone.surface), 0.7);
    const g = new THREE.Group();
    add(g, new THREE.BoxGeometry(0.018, 0.003, 5.6), keep(new THREE.MeshBasicMaterial({ color: hair, toneMapped: false })), [0, 0.003, 0]);
    add(
      g,
      new THREE.PlaneGeometry(1.2, 5.6),
      keep(new THREE.MeshBasicMaterial({ color: inkCol, transparent: true, opacity: 0.04, depthWrite: false, toneMapped: false })),
      [-0.6, 0.002, 0],
      [-Math.PI / 2, 0, 0],
    );
    scene.add(g);
    blade = g;
  }
  const bladeKnots: [number, number][] = [
    [TL.scan[0], -5.2],
    ...TL.found.map((f, i): [number, number] => [f - 0.004, L.pos[i][0]]),
    [TL.scan[1], 5.2],
  ];
  const bladeX = (p: number) => {
    for (let k = 1; k < bladeKnots.length; k++) {
      const [p0, x0] = bladeKnots[k - 1];
      const [p1, x1] = bladeKnots[k];
      if (p <= p1) return x0 + (x1 - x0) * seg(p, p0, p1);
    }
    return bladeKnots[bladeKnots.length - 1][1];
  };

  const v = new THREE.Vector3();
  return {
    update(p) {
      const cur = currentAt(p);
      const st = stageOf(p);
      objs.forEach((o, i) => {
        const r = ease(seg(p, TL.found[i] - 0.01, TL.found[i] + 0.016));
        const a = seg(p, TL.handle[i], TL.handle[i] + TL.handleDur);
        const s = seg(p, SEAL[i], SEAL[i] + TL.sealDur);
        const shown = r > 0.02;
        o.solids.forEach((m) => (m.visible = shown));
        o.ghost.visible = r < 0.98;
        (o.ghost.material as T.LineDashedMaterial).opacity = 0.4 * (1 - r);
        o.g.scale.setScalar(0.9 + 0.1 * r);
        o.g.position.y = -0.25 * (1 - r);
        // the ghost stays standing on the map while its object rises into place,
        // so its bottom edges are never buried under the floor
        o.ghost.position.y = (0.25 * (1 - r)) / (0.9 + 0.1 * r) + 0.004;
        o.set(r, a, cur === i && st < 2);
        const tidy = 1 - 0.35 * ease(s);
        o.g.rotation.set(o.base[0] * tidy, o.base[1] * tidy, o.base[2] * tidy);
        // the seal lives in the audit panel ("Sealed · policy"), not as a floating nut
        o.seal.visible = false;
      });
      if (blade) {
        const t = seg(p, TL.scan[0], TL.scan[1]);
        blade.visible = t > 0 && t < 1;
        blade.position.x = bladeX(p);
      }
    },
    fit(camera, W, H, stage) {
      // aim at the middle of the objects, then find the distance at which their
      // projected bounds fill the stage rect, then shift the view so they sit in it
      const pts: T.Vector3[] = [];
      const bb = new THREE.Box3();
      objs.forEach((o) => {
        o.g.updateMatrixWorld(true);
        bb.copy(o.box).applyMatrix4(o.g.matrixWorld);
        for (let k = 0; k < 8; k++)
          pts.push(new THREE.Vector3(k & 1 ? bb.max.x : bb.min.x, k & 2 ? bb.max.y : bb.min.y, k & 4 ? bb.max.z : bb.min.z));
      });
      const target = new THREE.Vector3(0, 0.45, 0);
      const dir = new THREE.Vector3(0, Math.sin(L.elev), Math.cos(L.elev));
      camera.aspect = W / H;
      camera.clearViewOffset();
      const measure = (d: number) => {
        camera.position.copy(target).addScaledVector(dir, d);
        camera.lookAt(target);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        let x0 = Infinity;
        let x1 = -Infinity;
        let y0 = Infinity;
        let y1 = -Infinity;
        for (const q of pts) {
          v.copy(q).project(camera);
          const px = ((v.x + 1) / 2) * W;
          const py = ((1 - v.y) / 2) * H;
          x0 = Math.min(x0, px);
          x1 = Math.max(x1, px);
          y0 = Math.min(y0, py);
          y1 = Math.max(y1, py);
        }
        return { x0, x1, y0, y1 };
      };
      let lo = 2;
      let hi = 90;
      for (let k = 0; k < 26; k++) {
        const mid = (lo + hi) / 2;
        const b = measure(mid);
        if (b.x1 - b.x0 <= stage.w && b.y1 - b.y0 <= stage.h) hi = mid;
        else lo = mid;
      }
      const b = measure(hi);
      const bx = (b.x0 + b.x1) / 2;
      const by = (b.y0 + b.y1) / 2;
      camera.setViewOffset(W, H, bx - (stage.x + stage.w / 2), by - (stage.y + stage.h / 2), W, H);
      camera.updateProjectionMatrix();
    },
    anchors(camera, W, H) {
      return objs.map((o, i) => {
        const above = L.above[i];
        const c = o.box.getCenter(new THREE.Vector3());
        v.set(c.x, above ? o.box.max.y : o.box.min.y, above ? c.z : o.box.max.z);
        o.g.updateMatrixWorld(true);
        o.g.localToWorld(v).project(camera);
        return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H, above };
      });
    },
    dispose() {
      trash.forEach((d) => d.dispose());
    },
  };
}

function toneOf(el: HTMLElement, theme: Theme): Tone {
  const css = getComputedStyle(el);
  return {
    theme,
    surface: css.getPropertyValue("--surface").trim() || (theme === "dark" ? "#0d0d10" : "#ffffff"),
    dot: css.getPropertyValue("--ink-4").trim() || (theme === "dark" ? "#3c3e45" : "#b4b7bf"),
  };
}

/* ---------------- live canvas (desktop) ---------------- */
type Live = {
  resize(W: number, H: number, stage: Rect): void;
  render(p: number): void;
  anchors(): Anchor[];
  dispose(): void;
};
function createLive(core: Core, canvas: HTMLCanvasElement, tone: Tone): Live {
  const { THREE } = core;
  const renderer = core.createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
  const world = buildWorld(core, scene, tone, "wide");
  let W = 0;
  let H = 0;
  return {
    resize(w, h, stage) {
      W = w;
      H = h;
      renderer.setSize(w, h, false);
      world.update(0.5); // fit on the full composition
      world.fit(camera, w, h, stage);
    },
    render(p) {
      if (!W) return;
      world.update(p);
      renderer.render(scene, camera);
    },
    anchors: () => (W ? world.anchors(camera, W, H) : []),
    dispose() {
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

/* ---------------- stills (phone, reduced motion) ---------------- */
const STILL = { w: 640, h: 560 };
const stillAnchors = new Map<string, Anchor[]>();
function renderStill(core: Core, tone: Tone, k: number) {
  const key = `mD-seq-still-v1-${k}`;
  let world: World | null = null;
  const url = core.renderOnce(
    key,
    ({ scene, camera }) => {
      world = buildWorld(core, scene, tone, "square");
      world.update(0.5);
      world.fit(camera, STILL.w, STILL.h, { x: 20, y: 44, w: STILL.w - 40, h: STILL.h - 88 });
      world.update(SETTLED[k]);
      scene.updateMatrixWorld(true);
      stillAnchors.set(`${k}:${tone.theme}`, world.anchors(camera, STILL.w, STILL.h));
    },
    { width: STILL.w, height: STILL.h, theme: tone.theme, transparent: true, fov: 24 },
  );
  (world as World | null)?.dispose();
  return { url, anchors: stillAnchors.get(`${k}:${tone.theme}`) ?? [] };
}

/* ================================================================== */
/* DOM                                                                 */
/* ================================================================== */

function useMedia(query: string) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const f = () => setOn(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [query]);
  return on;
}
const LIVE_MQ = "(min-width: 901px) and (prefers-reduced-motion: no-preference)";
const STACK_MQ = "(max-width: 900px), (prefers-reduced-motion: reduce)";

function Marker({ live }: { live: boolean }) {
  return live ? <span className="mD-live" aria-hidden="true" /> : <span className="mD-hex" aria-hidden="true" />;
}

/** The product panel: the same audit-trail UI in three states. */
function Panel({ s, only = false }: { s: Snap; only?: boolean }) {
  const heads = ["AI inventory", "Runtime", "Audit trail"];
  const counts = [
    `${count(s.found)} of 4 new`,
    `${count(s.handled)} of 4 handled`,
    `${count(s.sealed)} of 4 sealed`,
  ];
  const sealedOrder = AUDIT_ORDER.filter((i) => s.sealed[i]);
  const latest = sealedOrder[sealedOrder.length - 1] ?? -1;
  const layer = (k: Stage) => ({
    className: "mD-seq__layer",
    "data-on": s.stage === k,
    "aria-hidden": s.stage !== k,
    hidden: only && s.stage !== k,
  });
  return (
    <div className="mD-seq__panel mD-log" data-stage={s.stage}>
      <div className="mD-log__head">
        <span>
          {heads[s.stage]} <span className="mD-seq__muted">· Illustrative</span>
        </span>
        <span className="mD-seq__count">{counts[s.stage]}</span>
      </div>
      <div className="mD-seq__layers">
        {/* See: inventory, with the decision for each */}
        <div {...layer(0)}>
          {ITEMS.map((it) => {
            const found = s.found[it.i];
            const cur = s.stage === 0 && s.current === it.i;
            return (
              <div key={it.id} className="mD-seq__row" data-state={cur ? "current" : found ? "found" : "pending"}>
                <span className="mD-seq__idx">{cur ? <span className="mD-live" aria-hidden="true" /> : it.n}</span>
                {found ? (
                  <>
                    <span className="mD-seq__line">{it.th.see}</span>
                    <span className="mD-seq__chips" aria-label={`Decision: ${DECISIONS[it.act.decision]}`}>
                      {DECISIONS.map((d, k) => (
                        <span key={d} className="mD-seq__chip" data-on={k === it.act.decision}>
                          {d}
                        </span>
                      ))}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mD-seq__ghost" style={{ width: "64%" }} />
                    <span className="mD-seq__ghost" style={{ width: "40%" }} />
                  </>
                )}
              </div>
            );
          })}
          <div className="mD-seq__row mD-seq__row--known">
            <span className="mD-seq__idx">
              <span className="mD-hex" aria-hidden="true" />
            </span>
            <span className="mD-seq__line">n8n, Power Automate · already registered</span>
            <span className="mD-seq__chips" aria-label={`Decision: ${DECISIONS[1]}`}>
              {DECISIONS.map((d, k) => (
                <span key={d} className="mD-seq__chip" data-on={k === 1}>
                  {d}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Secure: runtime handling */}
        <div {...layer(1)}>
          {ITEMS.map((it) => {
            const done = s.handled[it.i];
            const acting = s.acting === it.i;
            const cur = s.stage === 1 && s.current === it.i;
            return (
              <div key={it.id} className="mD-seq__row" data-state={cur ? "current" : done ? "done" : "waiting"}>
                <span className="mD-seq__idx">{cur ? <span className="mD-live" aria-hidden="true" /> : it.n}</span>
                <span className="mD-seq__line">{done ? it.th.secure : it.th.see}</span>
                <span className="mD-seq__status">
                  {done && <span className="mD-hex" aria-hidden="true" />}
                  {done ? it.act.done : acting ? `${it.act.doing}…` : "Watching"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Prove: the audit trail, in the order things happened */}
        <div {...layer(2)}>
          {AUDIT_ORDER.map((i) => {
            const it = ITEMS[i];
            const sealed = s.sealed[i];
            const dot = s.stage === 2 && (s.current === i || (s.current === -1 && i === latest && s.evidence));
            return (
              <div key={it.id} className="mD-seq__arow" data-state={sealed ? "sealed" : "pending"}>
                {sealed ? (
                  <>
                    <span className="mD-log__time">{it.audit.time}</span>
                    <span className="mD-seq__asub">
                      <span className="mD-seq__line">{it.audit.subject}</span>
                      <span className="mD-seq__sub">{it.th.secure}</span>
                    </span>
                    <span className="mD-log__verdict">
                      <Marker live={dot} />
                      {it.audit.policy} · {it.audit.verdict}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="mD-seq__ghost" style={{ width: "70%" }} />
                    <span className="mD-seq__ghost" style={{ width: "58%" }} />
                    <span className="mD-seq__ghost" style={{ width: "90px" }} />
                  </>
                )}
              </div>
            );
          })}
          <div className="mD-seq__frameworks" data-on={s.evidence}>
            <span className="mD-seq__fwlabel">Logged for</span>
            <span className="mD-seq__fwlist">
              {FRAMEWORKS.map((f) => (
                <span key={f} className="mD-seq__fw">
                  {f}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- desktop: the self-playing sequence (no scroll pinning) ---------------- */
function SequenceLive({ theme }: { theme: Theme }) {
  const on = useMedia(LIVE_MQ);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fillRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [snap, setSnap] = useState<Snap>(() => snapAt(0));
  const [ready, setReady] = useState(false);
  const goRef = useRef<(k: number) => void>(() => {});

  useEffect(() => {
    if (!on) return;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    const stageEl = stageRef.current;
    const canvas = canvasRef.current;
    if (!scroller || !sheet || !stageEl || !canvas) return;
    let dead = false;
    let raf = 0;
    let live: Live | null = null;
    let lastKey = "";
    let visible = true;
    let clamp: Rect = { x: 0, y: 0, w: 0, h: 0 };

    const placeTags = (anchors: Anchor[]) => {
      const LEAD = 16;
      const sizes = anchors.map((_, i) => {
        const el = tagRefs.current[i];
        return el ? [el.offsetWidth, el.offsetHeight] : [0, 0];
      });
      anchors.forEach((a, i) => {
        const el = tagRefs.current[i];
        if (!el) return;
        const [w, h] = sizes[i];
        const x = Math.min(clamp.x + clamp.w - w - 6, Math.max(clamp.x + 6, a.x - w / 2));
        const y = a.above ? a.y - h - LEAD : a.y + LEAD;
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        el.style.setProperty("--lead-x", `${Math.round(Math.min(w - 10, Math.max(10, a.x - x)))}px`);
      });
    };

    /* the clock: each stage plays over its own duration; autoplay loops with a
       hold at the end, a click on a step plays that step and stops there */
    let p = 0;
    let target = 1;
    let auto = true;
    let started = false;
    let hold = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      if (p < target) {
        const k = p < BOUNDS[1] ? 0 : p < BOUNDS[2] ? 1 : 2;
        p = Math.min(target, p + ((BOUNDS[k + 1] - BOUNDS[k]) / STAGE_MS[k]) * dt);
      } else if (auto) {
        hold += dt;
        if (hold > HOLD_MS) {
          hold = 0;
          p = 0;
        }
      }
      frame();
      if (visible && started && (p < target || auto)) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const kick = () => {
      if (!raf && visible && started) raf = requestAnimationFrame(tick);
    };
    goRef.current = (k: number) => {
      auto = false;
      hold = 0;
      p = k === 0 ? 0 : BOUNDS[k] + 0.0005;
      target = SETTLED[k];
      started = true;
      kick();
    };

    const frame = () => {
      fillRefs.current.forEach((el, k) => {
        if (el) el.style.transform = `scaleX(${stageLocal(p, k)})`;
      });
      const s = snapAt(p);
      const k = JSON.stringify(s);
      if (k !== lastKey) {
        lastKey = k;
        setSnap(s);
      }
      if (live && visible) {
        live.render(p);
        placeTags(live.anchors());
      }
    };
    const request = () => {
      if (raf) return;
      if (visible && started && (p < target || auto)) kick();
      else frame();
    };
    const measure = () => {
      if (!live) return;
      const sr = sheet.getBoundingClientRect();
      const st = stageEl.getBoundingClientRect();
      const stage = { x: st.left - sr.left, y: st.top - sr.top, w: st.width, h: st.height };
      clamp = stage;
      // room above for the back row's callouts and below for the front row's
      live.resize(sr.width, sr.height, { x: stage.x + 10, y: stage.y + 70, w: stage.w - 20, h: stage.h - 160 });
      request();
    };

    import("./three/core")
      .then((core) => {
        if (dead) return;
        live = createLive(core, canvas, toneOf(sheet, theme));
        measure();
        // compile shaders now (even off-screen) so the first scroll into view is instant
        live.render(0);
        setReady(true);
      })
      .catch((err) => console.warn("[sequence] 3D unavailable", err));

    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    // starts playing once a third of it is on screen; pauses off screen
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && e.intersectionRatio >= 0.3) started = true;
        if (visible) request();
      },
      { threshold: [0, 0.3] },
    );
    io.observe(scroller);
    frame();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      goRef.current = () => {};
      ro.disconnect();
      io.disconnect();
      live?.dispose();
      setReady(false);
    };
  }, [on, theme]);

  return (
    <div className="mD-seq__live" data-stage={snap.stage} data-ready={ready}>
      <div className="mD-seq__scroller" ref={scrollerRef}>
        <div className="mD-seq__sticky">
          <div className="mD-sheet mD-seq__sheet" ref={sheetRef}>
            <canvas className="mD-seq__canvas" ref={canvasRef} aria-hidden="true" />

            <header className="mD-seq__head">
              <h2 className="mD-seq__tagline">
                {CLAUSES.map((c, k) => (
                  <span key={c} data-on={k <= snap.stage}>
                    {c}
                    {k < CLAUSES.length - 1 ? " " : ""}
                  </span>
                ))}
              </h2>
            </header>

            <ol className="mD-seq__rail">
              {STAGES.map((st, k) => (
                <li key={st.n} data-on={k === snap.stage} data-done={k < snap.stage}>
                  <button type="button" className="mD-seq__step" aria-pressed={k === snap.stage} onClick={() => goRef.current(k)}>
                    <Label n={st.n}>{st.label}</Label>
                    <span className="mD-seq__track">
                      <span
                        className="mD-seq__fill"
                        ref={(el) => {
                          fillRefs.current[k] = el;
                        }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="mD-seq__left">
              <div className="mD-seq__copy">
                {STAGES.map((st, k) => (
                  <div key={st.n} className="mD-seq__stagecopy" data-on={k === snap.stage}>
                    <h3 className="mD-h3">{st.title}</h3>
                    <p>{st.body}</p>
                  </div>
                ))}
              </div>
              <Panel s={snap} />
            </div>

            <div className="mD-seq__stage" ref={stageRef} aria-hidden="true" />

            <div className="mD-seq__tags" aria-hidden="true">
              {ITEMS.map((it) => {
                const i = it.i;
                const cur = snap.current === i && snap.stage < 2;
                return (
                  <div
                    key={it.id}
                    className="mD-seq__tag"
                    data-on={ready && snap.found[i]}
                    data-above={LAYOUT.wide.above[i]}
                    data-current={cur}
                    ref={(el) => {
                      tagRefs.current[i] = el;
                    }}
                  >
                    <span className="mD-seq__tagidx">
                      {/* the current item is already violet in the panel row and on
                          the object; the callout keeps the neutral hex */}
                      <Marker live={false} />
                      {it.n}
                    </span>
                    <span className="mD-seq__tagname">{it.short}</span>
                    <span className="mD-seq__tagstate">{tagState(i, snap)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- phone / reduced motion: stacked ---------------- */
type Still = { url: string; anchors: Anchor[] };
function SequenceStacked({ theme }: { theme: Theme }) {
  const on = useMedia(STACK_MQ);
  const rootRef = useRef<HTMLDivElement>(null);
  const [stills, setStills] = useState<(Still | null)[]>([null, null, null]);

  useEffect(() => {
    if (!on) return;
    const fig = rootRef.current?.querySelector<HTMLElement>(".mD-seq__still");
    if (!fig) return;
    let dead = false;
    setStills([null, null, null]);
    const tone = toneOf(fig, theme);
    import("./three/core")
      .then(async (core) => {
        for (let k = 0; k < 3; k++) {
          await new Promise((r) => requestAnimationFrame(() => r(null)));
          if (dead) return;
          try {
            const still = renderStill(core, tone, k);
            setStills((prev) => prev.map((x, j) => (j === k ? still : x)));
          } catch (err) {
            console.warn("[sequence] still failed", k, err);
          }
        }
      })
      .catch((err) => console.warn("[sequence] 3D unavailable", err));
    return () => {
      dead = true;
    };
  }, [on, theme]);

  return (
    <div className="mD-seq__stacked mD-container" ref={rootRef}>
      <header className="mD-seq__intro">
        <h2 className="mD-seq__tagline mD-seq__tagline--static">{sequence.tagline}</h2>
      </header>
      {STAGES.map((st, k) => {
        const s = snapAt(SETTLED[k]);
        const still = stills[k];
        return (
          <article key={st.n} className="mD-seq__block">
            <div className="mD-seq__blockcopy">
              <Label n={st.n}>{st.label}</Label>
              <h3 className="mD-h3">{st.title}</h3>
              <p>{st.body}</p>
            </div>
            <figure className="mD-sheet mD-seq__still" aria-hidden="true">
              {still && <img src={still.url} alt="" draggable={false} />}
              {still?.anchors.map((a, i) => (
                <span
                  key={i}
                  className="mD-seq__pin"
                  data-above={a.above}
                  style={{ left: `${(a.x / STILL.w) * 100}%`, top: `${(a.y / STILL.h) * 100}%` } as CSSProperties}
                >
                  {ITEMS[i].n}
                </span>
              ))}
            </figure>
            <Panel s={s} only />
          </article>
        );
      })}
    </div>
  );
}

export function Sequence({ theme }: SectionProps) {
  return (
    <section id="sequence" className="mD-seq" aria-label={sequence.tagline}>
      <SequenceLive theme={theme} />
      <SequenceStacked theme={theme} />
    </section>
  );
}
