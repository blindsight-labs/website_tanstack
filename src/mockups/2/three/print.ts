/* Hero scene for mockup 10, version A: "The spin prints the record".
 *
 * The hub-and-orbit mark (src/assets/ICON_Blindsight.svg, orbit radius = 1) stands
 * upright, facing the viewer, and turns anticlockwise in its own plane like a print
 * drum. Behind it, on the same axis, turns a chrome sprocket; only a ~40° window of it
 * shows, at the contact point, where its teeth rise from behind the glass orbit (the
 * logo's ring itself stays smooth and broken). A glass tape hangs straight down the
 * mark's left side with a row of perforations on the sprocket's pitch line: rack and pinion.
 * At the tangent point the teeth sit in the holes, so the tape advances exactly one
 * hole per tooth. When the mark eases, the tape eases; when a click jumps the story,
 * both roll on together. One turn = one record = one loop.
 *
 * Two fixed stations on the tape:
 *   the slot   a satin bar the tape leaves from: rows appear here RAW.
 *   the line   a thin chrome rod across the tape at the tangent point, where the teeth
 *              mesh. Everything below it has passed the mark and is PROCESSED: the
 *              ink shader switches from the raw print to the processed print exactly
 *              here, under the rod.
 * The tape ends in a hard glass edge; older rows leave through it.
 *
 * The record reads newest-first (it hangs from the mark):
 *   01 See it     five discovered AI uses; at the line each gets an ink tick and
 *                 "seen", the unknown app a hollow ring and "unapproved".
 *   02 Secure it  a request prints with a hidden instruction in violet (the page's one
 *                 violet); below the line it is struck through and "[stripped]", and
 *                 the customer email becomes user_7f3a.
 *   03 Govern it  each policy row gets its verdict tag; an engraved rule prints; then
 *                 the Govern node, rolling over the tape's edge, presses a small chrome
 *                 seal onto the seal row as it crosses the line (LOG_T.seal).
 * The current beat's node brightens and shows a slim ink ring.
 */
import { THREE, RoundedBoxGeometry, createRenderer, type Theme } from "./core";

export const LOOP_MS = 14000;
/** A calm, representative frame for reduced motion: the injection just stripped. */
export const SETTLED_MS = 6000;
/** When the DOM audit-trail row should appear, seal and clear. */
export const LOG_T = { in: 7600, seal: 8800, out: 13000 };
/** The three beats, for the caption rail under the render. */
export const BEATS = [
  { n: "01", label: "See it", t0: 0, t1: 3800 },
  { n: "02", label: "Secure it", t0: 3800, t1: 6600 },
  { n: "03", label: "Govern it", t0: 6600, t1: 14000 },
] as const;

export type HeroLabel = { x: number; y: number; a: number; state: 0 | 1 | 2 };
export type HeroMode = "wide" | "narrow";
export type HeroOptions = { theme: Theme; bg: string; ink: string };
/** One outer node, for the page to label: stage px, the beat it stands for, and how
 *  "on" it is right now (0..1; 1 = the beat being shown). */
export type HeroNode = { x: number; y: number; beat: number; on: number };

export type HeroScene = {
  resize(width: number, height: number, mode: HeroMode): void;
  render(timeMs: number): void;
  labels(): HeroLabel[];
  /** is this point (stage px) on the mark or the tape? */
  hit(x: number, y: number): boolean;
  /** the mark spins, so no page labels: always [] */
  nodes(): HeroNode[];
  /** always -1 (no page labels) */
  nodeAt(x: number, y: number): number;
  dispose(): void;
};

