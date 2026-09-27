/* Page registry: maps each page key to the site's page version ("b", see ../variant.tsx),
   falling back to LEGACY for any key the version doesn't provide.

   Routes render <SitePage name="team" /> (plus the key's props, see ./types.ts). Pages are
   registered in ./b/index.ts as loaders: each page is its own chunk, so the root (and with it
   the landing) carries no page code. A route's head() awaits preloadPage(key), and the router
   awaits head() before it renders (server, client navigation) and before it hydrates, so
   the page is already loaded when SitePage renders: no Suspense fallback shows, and SSR
   inlines the page. Pages import three.js only inside effects. */
import { Suspense, lazy, type ComponentType, type ReactNode } from "react";

import { SITE_VARIANT, useSiteVariant, type SiteVariant } from "../variant";
import { eagerPages as eagerB, pages as pagesB } from "./b";
import { legacyPages } from "./legacy";
import type { PageKey, PageLoaders, PageMap, PageProps } from "./types";

export type { PageKey, PageLoaders, PageMap, PageProps } from "./types";

type AnyPage = ComponentType<Record<string, unknown>>;
type Entry = { Component: AnyPage; load: () => Promise<unknown>; legacy: boolean };

function versionPages(_variant: SiteVariant): { loaders: PageLoaders; eager: Partial<PageMap> } {
  return { loaders: pagesB, eager: eagerB };
}

/** A thenable that settles synchronously: React.lazy then renders a page that is already
 *  loaded on its very first render, instead of suspending once. */
const settled = <T,>(value: T) => ({ then: (ok: (v: T) => void) => ok(value) }) as unknown as Promise<T>;

/** One entry (one React.lazy) per version and key, for the whole session, so a page's
 *  component type never changes between renders. */
const entries = new Map<string, Entry>();

function entryFor(name: PageKey, variant: SiteVariant | null): Entry {
  const version = variant ? versionPages(variant) : null;
  const own = version?.loaders[name];
  const key = `${own ? variant : "legacy"}:${name}`;
  const hit = entries.get(key);
  if (hit) return hit;

  let entry: Entry;
  const eager = own ? version?.eager[name] : undefined;
  if (eager) {
    entry = { Component: eager as unknown as AnyPage, load: () => Promise.resolve(eager), legacy: false };
  } else {
    const loader = (own ?? legacyPages()[name]) as unknown as () => Promise<AnyPage>;
    let loaded: AnyPage | undefined;
    let pending: Promise<AnyPage> | undefined;
    const load = () =>
      (pending ??= loader().then(
        (C) => (loaded = C),
        (err: unknown) => {
          pending = undefined; // a failed download can be retried
          throw err;
        },
      ));
    const Component = lazy(() => {
      const C = loaded;
      return C ? settled({ default: C }) : load().then((P) => ({ default: P }));
    });
    entry = { Component: Component as unknown as AnyPage, load, legacy: !own };
  }
  entries.set(key, entry);
  return entry;
}

/** The component for `name` under `variant` (null = legacy only), and whether it is the legacy
 *  one. The component is lazy: render it under <Suspense> (SitePage does). */
export function resolvePage<K extends PageKey>(
  name: K,
  variant: SiteVariant | null,
): { Component: PageMap[K]; legacy: boolean } {
  const { Component, legacy } = entryFor(name, variant);
  return { Component: Component as unknown as PageMap[K], legacy };
}

/** Loads page `name`'s code (active version, else legacy). Routes await it in head(); the
 *  demo modal calls it to prefetch its card. Resolves to nothing (safe as loader data). */
export function preloadPage(name: PageKey): Promise<void> {
  return entryFor(name, SITE_VARIANT)
    .load()
    .then(() => undefined);
}

/** Wraps a legacy page so it keeps its pre-redesign tokens and layout inside the .mD site
 *  wrapper (see legacy.css). Version pages are not wrapped. */
export function LegacyFrame({ children }: { children: ReactNode }) {
  return <div className="bs-legacy bs-legacy--page">{children}</div>;
}

/** Holds the page's place while its code loads (only if a route did not preload it). */
function PageFallback() {
  return <main aria-busy="true" style={{ minHeight: "100vh" }} />;
}

export type SitePageProps<K extends PageKey> = { name: K } & PageProps[K];

/** Renders page `name` in the active version, or its LEGACY body. */
export function SitePage<K extends PageKey>(props: SitePageProps<K>) {
  const { variant, active } = useSiteVariant();
  const { name, ...rest } = props;
  const { Component, legacy } = resolvePage(name, active ? variant : null);
  const Page = Component as unknown as AnyPage;
  const page = (
    <Suspense fallback={<PageFallback />}>
      <Page {...(rest as unknown as Record<string, unknown>)} />
    </Suspense>
  );
  return legacy ? <LegacyFrame>{page}</LegacyFrame> : page;
}
