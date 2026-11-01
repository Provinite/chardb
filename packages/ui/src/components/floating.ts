import { useEffect, useRef } from "react";
import type React from "react";
import { setElementVars } from "@vanilla-extract/dynamic";
import type { Placement } from "../hooks/placeFloating";
import * as styles from "./floating.css";

/**
 * Calls `onOutside` for a mouse press outside something floating while it is
 * `open`. Spread the returned handler onto the floating element.
 *
 * "Inside" is the component tree, not the DOM: a typeahead list or a menu
 * opened from inside a popover is portalled elsewhere in the page, but its
 * presses still bubble through the popover in React, so they never close it.
 * The elements in `alsoInside` (a trigger) count as inside by the DOM.
 */
export function usePressOutside(
  open: boolean,
  onOutside: () => void,
  alsoInside: React.RefObject<Element | null>[] = [],
): { onMouseDownCapture: (e: React.MouseEvent) => void } {
  const onOutsideRef = useRef(onOutside);
  onOutsideRef.current = onOutside;
  const alsoInsideRef = useRef(alsoInside);
  alsoInsideRef.current = alsoInside;
  // The press that went through the tree, compared by identity: a flag left
  // set by a press nobody else saw would swallow the next one.
  const pressedInside = useRef<Event | null>(null);
  // The same object every render, so it can sit in a memoised context.
  const handlers = useRef({
    onMouseDownCapture: (e: React.MouseEvent) => {
      pressedInside.current = e.nativeEvent;
    },
  });

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (pressedInside.current === e) return;
      const target = e.target as Node;
      if (alsoInsideRef.current.some((r) => r.current?.contains(target))) {
        return;
      }
      onOutsideRef.current();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return handlers.current;
}

/**
 * Writes a placement to a floating box as CSS variables and `data-side`.
 * Straight to the element: following a scroll changes these many times a
 * second, and none of it needs React to render anything.
 */
export const applyPlacement = (el: HTMLElement | null, p: Placement) => {
  if (!el) return;
  setElementVars(el, {
    [styles.top]: `${p.top}px`,
    [styles.left]: `${p.left}px`,
    [styles.arrowAt]: `${p.arrow}px`,
    [styles.maxWidth]: `${p.maxWidth}px`,
    [styles.maxHeight]: `${p.maxHeight}px`,
  });
  el.dataset.side = p.side;
};

/** What Tab stops on, matched broadly and then filtered. */
const TABBABLE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
  "[contenteditable]",
].join(",");

/** What Tab stops on inside `root`, in order. */
export const tabbables = (root: ParentNode): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(":disabled") &&
      !el.closest("[inert]") &&
      (el.checkVisibility?.() ?? true),
  );

/**
 * Sets `el` on the trigger's own ref and on any ref the child already had.
 * On React 18 a ref is not a prop: `cloneElement` replaces it, so a wrapper
 * that needs the element sets both.
 */
export const setRefs = <T>(
  el: T | null,
  ...refs: (React.Ref<T> | undefined)[]
) => {
  for (const ref of refs) {
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<T | null>).current = el;
  }
};

/** The ref already on a React element, which `cloneElement` would replace. */
export const refOf = <T>(
  element: React.ReactElement,
): React.Ref<T> | undefined =>
  (element as unknown as { ref?: React.Ref<T> }).ref;
