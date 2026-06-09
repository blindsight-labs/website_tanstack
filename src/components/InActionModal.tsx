import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { TopologyGraphDemo } from "@/routes/in-action";

const InActionModalContext = createContext<{ open: () => void; close: () => void }>({
  open: () => {},
  close: () => {},
});

/** Open/close the global "Blindsight in action" demo modal from any component under the provider. */
export function useInActionModal() {
  return useContext(InActionModalContext);
}

export function InActionModalProvider({ children }: { children: ReactNode }) {
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
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  return (
    <InActionModalContext.Provider value={{ open, close }}>
      {children}
      {isOpen && (
        <div className="modal-backdrop" onClick={close} role="presentation">
          <div
            ref={cardRef}
            className="modal-card modal-card-lg"
            role="dialog"
            aria-modal="true"
            aria-label="Blindsight in action"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className="modal-close" aria-label="Close" onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
            <TopologyGraphDemo embedded />
          </div>
        </div>
      )}
    </InActionModalContext.Provider>
  );
}
