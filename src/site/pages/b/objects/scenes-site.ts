/* Version B · header objects for the site pages: two speech slabs (FAQ), a chrome pin on the
   dotted plane (contact), a sealed glass record with the blind emboss (legal), the two columns
   (free trial), the AI register with its unregistered line (Shadow AI), a loupe over an empty
   address (404), and the small mark for the demo card. */
import type * as T from "three";

import { THREE, slab } from "@/site/three/core";
import { aim, bar, chrome, dashedRect, deg, floor, glass, graphite, ink, inkCss, satin, setup, signalCss, smoke, wall, type Ctx, type Tone } from "./kit";
import { embossMark, roundRect, rimmedSlab, shadowBlob, textBlock, words, flatWords } from "./print";

const flat = (o: T.Object3D) => {
  o.rotation.x = -Math.PI / 2;
  return o;
};

/** A speech slab's outline: a rounded rectangle with a tail off its bottom edge. */
function speech(W: number, H: number, r: number, tail: "left" | "right") {
  const s = new THREE.Shape();
  const [x0, y0, x1, y1] = [-W / 2, -H / 2, W / 2, H / 2];
  const k = tail === "left" ? 1 : -1;
  const a = k * (-W / 2 + 0.34);
  const b = k * (-W / 2 + 0.66);
  const tip = k * (-W / 2 + 0.16);
  const [l, rr] = k > 0 ? [a, b] : [b, a];
  s.moveTo(x0 + r, y0);
  s.lineTo(l, y0);
  s.lineTo(tip, y0 - 0.34);
  s.lineTo(rr, y0);
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

/* ---------- FAQ: a question slab over its answer ---------- */
export function sceneFaq(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 16,
      halo: { x: 0.1, y: -0.1, r: 3.5 },
      shadows: [
        { x: -0.35, y: 0.3, rx: 1.5, ry: 1.0, a: 0.1 },
        { x: 0.8, y: -0.8, rx: 1.3, ry: 0.9, a: 0.08 },
      ],
      quiet: { x: 0.2, y: -0.2, rx: 2.2, ry: 1.6, k: 0.35 },
    }),
  );
  const soft = ink(tone, 0.38);
  // the answer: smoked, underneath and behind
  const [AW, AH, AT] = [2.1, 1.35, 0.05];
  const ans = new THREE.Group();
  ans.add(rimmedSlab(speech(AW, AH, 0.2, "right"), AT, 0.02, smoke(tone.theme, 0.3), tone, 0.01));
  const az = AT / 2 + 0.024;
  const aHead = words("A.", 0.2, inkCss(tone, 0.9), { weight: 400, sans: true });
  aHead.position.set(-AW / 2 + 0.2, AH / 2 - 0.26, az);
  ans.add(aHead);
  [1.2, 1.3, 1.0, 1.25].forEach((w, k) => bar(ans, -AW / 2 + 0.2, AH / 2 - 0.56 - k * 0.15, w, 0.016, az, soft));
  flat(ans);
  ans.rotation.z = 0.1;
  ans.position.set(0.85, 0.05, -0.8);
  scene.add(ans);
  // the question: clear glass, on top
  const [QW, QH, QT] = [2.4, 1.5, 0.06];
  const q = new THREE.Group();
  q.add(rimmedSlab(speech(QW, QH, 0.22, "left"), QT, 0.02, glass(tone.theme, 0.25), tone, 0.011));
  const qz = QT / 2 + 0.024;
  const kick = words("QUESTION · SHADOW AI", 0.075, inkCss(tone, 0.7));
  kick.position.set(-QW / 2 + 0.22, QH / 2 - 0.24, qz);
  q.add(kick);
  const head = textBlock(["What is", "Shadow AI?"], 0.25, inkCss(tone, 0.96), { weight: 400 });
  head.mesh.position.set(-QW / 2 + 0.2, QH / 2 - 0.36, qz);
  q.add(head.mesh);
  flat(q);
  q.rotation.z = -0.12;
  q.position.set(-0.4, 0.09, 0.35);
  scene.add(q);
  // aimed left of the pieces and pulled back: the tail stays clear of the copy and the mask
  aim(ctx, [-0.3, 0.05, -0.05], 8.0, -10, 44);
}

