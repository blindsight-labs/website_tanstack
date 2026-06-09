import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { DemoForm } from "./DemoForm";

const DemoModalContext = createContext<{ open: () => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

/** Open/close the global demo-request modal from any component under the provider. */
export function useDemoModal() {
  return useContext(DemoModalContext);
}

export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog for keyboard/screen-reader users.
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

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
              <span className="tag">Request a Demo</span>
              <h2 id="demo-modal-title" className="demo-title">See Blindsight against your stack.</h2>
              <p className="demo-sub">
                30-minute working session with the founding team. Reply within one business day.
              </p>
            </div>
            <DemoForm />
          </div>
        </div>
      )}
    </DemoModalContext.Provider>
  );
}
