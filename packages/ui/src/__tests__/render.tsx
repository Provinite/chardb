import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

// Tells React that act() is in use, so it does not warn on every update.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** Renders into a detached container and returns that container. */
export const render = (ui: ReactElement) => {
  const container = document.createElement("div");
  document.body.append(container);
  act(() => createRoot(container).render(ui));
  return container;
};
