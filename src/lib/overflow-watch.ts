/* Dev only. <html> and <body> clip horizontal overflow (system.css, styles.css), so an element
   wider than the viewport is silently cut off instead of scrolling the page. This reports such
   elements in the console after each navigation and resize, so the clip never hides a layout bug. */

function scrolls(el: Element): boolean {
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (/(hidden|auto|scroll|clip)/.test(getComputedStyle(p).overflowX)) return true;
  }
  return false;
}

function check() {
  const vw = document.documentElement.clientWidth;
  const out: Element[] = [];
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width || (r.right <= vw + 1 && r.left >= -1)) continue;
    if (getComputedStyle(el).position === "fixed" || scrolls(el)) continue;
    // report the outermost offender only, not every descendant of it
    if (!out.some((o) => o.contains(el))) out.push(el);
  }
  if (out.length) console.warn(`[overflow] ${out.length} element(s) wider than the ${vw}px viewport (clipped):`, out);
}

export function watchOverflow(): () => void {
  let t = 0;
  const run = () => {
    clearTimeout(t);
    t = window.setTimeout(check, 1500);
  };
  run();
  window.addEventListener("resize", run);
  return () => {
    clearTimeout(t);
    window.removeEventListener("resize", run);
  };
}
