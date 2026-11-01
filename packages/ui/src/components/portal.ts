import { createContext, useContext } from "react";

/**
 * On a child of `<body>` that an open dialog must leave interactive, such as
 * the toasts' container.
 */
export const INERT_EXEMPT = "data-inert-exempt";

/**
 * Where menus, popovers, tooltips and typeahead lists render. A dialog
 * provides its layer, so what opens inside it paints above its scrim and
 * stays out of the `inert` it puts on the rest of the page.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

/** The nearest dialog's layer, or `document.body` outside any dialog. */
export const usePortalContainer = (): HTMLElement =>
  useContext(PortalContainerContext) ?? document.body;
