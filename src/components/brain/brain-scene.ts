import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Euler,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NormalBlending,
  OctahedronGeometry,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import { TRANSITION, type LayerId } from "./brain-content";

/* Imperative three.js scene for BrainExperience — no React in here.
   A point-cloud brain wired to its nearest neighbours, a field of neutral
   objects orbiting it too fast to click, and one shimmering glass orb per
   marked threat: a glossy iridescent shell around a glowing core that carries
   the layer colour. On a layer change each orb switches state a beat after the
   scan line passes its screen position: it slows down and eases its hue to the
   layer colour. Orb screen positions are reported every frame so the DOM
   buttons over the canvas can follow them. Colours come from CSS custom
   properties on `styleSource`, so the scene follows the site theme. */

export type ScreenPos = { x: number; y: number }; // % of the canvas box

export type BrainScene = {
  /** dir: 1 when moving forward through the layers, -1 when going back. */
  setLayer: (layer: LayerId, dir: 1 | -1) => void;
  setHalted: (index: number | null) => void;
  setTheme: () => void;
  dispose: () => void;
};

type Options = {
  mobile: boolean;
  markedCount: number;
  styleSource: HTMLElement;
  /** Maps a canvas x (%) to 0..1 across the stage, where the scan line runs. */
  scanFrac: (xPct: number) => number;
  onFrame: (marked: ScreenPos[]) => void;
  onReady: () => void;
};

type Orbiter = {
  radius: number;
  tilt: Quaternion;
  theta: number;
  speed: number; // rad/s, signed
  shape: 0 | 1 | 2; // doc box, agent sphere, API octahedron
  slot: number; // index within its shape's InstancedMesh (unmarked only)
  scale: number;
};

// Per marked orb: its current state, and the colour transition in flight.
type Mark = {
  group: Group;
  glass: MeshPhysicalMaterial;
  core: MeshBasicMaterial;
  coreMesh: Mesh;
  color: Color; // current layer colour
  layer: LayerId; // the layer this orb currently shows
  pending: LayerId; // takes effect at `start`
  start: number;
  from: Color;
  to: Color;
  scale: number;
};

// Brain: two hemispheres, a cerebellum and a stem; x front-back, y up, z left-right.
function insideBrain(x: number, y: number, z: number) {
  const hemi = (cz: number) => x * x + ((y - 0.05) / 0.74) ** 2 + ((z - cz) / 0.52) ** 2 < 1;
  const cerebellum = ((x - 0.52) / 0.36) ** 2 + ((y + 0.52) / 0.24) ** 2 + (z / 0.62) ** 2 < 1;
  const stem = Math.hypot(x - 0.28, z) < 0.13 && y < -0.35 && y > -1.05;
  return (hemi(0.42) || hemi(-0.42)) && Math.abs(z) > 0.03 ? true : cerebellum || stem;
}

function brainGeometry(count: number) {
  const pts: number[] = [];
  while (pts.length / 3 < count) {
    const x = Math.random() * 2.2 - 1.1;
    const y = Math.random() * 2.2 - 1.1;
    const z = Math.random() * 2 - 1;
    if (!insideBrain(x, y, z)) continue;
    // Favour the surface so the silhouette reads: keep interior points rarely.
    const nearEdge =
      !insideBrain(x * 1.12, y * 1.12, z * 1.12) || !insideBrain(x * 0.88, y * 0.88, z * 0.88);
    if (!nearEdge && Math.random() > 0.12) continue;
    pts.push(x, y, z);
  }
  // ponytail: O(n²) nearest-neighbour pass, fine at ≤2k points built once; use a grid if counts grow.
  const n = pts.length / 3;
  const lines: number[] = [];
  for (let i = 0; i < n; i++) {
    const best: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d =
        (pts[i * 3] - pts[j * 3]) ** 2 +
        (pts[i * 3 + 1] - pts[j * 3 + 1]) ** 2 +
        (pts[i * 3 + 2] - pts[j * 3 + 2]) ** 2;
      if (d > 0.03) continue;
      best.push([d, j]);
    }
    best.sort((a, b) => a[0] - b[0]);
    for (const [, j] of best.slice(0, 2)) {
      if (j < i) continue;
      lines.push(
        pts[i * 3],
        pts[i * 3 + 1],
        pts[i * 3 + 2],
        pts[j * 3],
        pts[j * 3 + 1],
        pts[j * 3 + 2],
      );
    }
  }
  return { points: new Float32Array(pts), lines: new Float32Array(lines) };
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(c);
}

