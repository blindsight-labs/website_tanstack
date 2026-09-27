/* Dotted parallax field — the closing sheet's dot texture, borrowed for the
   Walkthrough opening. Three CSS dot grids (fine/far, main, coarse/near) drift
   at different rates as the section scrolls through the viewport. No objects:
   the glass forms stay the closing sheet's alone. One rAF-throttled scroll
   listener, live only while the field is on screen, writes a single custom
   property (--dt7-p, -1…1); CSS turns it into transforms.
   The field is cleared in an ellipse around the heading block, measured live. */
import { useEffect, useRef, type RefObject } from "react";

type Props = {
  /** The heading block: dots clear out around its content. */
  head: RefObject<HTMLElement | null>;
  /** Where the field ends (the tab row); falls back when it is hidden. */
  until: RefObject<HTMLElement | null>;
  fallback: RefObject<HTMLElement | null>;
};

export function DotField({ head, until, fallback }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null);

  // measure: the clear ellipse around the heading, and where the field ends
  useEffect(() => {
    const field = fieldRef.current;
    const sheet = field?.parentElement;
    if (!field || !sheet) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const s = sheet.getBoundingClientRect();
      const h = head.current;
      if (h) {
        let l = Infinity;
        let t = Infinity;
        let r = -Infinity;
        let b = -Infinity;
        for (const child of Array.from(h.children)) {
          const q = child.getBoundingClientRect();
          if (!q.width || !q.height) continue;
          l = Math.min(l, q.left);
          t = Math.min(t, q.top);
          r = Math.max(r, q.right);
          b = Math.max(b, q.bottom);
        }
        if (r > l && b > t) {
          // 1.8x the text block's half-size: its corners sit ~78% out, inside the clear zone
          field.style.setProperty("--dt7-cx", `${Math.round((l + r) / 2 - s.left)}px`);
          field.style.setProperty("--dt7-cy", `${Math.round((t + b) / 2 - s.top)}px`);
          field.style.setProperty("--dt7-rx", `${Math.round(((r - l) / 2) * 1.8)}px`);
          field.style.setProperty("--dt7-ry", `${Math.round(((b - t) / 2) * 1.8)}px`);
        }
      }
      const end = [until.current, fallback.current].find((el) => el && el.offsetHeight > 0);
      if (end) field.style.setProperty("--dt7-h", `${Math.max(320, Math.round(end.getBoundingClientRect().top - s.top + 24))}px`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(sheet);
    if (head.current) ro.observe(head.current);
    schedule();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [head, until, fallback]);

  // parallax: one scroll listener, attached only while the field is on screen
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let on = false;
    const update = () => {
      raf = 0;
      const r = field.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const span = vh / 2 + r.height / 2;
      const p = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / span));
      field.style.setProperty("--dt7-p", p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const start = () => {
      if (on || still.matches) return;
      on = true;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      onScroll();
    };
    const stop = () => {
      if (!on) return;
      on = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "160px 0px" });
    io.observe(field);
    const onPref = () => {
      if (still.matches) {
        stop();
        field.style.setProperty("--dt7-p", "0");
      } else {
        io.disconnect();
        io.observe(field); // re-fires with the current state
      }
    };
    still.addEventListener("change", onPref);
    return () => {
      stop();
      io.disconnect();
      still.removeEventListener("change", onPref);
    };
  }, []);

  return (
    <div ref={fieldRef} className="dt7-field" aria-hidden="true">
      <div className="dt7-fade">
        <div className="dt7-clear">
          <div className="dt7-l dt7-l--far" />
          <div className="dt7-l dt7-l--mid" />
        </div>
        <div className="dt7-clear dt7-clear--wide">
          <div className="dt7-l dt7-l--near" />
        </div>
      </div>
    </div>
  );
}
