import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Escape-to-close, body-scroll lock, focus-on-open, a Tab focus trap, and focus returned to
 *  the opener on close, for a modal dialog. */
export function useModalDialog(
  isOpen: boolean,
  close: () => void,
  cardRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      // keep Tab inside the dialog: the page behind it is not reachable while it is open
      const items = [...cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog for keyboard/screen-reader users.
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      // back to the control that opened it, so keyboard users keep their place
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only on isOpen transition, not every render
  }, [isOpen]);
}
