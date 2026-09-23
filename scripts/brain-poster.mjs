// Generates src/assets/brain-poster.svg — the static brain + orbit field shown
// before three.js loads and as the reduced-motion / no-WebGL fallback.
// Colours are classes (see .brain-poster in src/components/brain/brain.css) so
// one inline SVG follows the theme. Run: node scripts/brain-poster.mjs
import fs from "node:fs";

const W = 1200;
const H = 1000;
const CX = 600;
const CY = 500;
const K = 0.9;

function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
const f1 = (n) => Math.round(n * 10) / 10;
const op = (n) => Math.round(n * 100) / 100;

// Side-profile brain: cerebrum + cerebellum + stem, sampled with a min distance.
function brainPoints(seed) {
  const r = rng(seed);
  const inside = (x, y) =>
    (x * x + ((y + 0.05) * (y + 0.05)) / 0.52 < 1 && y < 0.5) ||
    (x - 0.5) ** 2 / 0.09 + (y - 0.52) ** 2 / 0.045 < 1 ||
    (x > 0.18 && x < 0.36 && y > 0.4 && y < 0.95 - (x - 0.18) * 0.6);
  const pts = [];
  for (let tries = 0; pts.length < 230 && tries < 40000; tries++) {
    const x = r() * 2 - 1;
    const y = r() * 2 - 1;
    if (!inside(x, y)) continue;
    if (pts.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < 0.0085)) continue;
    pts.push({ x, y, z: r() });
  }
  const edges = new Set();
  pts.forEach((p, i) => {
    pts
      .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .forEach((o) => {
        if (o.d < 0.05) edges.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`);
      });
  });
  return { pts, edges: [...edges].map((e) => e.split("-").map(Number)) };
}

const ORBITS = [
  { rx: 300, ry: 96, rot: -0.35 },
  { rx: 380, ry: 150, rot: 0.28 },
  { rx: 460, ry: 120, rot: -0.12 },
  { rx: 340, ry: 250, rot: 0.9 },
  { rx: 540, ry: 190, rot: 0.08 },
  { rx: 420, ry: 300, rot: -0.7 },
  { rx: 610, ry: 150, rot: -0.22 },
  { rx: 260, ry: 210, rot: 1.9 },
];
const orbitAt = (o, a) => {
  const c = Math.cos(o.rot);
  const s = Math.sin(o.rot);
  const ex = o.rx * K * Math.cos(a);
  const ey = o.ry * K * Math.sin(a);
  return { x: CX + ex * c - ey * s, y: CY + ex * s + ey * c, z: Math.sin(a) };
};

const r = rng(11);
const OBJS = Array.from({ length: 46 }, (_, i) => ({
  orbit: i % ORBITS.length,
  a: r() * Math.PI * 2,
  kind: ["doc", "agent", "api"][Math.floor(r() * 3)],
  size: 5 + r() * 7,
  dir: r() > 0.5 ? 1 : -1,
  trail: 0.22 + r() * 0.4,
  tint: r() < 0.25,
}));

function shape(kind, x, y, s, cls, o) {
  if (kind === "doc")
    return `<rect class="${cls}" x="${f1(x - s * 0.55)}" y="${f1(y - s * 0.7)}" width="${f1(s * 1.1)}" height="${f1(s * 1.4)}" rx="1.5" opacity="${o}"/>`;
  if (kind === "api")
    return `<rect class="${cls}" x="${f1(x - s * 0.5)}" y="${f1(y - s * 0.5)}" width="${f1(s)}" height="${f1(s)}" rx="1" transform="rotate(45 ${f1(x)} ${f1(y)})" opacity="${o}"/>`;
  return `<circle class="${cls}" cx="${f1(x)}" cy="${f1(y)}" r="${f1(s * 0.55)}" opacity="${o}"/>`;
}

const out = [];
out.push(
  `<svg class="brain-poster" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">`,
  `<defs><radialGradient id="brain-glow"><stop class="g" offset="0%" stop-opacity="0.5"/><stop class="g" offset="100%" stop-opacity="0"/></radialGradient></defs>`,
);
for (const o of ORBITS)
  out.push(
    `<ellipse class="o" cx="${CX}" cy="${CY}" rx="${f1(o.rx * K)}" ry="${f1(o.ry * K)}" transform="rotate(${f1((o.rot * 180) / Math.PI)} ${CX} ${CY})"/>`,
  );

const drawObj = (ob, front) => {
  const o = ORBITS[ob.orbit];
  const p = orbitAt(o, ob.a);
  if (p.z > 0 !== front) return;
  const depth = 0.55 + (0.45 * (p.z + 1)) / 2;
  const s = ob.size * depth;
  // Motion streak: the hero's objects are too fast to click.
  [0.5, 0.28, 0.12].forEach((so, n) => {
    const a0 = ob.a - ob.dir * ob.trail * (n / 3);
    const a1 = ob.a - ob.dir * ob.trail * ((n + 1) / 3);
    const q0 = orbitAt(o, a0);
    const q1 = orbitAt(o, (a0 + a1) / 2);
    const q2 = orbitAt(o, a1);
    out.push(
      `<path class="${ob.tint ? "s2" : "s"}" d="M${f1(q0.x)} ${f1(q0.y)}Q${f1(q1.x)} ${f1(q1.y)} ${f1(q2.x)} ${f1(q2.y)}" stroke-width="${f1(s * 0.7)}" opacity="${op(so * depth)}"/>`,
    );
  });
  out.push(shape(ob.kind, p.x, p.y, s, ob.tint ? "b2" : "b", op(depth * 0.9)));
};

OBJS.forEach((ob) => drawObj(ob, false));
const { pts, edges } = brainPoints(7);
const R = 210 * K;
out.push(`<circle cx="${CX}" cy="${CY}" r="${f1(R * 1.9)}" fill="url(#brain-glow)"/>`);
const bp = (p) => ({ x: CX + p.x * R, y: CY + p.y * R * 0.95 });
out.push(`<g class="e">`);
for (const [a, b] of edges) {
  const p = bp(pts[a]);
  const q = bp(pts[b]);
  out.push(`<line x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(q.x)}" y2="${f1(q.y)}"/>`);
}
out.push(`</g>`);
pts.forEach((pt, i) => {
  const p = bp(pt);
  const cls = i % 9 === 0 ? "n3" : i % 3 === 0 ? "n2" : "n1";
  out.push(
    `<circle class="${cls}" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(1 + pt.z * 1.8)}" opacity="${op(0.4 + pt.z * 0.6)}"/>`,
  );
});
OBJS.forEach((ob) => drawObj(ob, true));
out.push(`</svg>`);

fs.writeFileSync(new URL("../src/assets/brain-poster.svg", import.meta.url), out.join("\n") + "\n");
console.log("wrote src/assets/brain-poster.svg");
