import { EyeOff, Workflow } from "lucide-react";
import { HeroPipelineDemo } from "./HeroPipelineDemo";
import { HeroShadowDemo } from "./HeroShadowDemo";

export type HeroTab = "shadow" | "pipeline";

/* Window-chrome frame wrapping the two Hero demos. The tab bar (macOS/Windows
 * style) switches the content; the active tab is controlled by the parent so it
 * can stay in sync with the CTAs (hover a CTA → its tab; 10s idle auto-advances).
 * onInteract lets in-demo interactions (toggle, stage hover) reset that idle timer. */
export function HeroWindow({
  tab,
  onTab,
  onInteract,
}: {
  tab: HeroTab;
  onTab: (t: HeroTab) => void;
  onInteract?: () => void;
}) {
  return (
    <div className="hero-window">
      <div className="hero-window-bar">
        <span className="hero-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <div className="hero-window-tabs" role="tablist" aria-label="Hero demo">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "shadow"}
            className={`hero-tab ${tab === "shadow" ? "active" : ""}`}
            onClick={() => onTab("shadow")}
          >
            <EyeOff size={14} aria-hidden="true" />
            Shadow AI
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pipeline"}
            className={`hero-tab ${tab === "pipeline" ? "active" : ""}`}
            onClick={() => onTab("pipeline")}
          >
            <Workflow size={14} aria-hidden="true" />
            AI Pipeline
          </button>
        </div>
      </div>
      <div className="hero-window-body">
        {tab === "shadow" ? (
          <HeroShadowDemo onInteract={onInteract} />
        ) : (
          <HeroPipelineDemo onInteract={onInteract} />
        )}
      </div>
    </div>
  );
}
