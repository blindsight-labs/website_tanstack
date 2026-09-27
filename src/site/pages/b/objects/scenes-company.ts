/* Version B · header objects for the company and writing pages: the mark as a lens (team),
   a file of glass role cards (careers), a role card clipped over a CV (apply), a glass page
   leaning in front of a paper one (blog, post), a glass frame holding a portrait (author). */
import type * as T from "three";

import { THREE, slab } from "@/site/three/core";
import { ROLES } from "../../legacy/Careers";
import { aim, bar, floor, glass, ink, inkCss, paper, satin, setup, wall, type Ctx, type Tone } from "./kit";
import { imageFor } from "./images";
import { MARK_R, glassMark, rimmedSlab, roundRect, shadowBlob, textBlock, words, wrap } from "./print";

/** A group whose XY plane lies on a horizontal face, reading along +x (print on top faces). */
function topFace(parent: T.Object3D) {
  const h = new THREE.Group();
  h.rotation.x = -Math.PI / 2;
  parent.add(h);
  return h;
}
/** Hairline edges round a W×D sheet's print face (glass holds its shape on white). */
function edges(face: T.Object3D, W: number, D: number, z: number, mat: T.Material, e = 0.012) {
  bar(face, -W / 2, D / 2 - e / 2, W, e, z, mat);
  bar(face, -W / 2, -D / 2 + e / 2, W, e, z, mat);
  bar(face, -W / 2, 0, e, D, z, mat);
  bar(face, W / 2 - e, 0, e, D, z, mat);
}

/* ---------- team: the mark, upright in a satin plinth, its hub a real lens ---------- */
export function sceneTeam(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  const light = tone.theme === "light";
  // a firm contact shadow: the plinth sits on the floor, it doesn't float in white
  scene.add(
    floor(tone, {
      extent: 18,
      halo: { x: 0, y: -0.6, r: 4.8 },
      shadows: [
        { x: 0.05, y: 0.12, rx: 1.6, ry: 0.5, a: light ? 0.3 : 0.2 },
        { x: 0.05, y: 0.08, rx: 1.1, ry: 0.24, a: light ? 0.42 : 0.24 },
      ],
    }),
  );
  scene.add(wall(tone, -2.2, { extent: 16, halo: { x: 0, y: 1.6, r: 4.4 } }));
  const S = 1.22;
  const baseH = 0.18;
  const holder = new THREE.Group();
  holder.rotation.y = -0.3; // less turned: the arcs' side faces no longer glint as grey tabs
  scene.add(holder);
  // light mode: a heavier, fully opaque ink rim (a thin one anti-aliases to grey at this size)
  // on clear glass, so the silhouette holds on white; no grey body, which read as haze
  const mark = glassMark(tone, { depth: 0.09, rimW: light ? 0.022 : 0.009, rim: light ? 1 : 0.8, tint: light ? 0.05 : 0.06 });
  mark.scale.setScalar(S);
  mark.position.y = MARK_R * S + baseH - 0.09; // the lowest arc sits in the plinth's slot
  holder.add(mark);
  const base = new THREE.Mesh(slab(1.9, baseH, 0.64, 0.05, 4), satin());
  base.position.y = baseH / 2;
  holder.add(base);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.004, 0.07), ink(tone, 0.9));
  mouth.position.y = baseH + 0.002;
  holder.add(mouth);
  // a tight dark contact line right under the plinth, so it sits on the floor
  const contact = shadowBlob(2.3, 0.95, light ? 0.34 : 0.5);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.003;
  holder.add(contact);
  aim(ctx, [0.05, 1.32, 0], 8.4, 16, 11);
}

