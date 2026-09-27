/* Load order for the landing: below-the-fold work (the Risks stills, the Sequence's scene
   chunk, the demo modal's code) waits until the Hero has drawn its first live frame, then for
   an idle moment, so it never competes with the Hero's download, build and shader compile.
   A page without a Hero (or a Hero whose 3D fails) opens the gate shortly after `load`. */

let open = false;
let armed = false;
const waiting: (() => void)[] = [];

/** Called by the Hero on its first drawn frame (stage data-ready). */
export function markHeroReady() {
  if (open) return;
  open = true;
  waiting.splice(0).forEach((go) => go());
}

/** No Hero on the page: open soon after load. A Hero that never draws: open late. */
function armFallback() {
  if (armed) return;
  armed = true;
  const start = () => {
    const hero = document.querySelector(".mD-hero__stage");
    window.setTimeout(markHeroReady, hero ? 8000 : 600);
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}

/** Runs `fn` once the Hero is ready (see above), after `delay` ms and then in an idle moment.
 *  Returns a cancel (use it as an effect's cleanup). Client only. */
export function afterHeroIdle(fn: () => void, o: { delay?: number; timeout?: number } = {}): () => void {
  let cancelled = false;
  let timer = 0;
  let idle = 0;
  const go = () => {
    if (cancelled) return;
    timer = window.setTimeout(() => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idle = window.requestIdleCallback(() => !cancelled && fn(), { timeout: o.timeout ?? 2000 });
      } else fn();
    }, o.delay ?? 0);
  };
  if (open) go();
  else {
    waiting.push(go);
    armFallback();
  }
  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    if (idle && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
  };
}
