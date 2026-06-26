import { useEffect, useState } from "react";
import { X } from "lucide-react";

const isMobile = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

/** An inline defined term: the word(s) get a dotted underline + an (i) icon, and a
 *  short definition appears on hover/focus (desktop) or in a tap-modal (mobile).
 *  Used to seed awareness of terms the market still confuses — e.g. "AI integrity".
 *  Reuses the InfoPill tooltip/modal styles (.ipill-tip*, .ipill-modal*). */
export function InfoTerm({
  term,
  desc,
  meta,
}: {
  term: string;
  desc: string;
  /** Short uppercase kicker shown above the term in the tip (optional). */
  meta?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);

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
        className={`iterm ${hovered ? "active" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        onClick={tap}
        aria-label={`What is ${term}?`}
        aria-expanded={hovered}
      >
        <span className="iterm-label">{term}</span>
        <span className="ipill-tip" role="tooltip">
          {meta && <span className="ipill-tip-meta">{meta}</span>}
          <span className="ipill-tip-name">{term}</span>
          <span className="ipill-tip-desc">{desc}</span>
        </span>
      </button>

      {pinned && (
        <div
          className="ipill-modal"
          role="dialog"
          aria-modal="true"
          aria-label={term}
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
            <span className="ipill-tip-name">{term}</span>
            <p className="ipill-tip-desc">{desc}</p>
          </div>
        </div>
      )}
    </>
  );
}