/* ------------------------------------------------------------------ */
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const backOut = (x: number) => {
  const c = 1.4;
  const u = x - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const deg = (d: number) => (d * Math.PI) / 180;
const TAU = Math.PI * 2;

/* the mark (orbit radius = 1) */
const HUB_R = 0.5;
const NODE_R = 0.25;
const NODE_A = [0, 128, 232]; // degrees, counter-clockwise from 3 o'clock
const GAP = 20; // half-gap of the orbit at each node, degrees
const BAND = 0.22;
const BAND_D = 0.02;
const BEVEL = 0.032; // round, polished edges: that is where the glass bends the grid
const ARM_W = 0.17;
const NODE_Z = 0.03;
const NODE_D = 0.16;

/* the drive: rim knurl and tape perforations share one pitch */
const N_SLOTS = 22; // rows of tape per turn (= per loop)
const HOLES_PER_ROW = 4;
const N_TEETH = N_SLOTS * HOLES_PER_ROW; // 88
const TOOTH_DEG = 360 / N_TEETH;
const SLOT_DEG = 360 / N_SLOTS;
const R_K = 1.17; // pitch circle of the knurl = the tape's perforation line
const ROW = (TAU * R_K) / N_SLOTS; // tape advance per slot = arc length at R_K
const PITCH = ROW / HOLES_PER_ROW;
/* the sprocket: its own wheel on the mark's axis, BEHIND the mark (root under the glass
   orbit), turning with it. Only a ~40° window of it shows, where it meets the tape: its
   teeth rise out from behind the orbit there and sink back beyond it, so the logo's
   ring stays smooth, glass and broken */
const SPROCKET_ROOT = 1.04; // hidden under the glass band (0.89 to 1.11)
const KNURL_OUT = 1.19; // tooth tip (inside the hole at the tangent point)
const WIN_IN = 13; // teeth are fully up within ±WIN_IN° of the contact...
const WIN_OUT = 21; // ...and fully sunk beyond ±WIN_OUT°

/* the tape (straight down, left of the mark) */
const TAPE_IN = 1.13; // inner edge, distance from the mark's centre: clear of the orbit
const HOLE_D = R_K - TAPE_IN; // perforation centre line, from the inner edge
const HOLE_L = 0.05; // along the tape
const HOLE_W = 0.04; // across
const GATE_ROWS = 2; // raw rows between the slot and the line
const GATE_V = GATE_ROWS * ROW;
const TAPE_W = 1.95;
const TAPE_L = 8 * ROW; // hard end
const TAPE_T = 0.05; // a thin glass slab with round polished edges
const TAPE_Z = -0.16; // behind the mark, so the nodes and teeth roll over its edge
const TAPE_FRONT = TAPE_Z + TAPE_T / 2;
const INK_Z = TAPE_FRONT - 0.012; // the print is an inner layer, inside the glass
const TEETH_Z = TAPE_FRONT + 0.015;
const PX_U = 480; // print texture px per world unit
const SLOT0 = 1; // row centre c lives at texture slot coordinate c + SLOT0
const C_SEAL = 12.85; // the seal row's centre (rows along the tape)
const STAMP_D = 0.105; // the seal's centre, from the tape's inner edge (inside the node's reach)
const STAMP_R = 0.045;
/* spin phase: the Govern node (0°) reaches the tangent point (180°) exactly as the seal
   row reaches the line; the teeth are phased to sit in the holes there */
const PHI0 = 180 - NODE_A[0] - (C_SEAL + GATE_ROWS) * SLOT_DEG;
const TOOTH0 = 180 - PHI0 - (0.5 + HOLES_PER_ROW * GATE_ROWS) * TOOTH_DEG;
const BEAT_NODE = [2, 1, 0];
const W_SPRING = 1 / 260; // critically damped catch-up after a click (per ms)

/* print columns (tape units from the tape's outer, left edge) */
const U_NUM = 0.07;
const U_TEXT = 0.26;
const U_STAT = TAPE_W - 0.13;

/** tape advance (slots) through one loop: [t ms, s, speed slots/s]. Steady, easing at
 *  the reading moments; s(LOOP) = s(0) + N_SLOTS, so one turn per loop. */
const KEYS: [number, number, number][] = [
  [0, 0.9, 1.4],
  [2500, 5.0, 1.2], // four See rows through the line, ChatGPT raw above it
  [3800, 6.6, 1.3],
  [6000, 9.9, 0.9], // the injection just stripped
  [6600, 10.8, 1.5],
  [8800, 14.85, 1.3], // the seal row on the line: pressed (LOG_T.seal)
  [14000, 22.9, 1.4],
];

/* the tape frame: origin at the slot, on the inner edge; +y upstream, +x towards the mark */
const Q0X = -TAPE_IN;
const Q0Y = GATE_V;
const TAPE_QUAD: [number, number][] = [
  [-TAPE_W - 0.11, 0.09],
  [0, 0.09],
  [0, -TAPE_L],
  [-TAPE_W, -TAPE_L],
];
/** the composition's bounds (rig units, mark centre = 0) */
const BB = {
  x0: Q0X - TAPE_W - 0.11,
  x1: 1.25,
  y0: Q0Y - TAPE_L,
  y1: Math.max(1.25, Q0Y + 0.09),
};

/* ------------------------------------------------------------------ */
/* studio environment (per theme): narrow strips and black flags        */
/* ------------------------------------------------------------------ */
function heroEnvironment(renderer: THREE.WebGLRenderer, dark: boolean) {
  const scene = new THREE.Scene();
  const grey = (v: number) => new THREE.Color(v, v, v);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: grey(dark ? 0.05 : 0.46) },
        hor: { value: grey(dark ? 0.018 : 0.3) },
        bot: { value: grey(dark ? 0.008 : 0.38) },
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
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: grey(v), side: THREE.DoubleSide }));
    const az = deg(azDeg);
    const el = deg(elDeg);
    m.position.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  if (dark) {
    panel(14, 1.6, 0, 76, 2.4);
    panel(1.8, 16, 52, 4, 4.0);
    panel(1.1, 16, -78, 4, 2.4);
    panel(12, 3.2, 215, 12, 0.2);
    panel(24, 9, 180, 34, 0.28);
  } else {
    panel(14, 1.4, 0, 78, 2.0);
    panel(3.2, 16, -74, 0, 0.0);
    panel(2.2, 16, 122, 0, 0.0);
    panel(9, 1.3, 205, -6, 0.0);
    panel(1.8, 14, 58, 6, 2.6);
    panel(1.2, 14, -40, 8, 2.4);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.01).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
    (m.material as THREE.Material | undefined)?.dispose?.();
  });
  return env;
}

/** The wall just behind: a hairline grid and dot field, strongest behind the mark so
 *  its glass visibly bends straight lines, fading round the composition; a round soft
 *  shadow under the mark (round, so the spin never contradicts it) and the tape's. */
const WALL = { w: 10, h: 7.4, cx: -2.2, cy: -1.1, z: -0.55 };
function backdropTexture(bg: THREE.Color, ink: THREE.Color, dark: boolean) {
  const W = 2048;
  const px = W / WALL.w;
  const H = Math.round(WALL.h * px);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = `#${bg.getHexString()}`;
  g.fillRect(0, 0, W, H);
  const X = (x: number) => (x - (WALL.cx - WALL.w / 2)) * px;
  const Y = (y: number) => (WALL.cy + WALL.h / 2 - y) * px;

  const k = dark ? 0.5 : 0.06;
  const sh = g.createRadialGradient(X(0.08), Y(-0.12), 0, X(0.08), Y(-0.12), 1.4 * px);
  sh.addColorStop(0, `rgba(0,0,0,${k})`);
  sh.addColorStop(0.55, `rgba(0,0,0,${k * 0.45})`);
  sh.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = sh;
  g.fillRect(0, 0, W, H);
  // hairline grid every 0.2 units through the mark's centre; strongest behind the mark
  // and the tape, so their glass visibly bends it (no drop shadow under the tape)
  const gx = X((BB.x0 + BB.x1) / 2);
  const gy = Y((BB.y0 + BB.y1) / 2);
  const rx = ((BB.x1 - BB.x0) / 2 + 1.0) * px;
  const ry = ((BB.y1 - BB.y0) / 2 + 0.9) * px;
  const mx = X(0);
  const my = Y(0);
  const tx0 = X(Q0X - TAPE_W);
  const tx1 = X(Q0X);
  const ty0 = Y(Q0Y);
  const ty1 = Y(Q0Y - TAPE_L);
  const fade = (x: number, y: number) => {
    const f = 1 - smooth(clamp01((Math.hypot((x - gx) / rx, (y - gy) / ry) - 0.45) / 0.55));
    const near = 1 - smooth(clamp01((Math.hypot(x - mx, y - my) / px - 1.0) / 0.6)); // behind the mark
    const out = Math.max(tx0 - x, x - tx1, ty0 - y, y - ty1, 0) / px; // behind the tape
    const onTape = 1 - smooth(clamp01(out / 0.4));
    return f * (1 + Math.max(near * 0.9, onTape * 0.7));
  };
  const inkCss = `#${ink.getHexString()}`;
  g.strokeStyle = inkCss;
  g.lineWidth = 1.7;
  const step = 0.2 * px;
  const segL = step / 3;
  const ox = ((mx % step) + step) % step;
  const oy = ((my % step) + step) % step;
  const la = dark ? 0.1 : 0.065;
  for (let y = oy; y < H; y += step)
    for (let x = 0; x < W; x += segL) {
      const f = fade(x + segL / 2, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * la;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + segL, y);
      g.stroke();
    }
  for (let x = ox; x < W; x += step)
    for (let y = 0; y < H; y += segL) {
      const f = fade(x, y + segL / 2);
      if (f < 0.02) continue;
      g.globalAlpha = f * la;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + segL);
      g.stroke();
    }
  g.fillStyle = inkCss;
  for (let y = oy + step / 2; y < H; y += step)
    for (let x = ox + step / 2; x < W; x += step) {
      const f = fade(x, y);
      if (f < 0.02) continue;
      g.globalAlpha = f * (dark ? 0.2 : 0.14);
      g.beginPath();
      g.arc(x, y, 2.1, 0, TAU);
      g.fill();
    }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
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

