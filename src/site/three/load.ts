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
