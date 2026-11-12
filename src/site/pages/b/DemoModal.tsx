/* Version B · the demo-request card: the offer on the left (tag, headline, three numbered steps,
   where it deploys), the form in a hairline panel on the right; one column on phones. The
   provider (DemoModal.tsx) owns the dialog; DemoForm owns the fields, validation and
   submission (styled in b-dform.css through its class names). */
import { X } from "lucide-react";

import { DemoForm } from "@/components/DemoForm";
import { deployment } from "@/site/content";
import { Label } from "@/site/shared";
import { DEMO_MODAL_COPY } from "../data";
import type { DemoModalProps } from "../types";
import { Steps } from "./parts";

export function DemoModalB({ onClose }: DemoModalProps) {
  const copy = DEMO_MODAL_COPY;
  return (
    <div className="pb-modal">
      <button type="button" className="pb-modal__close" aria-label="Close" onClick={onClose}>
        <X size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="pb-modal__intro">
        <span className="pb-modal__tag">
          <Label>{copy.tag}</Label>
        </span>
        <h2 id="demo-modal-title" className="mD-h2 pb-modal__title">
          {copy.title}
        </h2>
        <p className="pb-modal__sub">{copy.sub}</p>
        <Steps items={copy.steps} label="What happens next" />
        <div className="pb-modal__hosting">
          <Label>{copy.hostingLabel}</Label>
          <ul className="pb-modal__chips">
            {deployment.hosting.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="pb-modal__panel">
        <h3 className="pb-modal__panelTitle">{copy.formTitle}</h3>
        <p className="pb-modal__panelSub">{copy.formSub}</p>
        <DemoForm />
      </div>
    </div>
  );
}
