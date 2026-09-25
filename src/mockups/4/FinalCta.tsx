/* 09 · Closing sheet — Octane's black closing sheet: thick clear glass slabs
   cropped by the sheet's corners and a machined chrome hex (our marker, made
   real) half behind the glass. No colour: violet is reserved for live signals.
   Rendered once (three.js renderOnce → <img>); the sheet colour is the
   render's backdrop. */
import { useEffect, useRef, useState } from "react";
import type { BufferGeometry, Material, Texture } from "three";

import { finalCta } from "./content";
import { CtaButton, Label, useReveal, type SectionProps, type Theme } from "./shared";

type Core = typeof import("@/mockups/4/three/core");

/** Faint dot field in the sheet colour; empty in the middle where the type sits,
 *  denser towards the corners where the glass needs something to refract. */
function dotField(core: Core, bg: string, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  const step = Math.max(14, Math.round(w / 96));
  const cx = w / 2;
  const cy = h / 2;
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      const d = Math.hypot((x - cx) / (w / 2), (y - cy) / (h / 2)) / Math.SQRT2;
      const a = Math.min(1, Math.max(0, (d - 0.34) / 0.45));
      if (a <= 0.02) continue;
      g.fillStyle = `rgba(255,255,255,${(0.55 * a * a).toFixed(3)})`;
      g.beginPath();
      g.arc(x, y, Math.max(1, step / 13), 0, Math.PI * 2);
      g.fill();
    }
  const tex = new core.THREE.CanvasTexture(c);
  tex.colorSpace = core.THREE.SRGBColorSpace;
  return tex;
}

/** The softbox studio of core.studioEnvironment, but with black walls: the
 *  product-shot-on-black setup. Glass edges pick up thin white rims, faces a soft
 *  sheen, chrome goes hard black-and-white. An equirect canvas, PMREM'd by three. */
let blackStudioTex: Texture | null = null;
function blackStudio(core: Core) {
  if (blackStudioTex) return blackStudioTex;
  const { THREE } = core;
  const W = 1024;
  const H = 512;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  // a dim, broad overhead gradient: faces pointing up carry a soft sheen
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2c2c30");
  sky.addColorStop(0.3, "#131315");
  sky.addColorStop(0.5, "#060607");
  sky.addColorStop(1, "#000000");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // u: 0.5 = +x (right), 0.75 = +z (towards the camera), 0.25 = -z (behind the objects)
  // v (canvas y): 0 = zenith, 0.5 = horizon
  const box = (u0: number, u1: number, v0: number, v1: number, k: number, soft = 6) => {
    g.save();
    g.filter = `blur(${soft}px)`;
    g.fillStyle = `rgb(${k},${k},${k})`;
    g.fillRect(u0 * W, v0 * H, (u1 - u0) * W, (v1 - v0) * H);
    g.restore();
  };
  // No big key: a large bright box floods every flat face and turns glass into
  // grey plastic. Narrow hard strips instead, so faces stay black and every
  // bevel carries one unbroken bright rim.
  box(0, 1, 0, 0.05, 70, 8); // dim overhead ring
  box(0.42, 0.58, 0.04, 0.13, 140, 6); // small grey overhead softbox: the chrome hex reads as metal
  // a broad mid-grey card behind the camera: chrome faces pointing at us reflect
  // it fully (grey metal, not a black hole); glass reflects ~4% of it (stays clear)
  box(0.68, 0.84, 0.26, 0.62, 150, 12);
  box(0.2, 0.235, 0.2, 0.8, 255, 1.5); // strip behind-left
  box(0.745, 0.765, 0.2, 0.8, 255, 1.5); // strip on the camera side
  box(0.655, 0.668, 0.3, 0.72, 255, 1.5); // tall front strip, left of camera
  box(0.485, 0.497, 0.22, 0.78, 255, 1.5); // right strip
  box(0, 0.01, 0.22, 0.78, 220, 1.5); // left strip (wraps)
  box(0.99, 1, 0.22, 0.78, 220, 1.5);
  box(0.18, 0.32, 0.54, 0.6, 50, 6); // low back fill
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  blackStudioTex = tex;
  return tex;
}