/* ---------- contact: a chrome pin on the dotted plane, at Rennweg 57 ---------- */
export function sceneContact(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(floor(tone, { extent: 16, halo: { x: 0.4, y: 0.2, r: 3.5 }, shadows: [{ x: 0.2, y: 0.15, rx: 0.5, ry: 0.3, a: 0.1 }] }));
  const cm = chrome(tone.theme);
  // a touch rougher: the black flags no longer band across the head like an eyelid
  cm.roughness = 0.14;
  const pin = new THREE.Group(); // pivots on its tip, on the floor
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.004, 1.36, 20), cm);
  needle.position.y = 0.68;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 32), satin());
  collar.position.y = 1.36;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 64, 48), cm);
  head.position.y = 1.66;
  pin.add(needle, collar, head);
  pin.rotation.set(0.08, 0, -0.1);
  scene.add(pin);
  // where it stands: two hairline rings, and the address printed on the plane
  const ringA = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.214, 96), ink(tone, 0.85));
  const ringB = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.566, 128), ink(tone, 0.35));
  for (const r of [ringA, ringB]) {
    flat(r);
    r.position.y = 0.003;
    scene.add(r);
  }
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), ink(tone, 0.9));
  flat(dot);
  dot.position.y = 0.004;
  scene.add(dot);
  const addr = flatWords("RENNWEG 57 · 8001 ZÜRICH", 0.13, inkCss(tone, 0.9), { weight: 600 });
  addr.position.set(0.85, 0.003, 0.3);
  scene.add(addr);
  const who = flatWords("Blindsight Technologies AG", 0.1, inkCss(tone, 0.7));
  who.position.set(0.85, 0.003, 0.52);
  scene.add(who);
  const hs = shadowBlob(0.7, 0.45, tone.theme === "light" ? 0.16 : 0.45);
  flat(hs);
  hs.position.set(0.2, 0.004, 0.15);
  scene.add(hs);
  aim(ctx, [0.7, 0.45, 0.2], 7.4, -16, 44);
}

/* ---------- legal: a sealed glass record, the mark pressed blind into its seal ---------- */
export function sceneLegal(ctx: Ctx, tone: Tone, title: string[]) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 16,
      halo: { x: 0.1, y: 0, r: 3.5 },
      shadows: [
        { x: 0, y: 0.1, rx: 1.6, ry: 1.9, a: 0.1 },
        { x: 0.4, y: -0.1, rx: 1.5, ry: 1.9, a: 0.07 },
      ],
      quiet: { x: 0.1, y: 0, rx: 1.7, ry: 2.1, k: 0.35 },
    }),
  );
  const [W, D, Tk] = [2.5, 3.2, 0.07];
  // the file underneath: smoked glass, bars only
  const under = new THREE.Group();
  under.add(new THREE.Mesh(slab(W, Tk, D, 0.02, 3), smoke(tone.theme, 0.25)));
  under.position.set(0.32, Tk / 2 + 0.01, -0.22);
  under.rotation.y = 0.09;
  scene.add(under);
  // the record
  const rec = new THREE.Group();
  rec.add(new THREE.Mesh(slab(W, Tk, D, 0.02, 3), glass(tone.theme, 0.2)));
  const face = new THREE.Group();
  face.rotation.x = -Math.PI / 2;
  rec.add(face);
  const fz = Tk / 2 + 0.003;
  const L = -W / 2 + 0.22;
  const e = ink(tone, 0.3);
  bar(face, -W / 2, D / 2 - 0.006, W, 0.012, fz, e);
  bar(face, -W / 2, -D / 2 + 0.006, W, 0.012, fz, e);
  bar(face, -W / 2, 0, 0.012, D, fz, e);
  bar(face, W / 2 - 0.012, 0, 0.012, D, fz, e);
  const kick = words("BLINDSIGHT TECHNOLOGIES AG", 0.08, inkCss(tone, 0.5));
  kick.position.set(L, D / 2 - 0.26, fz + 0.001);
  face.add(kick);
  const head = textBlock(title, 0.28, inkCss(tone, 0.96), { weight: 400 });
  head.mesh.position.set(L, D / 2 - 0.4, fz + 0.001);
  face.add(head.mesh);
  const soft = ink(tone, 0.36);
  const y0 = D / 2 - 0.4 - head.h - 0.28;
  [1.9, 1.75, 2.0, 1.4, 1.85, 1.6].forEach((w, k) => bar(face, L, y0 - k * 0.17, w, 0.016, fz, soft));
  const sealed = words("SEALED · MAY 2026", 0.075, inkCss(tone, 0.6));
  sealed.position.set(L, -D / 2 + 0.34, fz + 0.001);
  face.add(sealed);
  // the seal: a light satin disc on the glass, the mark in blind relief, a raised ring round it
  const st = satin();
  st.color.set("#B8BAC0");
  st.roughness = 0.2;
  const R = 0.46;
  const seal = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.05, 96), st);
  seal.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.06, 0.008, 8, 128), st);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  seal.add(ring);
  const mark = embossMark(st, 0.02);
  mark.scale.set(0.3, 0.3, 0.8); // a shallow relief: ≈ half the disc's thickness proud of it
  mark.rotation.x = -Math.PI / 2;
  mark.position.y = 0.033;
  seal.add(mark);
  seal.position.set(W / 2 - 0.68, Tk / 2 + 0.025, D / 2 - 0.62);
  rec.add(seal);
  rec.position.set(-0.1, Tk / 2 + Tk + 0.03, 0.1);
  rec.rotation.y = -0.07;
  scene.add(rec);
  // pulled back: the record keeps air above and below it in the compact header
  aim(ctx, [0.1, 0.1, 0.25], 8.4, 10, 44);
}