/** One orbit arc as a flat glass band with rounded ends and round polished edges. */
function arcBand(a0: number, a1: number) {
  const hw = BAND / 2 - BEVEL;
  const sh = new THREE.Shape();
  sh.absarc(0, 0, 1 + hw, a0, a1, false);
  sh.absarc(Math.cos(a1), Math.sin(a1), hw, a1, a1 + Math.PI, false);
  sh.absarc(0, 0, 1 - hw, a1, a0, true);
  sh.absarc(Math.cos(a0), Math.sin(a0), hw, a0 + Math.PI, a0 + TAU, false);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth: BAND_D,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 6,
    curveSegments: 72,
  });
  g.translate(0, 0, -BAND_D / 2);
  return g;
}

/** A thin fresnel rim for clear glass: bright (dark mode) or ink (light mode) only
 *  where the surface turns away from the eye, so glass has a crisp outline without a
 *  milky face. */
function rimMaterial(color: THREE.Color, strength: number) {
  const c = color.clone().convertLinearToSRGB();
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    uniforms: { col: { value: new THREE.Vector3(c.r, c.g, c.b) }, k: { value: strength } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV;
      void main() {
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        f = smoothstep(0.3, 0.92, f);
        gl_FragColor = vec4(col, f * k);
      }`,
  });
}

/* ------------------------------------------------------------------ */
/* the print: one loop of tape, raw and processed, ink and violet       */
/* ------------------------------------------------------------------ */
type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };
type When = "both" | "raw" | "proc";
type Cls = "ink" | "sig";
type Part = { s: string; w?: number; a?: number; cls?: Cls; mono?: boolean };
const SANS = `"IBM Plex Sans", system-ui, sans-serif`;
const MONO = `"IBM Plex Mono", ui-monospace, monospace`;

/** Draws one layer of the loop's tape (white on transparent; alpha = coverage). A row
 *  centred at c (rows along the tape) sits at canvas y (N - c - SLOT0) rows: the
 *  newest row is at the top, as it hangs below the slot. */
function drawTape(g: Ctx, proc: boolean, violet: boolean) {
  const rowPx = g.canvas.height / N_SLOTS;
  const X = (u: number) => u * PX_U;
  const Y = (c: number, dy = 0) => (N_SLOTS - c - SLOT0) * rowPx - dy * PX_U;
  const on = (cls: Cls, when: When) => (cls === "sig") === violet && (when === "both" || (when === "proc") === proc);
  const font = (px: number, w: number, mono = false) => {
    g.font = `${w} ${px.toFixed(1)}px ${mono ? MONO : SANS}`;
    g.letterSpacing = mono ? `${(px * 0.06).toFixed(1)}px` : "0px";
  };
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.lineCap = "round";
  g.lineJoin = "round";

  /** one line of styled parts from u (or ending at u); shrinks to fit maxW; returns its span */
  const line = (parts: Part[], u: number, c: number, when: When, o: { size?: number; right?: boolean; maxW?: number } = {}) => {
    let px = (o.size ?? 0.1) * PX_U;
    const measure = () =>
      parts.map((p) => {
        font(px, p.w ?? 400, p.mono);
        return g.measureText(p.s).width;
      });
    let ws = measure();
    let total = ws.reduce((a, b) => a + b, 0);
    if (o.maxW && total > o.maxW * PX_U) {
      px *= (o.maxW * PX_U) / total;
      ws = measure();
      total = ws.reduce((a, b) => a + b, 0);
    }
    let x = o.right ? X(u) - total : X(u);
    const x0 = x;
    parts.forEach((p, i) => {
      if (on(p.cls ?? "ink", when)) {
        font(px, p.w ?? 400, p.mono);
        g.globalAlpha = p.a ?? 1;
        g.fillText(p.s, x, Y(c));
      }
      x += ws[i];
    });
    g.globalAlpha = 1;
    return { u0: x0 / PX_U, u1: x / PX_U };
  };
  const path = (when: When, a: number, lw: number, pts: number[], dash?: number[]) => {
    if (!on("ink", when)) return;
    g.globalAlpha = a;
    g.lineWidth = lw * PX_U;
    g.setLineDash(dash ? dash.map((d) => d * PX_U) : []);
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
  };
  const tick = (u: number, c: number) =>
    path("proc", 0.92, 0.011, [X(u - 0.03), Y(c, 0.0), X(u - 0.009), Y(c, -0.022), X(u + 0.033), Y(c, 0.027)]);
  const ring = (u: number, c: number) => {
    if (!on("ink", "proc")) return;
    g.globalAlpha = 0.85;
    g.lineWidth = 0.009 * PX_U;
    g.beginPath();
    g.arc(X(u), Y(c), 0.024 * PX_U, 0, TAU);
    g.stroke();
    g.globalAlpha = 1;
  };
  const num = (c: number, n: string) => line([{ s: n, w: 500, a: 0.34, mono: true }], U_NUM, c, "both", { size: 0.06 });
  const status = (c: number, s: string, when: When, a: number, w = 400) => line([{ s, w, a }], U_STAT, c, when, { size: 0.08, right: true });
  /** a verdict tag at the right: outlined, or filled with the word knocked out */
  const tag = (c: number, label: string, filled: boolean) => {
    if (!on("ink", "proc")) return;
    font(0.074 * PX_U, 600);
    const w = g.measureText(label).width;
    const padX = 0.045 * PX_U;
    const h = 0.14 * PX_U;
    const r = 0.028 * PX_U;
    const x1 = X(U_STAT);
    const x0 = x1 - w - 2 * padX;
    const y0 = Y(c) - h / 2;
    g.beginPath();
    g.moveTo(x0 + r, y0);
    g.arcTo(x1, y0, x1, y0 + h, r);
    g.arcTo(x1, y0 + h, x0, y0 + h, r);
    g.arcTo(x0, y0 + h, x0, y0, r);
    g.arcTo(x0, y0, x1, y0, r);
    g.closePath();
    if (filled) {
      g.globalAlpha = 0.9;
      g.fill();
      g.globalAlpha = 1;
      g.globalCompositeOperation = "destination-out";
      g.fillText(label, x0 + padX, Y(c));
      g.globalCompositeOperation = "source-over";
    } else {
      g.globalAlpha = 0.7;
      g.lineWidth = 0.007 * PX_U;
      g.stroke();
      g.globalAlpha = 0.95;
      g.fillText(label, x0 + padX, Y(c));
    }
    g.globalAlpha = 1;
  };

  /** a beat divider: a tiny mono marker and a hairline. The record reads newest-first,
   *  so each marker heads the group printed just before it (below it on the tape). */
  const divider = (c: number, label: string) => {
    const { u1 } = line([{ s: label, w: 500, a: 0.55, mono: true }], U_TEXT, c, "both", { size: 0.056 });
    path("both", 0.2, 0.005, [X(u1 + 0.05), Y(c), X(U_STAT), Y(c)]);
    path("both", 0.2, 0.005, [X(U_NUM), Y(c), X(U_TEXT - 0.05), Y(c)]);
  };
  divider(4.5, "01 · SEE");
  divider(8.5, "02 · SECURE");
  divider(13.85, "03 · GOVERN");

  // 01 See: what the mark finds
  const SEE: [number, string, string, boolean][] = [
    [-0.5, "Gemini", "sales", false],
    [0.5, "agent:finance", "ERP", false],
    [1.5, "pdf-summariser.app", "", true],
    [2.5, "Copilot", "engineering", false],
    [3.5, "ChatGPT", "marketing", false],
  ];
  for (const [c, app, who, rogue] of SEE) {
    num(c, "01");
    line([{ s: app, w: 500, a: 0.92 }, { s: who ? `  ${who}` : "", a: 0.5 }], U_TEXT, c, "both", { maxW: 1.0 });
    if (rogue) {
      status(c, "unknown", "raw", 0.45);
      const { u0 } = status(c, "unapproved", "proc", 0.8);
      ring(u0 - 0.06, c);
    } else {
      const { u0 } = status(c, "seen", "proc", 0.6);
      tick(u0 - 0.065, c);
    }
  }

  // 02 Secure: a request with a customer email and a hidden instruction
  num(5.5, "02");
  line([{ s: "invoice_0412.pdf", w: 500, a: 0.92 }], U_TEXT, 5.5, "both", { maxW: 0.9 });
  status(5.5, "→ agent:finance", "both", 0.5);
  num(6.5, "02");
  line([{ s: "anna.keller@kunde.ch", a: 0.88 }], U_TEXT, 6.5, "raw", { maxW: 1.4 });
  line([{ s: "anna.keller@…", a: 0.4 }, { s: "  →  ", a: 0.4 }, { s: "user_7f3a", w: 600, a: 0.95 }], U_TEXT, 6.5, "proc", {
    maxW: U_STAT - U_TEXT,
  });
  num(7.5, "02");
  const inj = "“ignore prior rules…”";
  line([{ s: inj, w: 500, cls: "sig" }], U_TEXT, 7.5, "raw", { maxW: 1.02 });
  const struck = line([{ s: inj, w: 500, a: 0.6, cls: "sig" }], U_TEXT, 7.5, "proc", { maxW: 1.02 });
  line([{ s: inj, w: 500, a: 0.3 }], U_TEXT, 7.5, "proc", { maxW: 1.02 }); // what is left once the violet fades
  path("proc", 0.85, 0.008, [X(struck.u0 - 0.02), Y(7.5, 0.004), X(struck.u1 + 0.02), Y(7.5, 0.004)]);
  status(7.5, "[stripped]", "proc", 0.95, 600);

  // 03 Govern: each request meets its policy; then the rule and the seal
  const POL: [number, string, string, boolean][] = [
    [9.5, "finance-data", "allowed", false],
    [10.5, "customer-pii", "masked", false],
    [11.5, "shadow AI", "blocked", true],
  ];
  for (const [c, obj, verdict, filled] of POL) {
    num(c, "03");
    line([{ s: "policy  ", a: 0.42 }, { s: obj, w: 500, a: 0.92 }], U_TEXT, c, "both", { maxW: 1.05 });
    status(c, "pending", "raw", 0.35);
    tag(c, verdict, filled);
  }
  const cRule = (11.5 + C_SEAL) / 2;
  path("proc", 0.62, 0.006, [X(0.07), Y(cRule, 0.011), X(U_STAT), Y(cRule, 0.011)]);
  path("proc", 0.26, 0.006, [X(0.07), Y(cRule, -0.011), X(U_STAT), Y(cRule, -0.011)]);
  num(C_SEAL, "03");
  line([{ s: "10 decisions", w: 500, a: 0.85 }], U_TEXT, C_SEAL, "both", { maxW: 1.0 });
  line([{ s: "sealed", w: 600, a: 0.95 }], TAPE_W - STAMP_D - STAMP_R - 0.035, C_SEAL, "proc", { size: 0.08, right: true });
  // the end of the record: a labelled tear line
  const { u1: endU } = line([{ s: "END OF RECORD", w: 500, a: 0.4, mono: true }], U_TEXT, 17.2, "both", { size: 0.05 });
  path("both", 0.24, 0.005, [X(endU + 0.05), Y(17.2), X(TAPE_W - 0.1), Y(17.2)], [0.03, 0.028]);
}

/** The loop's print as one RGBA mask: R raw ink, G processed ink, B raw violet,
 *  A processed violet. The shader picks raw or processed by distance from the slot. */
function tapeTexture() {
  const CW = Math.round(TAPE_W * PX_U);
  const CH = Math.round(N_SLOTS * ROW * PX_U);
  const c = document.createElement("canvas");
  c.width = CW;
  c.height = CH;
  const g = c.getContext("2d", { willReadFrequently: true })! as Ctx;
  const data = new Uint8Array(CW * CH * 4);
  for (let layer = 0; layer < 4; layer++) {
    g.clearRect(0, 0, CW, CH);
    drawTape(g, layer % 2 === 1, layer >= 2);
    const px = g.getImageData(0, 0, CW, CH).data;
    for (let i = 0; i < px.length; i += 4) data[i + layer] = px[i + 3];
  }
  c.width = c.height = 0;
  const tex = new THREE.DataTexture(data, CW, CH, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */
export async function createHeroScene(canvas: HTMLCanvasElement, opts: HeroOptions): Promise<HeroScene> {
  const dark = opts.theme === "dark";
  // the print needs its faces before it is drawn
  try {
    await Promise.race([
      Promise.all(
        ["400 48px", "500 48px", "600 48px"].map((f) => document.fonts.load(`${f} "IBM Plex Sans"`)).concat(document.fonts.load(`500 32px "IBM Plex Mono"`)),
      ),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
  } catch {
    /* fall back to system faces */
  }

  const renderer = createRenderer(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMappingExposure = dark ? 1.0 : 1.04;
  renderer.localClippingEnabled = true;

  const bg = new THREE.Color().setStyle(opts.bg);
  const ink = new THREE.Color().setStyle(opts.ink);
  const scene = new THREE.Scene();
  scene.background = bg;
  const env = heroEnvironment(renderer, dark);
  scene.environment = env;
  const key = new THREE.DirectionalLight(0xffffff, dark ? 1.1 : 0.75);
  key.position.set(-3, 5, 6);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 200);

  /* ---------- materials ---------- */
  const glass = (extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1,
      thickness: 0.3,
      ior: 1.5,
      dispersion: 0.02,
      clearcoat: 0,
      attenuationColor: new THREE.Color(dark ? "#9a9a9e" : "#f2f3f5"),
      attenuationDistance: 60,
      specularIntensity: 1,
      envMapIntensity: dark ? 1.5 : 1,
      ...extra,
    });
  // clear glass: the round bevels refract the grid just behind it
  const matBand = glass({ thickness: 0.35 });
  const matArm = glass({ thickness: 0.3 });
  const matLens = glass({ thickness: 0.4, envMapIntensity: dark ? 1.4 : 1 });
  // the tape: a thin clear slab; its round edges bend the grid, the print sits inside it
  const matTape = glass({ thickness: 0.14, dispersion: 0.02, envMapIntensity: dark ? 1.7 : 1.2, depthWrite: false });
  const rimCol = dark ? new THREE.Color(0xffffff) : ink;
  const matRim = rimMaterial(rimCol, dark ? 0.9 : 0.42);
  const matRimHi = rimMaterial(rimCol, dark ? 1.0 : 0.55);
  const matChrome = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#e6e8ec" : "#f3f4f6"),
    metalness: 1,
    roughness: 0.06,
    envMapIntensity: dark ? 1.3 : 1,
  });
  const matSatin = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(dark ? "#8a8c92" : "#c4c6cc"),
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1,
  });
  const signalCol = new THREE.Color(dark ? "#A08CFF" : "#6E4BFF");

  /* ---------- the wall behind ---------- */
  const wallTex = backdropTexture(bg, ink, dark);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL.w, WALL.h), new THREE.MeshBasicMaterial({ map: wallTex, toneMapped: false }));
  wall.position.set(WALL.cx, WALL.cy, WALL.z);
  scene.add(wall);

  /* ---------- the mark ---------- */
  const rig = new THREE.Group(); // sway + cursor lean: mark and tape move as one machine
  const dial = new THREE.Group(); // the in-plane turn
  rig.add(dial);
  scene.add(rig);

  NODE_A.forEach((a, i) => {
    const bandGeo = arcBand(deg(a + GAP), deg((NODE_A[i + 1] ?? 360) - GAP));
    dial.add(new THREE.Mesh(bandGeo, matBand), new THREE.Mesh(bandGeo, matRim));
  });
  // arms: clear glass bars with round edges, hub rim to under each node
  const armIn = HUB_R - 0.03;
  const armLen = 1 - NODE_R * 0.4 - armIn;
  const armGeo = new RoundedBoxGeometry(armLen, ARM_W, 0.07, 4, 0.034);
  NODE_A.forEach((a) => {
    const mid = armIn + armLen / 2;
    for (const m of [matArm, matRim]) {
      const arm = new THREE.Mesh(armGeo, m);
      arm.position.set(Math.cos(deg(a)) * mid, Math.sin(deg(a)) * mid, -0.02);
      arm.rotation.z = deg(a);
      dial.add(arm);
    }
  });
  const lensGeo = puck(HUB_R, 0.26, 0.1);
  dial.add(new THREE.Mesh(lensGeo, matLens), new THREE.Mesh(lensGeo, matRim));
  dial.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 48, 32), matChrome));

  // the sprocket, behind the mark on its axis: a short chrome rim arc under the glass
  // orbit at the contact window (round, so it reads the same while it turns) and teeth
  // that turn with the dial, rising out from behind the orbit only inside the window
  const arcDeg = 2 * WIN_OUT + 6;
  const carrier = new THREE.Mesh(new THREE.TorusGeometry(SPROCKET_ROOT + 0.01, 0.012, 8, 48, deg(arcDeg)), matSatin);
  carrier.rotation.z = deg(180 - arcDeg / 2);
  carrier.position.z = TEETH_Z;
  rig.add(carrier);
  const toothGeo = new RoundedBoxGeometry(KNURL_OUT - SPROCKET_ROOT, 0.03, 0.02, 1, 0.006);
  toothGeo.translate((KNURL_OUT - SPROCKET_ROOT) / 2, 0, 0); // grows outward from its root
  const teeth = new THREE.InstancedMesh(toothGeo, matChrome, N_TEETH);
  teeth.frustumCulled = false;
  const zAx = new THREE.Vector3(0, 0, 1);
  const toothQ = Array.from({ length: N_TEETH }, (_, i) => new THREE.Quaternion().setFromAxisAngle(zAx, deg(TOOTH0 + i * TOOTH_DEG)));
  const toothP = Array.from({ length: N_TEETH }, (_, i) => {
    const a = deg(TOOTH0 + i * TOOTH_DEG);
    return new THREE.Vector3(Math.cos(a) * SPROCKET_ROOT, Math.sin(a) * SPROCKET_ROOT, TEETH_Z);
  });
  const toothS = new THREE.Vector3();
  const toothM = new THREE.Matrix4();
  dial.add(teeth);

  // outer nodes: chrome discs on the orbit; the active one brightens and shows a slim ink ring
  const nodeGeo = puck(NODE_R, NODE_D, 0.07);
  const faceRingGeo = new THREE.RingGeometry(0.128, 0.14, 72);
  const nodeParts = NODE_A.map((a) => {
    const mat = matChrome.clone();
    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.set(Math.cos(deg(a)), Math.sin(deg(a)), NODE_Z);
    dial.add(node);
    const ringMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(faceRingGeo, ringMat);
    ring.position.set(node.position.x, node.position.y, NODE_Z + NODE_D / 2 + 0.002);
    ring.visible = false;
    dial.add(ring);
    return { node, mat, ring, ringMat };
  });

  /* ---------- the tape ---------- */
  const tapeG = new THREE.Group(); // origin at the slot on the tape's inner edge; -y = downstream
  tapeG.position.set(Q0X, Q0Y, 0);
  rig.add(tapeG);

  const tapeGeo = new RoundedBoxGeometry(TAPE_W, TAPE_L + 0.1, TAPE_T, 4, 0.022);
  tapeGeo.translate(-TAPE_W / 2, -TAPE_L / 2 + 0.05, TAPE_Z);
  tapeG.add(new THREE.Mesh(tapeGeo, matTape), new THREE.Mesh(tapeGeo, matRimHi));

  // the print on the tape's inner face: raw above the line, processed below; the
  // perforations, a faint body tint and a 1px glass edge are drawn by the same shader
  const tapeTex = tapeTexture();
  const srgb = (c: THREE.Color) => {
    const s = c.clone().convertLinearToSRGB();
    return new THREE.Vector3(s.r, s.g, s.b);
  };
  const printU = {
    map: { value: tapeTex as THREE.Texture },
    sMod: { value: 0 },
    violetK: { value: 0 },
    inkCol: { value: srgb(ink) },
    sigCol: { value: srgb(signalCol) },
    edgeCol: { value: srgb(rimCol) },
    edgeA: { value: dark ? 0.75 : 0.3 },
    hiA: { value: dark ? 0.3 : 0.85 }, // a white hairline just inside the edge
    fillCol: { value: new THREE.Vector3(1, 1, 1) }, // pale glass, never grey paper
    fillA: { value: dark ? 0.06 : 0.14 },
  };
  const f = (x: number) => x.toFixed(6);
  const matPrint = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    defines: {
      ROW_: f(ROW),
      PITCH_: f(PITCH),
      NS_: f(N_SLOTS),
      S0_: f(SLOT0),
      TW_: f(TAPE_W),
      TL_: f(TAPE_L),
      GATE_: f(GATE_V),
      HD_: f(HOLE_D),
      HL_: f(HOLE_L),
      HW_: f(HOLE_W),
    },
    uniforms: printU,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform float sMod; uniform float violetK;
      uniform vec3 inkCol; uniform vec3 sigCol; uniform vec3 edgeCol; uniform float edgeA; uniform float hiA;
      uniform vec3 fillCol; uniform float fillA;
      varying vec2 vP;
      void main() {
        float v = -vP.y; // distance downstream of the slot
        // the tape material under this point: slot coordinate = advance - distance / row
        vec2 uv = vec2((vP.x + TW_) / TW_, 1.0 - (sMod - v / ROW_ + S0_) / NS_);
        vec4 tx = textureGrad(map, vec2(uv.x, fract(uv.y)), dFdx(uv), dFdy(uv));
        float k = smoothstep(GATE_ - 0.008, GATE_ + 0.008, v); // past the line: processed
        float ia = mix(tx.r, tx.g, k);
        float va = mix(tx.b, tx.a * violetK, k);
        // perforations on the pitch line, one per knurl tooth
        float hc = (sMod * ROW_ - v) / PITCH_;
        vec2 q = vec2((fract(hc) - 0.5) * PITCH_, vP.x + HD_);
        float sd = length(max(abs(q) - vec2(HL_ * 0.5 - 0.01, HW_ * 0.5 - 0.01), 0.0)) - 0.01;
        float aa = max(fwidth(sd), 1e-5);
        float hole = 1.0 - smoothstep(-aa, aa, sd);
        float holeEdge = (1.0 - smoothstep(0.4, 1.3, abs(sd) / aa)) * 0.6;
        // a 1px glass edge along both sides and the hard end
        float ex = min(vP.x + TW_, -vP.x) / max(fwidth(vP.x), 1e-5);
        float ey = (vP.y + TL_) / max(fwidth(vP.y), 1e-5);
        float ed = min(ex, ey);
        float edge = (1.0 - smoothstep(0.5, 1.5, ed)) * edgeA;
        float hi = (1.0 - smoothstep(0.35, 1.0, abs(ed - 2.6))) * hiA;
        // compose, premultiplied: pale body, highlight, ink, violet, hole outline, edge
        float A = fillA * (1.0 - hole);
        vec3 P = fillCol * A;
        P = vec3(1.0) * hi + P * (1.0 - hi); A = hi + A * (1.0 - hi);
        P = inkCol * ia + P * (1.0 - ia); A = ia + A * (1.0 - ia);
        P = sigCol * va + P * (1.0 - va); A = va + A * (1.0 - va);
        P = inkCol * holeEdge + P * (1.0 - holeEdge); A = holeEdge + A * (1.0 - holeEdge);
        P = edgeCol * edge + P * (1.0 - edge); A = edge + A * (1.0 - edge);
        if (A < 0.002) discard;
        gl_FragColor = vec4(P / A, A);
      }`,
  });
  const printGeo = new THREE.PlaneGeometry(TAPE_W, TAPE_L);
  printGeo.translate(-TAPE_W / 2, -TAPE_L / 2, INK_Z);
  const print = new THREE.Mesh(printGeo, matPrint);
  print.renderOrder = 2;
  tapeG.add(print);

  // the slot the tape leaves from: a satin bar across its top
  const slotGeo = new RoundedBoxGeometry(TAPE_W + 0.05, 0.11, 0.1, 3, 0.035);
  slotGeo.translate(-TAPE_W / 2 - 0.025, 0.035, TAPE_Z + 0.045);
  tapeG.add(new THREE.Mesh(slotGeo, matSatin), new THREE.Mesh(slotGeo, matRimHi));

  // the line: a thin chrome rod across the tape at the tangent point, from the tape's
  // outer edge (flush) to just short of the perforations, where the teeth mesh
  const rodL = TAPE_W - 0.09;
  const guideGeo = new THREE.CylinderGeometry(0.015, 0.015, rodL, 24, 1);
  guideGeo.rotateZ(Math.PI / 2);
  guideGeo.translate(-0.09 - rodL / 2, -GATE_V, TAPE_FRONT + 0.017);
  tapeG.add(new THREE.Mesh(guideGeo, matChrome));

  // the seal: a small chrome disc, pressed on by the Govern node, clipped by the hard end
  const clip = new THREE.Plane();
  const matStamp = matChrome.clone();
  matStamp.envMapIntensity = dark ? 1.8 : 1.2;
  matStamp.clippingPlanes = [clip];
  const stampRingMat = new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: dark ? 0.85 : 0.7, depthWrite: false, toneMapped: false });
  stampRingMat.clippingPlanes = [clip];
  const stamp = new THREE.Group();
  const stampRing = new THREE.Mesh(new THREE.RingGeometry(STAMP_R * 0.55, STAMP_R * 0.68, 48), stampRingMat);
  stampRing.position.z = 0.016;
  stamp.add(new THREE.Mesh(puck(STAMP_R, 0.03, 0.01, 48), matStamp), stampRing);
  stamp.visible = false;
  tapeG.add(stamp);

  /* ---------- cursor lean ---------- */
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    lean.tx = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
    lean.ty = clamp01((e.clientY - r.top) / r.height) * 2 - 1;
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  /* ---------- per-frame state (all eased from what is on screen) ---------- */
  let viewW = 1;
  let viewH = 1;
  let lastReal = -1;
  let fDt = 16;
  let fSnap = true;
  const follow = (cur: number, to: number, tau: number) => (fSnap ? to : cur + (to - cur) * (1 - Math.exp(-fDt / tau)));
  const onShown = [0, 0, 0];
  let violetK = 0;
  // the spin: the story's tape advance, followed by a critically damped spring on the
  // error (with the story's own speed fed forward, so steady motion has no lag)
  let prevTarget: number | null = null;
  let prevV = 0;
  let lagE = 0;
  let lagV = 0;
  let kS = 0;
  let kV = 0;
  function tapeAt(t: number) {
    let i = 0;
    while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const s0 = a[1];
    const s1 = b[1];
    const h = b[0] - a[0];
    const x = clamp01((t - a[0]) / h);
    const m0 = (a[2] * h) / 1000;
    const m1 = (b[2] * h) / 1000;
    const x2 = x * x;
    const x3 = x2 * x;
    kS = (2 * x3 - 3 * x2 + 1) * s0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * s1 + (x3 - x2) * m1;
    kV = ((6 * x2 - 6 * x) * s0 + (3 * x2 - 4 * x + 1) * m0 + (-6 * x2 + 6 * x) * s1 + (3 * x2 - 2 * x) * m1) / h;
  }

  const tmpV = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const quadPx = new Float32Array(8);

  function update(tAbs: number) {
    const loopN = Math.floor(tAbs / LOOP_MS);
    const t = tAbs - loopN * LOOP_MS;
    const nowMs = performance.now();
    const raw = lastReal < 0 ? Infinity : nowMs - lastReal;
    lastReal = nowMs;
    fSnap = raw > 250;
    fDt = fSnap ? 16 : raw;

    /* ambient (real time): a slow, small sway and a gentle lean to the cursor */
    const e = fSnap ? 1 : 1 - Math.pow(0.03, fDt / 1000);
    lean.x += (lean.tx - lean.x) * e;
    lean.y += (lean.ty - lean.y) * e;
    rig.rotation.set(
      -0.04 + Math.sin((nowMs / 23000) * TAU + 1.1) * 0.014 + lean.y * 0.03,
      -0.07 + Math.sin((nowMs / 31000) * TAU) * 0.025 + lean.x * 0.045,
      0,
    );
    rig.position.y = Math.sin((nowMs / 19000) * TAU) * 0.01;
    scene.environmentRotation.set(0, Math.sin((nowMs / 37000) * TAU) * 0.3, 0);

    /* the spin and the tape: one number drives both */
    tapeAt(t);
    const target = loopN * N_SLOTS + kS;
    if (fSnap || prevTarget === null || Math.abs(target - prevTarget) > N_SLOTS * 1.5) {
      lagE = 0;
      lagV = 0;
    } else {
      lagE -= target - prevTarget - prevV * fDt; // a jump in the story becomes an error to roll off
      const ex = Math.exp(-W_SPRING * fDt);
      const b = lagV + W_SPRING * lagE;
      lagE = (lagE + b * fDt) * ex;
      lagV = (lagV - W_SPRING * b * fDt) * ex;
    }
    prevTarget = target;
    prevV = kV;
    const s = target + lagE;
    const sMod = ((s % N_SLOTS) + N_SLOTS) % N_SLOTS;
    const dialDeg = PHI0 + sMod * SLOT_DEG;
    dial.rotation.z = deg(dialDeg);
    printU.sMod.value = sMod;
    // the sprocket's teeth turn with the dial; each rises from behind the orbit as it
    // enters the contact window and sinks back as it leaves
    for (let i = 0; i < N_TEETH; i++) {
      const w = TOOTH0 + i * TOOTH_DEG + dialDeg - 180;
      const d = Math.abs((((w % 360) + 540) % 360) - 180);
      const up = 1 - smooth(seg(d, WIN_IN, WIN_OUT));
      toothS.set(Math.max(up, 1e-3), up > 0.001 ? 1 : 1e-3, 1);
      teeth.setMatrixAt(i, toothM.compose(toothP[i], toothQ[i], toothS));
    }
    teeth.instanceMatrix.needsUpdate = true;

    /* the beat's node: brighter chrome and a slim ink ring */
    const beat = t < BEATS[1].t0 ? 0 : t < BEATS[2].t0 ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const on = (onShown[i] = follow(onShown[i], BEAT_NODE[beat] === i ? 1 : 0, 200));
      const p = nodeParts[i];
      p.mat.envMapIntensity = (dark ? 1.3 : 1) + 0.55 * on;
      p.ringMat.opacity = on * (dark ? 0.9 : 0.8);
      p.ring.scale.setScalar(0.7 + 0.3 * on);
      p.ring.visible = on > 0.01;
    }
    // the one violet lives only in the Secure beat
    violetK = follow(violetK, beat === 1 ? 1 : 0, 280);
    printU.violetK.value = violetK;

    /* the seal: as its row crosses the line the Govern node rolls over the tape's edge
       there, dips onto it and leaves the chrome seal behind, riding away with the tape */
    const vs = ((((s - C_SEAL) % N_SLOTS) + N_SLOTS) % N_SLOTS) * ROW;
    const dv = (vs - GATE_V) / 0.09;
    const press = Math.exp(-dv * dv);
    const gov = nodeParts[0];
    gov.node.position.z = NODE_Z - 0.035 * press;
    gov.ring.position.z = NODE_Z + NODE_D / 2 + 0.002 - 0.035 * press;
    stamp.visible = vs >= GATE_V && vs < TAPE_L + STAMP_R;
    stamp.position.set(-STAMP_D, -vs, TAPE_FRONT + 0.016);
    stamp.scale.setScalar(0.4 + 0.6 * backOut(seg(vs, GATE_V, GATE_V + 0.1)));
    // the hard end clips it as it leaves
    tapeG.updateWorldMatrix(true, false);
    tmpN.set(0, 1, 0).transformDirection(tapeG.matrixWorld);
    tmpV.set(0, -TAPE_L, 0).applyMatrix4(tapeG.matrixWorld);
    clip.setFromNormalAndCoplanarPoint(tmpN, tmpV);
  }

  function resize(width: number, height: number, m: HeroMode) {
    viewW = Math.max(1, Math.round(width));
    viewH = Math.max(1, Math.round(height));
    renderer.setSize(viewW, viewH, false);
    const bw = BB.x1 - BB.x0;
    const bh = BB.y1 - BB.y0;
    let S: number;
    let cx: number;
    let cy: number;
    if (m === "wide") {
      // right of the headline (x ≥ ~49%), clear of the top and right edges and the caption rail
      const top = 34;
      const bottom = 140;
      const right = 34;
      S = Math.min((viewW - right - viewW * 0.493) / bw, (viewH - top - bottom) / bh);
      cx = viewW - right - BB.x1 * S;
      const free = viewH - top - bottom - bh * S;
      cy = top + free * 0.3 + BB.y1 * S;
    } else {
      S = Math.min((viewW * 0.9) / bw, (viewH * 0.88) / bh);
      cx = viewW / 2 - ((BB.x0 + BB.x1) / 2) * S;
      cy = viewH / 2 + ((BB.y0 + BB.y1) / 2) * S;
    }
    // a lens shift puts the mark's centre at (cx, cy) with the view axis straight on
    const fullW = 2 * Math.max(cx, viewW - cx);
    const fullH = 2 * Math.max(cy, viewH - cy);
    camera.fov = 22;
    camera.aspect = fullW / fullH;
    camera.position.set(0, 0, fullH / (2 * S * Math.tan(deg(camera.fov / 2))));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(fullW, fullH, fullW / 2 - cx, fullH / 2 - cy, viewW, viewH);
    camera.updateProjectionMatrix();
  }

  /** a point (in `obj`'s frame) → stage px, written into tmpV.x / tmpV.y */
  const toStage = (obj: THREE.Object3D, x: number, y: number, z: number) => {
    tmpV.set(x, y, z).applyMatrix4(obj.matrixWorld).project(camera);
    tmpV.set(((tmpV.x + 1) / 2) * viewW, ((1 - tmpV.y) / 2) * viewH, 0);
    return tmpV;
  };

  return {
    resize,
    render(tMs: number) {
      update(tMs);
      renderer.render(scene, camera);
    },
    labels: () => [],
    nodes: () => [],
    nodeAt: () => -1,
    hit(x: number, y: number) {
      // on the mark: within the nodes' reach of its projected centre
      const c = toStage(rig, 0, 0, 0);
      const cx = c.x;
      const cy = c.y;
      const e = toStage(rig, 0, 1, 0);
      if (Math.hypot(x - cx, y - cy) <= 1.3 * Math.hypot(e.x - cx, e.y - cy)) return true;
      // on the tape: inside its projected outline
      for (let i = 0; i < 4; i++) {
        const p = toStage(tapeG, TAPE_QUAD[i][0], TAPE_QUAD[i][1], TAPE_Z);
        quadPx[i * 2] = p.x;
        quadPx[i * 2 + 1] = p.y;
      }
      let sgn = 0;
      for (let i = 0; i < 4; i++) {
        const ax = quadPx[i * 2];
        const ay = quadPx[i * 2 + 1];
        const bx = quadPx[((i + 1) % 4) * 2];
        const by = quadPx[((i + 1) % 4) * 2 + 1];
        const cr = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
        if (cr === 0) continue;
        const sg = cr > 0 ? 1 : -1;
        if (sgn === 0) sgn = sg;
        else if (sg !== sgn) return false;
      }
      return true;
    },
    dispose() {
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      teeth.dispose();
      matChrome.dispose();
      tapeTex.dispose();
      wallTex.dispose();
      env.dispose();
      renderer.dispose();
    },
  };
}
