/* Section 5 — Deployment (owner: mid).
   A plain architecture drawing: hairlines + three rendered objects (chrome
   puck = endpoint agent, glass ring on a chrome rod = SDK/proxy, thick glass
   block with a chrome hex inside = Blindsight's local detection). No icon grid. */
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { deployment } from "./content";
import { Label, MetalIcon, useReveal, type SectionProps, type Theme } from "./shared";
import { MID_SURFACE, canvasTexture, frustumPlane, seeded, useNearViewport, type Core } from "./Walkthrough";

type ObjKind = "puck" | "ring" | "core";

/* ------------------------------------------------------------------ */
/* Rendered objects                                                     */
/* ------------------------------------------------------------------ */
export function hexPrism(core: Core, r: number, depth: number, bevel: number) {
  const { THREE } = core;
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i) s.lineTo(x, y);
    else s.moveTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 1,
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

/** A faint dot field in the surface colour, fading out towards the edges, so
 *  glass has something to bend without the image showing a rectangle. */
function dotField(core: Core, bg: string, dot: string, w: number, h: number, step = 14, seed = 3) {
  const rnd = seeded(seed);
  return canvasTexture(core, w, h, (g) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = dot;
    for (let y = step / 2; y < h; y += step)
      for (let x = step / 2; x < w; x += step) {
        const d = Math.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2));
        const a = Math.max(0, 1 - d * 1.15);
        if (a <= 0.02) continue;
        g.globalAlpha = a * (0.55 + rnd() * 0.45);
        g.beginPath();
        g.arc(x, y, 1.25, 0, Math.PI * 2);
        g.fill();
      }
    g.globalAlpha = 1;
  });
}

function renderObject(core: Core, kind: ObjKind, theme: Theme) {
  const { THREE, renderOnce, materials, slab, studioLights } = core;
  const bg = MID_SURFACE.surface[theme];
  const dot = theme === "dark" ? "#2c2d33" : "#cfd1d7";
  const size = kind === "core" ? { width: 360, height: 260 } : { width: 220, height: 160 };
  return renderOnce(
    `mid-dp-${kind}-v6`,
    ({ scene, camera }) => {
      scene.background = new THREE.Color(bg);
      camera.fov = 26;
      // the core is framed tight so the slab and its hex read at thumbnail size
      camera.position.set(0, 0, kind === "core" ? 6.6 : 10);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      const { mesh } = frustumPlane(core, camera, -3, dotField(core, bg, dot, size.width * 2, size.height * 2, 16, kind.length));
      scene.add(mesh);

      const glass = materials.glass(theme);
      glass.dispersion = 0;
      glass.attenuationColor = new THREE.Color("#ffffff");
      glass.attenuationDistance = 60;
      glass.thickness = 1.6;
      const chrome = materials.chrome();

      if (kind === "core") {
        // one clear slab holding a single chrome hex (a thick cube bent the hex
        // into an illegible chrome mass)
        // tilted towards the camera so the slab shows its top edge and the hex its
        // bevelled walls (face-on, both read as flat icons)
        glass.thickness = 0.5;
        const unit = new THREE.Group();
        unit.add(new THREE.Mesh(slab(3.1, 2.1, 0.46, 0.14, 6), glass));
        // brushed metal-grey, not mirror chrome: in this small frame chrome picks
        // up the studio's black flags and the hex prints as a black icon
        // (part-metal so the key light shades its faces: fully metallic, the face
        // mirrors the dark flag behind the camera and goes black)
        const metal = materials.satin();
        metal.color.set("#C4C6CC");
        metal.metalness = 0.55;
        metal.roughness = 0.4;
        unit.add(new THREE.Mesh(hexPrism(core, 0.6, 0.12, 0.09), metal));
        unit.rotation.set(0.5, 0.52, 0);
        scene.add(unit);
      } else if (kind === "ring") {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.3, 40, 96), glass);
        ring.rotation.set(0.25, 0.95, 0);
        scene.add(ring);
        const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 4.8, 8, 24), chrome);
        rod.rotation.set(0, 0, Math.PI / 2);
        scene.add(rod);
      } else {
        // endpoint agent: a machined chrome puck with a glass lens
        const profile = [
          new THREE.Vector2(0, -0.22),
          new THREE.Vector2(1.02, -0.22),
          new THREE.Vector2(1.12, -0.16),
          new THREE.Vector2(1.16, -0.06),
          new THREE.Vector2(1.16, 0.08),
          new THREE.Vector2(1.1, 0.18),
          new THREE.Vector2(0.98, 0.22),
          new THREE.Vector2(0, 0.22),
        ];
        const puck = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), materials.satin());
        puck.rotation.set(0.95, 0, 0.12);
        scene.add(puck);
        const lens = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), glass);
        lens.scale.set(1, 0.42, 1);
        lens.position.set(0, 0.22, 0);
        lens.rotation.set(0, 0, 0);
        const g = new THREE.Group();
        g.add(lens);
        g.rotation.set(0.95, 0, 0.12);
        scene.add(g);
      }
      studioLights(scene, theme);
    },
    { ...size, theme },
  );
}

/* ------------------------------------------------------------------ */
function Flow({ caption, dir = "right" }: { caption?: string; dir?: "right" | "left" }) {
  return (
    <div className="mid-dp__flow" data-dir={dir} aria-hidden="true">
      {caption && <span className="mid-dp__flow-cap">{caption}</span>}
      <span className="mid-dp__flow-line">
        <span className="mid-dp__pulse" />
      </span>
      <ArrowRight size={12} strokeWidth={1.5} className="mid-dp__flow-head" />
    </div>
  );
}

