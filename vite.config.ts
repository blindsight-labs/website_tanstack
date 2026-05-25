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
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ customViteReactPlugin: true }),
    viteReact(),
    netlify(),
  ],
});
