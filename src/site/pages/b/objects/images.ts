/* Version B · images a scene prints (the author's portrait). renderOnce is synchronous, so
   ./index.ts loads and decodes them BEFORE the render; scenes then read them from here. */
const loaded = new Map<string, HTMLImageElement>();

export async function preload(src: string) {
  if (!src || loaded.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  try {
    await img.decode();
    loaded.set(src, img);
  } catch {
    /* no photo: the scene prints a monogram instead */
  }
}

export const imageFor = (src: string) => (src ? loaded.get(src) : undefined);
