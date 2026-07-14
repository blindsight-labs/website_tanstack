import { useEffect, type RefObject } from "react";

/** Escape-to-close, body-scroll lock, and focus-on-open for a modal dialog. */
export function useModalDialog(
  isOpen: boolean,
  close: () => void,
  cardRef: RefObject<HTMLDivElement | null>,
) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only on isOpen transition, not every render
  }, [isOpen]);
}