/* ---------- free trial: the two columns (catch rate, and what it costs) ---------- */
export function sceneColumns(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(floor(tone, { extent: 18, halo: { x: 0, y: -0.5, r: 4.6 }, shadows: [{ x: 0, y: 0.1, rx: 1.9, ry: 0.5, a: 0.1 }] }));
  scene.add(wall(tone, -2.1, { extent: 16, halo: { x: 0, y: 1.4, r: 4.2 } }));
  const baseH = 0.14;
  const base = new THREE.Mesh(slab(3.1, baseH, 0.7, 0.04, 4), satin());
  base.position.y = baseH / 2;
  scene.add(base);
  const cols = [
    { v: "0.9008", k: "ATTACKS BLOCKED", x: -0.74 },
    { v: "0.9185", k: "LEGITIMATE WORK", x: 0.74 },
  ];
  const full = 2.5; // 1.000
  const [W, Tk] = [1.3, 0.07];
  cols.forEach((c) => {
    const H = full * Number(c.v);
    const p = new THREE.Group();
    const pane = new THREE.Mesh(slab(W, H, Tk, 0.02, 3), glass(tone.theme, 0.2));
    pane.position.y = H / 2;
    p.add(pane);
    const fz = Tk / 2 + 0.003;
    const e = ink(tone, 0.3);
    bar(p, -W / 2, H - 0.006, W, 0.012, fz, e);
    bar(p, -W / 2, H / 2, 0.012, H, fz, e);
    bar(p, W / 2 - 0.012, H / 2, 0.012, H, fz, e);
    const val = words(c.v, 0.26, inkCss(tone, 0.96), { weight: 300, sans: true });
    val.position.set(-W / 2 + 0.14, H - 0.3, fz + 0.001);
    p.add(val);
    const key = words(c.k, 0.07, inkCss(tone, 0.7));
    key.position.set(-W / 2 + 0.16, H - 0.56, fz + 0.001);
    p.add(key);
    p.position.set(c.x, baseH - 0.06, 0);
    scene.add(p);
  });
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.004, 0.09), ink(tone, 0.9));
  mouth.position.y = baseH + 0.002;
  scene.add(mouth);
  aim(ctx, [0, 1.2, 0], 8.3, 18, 13);
}