/* ---------- careers: seven glass role cards filed back to front ---------- */
export function sceneCareers(ctx: Ctx, tone: Tone) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 16,
      halo: { x: 0.1, y: 0, r: 4.2 },
      shadows: [{ x: 0, y: 0.1, rx: 1.8, ry: 1.5, a: 0.12 }],
      quiet: { x: 0, y: 0.05, rx: 1.7, ry: 1.9, k: 0.35 },
    }),
  );
  const [W, D, Tk, n] = [2.7, 1.5, 0.035, ROLES.length];
  const g = glass(tone.theme, 0.1);
  const edge = ink(tone, 0.32);
  const soft = ink(tone, 0.35);
  const title = inkCss(tone, 0.92);
  const meta = inkCss(tone, 0.5);
  const fz = Tk / 2 + 0.003;
  const L = -W / 2 + 0.17;
  for (let i = 0; i < n; i++) {
    const role = ROLES[n - 1 - i]; // the first role on top, at the back
    const card = new THREE.Group();
    card.add(new THREE.Mesh(slab(W, Tk, D, 0.016, 3), g));
    card.position.set(0.03 * Math.sin(i * 1.7), Tk / 2 + 0.02 + i * 0.1, 0.95 - i * 0.3);
    card.rotation.y = 0.025 * Math.sin(i * 2.3);
    const face = topFace(card);
    edges(face, W, D, fz, edge);
    const top = i === n - 1;
    // each card's title sits on its front strip, the part the next card leaves in view
    const y = top ? D / 2 - 0.26 : -D / 2 + 0.14;
    // blended print on the glass faces (opaque print showed each title twice: once on the face,
    // once again through its own card); only floor print under a lens is opaque
    const t = words(role.title, top ? 0.15 : 0.085, title, { weight: 600 });
    t.position.set(L, y, fz + 0.001);
    face.add(t);
    const m = words(`${role.location} · ${role.type}`, top ? 0.085 : 0.058, meta, { align: "right" });
    m.position.set(W / 2 - 0.17, top ? D / 2 - 0.26 : y, fz + 0.001);
    face.add(m);
    if (top) [2.1, 1.9, 2.2, 1.3].forEach((w, k) => bar(face, L, D / 2 - 0.56 - k * 0.17, w, 0.018, fz, soft));
    scene.add(card);
  }
  aim(ctx, [0.05, 0.3, -0.05], 7.6, -6, 44);
}

/* ---------- apply: the role card, laid over a paper CV ---------- */
export function sceneApply(ctx: Ctx, tone: Tone, roleTitle = "") {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 16,
      halo: { x: 0.1, y: 0.2, r: 3.2 },
      shadows: [
        { x: -0.5, y: 0.1, rx: 1.3, ry: 1.6, a: 0.1, rot: 0.2 },
        { x: 0.7, y: 0.6, rx: 1.4, ry: 0.9, a: 0.1 },
      ],
      quiet: { x: 0.1, y: 0.3, rx: 1.9, ry: 1.6, k: 0.35 },
    }),
  );
  const soft = ink(tone, 0.35);
  // the CV: solid paper, printed with bars only
  const cv = new THREE.Group();
  const [PW, PD] = [1.9, 2.5];
  cv.add(new THREE.Mesh(slab(PW, 0.02, PD, 0.01, 2), paper(tone.theme)));
  const pf = topFace(cv);
  const PL = -PW / 2 + 0.16;
  const cvHead = words("CV", 0.16, inkCss(tone, 0.9), { weight: 600 });
  cvHead.position.set(PL, PD / 2 - 0.22, 0.013);
  pf.add(cvHead);
  edges(pf, PW, PD, 0.012, ink(tone, 0.25), 0.008);
  // short lines on the CV's left half: they never run under the card's words
  [0.8, 0.6, 0.5].forEach((w, k) => bar(pf, PL, PD / 2 - 0.46 - k * 0.12, w, 0.018, 0.012, soft));
  [0.8, 0.72, 0.6, 0.78, 0.5, 0.7].forEach((w, k) => bar(pf, PL, PD / 2 - 0.92 - k * 0.14, w, 0.014, 0.012, soft));
  cv.position.set(-0.55, 0.011, 0.05);
  cv.rotation.y = 0.2;
  scene.add(cv);
  // the role card on top of it
  const role = ROLES.find((r) => r.title === roleTitle);
  const [W, D, Tk] = [2.5, 1.45, 0.04];
  const card = new THREE.Group();
  card.add(new THREE.Mesh(slab(W, Tk, D, 0.018, 3), glass(tone.theme, 0.12)));
  const face = topFace(card);
  const fz = Tk / 2 + 0.003;
  const L = -W / 2 + 0.18;
  edges(face, W, D, fz, ink(tone, 0.35));
  const kick = words("APPLICATION", 0.075, inkCss(tone, 0.5), { weight: 500 });
  kick.position.set(L, D / 2 - 0.2, fz + 0.001);
  face.add(kick);
  const head = textBlock(wrap(role?.title ?? (roleTitle || "General application"), 22, 2), 0.2, inkCss(tone, 0.95), { weight: 400 });
  head.mesh.position.set(L, D / 2 - 0.32, fz + 0.001);
  face.add(head.mesh);
  const meta = words(role ? `${role.location} · ${role.type}` : "Zürich · Remote", 0.08, inkCss(tone, 0.55));
  meta.position.set(L, -D / 2 + 0.2, fz + 0.001);
  face.add(meta);
  card.position.set(0.7, 0.02 + Tk / 2 + 0.03, 0.6);
  card.rotation.y = -0.1;
  scene.add(card);
  aim(ctx, [0.15, 0.1, 0.3], 6.9, 8, 44);
}

