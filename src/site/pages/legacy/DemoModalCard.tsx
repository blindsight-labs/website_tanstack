/* LEGACY demo-request modal card contents (the pre-redesign DemoModal body, unchanged).
   Rendered inside the provider's dialog element (.modal-card.demo-modal) when the active page
   version does not provide `demoModal`. */
import { X } from "lucide-react";

import { DemoForm } from "@/components/DemoForm";
import type { DemoModalProps } from "../types";

/** The card's heading copy (version B's card reuses it). */
export const DEMO_MODAL_COPY = {
  tag: "Request a Demo",
  title: "See Blindsight against your stack.",
  sub: "30-minute working session with the founding team. Reply within one business day.",
};

export function DemoModalCard({ onClose }: DemoModalProps) {
  return (
    <>
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
        <X size={18} aria-hidden="true" />
      </button>
      <div className="demo-compact-head">
        <span className="tag">{DEMO_MODAL_COPY.tag}</span>
        <h2 id="demo-modal-title" className="demo-title">
          {DEMO_MODAL_COPY.title}
        </h2>
        <p className="demo-sub">{DEMO_MODAL_COPY.sub}</p>
      </div>
      <DemoForm />
    </>
  );
}
