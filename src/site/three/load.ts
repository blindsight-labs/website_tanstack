/* The Hero's scene module (three.js with it), fetched once. Home.tsx starts the download as
   soon as the landing's route chunk evaluates, in parallel with hydration; Hero.tsx's effect
   then reuses the same promise instead of starting the fetch after hydration. */
let office: Promise<typeof import("./office")> | null = null;

export function loadOffice() {
  office ??= import("./office").catch((err: unknown) => {
    office = null; // let a later call retry a failed download
    throw err;
  });
  return office;
}

/** Phones, and devices that ask for less (Save-Data, ≤ 4 GB): their 3× screens would otherwise
 *  render every scene at 2× or more, the dominant GPU/battery cost. They also keep the Hero's
 *  poster instead of the live scene (Hero.tsx). */
export function constrainedDevice(): boolean {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const phone = window.matchMedia("(pointer: coarse) and (max-width: 899px)").matches;
  return phone || n.connection?.saveData === true || (n.deviceMemory ?? 8) <= 4;
}