const WHITE = new Color(1, 1, 1);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeInOut = (t: number) => t * t * (3 - 2 * t);
// Frame-rate independent approach: `rate` is roughly 1/time-constant in seconds.
const approach = (cur: number, target: number, rate: number, dt: number) =>
  cur + (target - cur) * (1 - Math.exp(-rate * dt));

export function createBrainScene(canvas: HTMLCanvasElement, opts: Options): BrainScene {
  const { mobile, markedCount } = opts;
  const renderer = new WebGLRenderer({ canvas, antialias: !mobile, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1.2, 0.1, 100);
  camera.position.set(0, 0.3, 11);
  camera.lookAt(0, 0, 0);
  // Lights and the room reflection only affect the glass orbs; everything else is unlit.
  scene.add(new AmbientLight(0xffffff, 0.6));
  const sun = new DirectionalLight(0xffffff, 2);
  sun.position.set(3, 4, 6);
  scene.add(sun);
  const pmrem = new PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ── Brain ──
  const brain = new Group();
  brain.scale.setScalar(1.35);
  scene.add(brain);
  const { points, lines } = brainGeometry(mobile ? 900 : 1800);
  const pointGeo = new BufferGeometry();
  pointGeo.setAttribute("position", new BufferAttribute(points, 3));
  const pointColors = new Float32Array(points.length);
  pointGeo.setAttribute("color", new BufferAttribute(pointColors, 3));
  const sprite = dotTexture();
  const pointMat = new PointsMaterial({
    size: mobile ? 0.07 : 0.05,
    map: sprite,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  brain.add(new Points(pointGeo, pointMat));
  const lineGeo = new BufferGeometry();
  lineGeo.setAttribute("position", new BufferAttribute(lines, 3));
  const lineMat = new LineBasicMaterial({ transparent: true, opacity: 0.22, depthWrite: false });
  brain.add(new LineSegments(lineGeo, lineMat));

  // ── Orbiters: the first `markedCount` are the threat orbs ──
  const total = markedCount + (mobile ? 60 : 150);
  const shapeGeos = [
    new BoxGeometry(0.07, 0.09, 0.02),
    new SphereGeometry(0.045, 10, 8),
    new OctahedronGeometry(0.055),
  ];
  const shapeCounts = [0, 0, 0];
  const orbiters: Orbiter[] = [];
  for (let i = 0; i < total; i++) {
    const marked = i < markedCount;
    const shape = (i % 3) as 0 | 1 | 2;
    orbiters.push({
      // Orbs get mid-field orbits spread around the brain so they stay in view.
      radius: marked ? 2.15 + (i % 3) * 0.42 : 1.7 + Math.random() * 2.5,
      tilt: new Quaternion().setFromEuler(
        marked
          ? new Euler(0.3 + (i % 4) * 0.3, 0, (i % 2 ? 1 : -1) * (0.15 + (i % 3) * 0.2))
          : new Euler(Math.random() * Math.PI, 0, (Math.random() - 0.5) * Math.PI),
      ),
      theta: marked ? (i / markedCount) * Math.PI * 2 : Math.random() * Math.PI * 2,
      speed: (1.5 + Math.random() * 2.5) * (Math.random() > 0.5 ? 1 : -1),
      shape,
      slot: marked ? -1 : shapeCounts[shape]++,
      scale: marked ? 1 : 0.7 + Math.random() * 0.8,
    });
  }
  const shapeMat = new MeshBasicMaterial();
  const meshes = shapeGeos.map((g, s) => {
    const m = new InstancedMesh(g, shapeMat, shapeCounts[s]);
    m.frustumCulled = false;
    scene.add(m);
    return m;
  });
  // Glass orb = a clear, iridescent shell (drawn after, so it glazes over) and a glowing core.
  const shellGeo = new SphereGeometry(0.14, 32, 20);
  const coreGeo = new SphereGeometry(0.055, 16, 12);
  const marks: Mark[] = Array.from({ length: markedCount }, () => {
    const core = new MeshBasicMaterial({ transparent: true, opacity: 0.9 });
    const glass = new MeshPhysicalMaterial({
      envMap,
      transparent: true,
      opacity: 0.4,
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      iridescence: 1,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [150, 450],
      depthWrite: false,
    });
    const coreMesh = new Mesh(coreGeo, core);
    const shell = new Mesh(shellGeo, glass);
    shell.renderOrder = 1;
    const group = new Group();
    group.add(coreMesh, shell);
    scene.add(group);
    return {
      group,
      glass,
      core,
      coreMesh,
      color: new Color(),
      layer: "hero",
      pending: "hero",
      start: 0,
      from: new Color(),
      to: new Color(),
      scale: 1,
    };
  });
  const baseSpeed = orbiters.map((o) => o.speed);
  const curSpeed = orbiters.map((o) => o.speed);

  // Short motion trails: a two-point segment per object, fading into the ground.
  const trailPos = new Float32Array(total * 6);
  const trailCol = new Float32Array(total * 6);
  const trailGeo = new BufferGeometry();
  trailGeo.setAttribute("position", new BufferAttribute(trailPos, 3));
  trailGeo.setAttribute("color", new BufferAttribute(trailCol, 3));
  const trailMat = new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 });
  const trails = new LineSegments(trailGeo, trailMat);
  trails.frustumCulled = false;
  if (!mobile) scene.add(trails);

  // ── Theme ──
  const col = {
    bg: new Color(),
    object: new Color(),
    primary: new Color(),
    secondary: new Color(),
    node: new Color(),
    hero: new Color(),
    see: new Color(),
    govern: new Color(),
    prove: new Color(),
  };
  let dark = false;
  const readTheme = () => {
    const cs = getComputedStyle(opts.styleSource);
    const v = (name: string) => cs.getPropertyValue(name).trim() || "#888";
    col.bg.set(v("--bg"));
    col.object.set(v("--dim"));
    col.primary.set(v("--color-primary-500"));
    col.secondary.set(v("--color-secondary-500"));
    col.node.set(v("--brain-node"));
    col.hero.set(v("--muted"));
    col.see.set(v("--color-error-500"));
    col.govern.set(v("--color-success-500"));
    col.prove.set(v("--color-primary-500"));
    dark = document.documentElement.dataset.theme === "dark";
    pointMat.blending = dark ? AdditiveBlending : NormalBlending;
    pointMat.needsUpdate = true;
    lineMat.color.copy(col.primary);
    const c = new Color();
    for (let i = 0; i < points.length / 3; i++) {
      c.copy(i % 9 === 0 ? col.node : i % 3 === 0 ? col.secondary : col.primary);
      c.toArray(pointColors, i * 3);
    }
    pointGeo.attributes.color.needsUpdate = true;
    // A theme switch recolours at once; no hue sweep.
    for (const m of marks) {
      m.to.copy(col[m.pending]);
      m.from.copy(m.to);
      m.color.copy(m.to);
    }
  };
  readTheme();

  // ── State ──
  let halted: number | null = null;
  let dim = 0; // unmarked objects recede on the layers (0..1)
  let dimFrom = 0;
  let dimTo = 0;
  let dimStart = 0;

  // ── Loop ──
  const m4 = new Matrix4();
  const pos = new Vector3();
  const prev = new Vector3();
  const proj = new Vector3();
  const unitScale = new Vector3();
  const noRot = new Quaternion();
  const c = new Color();
  const screen: ScreenPos[] = Array.from({ length: markedCount }, () => ({ x: 50, y: 50 }));
  const orbitPoint = (o: Orbiter, theta: number, out: Vector3) =>
    out.set(o.radius * Math.cos(theta), 0, o.radius * Math.sin(theta)).applyQuaternion(o.tilt);

  let raf = 0;
  let last = performance.now();
  let visible = true;
  let ready = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    dim = dimFrom + (dimTo - dimFrom) * easeInOut(clamp01((now - dimStart) / TRANSITION.hueMs));
    brain.rotation.y += dt * 0.15;

    for (let i = 0; i < total; i++) {
      const o = orbiters[i];
      const m = i < markedCount ? marks[i] : null;

      if (m) {
        if (now >= m.start) m.layer = m.pending;
        const on = m.layer !== "hero";
        const stop = on && halted === i;
        // Halting is near-instant (~50ms); slowing for a layer takes ~a quarter second.
        const target = stop ? 0 : on ? 0.22 * Math.sign(baseSpeed[i]) : baseSpeed[i];
        curSpeed[i] = approach(curSpeed[i], target, stop ? 22 : 5, dt);
        const t = easeInOut(clamp01((now - m.start) / TRANSITION.hueMs));
        m.color.copy(m.from).lerpHSL(m.to, t);
        // Shimmer: the core breathes and the iridescent film drifts, each orb out of phase.
        const phase = now / 1000 + i * 1.7;
        m.core.color.copy(m.color);
        m.coreMesh.scale.setScalar(1 + Math.sin(phase * 2.6) * 0.12);
        m.glass.color.copy(m.color).lerp(WHITE, dark ? 0.55 : 0.35);
        m.glass.emissive.copy(m.color).multiplyScalar(dark ? 0.25 : 0.08);
        m.glass.iridescenceThicknessRange[1] = 420 + Math.sin(phase * 1.3) * 160;
        m.scale = approach(m.scale, (on ? 1.45 : 1) * (stop ? 1.25 : 1), 12, dt);
      } else {
        curSpeed[i] = approach(curSpeed[i], baseSpeed[i], 5, dt);
      }
      o.theta += curSpeed[i] * dt;
      orbitPoint(o, o.theta, pos);

      if (m) {
        m.group.position.copy(pos);
        m.group.scale.setScalar(m.scale * (mobile ? 1.25 : 1));
        // Turning moves the reflection and sheen across the glass.
        m.group.rotation.y += dt * 0.9;
        m.group.rotation.x = Math.sin(now / 1400 + i) * 0.35;
        proj.copy(pos).project(camera);
        screen[i].x = ((proj.x + 1) / 2) * 100;
        screen[i].y = ((1 - proj.y) / 2) * 100;
        c.copy(m.color);
      } else {
        // Unmarked objects stay neutral: colour is reserved for the layers.
        c.copy(col.object).lerp(col.bg, dim);
        m4.compose(pos, noRot, unitScale.setScalar(o.scale));
        meshes[o.shape].setMatrixAt(o.slot, m4);
        meshes[o.shape].setColorAt(o.slot, c);
      }

      if (!mobile) {
        // Trail length follows speed, so slowed/halted objects lose theirs.
        orbitPoint(o, o.theta - curSpeed[i] * 0.09, prev);
        pos.toArray(trailPos, i * 6);
        prev.toArray(trailPos, i * 6 + 3);
        c.toArray(trailCol, i * 6);
        col.bg.toArray(trailCol, i * 6 + 3);
      }
    }
    for (const mesh of meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
    opts.onFrame(screen);
    if (!ready) {
      ready = true;
      opts.onReady();
    }
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  // Only render while the stage is on screen and the tab is visible.
  const run = () => {
    const should = visible && !document.hidden;
    if (should && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!should && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    run();
  });
  io.observe(canvas);
  document.addEventListener("visibilitychange", run);
  run();

  return {
    setLayer: (l, dir) => {
      const t0 = performance.now();
      marks.forEach((m, i) => {
        // Each symbol turns a beat after the scan line reaches it.
        const f = clamp01(opts.scanFrac(screen[i].x));
        m.from.copy(m.color);
        m.to.copy(col[l]);
        m.pending = l;
        m.start = t0 + (dir > 0 ? f : 1 - f) * TRANSITION.scanMs + TRANSITION.beatMs;
      });
      dimFrom = dim;
      dimTo = l === "hero" ? 0 : 0.7;
      dimStart = t0 + TRANSITION.scanMs / 2;
    },
    setHalted: (i) => {
      halted = i;
    },
    setTheme: readTheme,
    dispose: () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      [pointGeo, lineGeo, trailGeo, shellGeo, coreGeo, ...shapeGeos].forEach((g) => g.dispose());
      [pointMat, lineMat, trailMat, shapeMat, ...marks.flatMap((m) => [m.glass, m.core])].forEach(
        (m) => m.dispose(),
      );
      meshes.forEach((m) => m.dispose());
      envMap.dispose();
      pmrem.dispose();
      sprite.dispose();
      renderer.dispose();
    },
  };
}
