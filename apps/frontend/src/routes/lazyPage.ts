import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type LazyPage<P extends object> = LazyExoticComponent<
  ComponentType<P>
> & {
  /** Starts downloading the page's code without rendering it. */
  preload: () => Promise<unknown>;
};

/**
 * `React.lazy` for a module's named export. Pages export by name, and
 * `lazy` wants a default. Calling `preload` first costs nothing extra: the
 * browser fetches a module once, however many times it is imported.
 */
export const lazyPage = <K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
): LazyPage<P> =>
  Object.assign(
    lazy(() => load().then((module) => ({ default: module[name] }))),
    { preload: load },
  );
