/* LEGACY demo-request modal card contents (the pre-redesign DemoModal body, unchanged).
   Rendered inside the provider's dialog element (.modal-card.demo-modal) when the active page
   version does not provide `demoModal`. */
import { X } from "lucide-react";

import { DemoForm } from "@/components/DemoForm";
import type { DemoVariant } from "@/components/DemoModal";
import type { DemoModalProps } from "../types";

/** Per-kind heading copy: "demo" = book a working session; "download" = get the app after
 *  sharing details; "trial" = start the free-trial program (see /demo). */
export const DEMO_MODAL_COPY: Record<DemoVariant, { tag: string; title: string; sub: string }> = {
  demo: {
    tag: "Request a Demo",
    title: "See Blindsight against your stack.",
    sub: "30-minute working session with the founding team. Reply within one business day.",
  },
  download: {
    tag: "Download Blindsight",
    title: "See your Shadow AI.",
    sub: "Tell us where to send it, we'll email your download link and setup guide within one business day.",
  },
  trial: {
    tag: "Runtime + Shadow AI · Free trial",
    title: "Measure it on your own traffic.",
    sub: "10,000 tokens, free. Two minutes, no card, no procurement.",
  },
};

export function DemoModalCard({ kind, onClose }: DemoModalProps) {
  return (
    <>
      <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
        <X size={18} aria-hidden="true" />
      </button>
      <div className="demo-compact-head">
        <span className="tag">{DEMO_MODAL_COPY[kind].tag}</span>
        <h2 id="demo-modal-title" className="demo-title">
          {DEMO_MODAL_COPY[kind].title}
        </h2>
        <p className="demo-sub">{DEMO_MODAL_COPY[kind].sub}</p>
      </div>
      <DemoForm variant={kind} />
    </>
  );
}
