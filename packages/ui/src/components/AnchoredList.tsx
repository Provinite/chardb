import React, { useLayoutEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import { cx } from "../layout/element";
import * as styles from "./AnchoredList.css";
import { usePortalContainer } from "./portal";

/** Pixels between the input and its list. */
const GAP_PX = 4;
/** Pixels the list keeps from the viewport's edges. */
const MARGIN_PX = 8;
/** The tallest a list grows before it scrolls, unless it says otherwise. */
const LIST_MAX_HEIGHT_PX = 300;

/**
 * Keeps a typeahead's list under its input, as wide as the input, or above
 * it when there is no room below. For a list rendered into the portal
 * container with `position: fixed`, which nothing on the page can clip.
 */
function useAnchoredList(
  anchor: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  open: boolean,
  maxHeight: number,
): void {
  useAnchoredPosition(anchor, list, open, {
    side: "bottom",
    align: "start",
    gap: GAP_PX,
    margin: MARGIN_PX,
    // Past the cap `apply` sets, so the cap never decides the side.
    measure: (el) => ({
      width: anchor.current?.offsetWidth ?? el.offsetWidth,
      height: Math.min(el.scrollHeight, maxHeight),
    }),
    // Straight to the element, so following a scroll re-renders nothing.
    // Writes only: a read here would force a layout on every scroll step.
    apply: (p) => {
      const el = list.current;
      if (!el) return;
      el.style.top = `${p.top}px`;
      el.style.left = `${p.left}px`;
      el.style.maxHeight = `${Math.min(p.maxHeight, maxHeight)}px`;
    },
  });

  // The width on its own: an input can narrow without moving (a scrollbar
  // appearing beside it), which changes no placement and so calls no
  // `apply`. The observer hands over the size it measured.
  useLayoutEffect(() => {
    if (!open) return;
    const a = anchor.current;
    const el = list.current;
    if (!a || !el) return;
    el.style.width = `${a.offsetWidth}px`;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const size = entry?.borderBoxSize?.[0]?.inlineSize;
      if (size !== undefined && list.current) {
        list.current.style.width = `${size}px`;
      }
    });
    observer.observe(a);
    return () => observer.disconnect();
  }, [open, anchor, list]);
}

export interface AnchoredListProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** What it sits under: the typeahead's box, not just its input. */
  anchor: RefObject<HTMLElement | null>;
  /** Rendered only while open. */
  open: boolean;
  /** Pixels it grows to before it scrolls. */
  maxHeight?: number;
}

/**
 * A typeahead's list of matches, in the portal container (the body, or the
 * dialog the typeahead sits in) and kept under its anchor. The component it
 * belongs to styles how it looks; this owns where it is.
 *
 * Portalled, it is outside the typeahead in the page but inside it in the
 * component tree, so a typeahead tells presses inside from outside with
 * `usePressOutside`, which goes by the tree.
 */
export function AnchoredList({
  anchor,
  open,
  maxHeight = LIST_MAX_HEIGHT_PX,
  className,
  children,
  ...rest
}: AnchoredListProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const container = usePortalContainer();
  useAnchoredList(anchor, ref, open, maxHeight);

  if (!open) return null;
  return createPortal(
    <div
      {...rest}
      ref={ref}
      className={cx(styles.list, className)}
      style={assignInlineVars({ [styles.maxHeight]: `${maxHeight}px` })}
    >
      {children}
    </div>,
    container,
  );
}