/** Our hex marker, machined: a chrome hexagonal plate with rounded, bevelled edges. */
function hexPlate(core: Core, R: number, depth: number) {
  const { THREE } = core;
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 3;
    const x = R * Math.cos(a);
    const y = R * Math.sin(a);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.45,
    bevelSize: R * 0.1,
    bevelSegments: 6,
    curveSegments: 6,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

function renderSheet(core: Core, theme: Theme, bg: string, width: number, height: number) {
  const { THREE } = core;
  const aspect = width / height;
  const wide = aspect >= 1.1;
  return core.renderOnce(
    `mDb-final-v5-${wide ? "wide" : "tall"}-${bg}`,
    ({ scene, camera }) => {
      const dist = 10;
      const fov = 30;
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      const t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const hh = dist * t; // half-height of the view at z = 0
      const hw = hh * aspect;

      scene.background = new THREE.Color(bg);
      scene.environment = blackStudio(core);

      // backdrop plane exactly filling the view at its depth
      const zb = -3.2;
      const bh = 2 * (dist - zb) * t;
      const bw = bh * aspect;
      const texW = Math.min(2048, Math.round(width * 1.5));
      const texH = Math.round(texW / aspect);
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(bw, bh),
        new THREE.MeshBasicMaterial({ map: dotField(core, bg, texW, texH), toneMapped: false }),
      );
      plane.position.z = zb;
      scene.add(plane);

      // clear glass: near-neutral, barely absorbing; the rims do the work
      const glass = core.materials.glass("dark");
      // front faces only: rendering back faces into the transmission pass made
      // the slabs darker than the sheet behind them, which clear glass never is
      glass.side = THREE.FrontSide;
      glass.attenuationColor = new THREE.Color("#DADBDE");
      glass.attenuationDistance = 14;
      glass.thickness = 1.0;
      glass.ior = 1.5;
      glass.dispersion = 0.02;
      glass.envMapIntensity = 1.3;
      const chrome = core.materials.chrome();
      chrome.color = new THREE.Color("#E4E5E8");
      chrome.roughness = 0.06;
      chrome.envMapIntensity = 1.6;

      const add = (geo: BufferGeometry, mat: Material, pos: [number, number, number], rot: [number, number, number]) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(...pos);
        m.rotation.set(...rot);
        scene.add(m);
        return m;
      };

      if (wide) {
        // top-left: a big thick slab over a smaller one, both cropped by the corner
        // rounder bevels (0.44): more of each edge catches a strip, so the rims read
        add(core.slab(3.9, 2.5, 0.9, 0.44, 10), glass, [-hw + 1.1, hh - 0.4, 0.5], [0.55, -0.5, -0.66]);
        add(core.slab(2.5, 1.6, 0.7, 0.34, 10), glass, [-hw + 2.9, hh + 0.2, -1.1], [-0.35, 0.55, -0.3]);
        // bottom-right: one thick slab tipped towards the viewer; the chrome hex sits
        // half behind it, so one half is seen straight and the other through the glass
        add(core.slab(4.3, 2.8, 0.95, 0.46, 10), glass, [hw - 0.9, -hh + 0.35, 0.6], [-0.5, 0.55, 0.6]);
        add(hexPlate(core, 0.62, 0.22), chrome, [hw - 2.55, -hh + 1.3, -0.7], [0.5, -0.55, 0.18]);
        // left edge, low: a sliver of glass for depth
        add(core.slab(1.5, 3.2, 0.6, 0.29, 10), glass, [-hw - 0.15, -hh + 0.65, 0.2], [0.25, 0.75, 0.35]);
      } else {
        // phone: pushed further into the corners so nothing crosses the label or headline
        add(core.slab(3.0, 2.0, 0.8, 0.38, 10), glass, [-hw - 0.2, hh + 0.15, 0.4], [0.55, -0.45, -0.55]);
        add(core.slab(3.2, 2.1, 0.8, 0.38, 10), glass, [hw + 0.15, -hh - 0.1, 0.4], [-0.5, 0.55, 0.5]);
        add(hexPlate(core, 0.46, 0.18), chrome, [hw - 1.35, -hh + 1.0, -0.7], [0.5, -0.55, 0.18]);
      }

      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(3, 6, 5);
      scene.add(key);
    },
    { width, height, theme, fov: 30, transparent: false },
  );
}

export function FinalCta({ theme }: SectionProps) {
  const ref = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useReveal(ref);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    let alive = true;
    let lastKey = "";
    let timer = 0;

    const draw = () => {
      const r = sheet.getBoundingClientRect();
      // bucket the size so small resizes reuse the cached render
      const w = Math.min(1680, Math.max(320, Math.round(r.width / 40) * 40));
      const h = Math.min(1000, Math.max(400, Math.round(r.height / 40) * 40));
      const bg = getComputedStyle(sheet).backgroundColor || "#060607";
      const key = `${w}x${h}:${bg}:${theme}`;
      if (key === lastKey) return;
      lastKey = key;
      import("@/mockups/4/three/core")
        .then((core) => {
          if (!alive) return;
          setSrc(renderSheet(core, theme, toHex(bg), w, h));
        })
        .catch(() => {
          /* no WebGL: the plain black sheet stands on its own */
        });
    };

    // render when the sheet is within reach, not at page load
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          draw();
        }
      },
      { rootMargin: "1600px 0px" },
    );
    io.observe(sheet);
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lastKey && draw(), 350);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      io.disconnect();
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  return (
    <section ref={ref} className="mDb-final" aria-labelledby="mDb-final-title">
      <div ref={sheetRef} className="mD-sheet mD-sheet--inverse mDb-final__sheet">
        {src && (
          <img
            className="mDb-final__render"
            src={src}
            alt=""
            aria-hidden="true"
            draggable={false}
            data-ready={ready ? "true" : undefined}
            onLoad={() => setReady(true)}
          />
        )}
        <div className="mDb-final__content" data-reveal>
          <Label>Start with discovery</Label>
          <h2 id="mDb-final-title" className="mD-h1 mDb-final__title">
            {finalCta.headline}
          </h2>
          <CtaButton size="lg" />
        </div>
      </div>
    </section>
  );
}

/** "rgb(6, 6, 7)" → "#060607" (keeps the render cache key tidy). */
function toHex(css: string) {
  const m = css.match(/\d+(\.\d+)?/g);
  if (!m || m.length < 3) return "#060607";
  return (
    "#" +
    m
      .slice(0, 3)
      .map((v) => Math.round(Number(v)).toString(16).padStart(2, "0"))
      .join("")
  );
}
