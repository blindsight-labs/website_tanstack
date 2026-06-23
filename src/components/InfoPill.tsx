import { useEffect, useState } from "react";
import { X } from "lucide-react";

export type PillInfo = {
  name: string;
  desc: string;
  /** Short uppercase kicker shown above the name (optional). */
  meta?: string;
};

const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

/** A small pill that reveals `meta · name · desc` on hover/focus (desktop)
 *  or in a centered tap-modal (mobile). Modeled on the iceberg markers. */
export function InfoPill({ name, desc, meta, className = "" }: PillInfo & { className?: string }) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

  // Mobile modal closes on Escape.
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pinned]);

  const tap = () => (isMobile() ? setPinned((p) => !p) : setHovered((h) => !h));

  return (
    <>
      <button
        type="button"
        className={`ipill ${hovered ? "active" : ""} ${className}`.trim()}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={tap}
        aria-expanded={hovered}
      >
        <span className="ipill-label">{name}</span>
        <span className="ipill-tip" role="tooltip">
          {meta && <span className="ipill-tip-meta">{meta}</span>}
          <span className="ipill-tip-name">{name}</span>
          <span className="ipill-tip-desc">{desc}</span>
        </span>
      </button>

      {pinned && (
        <div
          className="ipill-modal"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setPinned(false)}
        >
          <div className="ipill-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ipill-modal-close"
              onClick={() => setPinned(false)}
              aria-label="Close"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {meta && <span className="ipill-tip-meta">{meta}</span>}
            <span className="ipill-tip-name">{name}</span>
            <p className="ipill-tip-desc">{desc}</p>
          </div>
        </div>
      )}
    </>
  );
}
