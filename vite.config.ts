import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Netlify build target — the @netlify plugin handles serverless function packaging
// and provides local emulation of Netlify Functions during `vite dev`.
// Publish dir is `dist/client` (see netlify.toml). VITE_* env vars are inlined
// at build time via Vite's default env handling — no extra config needed.
export default defineConfig({
  // Pinned away from 5173: Windows/Hyper-V (WSL2) dynamically reserves TCP port
  // ranges for its internal networking, and 5173 currently falls inside one
  // (`netsh interface ipv4 show excludedportrange protocol=tcp`), causing
  // EACCES on bind. Those ranges shift over time; if 3000 ever collides too,
  // re-run that command and pick another free port outside the listed ranges.
  server: { port: 3000 },
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart(), viteReact(), netlify()],
  // Pre-bundle these in the FIRST optimize pass. Otherwise Vite discovers them
  // mid-load ("new dependencies optimized … reloading") and the in-flight client
  // entry import 504s — breaking hydration so no buttons work until a reload.
  // The router-core SSR subpaths + seroval are pulled in by @tanstack/react-start.
  optimizeDeps: {
    include: [
      "@tanstack/router-core",
      "@tanstack/router-core/isServer",
      "@tanstack/router-core/ssr/client",
      "seroval",
    ],
  },
});