/* ---------- blog / post: a glass page leaning in front of a paper page ---------- */
export type PageArg = { kicker: string; title: string; foot: string };

export function sceneBlog(ctx: Ctx, tone: Tone, arg: PageArg) {
  const { scene } = ctx;
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 18,
      halo: { x: 0.2, y: -0.5, r: 4.6 },
      shadows: [
        { x: 0.2, y: 0.05, rx: 1.8, ry: 0.5, a: 0.1 },
        { x: 0.8, y: -0.75, rx: 1.3, ry: 0.3, a: 0.09 },
      ],
    }),
  );
  scene.add(wall(tone, -2.3, { extent: 16, halo: { x: 0.3, y: 1.6, r: 4.4 } }));
  const [W, H, Tk] = [2.3, 3.0, 0.05];
  const soft = ink(tone, 0.38);
  const leaning = (lean: number, yaw: number, x: number, z: number) => {
    const turn = new THREE.Group();
    turn.rotation.y = yaw;
    turn.position.set(x, 0, z);
    const tilt = new THREE.Group();
    tilt.rotation.x = -lean; // top back, resting on its bottom edge
    turn.add(tilt);
    scene.add(turn);
    return tilt;
  };
  // behind: a paper page (something with contrast for the glass to bend)
  // (set further right and back, with four short lines in its lower half only, so its print
  // never tangles with the glass page's title and lines)
  const back = leaning(0.3, -0.12, 0.9, -0.8);
  const paperMat = paper(tone.theme);
  // in dark, just above the sheet's surface: a quiet page, not a grey slab
  if (tone.theme === "dark") paperMat.color.set("#1d1e22");
  const sheet = new THREE.Mesh(slab(W, H, 0.02, 0.01, 2), paperMat);
  sheet.position.y = H / 2;
  back.add(sheet);
  // a hairline edge (like the CV), so white paper on white holds its shape and its lines don't float
  const pe = ink(tone, 0.25);
  bar(back, -W / 2, H - 0.004, W, 0.008, 0.012, pe);
  bar(back, -W / 2, 0.004, W, 0.008, 0.012, pe);
  bar(back, -W / 2, H / 2, 0.008, H, 0.012, pe);
  bar(back, W / 2 - 0.008, H / 2, 0.008, H, 0.012, pe);
  // its lines sit low, well below where the glass page's lines end
  [1.1, 0.9, 1.2, 0.7].forEach((w, k) => bar(back, -W / 2 + 0.2, H - 2.0 - k * 0.2, w, 0.02, 0.012, soft));
  // in front: the glass page, printed
  const front = leaning(0.18, -0.26, -0.15, 0.2);
  const pane = new THREE.Mesh(slab(W, H, Tk, 0.02, 3), glass(tone.theme, 0.2));
  pane.position.y = H / 2;
  front.add(pane);
  const fz = Tk / 2 + 0.003;
  const L = -W / 2 + 0.2;
  const e = ink(tone, 0.3);
  bar(front, -W / 2, H - 0.006, W, 0.012, fz, e);
  bar(front, -W / 2, 0.006, W, 0.012, fz, e);
  bar(front, -W / 2, H / 2, 0.012, H, fz, e);
  bar(front, W / 2 - 0.012, H / 2, 0.012, H, fz, e);
  const kick = words(arg.kicker.toUpperCase(), 0.085, inkCss(tone, 0.5), { weight: 500 });
  kick.position.set(L, H - 0.28, fz + 0.001);
  front.add(kick);
  const head = textBlock(wrap(arg.title, 17, 3), 0.22, inkCss(tone, 0.96), { weight: 400 });
  head.mesh.position.set(L, H - 0.44, fz + 0.001);
  front.add(head.mesh);
  const y0 = H - 0.44 - head.h - 0.22;
  [1.8, 1.7, 1.85, 1.3].forEach((w, k) => bar(front, L, y0 - k * 0.17, w, 0.016, fz, soft));
  const foot = words(arg.foot, 0.075, inkCss(tone, 0.5));
  foot.position.set(L, 0.3, fz + 0.001);
  front.add(foot);
  // a satin ledge the glass page rests against
  const ledge = new THREE.Mesh(slab(2.7, 0.1, 0.24, 0.03, 3), satin());
  ledge.position.set(-0.2, 0.05, 0.42);
  ledge.rotation.y = -0.26;
  scene.add(ledge);
  aim(ctx, [0.15, 1.45, 0], 8.6, 16, 12);
}

