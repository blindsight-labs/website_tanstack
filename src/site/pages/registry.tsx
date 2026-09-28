/* Page registry: maps each page key to its page in ./b.

   Routes render <SitePage name="team" /> (plus the key's props, see ./types.ts). Pages are
   registered in ./b/index.ts as loaders: each page is its own chunk, so the root (and with it
   the landing) carries no page code. A route's head() awaits preloadPage(key), and the router
   awaits head() before it renders (server, client navigation) and before it hydrates, so
   the page is already loaded when SitePage renders: no Suspense fallback shows, and SSR
   inlines the page. Pages import three.js only inside effects. */
import { Suspense, lazy, type ComponentType } from "react";

import { eagerPages, pages } from "./b";
import type { PageKey, PageMap, PageProps } from "./types";

export type { PageKey, PageLoaders, PageMap, PageProps } from "./types";

type AnyPage = ComponentType<Record<string, unknown>>;
type Entry = { Component: AnyPage; load: () => Promise<unknown> };

/** A thenable that settles synchronously: React.lazy then renders a page that is already
 *  loaded on its very first render, instead of suspending once. */
const settled = <T,>(value: T) => ({ then: (ok: (v: T) => void) => ok(value) }) as unknown as Promise<T>;

/** One entry (one React.lazy) per key, for the whole session, so a page's component type
 *  never changes between renders. */
const entries = new Map<PageKey, Entry>();

function entryFor(name: PageKey): Entry {
  const hit = entries.get(name);
  if (hit) return hit;

  let entry: Entry;
  const eager = eagerPages[name];
  if (eager) {
    entry = { Component: eager as unknown as AnyPage, load: () => Promise.resolve(eager) };
  } else {
    const loader = pages[name] as unknown as () => Promise<AnyPage>;
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
    entry = { Component: Component as unknown as AnyPage, load };
  }
  entries.set(name, entry);
  return entry;
}

/** The component for `name`. It is lazy: render it under <Suspense> (SitePage does). */
export function resolvePage<K extends PageKey>(name: K): PageMap[K] {
  return entryFor(name).Component as unknown as PageMap[K];
}

/** Loads page `name`'s code. Routes await it in head(); the demo modal calls it to prefetch
 *  its card. Resolves to nothing (safe as loader data). */
export function preloadPage(name: PageKey): Promise<void> {
  return entryFor(name)
    .load()
    .then(() => undefined);
}

/** Holds the page's place while its code loads (only if a route did not preload it). */
function PageFallback() {
  return <main aria-busy="true" style={{ minHeight: "100vh" }} />;
}

export type SitePageProps<K extends PageKey> = { name: K } & PageProps[K];

/** Renders page `name`. */
export function SitePage<K extends PageKey>(props: SitePageProps<K>) {
  const { name, ...rest } = props;
  const Page = resolvePage(name) as unknown as AnyPage;
  return (
    <Suspense fallback={<PageFallback />}>
      <Page {...(rest as unknown as Record<string, unknown>)} />
    </Suspense>
  );
}
