import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * `React.lazy` for a module's named export. Pages export by name, and
 * `lazy` wants a default.
 */
export const lazyPage = <K extends string, P extends object>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
): LazyExoticComponent<ComponentType<P>> =>
  lazy(() => load().then((module) => ({ default: module[name] })));