/* ---------- author: a glass frame, the portrait set inside it, the name on the glass ---------- */
export type AuthorArg = { name: string; photo: string; pos: string };

/** The portrait as print: cover-cropped, monochrome, with a hairline border; a monogram
 *  on the surface grey when there is no photo. */
function portrait(tone: Tone, arg: AuthorArg, pw: number, ph: number) {
  const W = 640;
  const H = Math.round((W * ph) / pw);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const light = tone.theme === "light";
  g.fillStyle = light ? "#eceef1" : "#1a1b1f";
  g.fillRect(0, 0, W, H);
  const img = imageFor(arg.photo);
  if (img) {
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * k;
    const dh = img.naturalHeight * k;
    const px = parseFloat(arg.pos) / 100;
    const fx = Number.isFinite(px) ? px : 0.5;
    g.filter = light ? "grayscale(1) contrast(1.04)" : "grayscale(1) contrast(1.02) brightness(0.9)";
    g.drawImage(img, (W - dw) * fx, 0, dw, dh); // top-anchored, like the team portraits
    g.filter = "none";
    // a soft wash over the outer quarter: the photo's background (a tiled facade) must not
    // read as one more grid next to the floor and the wall
    const wash = g.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.36, W / 2, H * 0.42, Math.hypot(W, H) * 0.56);
    const base = light ? "236,238,241" : "26,27,31";
    wash.addColorStop(0, `rgba(${base},0)`);
    wash.addColorStop(1, `rgba(${base},0.85)`);
    g.fillStyle = wash;
    g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = inkCss(tone, 0.4);
    g.font = `300 ${Math.round(H * 0.42)}px "IBM Plex Sans", system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(arg.name.slice(0, 1), W / 2, H / 2);
  }
  g.strokeStyle = inkCss(tone, 0.35);
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, W - 3, H - 3);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
}

export function sceneAuthor(ctx: Ctx, tone: Tone, arg: AuthorArg) {
  const { scene } = ctx;
  const light = tone.theme === "light";
  setup(ctx, tone);
  scene.add(
    floor(tone, {
      extent: 16,
      halo: { x: 0, y: -0.5, r: 4.4 },
      shadows: [
        { x: 0.05, y: 0.08, rx: 1.3, ry: 0.36, a: light ? 0.18 : 0.14 },
        { x: 0.05, y: 0.06, rx: 0.95, ry: 0.2, a: light ? 0.2 : 0.16 },
      ],
    }),
  );
  scene.add(wall(tone, -2, { extent: 16, halo: { x: 0, y: 1.3, r: 3.8 } }));
  const [W, H, Tk, bev] = [1.75, 2.2, 0.16, 0.02];
  const footH = 0.16;
  const frame = new THREE.Group();
  const foot = new THREE.Mesh(slab(W + 0.32, footH, 0.56, 0.04, 4), satin());
  foot.position.y = footH / 2;
  frame.add(foot);
  const cy = footH - 0.06 + H / 2;
  // the frame: a thick clear block with a firm rim, like the Risks cards hold on white
  const block = rimmedSlab(roundRect(W, H, 0.05), Tk, bev, glass(tone.theme, 0.5), tone, light ? 0.014 : 0.01, {
    rim: light ? 0.95 : 0.8,
    tint: light ? 0.05 : 0.06,
  });
  block.position.y = cy;
  frame.add(block);
  // the portrait, set inside the glass a little behind its front face
  // (1.1 tall, inset 0.14: the portrait ends well above the printed name)
  const [PW, PH] = [W - 0.36, (W - 0.36) * 1.1];
  const pic = portrait(tone, arg, PW, PH);
  pic.position.set(0, cy + H / 2 - 0.14 - PH / 2, -0.01);
  frame.add(pic);
  // the name, printed on the front face below it (outside the glass, so it never sinks in)
  const zf = Tk / 2 + bev + 0.005;
  const who = words(arg.name, 0.13, inkCss(tone, 0.96), { weight: 400, sans: true, align: "center" });
  who.position.set(0, cy - H / 2 + 0.3, zf);
  frame.add(who);
  const tag = words("AUTHOR · BLINDSIGHT", 0.06, inkCss(tone, 0.55), { align: "center" });
  tag.position.set(0, cy - H / 2 + 0.14, zf);
  frame.add(tag);
  frame.rotation.y = -0.3;
  scene.add(frame);
  const sh = shadowBlob(2.8, 0.9, light ? 0.16 : 0.4);
  sh.rotation.x = -Math.PI / 2;
  sh.position.set(0.1, 0.004, 0.12);
  scene.add(sh);
  aim(ctx, [0.05, 1.2, 0], 7.2, 14, 10);
}
