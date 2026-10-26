// Pre-renders the subpage header stills into src/assets/stills (see its README).
// Zero deps: a temporary vite dev server + installed Edge over the DevTools Protocol.
//   node scripts/export-stills.mjs        (EDGE=<path to msedge/chrome> to override)
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "../src/site/pages/b/objects/version.ts";

const EDGE = process.env.EDGE || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ORIGIN = "http://127.0.0.1:3123";
const CDP_PORT = 9339;
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "src/assets/stills");
const THEMES = ["light", "dark"];
const MAX_BYTES = 120 * 1024;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(what, ms, fn) {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(250)) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
  }
  throw new Error(`timed out waiting for ${what}`);
}
// killing node/Edge on Windows leaves their children (esbuild, renderers) behind
function killTree(p) {
  if (!p || p.exitCode !== null) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {}
  } else p.kill("SIGKILL");
}

// headed, off-screen: headless Edge can fall back to SwiftShader, which renders differently.
// One fresh profile per theme: no stored theme, so the init script follows prefers-color-scheme;
// and after the 404 page the dev server's tab stops navigating, so each theme ends on it.
async function openEdge(profile) {
  const proc = spawn(
    EDGE,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--window-position=-3000,-3000",
      "--window-size=1440,900",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-background-timer-throttling",
      "--disable-features=CalculateNativeWinOcclusion",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  edges.push(proc);
  proc.on("error", (e) => console.error(`Edge: ${e.message}`)); // e.g. a wrong EDGE path
  const page = await until("Edge", 20_000, async () =>
    (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()).find(
      (t) => t.type === "page",
    ),
  );
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r, j) => (ws.addEventListener("open", r), ws.addEventListener("error", j)));
  let seq = 0;
  const waiting = new Map();
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    waiting.get(m.id)?.(m);
    waiting.delete(m.id);
  });
  const send = (method, params = {}) =>
    new Promise((r, j) => {
      const id = ++seq;
      const t = setTimeout(() => j(new Error(`CDP ${method} timed out`)), 30_000);
      waiting.set(id, (m) => (clearTimeout(t), r(m)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, error } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (error || result.exceptionDetails)
      throw new Error(JSON.stringify(error ?? result.exceptionDetails));
    return result.result.value;
  };
  const renderer = await evaluate(
    `(() => { const g = document.createElement("canvas").getContext("webgl2"); const x = g && g.getExtension("WEBGL_debug_renderer_info"); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : "no webgl2"; })()`,
  );
  console.log("WebGL renderer:", renderer);
  if (/swiftshader|no webgl2/i.test(renderer))
    throw new Error("no hardware WebGL: the stills would not match real renders");
  return {
    send,
    evaluate,
    close: () => (ws.close(), killTree(proc)),
  };
}

const profiles = [];
const edges = [];
let vite;
try {
  if (
    await fetch(ORIGIN).then(
      () => true,
      () => false,
    )
  )
    throw new Error(`${ORIGIN} is already in use`);
  vite = spawn(
    process.execPath,
    [
      join(ROOT, "node_modules/vite/bin/vite.js"),
      "dev",
      "--port",
      "3123",
      "--strictPort",
      "--host",
      "127.0.0.1",
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
  await until("vite", 60_000, async () => (await fetch(ORIGIN + "/sitemap.xml")).ok);
  if (vite.exitCode !== null) throw new Error("vite exited: is port 3123 taken?");

  const xml = await (await fetch(ORIGIN + "/sitemap.xml")).text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p !== "/" && !p.startsWith("/authors/"))
    .concat("/does-not-exist");

  // nothing on disk changes until both themes have rendered
  const files = [];
  for (const theme of THEMES) {
    profiles.push(mkdtempSync(join(tmpdir(), "stills-edge-")));
    const { send, evaluate, close } = await openEdge(profiles.at(-1));
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: theme }],
    });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
      mobile: false,
    });
    const done = new Set();
    for (const path of paths) {
      await send("Page.navigate", { url: "about:blank" });
      await send("Page.navigate", { url: `${ORIGIN}${path}#stills-live` });
      const shot = await until(`${path} (${theme})`, 60_000, () =>
        evaluate(`(() => {
          const s = document.querySelector(".pb-still[data-state=ready]");
          const img = s && s.querySelector("img");
          if (!img || !img.src.startsWith("data:")) return null;
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d").drawImage(img, 0, 0);
          return { name: s.dataset.still, dom: document.documentElement.dataset.theme, w: c.width, h: c.height, url: c.toDataURL("image/webp", 0.75) };
        })()`),
      );
      if (shot.dom !== theme)
        throw new Error(`${path}: data-theme is ${shot.dom}, expected ${theme}`);
      if (done.has(shot.name)) continue;
      done.add(shot.name);
      const bytes = Buffer.from(shot.url.split(",")[1], "base64");
      const file = `${shot.name}-${VERSION}-${theme}.webp`;
      files.push({ file, bytes });
      const kb = (bytes.length / 1024).toFixed(1);
      console.log(`${file}  ${shot.w}x${shot.h}  ${kb} KB  ${path}`);
      if (bytes.length > MAX_BYTES) console.warn(`  warning: ${file} is over 120 KB`);
    }
    close();
  }
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.endsWith(".webp")) rmSync(join(OUT, f));
  for (const { file, bytes } of files) writeFileSync(join(OUT, file), bytes);
  const total = files.reduce((n, f) => n + f.bytes.length, 0);
  console.log(`wrote ${files.length} files, ${(total / 1024).toFixed(1)} KB`);
} finally {
  edges.forEach(killTree);
  killTree(vite);
  await sleep(500);
  for (const p of profiles)
    rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
}