/* ---------- Shadow AI: the AI register, and the line nobody wrote ---------- */
export function sceneRegister(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(floor(tone, { extent: 18, halo: { x: 0, y: -0.5, r: 4.6 }, shadows: [{ x: 0, y: 0.12, rx: 1.8, ry: 0.45, a: 0.1 }] }));
  scene.add(wall(tone, -2.1, { extent: 16, halo: { x: 0, y: 1.4, r: 4.2 } }));
  const [PW, PH, Tk] = [2.9, 1.65, 0.07];
  const footH = 0.16;
  const reg = new THREE.Group();
  const foot = new THREE.Mesh(slab(PW + 0.2, footH, 0.5, 0.04, 4), satin());
  foot.position.y = footH / 2;
  reg.add(foot);
  const py = footH - 0.04 + PH / 2;
  const plaque = rimmedSlab(roundRect(PW, PH, 0.06), Tk, 0.02, glass(tone.theme, 0.2), tone, 0.01);
  plaque.position.y = py;
  reg.add(plaque);
  const z = Tk / 2 + 0.026;
  const L = -PW / 2 + 0.22;
  const R = PW / 2 - 0.22;
  const at = (m: T.Object3D, x: number, y: number) => {
    m.position.set(x, py + y, z);
    reg.add(m);
  };
  at(words("AI REGISTER", 0.12, inkCss(tone, 0.92), { weight: 600 }), L, PH / 2 - 0.24);
  // the rules are firmer than the wall grid behind the glass: the register's lines win
  bar(reg, L, py + PH / 2 - 0.42, R - L, 0.008, z, ink(tone, 0.6));
  const rows: [string, string][] = [
    ["agent:support", "registered"],
    ["n8n · invoices", "registered"],
  ];
  rows.forEach(([a, b], i) => {
    const y = PH / 2 - 0.62 - i * 0.3;
    at(words(a, 0.1, inkCss(tone, 0.85), { weight: 500 }), L, y);
    at(words(b, 0.085, inkCss(tone, 0.65), { align: "right" }), R, y);
    bar(reg, L, py + y - 0.15, R - L, 0.005, z, ink(tone, 0.45));
  });
  // the line nobody wrote: a dashed empty entry, and the AI in it (the one violet)
  const yv = PH / 2 - 0.62 - 2 * 0.3 - 0.06;
  dashedRect(reg, L - 0.06, py + yv, R - L + 0.12, 0.3, z, ink(tone, 0.8));
  at(words("chatgpt.com · m.keller", 0.1, signalCss(tone.theme), { weight: 600 }), L + 0.06, yv);
  at(words("flagged", 0.085, inkCss(tone, 0.9), { align: "right", weight: 600 }), R - 0.06, yv);
  reg.rotation.y = -0.22;
  scene.add(reg);
  aim(ctx, [0.05, 1.05, 0], 7.4, 14, 12);
}

/* ---------- 404: a loupe over an address with nothing at it ---------- */
export function sceneLost(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(floor(tone, { extent: 16, halo: { x: 0.1, y: 0, r: 4.0 }, shadows: [{ x: 0.05, y: 0.12, rx: 1.0, ry: 0.85, a: 0.12 }] }));
  // opaque print: "/404" is read THROUGH the lens (a blended plane would vanish there)
  const t = flatWords("/404", 0.42, inkCss(tone, 0.92), { weight: 500, align: "center", opaque: true });
  t.position.set(-0.1, 0.003, 0.02);
  scene.add(t);
  // …and the sub line sits clear of the rim, in front of the loupe
  const sub = flatWords("no page at this address", 0.09, inkCss(tone, 0.55), { align: "center", opaque: true });
  sub.position.set(-0.1, 0.003, 0.95);
  scene.add(sub);
  const loupe = new THREE.Group();
  const steel = chrome(tone.theme);
  steel.roughness = 0.2;
  const ringR = 0.78;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.036, 20, 128), steel);
  ring.rotation.x = Math.PI / 2;
  loupe.add(ring);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(ringR - 0.02, 64, 24), glass(tone.theme, 0.3));
  lens.scale.y = 0.07;
  loupe.add(lens);
  const ha = deg(-24);
  const mount = new THREE.Group();
  mount.rotation.y = -ha;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.22, 16), steel);
  neck.rotation.z = Math.PI / 2;
  neck.position.x = ringR + 0.11;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.06, 0.12, 24), steel);
  collar.rotation.z = Math.PI / 2;
  collar.position.x = ringR + 0.25;
  const prof: T.Vector2[] = [new THREE.Vector2(0, 0)];
  const GL = 1.25;
  for (let i = 0; i <= 16; i++) prof.push(new THREE.Vector2(0.056 + 0.026 * (i / 16), (i / 16) * GL));
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    prof.push(new THREE.Vector2(0.082 * Math.cos(a), GL + 0.082 * Math.sin(a) * 0.9));
  }
  const grip = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), graphite(tone.theme));
  grip.rotation.z = -Math.PI / 2;
  grip.position.x = ringR + 0.31;
  mount.add(neck, collar, grip);
  loupe.add(mount);
  // resting just above the print (not floating), centered on it
  loupe.position.set(-0.1, 0.12, 0.02);
  loupe.rotation.z = 0.04;
  scene.add(loupe);
  aim(ctx, [0.55, 0.1, 0.2], 6.8, -8, 44);
}
