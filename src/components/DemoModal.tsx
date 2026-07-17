import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useModalDialog } from "@/hooks/useModalDialog";
import { DemoForm } from "./DemoForm";

/** "demo" = book a working session; "download" = get the app after sharing details. */
export type DemoVariant = "demo" | "download";

const VARIANT_COPY: Record<DemoVariant, { tag: string; title: string; sub: string }> = {
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
};

const DemoModalContext = createContext<{
  open: (variant?: DemoVariant) => void;
  close: () => void;
}>({
  open: () => {},
  close: () => {},
});

/** Open/close the global demo-request modal from any component under the provider. */
export function useDemoModal() {
  return useContext(DemoModalContext);
}

export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<DemoVariant>("demo");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const open = (v: DemoVariant = "demo") => {
    setVariant(v);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);

  useModalDialog(isOpen, close, cardRef);

  return (
    <DemoModalContext.Provider value={{ open, close }}>
      {children}
      {isOpen && (
        <div className="modal-backdrop" onClick={close} role="presentation">
          <div
            ref={cardRef}
            className="modal-card demo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
            <div className="demo-compact-head">
              <span className="tag">{VARIANT_COPY[variant].tag}</span>
              <h2 id="demo-modal-title" className="demo-title">
                {VARIANT_COPY[variant].title}
              </h2>
              <p className="demo-sub">{VARIANT_COPY[variant].sub}</p>
            </div>
            <DemoForm variant={variant} />
          </div>
        </div>
      )}
    </DemoModalContext.Provider>
  );
}
