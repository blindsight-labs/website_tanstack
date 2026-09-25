import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";

/* Material lab: renders the shared glass / frosted / chrome / satin / signal
   materials on both themes, to tune the look and to check headless WebGL. */
export const Route = createFileRoute("/mockup-lab")({
  component: Lab,
  head: () => ({ meta: [{ title: "Mockup · material lab" }, { name: "robots", content: "noindex" }] }),
});

function Stage({ theme }: { theme: "light" | "dark" }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    let dispose = () => {};
    import("@/mockups/4/three/core").then(({ THREE, createRenderer, studioEnvironment, materials, backdrop, slab, studioLights, PALETTE }) => {
      const canvas = ref.current!;
      const r = createRenderer(canvas);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      r.setSize(w, h, false);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(PALETTE[theme].bg);
      scene.environment = studioEnvironment(r);
      studioLights(scene, theme);
      scene.add(backdrop(theme, 40, 24, "chars", -3));
      const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 100);
      cam.position.set(0, 0.6, 12);
      cam.lookAt(0, 0, 0);

      const glassSlab = new THREE.Mesh(slab(2.2, 3, 0.7, 0.3), materials.glass(theme));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.16, 48, 128), materials.glass(theme));
      ring.position.set(-4.2, -2.1, 1);
      scene.add(ring);
      glassSlab.position.set(-4.2, 0, 0);
      glassSlab.rotation.set(0.1, 0.5, 0.15);
      const frost = new THREE.Mesh(slab(2.2, 3, 0.3, 0.18), materials.frosted(theme));
      frost.position.set(-1.4, 0, 0);
      frost.rotation.set(0.05, -0.35, -0.08);
      const chrome = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.28, 64, 160), materials.chrome());
      chrome.position.set(1.5, 0.2, 0);
      const satin = new THREE.Mesh(new THREE.TorusKnotGeometry(0.6, 0.2, 160, 32), materials.satin());
      satin.position.set(4.2, 0.2, 0);
      const signal = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 16), materials.signal(theme));
      signal.position.set(-1.4, 1.1, 0.4);
      scene.add(glassSlab, frost, chrome, satin, signal);

      const loop = (t: number) => {
        chrome.rotation.set(t * 0.0004, t * 0.0006, 0);
        satin.rotation.set(t * 0.0003, t * 0.0005, 0);
        glassSlab.rotation.y = 0.5 + Math.sin(t * 0.0006) * 0.25;
        r.render(scene, cam);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      dispose = () => r.dispose();
    });
    return () => {
      cancelAnimationFrame(raf);
      dispose();
    };
  }, [theme]);
  return <canvas ref={ref} style={{ width: "100%", height: 440, display: "block" }} />;
}

function Lab() {
  return (
    <main style={{ background: "#888", minHeight: "100vh" }}>
      <Stage theme="light" />
      <Stage theme="dark" />
    </main>
  );
}
