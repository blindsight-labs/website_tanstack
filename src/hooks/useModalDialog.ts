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
        // capture phase + preventDefault: the mobile sheet's Escape (Nav.tsx) leaves this one to us
        e.preventDefault();
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
      // focus fell out (its element unmounted, so it sits on body): pull it back in
      if (!cardRef.current.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && (active === first || active === cardRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    // Lock the page behind it: iOS Safari ignores overflow:hidden for touch scrolling, so the body
    // is pinned at its offset (overflow:hidden would also make body a scroll container and take
    // the sticky nav with it). The padding stands in for the scrollbar the pin removes.
    const body = document.body.style;
    const prevBody = body.cssText;
    const y = window.scrollY;
    const href = location.href;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    Object.assign(body, { position: "fixed", top: `-${y}px`, left: "0", right: "0", paddingRight: `${gutter}px` });
    // Move focus into the dialog for keyboard/screen-reader users.
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      body.cssText = prevBody;
      // back where it was, unless browser Back changed the page underneath (the router owns that)
      if (location.href === href) window.scrollTo({ top: y, behavior: "instant" });
      // back to the control that opened it, so keyboard users keep their place
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open only on isOpen transition, not every render
  }, [isOpen]);
}
