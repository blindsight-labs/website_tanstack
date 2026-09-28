import { Suspense, createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useModalDialog } from "@/hooks/useModalDialog";
import { afterHeroIdle } from "@/site/heroReady";
import { preloadPage, resolvePage } from "@/site/pages/registry";
import { useSiteVariant } from "@/site/variant";

/** "demo" = book a working session; "download" = get the app after sharing details;
 *  "trial" = start the free-trial program (see /demo). */
export type DemoVariant = "demo" | "download" | "trial";

const DemoModalContext = createContext<{
  open: (variant?: DemoVariant) => void;
  close: () => void;
  /** Start loading the card's code (a CTA calls it on hover / focus, so opening is instant). */
  prefetch: () => void;
}>({
  open: () => {},
  close: () => {},
  prefetch: () => {},
});

/** Open/close the global demo-request modal from any component under the provider. */
export function useDemoModal() {
  return useContext(DemoModalContext);
}

/** The card (DemoForm and its server-fn client) is its own chunk: fetched in an idle
 *  moment once the page is up, or earlier when a CTA is hovered or focused. */
const prefetch = () => {
  preloadPage("demoModal").catch(() => undefined);
};

/** Owns the modal shell: backdrop, dialog element, Escape, scroll lock, focus on open and
 *  click-outside. The card CONTENTS come from the active page version's `demoModal` page
 *  (src/site/pages), else the legacy card. A version's card sits in `.bs-modal` (baseline in
 *  src/site/chrome.css); the backdrop carries data-site-variant for version styling. */
export function DemoModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<DemoVariant>("demo");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const open = (v: DemoVariant = "demo") => {
    setKind(v);
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);
  /** A click on the backdrop closes only an untouched card: once something is typed, a stray
   *  click must not throw it away (the X and Escape still close). */
  const closeFromBackdrop = () => {
    const typed = cardRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input[type=text], input[type=email], textarea",
    );
    if (typed && [...typed].some((el) => el.value.trim() !== "")) return;
    close();
  };

  useModalDialog(isOpen, close, cardRef);
  // on the landing: after the hero's first frame, plus a beat (see src/site/heroReady.ts)
  useEffect(() => afterHeroIdle(prefetch, { delay: 1500 }), []);

  const { variant, active } = useSiteVariant();
  const { Component: Card, legacy } = resolvePage("demoModal", active ? variant : null);

  return (
    <DemoModalContext.Provider value={{ open, close, prefetch }}>
      {children}
      {isOpen && (
        <div
          className={legacy ? "modal-backdrop bs-legacy" : "modal-backdrop"}
          data-site-variant={legacy ? undefined : variant}
          onClick={closeFromBackdrop}
          role="presentation"
        >
          <div
            ref={cardRef}
            className={legacy ? "modal-card demo-modal" : "bs-modal"}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            {/* only if opened before the prefetch landed: the card fills in when it arrives */}
            <Suspense fallback={null}>
              <Card kind={kind} onClose={close} />
            </Suspense>
          </div>
        </div>
      )}
    </DemoModalContext.Provider>
  );
}
