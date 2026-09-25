/* Shared building blocks for mockup D. Section files import from here; they do
   not re-implement labels, the CTA, metallic icons or reveal-on-scroll. */
import { useEffect, type ComponentType, type ReactNode, type RefObject } from "react";
import { ArrowRight, type LucideProps } from "lucide-react";

import { useDemoModal } from "@/components/DemoModal";
import { CTA } from "./content";

export type Theme = "light" | "dark";
export type SectionProps = { theme: Theme };

/** "03 · PROVE IT" micro-label with the metallic hex marker. */
export function Label({ n, children, hex = true }: { n?: string; children: ReactNode; hex?: boolean }) {
  return (
    <span className="mD-label">
      {hex && <span className="mD-hex" aria-hidden="true" />}
      {n && (
        <>
          <span className="mD-label__n">{n}</span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>{children}</span>
    </span>
  );
}

/** The one CTA. Opens the site's real demo/discovery modal. */
export function CtaButton({
  size = "md",
  variant = "primary",
  label = CTA,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  label?: string;
  className?: string;
}) {
  const { open } = useDemoModal();
  const cls = ["mD-btn", `mD-btn--${variant}`, size !== "md" ? `mD-btn--${size}` : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={cls} onClick={() => open("demo")}>
      {label}
      <ArrowRight size={14} strokeWidth={1.75} className="mD-btn__arrow" aria-hidden="true" />
    </button>
  );
}

/** SVG gradient defs, mounted once per page. Reference with url(#mD-metal). */
export function MetalDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mD-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.38" stopColor="#C9CCD3" />
          <stop offset="0.52" stopColor="#6F737C" />
          <stop offset="0.78" stopColor="#B5B8C0" />
          <stop offset="1" stopColor="#E9EBEF" />
        </linearGradient>
        <linearGradient id="mD-metal-ink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C8089" />
          <stop offset="0.45" stopColor="#2B2D33" />
          <stop offset="0.55" stopColor="#0B0B0D" />
          <stop offset="1" stopColor="#50535B" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** A lucide icon stroked in metallic grey. On light surfaces use tone="ink". */
export function MetalIcon({
  icon: Icon,
  size = 20,
  tone = "ink",
  strokeWidth = 1.5,
  ...rest
}: { icon: ComponentType<LucideProps>; size?: number; tone?: "ink" | "light" } & LucideProps) {
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      color={tone === "ink" ? "url(#mD-metal-ink)" : "url(#mD-metal)"}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** Reveal-on-scroll for any [data-reveal] element inside `root`. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "true";
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [root]);
}

/** Scroll progress (0..1) of `el` through the viewport, for sticky sequences. */
export function scrollProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -r.top / total));
}
