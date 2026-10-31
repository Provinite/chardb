import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach } from "vitest";

// Tells React that act() is in use, so it does not warn on every update.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: { root: Root; container: HTMLElement }[] = [];

// Each test starts from an empty body.
afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount());
    container.remove();
  }
});

/**
 * Renders into a container in the body, and returns the container and a way
 * to render something else into the same root. Unmounted after each test,
 * whether or not it passed.
 */
export const mount = (ui: ReactElement) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mounted.push({ root, container });
  act(() => root.render(ui));
  return {
    container,
    rerender: (next: ReactElement) => act(() => root.render(next)),
  };
};

/** Renders into a container in the body and returns that container. */
export const render = (ui: ReactElement) => mount(ui).container;