function Obj({ src, kind, alt }: { src: string | null; kind: ObjKind; alt: string }) {
  return (
    <div className="mid-dp__obj" data-kind={kind} data-ready={src ? "true" : "false"}>
      {src ? <img src={src} alt={alt} draggable={false} /> : <span className="mD-hex mid-dp__obj-ph" aria-hidden="true" />}
    </div>
  );
}

export function Deployment({ theme }: SectionProps) {
  const root = useRef<HTMLElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  useReveal(root);
  const [img, setImg] = useState<Partial<Record<ObjKind, string>>>({});

  useNearViewport(
    figure,
    () => {
      let alive = true;
      setImg({});
      import("@/mockups/7/three/core")
        .then((core) => {
          const kinds: ObjKind[] = ["core", "puck", "ring"];
          const step = (i: number) => {
            if (!alive || i >= kinds.length) return;
            try {
              const url = renderObject(core, kinds[i], theme);
              setImg((m) => ({ ...m, [kinds[i]]: url }));
            } catch (err) {
              console.warn("[deployment] render skipped", err);
            }
            requestAnimationFrame(() => step(i + 1));
          };
          requestAnimationFrame(() => step(0));
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    },
    [theme],
  );

  const [agent, sdk] = deployment.surfaces;

  return (
    <section ref={root} id="deployment" className="mD-section mid-dp" aria-labelledby="mid-dp-title">
      <div className="mD-container">
        <header className="mid-dp__head" data-reveal>
          <div>
            <Label>{deployment.label}</Label>
            <h2 id="mid-dp-title" className="mD-h1 mid-dp__title">
              {deployment.headline}
            </h2>
          </div>
          <p className="mid-dp__local">{deployment.local}</p>
        </header>

        <figure ref={figure} className="mid-dp__fig" data-reveal aria-labelledby="mid-dp-cap">
          <figcaption id="mid-dp-cap" className="mid-dp__figcap">
            <span>Architecture</span>
            <span className="mid-dp__figcap-r">Two surfaces · one detection layer</span>
          </figcaption>

          <div className="mid-dp__grid">
            {/* lane A — people */}
            <div className="mid-dp__end mid-dp__end--src" style={{ gridArea: "a1" }}>
              <span className="mid-dp__end-k">Your people</span>
              <span className="mid-dp__end-v">laptops · browser · desktop apps</span>
            </div>
            <div style={{ gridArea: "af1" }}>
              <Flow caption="prompts · uploads" />
            </div>
            <div className="mid-dp__node" style={{ gridArea: "an" }}>
              <Obj src={img.puck ?? null} kind="puck" alt="" />
              <span className="mid-dp__node-k">
                <span className="mid-dp__tag">A</span>
                {agent.name}
              </span>
            </div>
            <div style={{ gridArea: "af2" }}>
              <Flow caption="pseudonymised" />
            </div>
            <div className="mid-dp__end" style={{ gridArea: "a2" }}>
              <span className="mid-dp__end-k">AI tools</span>
              <span className="mid-dp__end-v">chatgpt.com · copilot · deepl.com</span>
            </div>

            {/* the detection layer */}
            <div className="mid-dp__core" style={{ gridArea: "core" }}>
              <span className="mid-dp__vline mid-dp__vline--up" aria-hidden="true" />
              <Obj src={img.core ?? null} kind="core" alt="" />
              <div className="mid-dp__core-txt">
                <span className="mid-dp__node-k">Blindsight</span>
                <span className="mid-dp__core-v">detection on local models</span>
              </div>
              <span className="mid-dp__vline mid-dp__vline--down" aria-hidden="true" />
            </div>

            {/* lane B — systems */}
            <div className="mid-dp__end mid-dp__end--src" style={{ gridArea: "b1" }}>
              <span className="mid-dp__end-k">Your AI systems</span>
              <span className="mid-dp__end-v">agents · RAG apps · n8n</span>
            </div>
            <div style={{ gridArea: "bf1" }}>
              <Flow caption="prompts · retrievals · tool calls" />
            </div>
            <div className="mid-dp__node" style={{ gridArea: "bn" }}>
              <Obj src={img.ring ?? null} kind="ring" alt="" />
              <span className="mid-dp__node-k">
                <span className="mid-dp__tag">B</span>
                {sdk.name}
              </span>
            </div>
            <div style={{ gridArea: "bf2" }}>
              <Flow caption="inspected at runtime" />
            </div>
            <div className="mid-dp__end" style={{ gridArea: "b2" }}>
              <span className="mid-dp__end-k">Models &amp; tools</span>
              <span className="mid-dp__end-v">LLM APIs · knowledge base · actions</span>
            </div>

            {/* where it runs */}
            <div className="mid-dp__bound" aria-hidden="true">
              <span className="mid-dp__bound-k">Your environment</span>
            </div>
            <div className="mid-dp__host" style={{ gridArea: "host" }}>
              <span className="mid-dp__host-k">Runs</span>
              <ul className="mid-dp__chips" aria-label="Hosting options">
                {deployment.hosting.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          </div>
        </figure>

        <div className="mid-dp__cols">
          {[agent, sdk].map((s, i) => (
            <article key={s.name} className="mid-dp__col" data-reveal>
              <div className="mid-dp__col-k">
                <span className="mid-dp__tag">{i === 0 ? "A" : "B"}</span>
                <span>{s.for}</span>
              </div>
              <h3 className="mD-h3">{s.name}</h3>
              <p>{s.body}</p>
            </article>
          ))}
          <aside className="mid-dp__col mid-dp__col--steps" data-reveal>
            <div className="mid-dp__col-k">
              <MetalIcon icon={ArrowRight} size={13} tone={theme === "dark" ? "light" : "ink"} />
              <span>Step by step</span>
            </div>
            <p className="mid-dp__ph">{deployment.steps}</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
