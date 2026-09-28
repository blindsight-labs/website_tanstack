/* Version B · the demo-request card, chrome direction: the site's own surface (white in light,
   near-black in dark) inside a thin machined metal rim, the flat brand mark in the site's
   metal gradient as a small maker's badge (34px), the form beside the three-step "what
   happens next". Close button, path cards and fields share the chrome hairline. The provider
   (DemoModal.tsx) owns the dialog; DemoForm owns the fields, validation and submission
   (restyled in b-dform.css through its class names, logic untouched). */
import { useId } from "react";
import { X } from "lucide-react";

import { DemoForm } from "@/components/DemoForm";
import { Label } from "@/site/shared";
import { useSiteTheme } from "@/site/theme";
import { DEMO_MODAL_COPY } from "../legacy/DemoModalCard";
import type { DemoModalProps } from "../types";
import { Steps } from "./parts";

/* The site's metal gradients (MetalDefs in src/site/shared.tsx: mD-metal-ink on light,
   mD-metal on dark), set once across the whole mark (userSpaceOnUse), so it reads as one
   piece of metal rather than a gradient per part. */
const METAL: Record<"light" | "dark", [number, string][]> = {
  light: [
    [0, "#7C8089"],
    [0.45, "#2B2D33"],
    [0.55, "#111118"],
    [1, "#50535B"],
  ],
  dark: [
    [0, "#FFFFFF"],
    [0.38, "#C9CCD3"],
    [0.52, "#6F737C"],
    [0.78, "#B5B8C0"],
    [1, "#E9EBEF"],
  ],
};

/** The Blindsight mark, flat, exactly as src/assets/ICON_Blindsight.svg, in the site's metal. */
function MetalMark({ className }: { className?: string }) {
  const { theme } = useSiteTheme();
  const id = useId().replace(/:/g, "");
  const fill = `url(#${id}-metal)`;
  return (
    <svg className={className} viewBox="0 0 500 500" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-metal`} gradientUnits="userSpaceOnUse" x1="0" y1="15" x2="0" y2="485">
          {METAL[theme].map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <g fill={fill}>
        <rect x="311.79" y="231.96" width="95.59" height="35.78" transform="translate(-.3 .43) rotate(-.07)" />
        <path d="M179.77,66.29c.43,1.88,2.28,3.02,4.14,2.49,16.11-4.53,33.08-6.99,50.62-7.01,78.53-.09,146,48.2,174.26,116.66.74,1.8,2.81,2.55,4.56,1.71,10.14-4.91,21.51-7.67,33.53-7.68h4.51c2.39,0,4.09-2.4,3.25-4.64C421.28,78.62,335.29,15.13,234.47,15.25c-24.89.03-48.84,3.98-71.33,11.19-2.28.73-3.04,3.61-1.42,5.39,8.71,9.6,15.03,21.39,18.05,34.46Z" />
        <path d="M69.82,347.74c1.72-.88,2.37-2.96,1.42-4.63-15.67-27.41-24.68-59.11-24.72-92.89-.04-33.78,8.89-65.49,24.5-92.94.95-1.68.29-3.75-1.43-4.63-11.79-5.99-21.82-14.9-29.16-25.8-1.34-1.98-4.31-1.94-5.56.1C12.74,162.81-.05,205.04,0,250.28c.05,45.24,12.95,87.43,35.16,123.24,1.26,2.03,4.23,2.07,5.56.08,7.32-10.91,17.33-19.85,29.1-25.86Z" />
        <path d="M454.83,331.67c.83-2.24-.87-4.63-3.26-4.63h-4.51c-12.02.02-23.4-2.71-33.55-7.59-1.75-.84-3.82-.08-4.56,1.72-28.1,68.53-95.45,116.97-173.98,117.07-17.54.02-34.51-2.4-50.64-6.89-1.86-.52-3.7.63-4.13,2.5-2.99,13.08-9.28,24.88-17.97,34.5-1.61,1.78-.85,4.66,1.44,5.38,22.51,7.16,46.47,11.05,71.36,11.02,100.82-.12,186.66-63.81,219.8-153.08Z" />
        <path d="M340.37,249.88c-.07-58.83-47.81-106.46-106.64-106.39-58.83.07-106.46,47.81-106.39,106.64.07,58.83,47.81,106.46,106.64,106.39,58.83-.07,106.46-47.81,106.39-106.64Z" />
        <path d="M500,249.69c-.03-29.29-23.81-53.01-53.1-52.97-29.29.03-53.01,23.81-52.97,53.1.03,29.29,23.81,53.01,53.1,52.97,29.29-.03,53.01-23.81,52.97-53.1Z" />
        <rect x="106.89" y="333.21" width="95.59" height="35.78" transform="translate(-216.98 255.88) rotate(-51.85)" />
        <path d="M67.46,453.97c20.74,20.69,54.32,20.65,75-.09s20.65-54.32-.09-75c-20.74-20.69-54.32-20.65-75,.09-20.69,20.74-20.65,54.32.09,75Z" />
        <rect x="136.55" y="101.16" width="35.78" height="95.59" transform="translate(-59.07 127.71) rotate(-38.28)" />
        <path d="M67.06,121.3c20.74,20.69,54.32,20.65,75-.09,20.69-20.74,20.65-54.32-.09-75s-54.32-20.65-75,.09c-20.69,20.74-20.65,54.32.09,75Z" />
      </g>
    </svg>
  );
}

const NEXT = [
  { k: "Reply", v: "A founder replies within one business day, from info@blindsight.io." },
  { k: "Session", v: "30 minutes with the founding team, against your own stack." },
  { k: "Discovery", v: "We scope a first look at the AI in use across your organization." },
];

export function DemoModalB({ onClose }: DemoModalProps) {
  const copy = DEMO_MODAL_COPY;
  return (
    <div className="pb-modal">
      <button type="button" className="pb-modal__close" aria-label="Close" onClick={onClose}>
        <X size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="pb-modal__head">
        <MetalMark className="pb-modal__mark" />
        <div className="pb-modal__headText">
          <Label>{copy.tag}</Label>
          <h2 id="demo-modal-title" className="mD-h2 pb-modal__title">
            {copy.title}
          </h2>
          <p className="pb-modal__sub">{copy.sub}</p>
        </div>
      </div>
      <div className="pb-modal__grid">
        <div className="pb-modal__form">
          <DemoForm />
        </div>
        <aside className="pb-modal__next" aria-label="What happens next">
          <p className="pb-next__head">What happens next</p>
          <Steps items={NEXT} />
        </aside>
      </div>
    </div>
  );
}
