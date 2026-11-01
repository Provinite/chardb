import React, {
  cloneElement,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import type { Align, FallbackStrategy, Side } from "../hooks/placeFloating";
import { applyPlacement, refOf, setRefs, tabbables } from "./floating";
import * as floatingStyles from "./floating.css";
import * as styles from "./Popover.css";
import { usePortalContainer } from "./portal";

/** Pixels between the trigger and the panel: room for the arrow. */
const GAP_PX = 10;
/**
 * Pixels the panel keeps from the viewport's edges. The one source for it:
 * the size caps arrive from the placement as CSS variables.
 */
const MARGIN_PX = 8;
/** Pixels the arrow keeps from the panel's corners. */
const ARROW_INSET_PX = 14;

/**
 * Escape, on the panel or its trigger. Handled there rather than on the
 * document, so it runs before a dialog the popover sits in sees the key; the
 * dialog leaves a handled Escape alone and stays open.
 */
const escapeCloses = (
  e: React.KeyboardEvent,
  close: (refocus: boolean) => void,
) => {
  if (e.key !== "Escape" || e.defaultPrevented || e.nativeEvent.isComposing) {
    return;
  }
  e.preventDefault();
  close(true);
};

interface PopoverContextValue {
  open: boolean;
  toggle: () => void;
  /** Closes it; with `refocus`, focus goes back to the trigger. */
  close: (refocus: boolean) => void;
  panelId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  panelRef: React.MutableRefObject<HTMLDivElement | null>;
  bodyRef: React.MutableRefObject<HTMLDivElement | null>;
}

/**
 * The panel's size with nothing capped: its body's whole content, plus the
 * panel's own border and padding. Deciding by the capped size would let the
 * cap pick the side, and a new side means a new cap.
 */
const naturalSize = (
  panel: HTMLElement,
  body: HTMLElement | null,
): { width: number; height: number } => ({
  width: panel.offsetWidth,
  height: body
    ? panel.offsetHeight - body.clientHeight + body.scrollHeight
    : panel.offsetHeight,
});

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover(): PopoverContextValue {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover part used outside its Root");
  return ctx;
}

export interface PopoverRootProps {
  /** The side of the trigger it opens on, when there is room. */
  side?: Side;
  /** Where along that side, relative to the trigger. */
  align?: Align;
  /**
   * Sides to try, in order, when there is no room on `side`. The opposite
   * side by default; `[]` keeps it on `side`.
   */
  fallbackPlacements?: Side[];
  /**
   * When there is room on none of them: `bestFit` (the default) takes the
   * side with the most room, `initialPlacement` stays on `side`. Capped and
   * scrolling either way.
   */
  fallbackStrategy?: FallbackStrategy;
  children?: React.ReactNode;
}

/**
 * A panel that opens beside a button: settings, a picker, anything that
 * belongs to the button and is too much to show all the time. A non-modal
 * dialog -- the page stays live, and a press outside closes it.
 *
 * The panel renders at the end of `<body>`, so focus is moved for it: into
 * its first control on open, back to the trigger on Escape or on Shift+Tab
 * from the top, and on past the trigger on Tab from the bottom, which also
 * closes it. Keyboard order is as if the panel sat right after its trigger.
 */
export function PopoverRoot({
  side = "bottom",
  align = "center",
  fallbackPlacements,
  fallbackStrategy,
  children,
}: PopoverRootProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useAnchoredPosition(triggerRef, panelRef, open, {
    side,
    align,
    fallbackPlacements,
    fallbackStrategy,
    gap: GAP_PX,
    margin: MARGIN_PX,
    arrowInset: ARROW_INSET_PX,
    apply: (p) => applyPlacement(panelRef.current, p),
    measure: (panel) => naturalSize(panel, bodyRef.current),
  });

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const toggle = useCallback(() => setOpen((was) => !was), []);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        close(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, close]);

  // Changes only on open and close: where the panel sits is never in here, so
  // following a scroll re-renders neither the trigger nor the panel.
  const ctx = useMemo(
    () => ({ open, toggle, close, panelId, triggerRef, panelRef, bodyRef }),
    [open, toggle, close, panelId],
  );

  return (
    <PopoverContext.Provider value={ctx}>{children}</PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps {
  /** The button that opens it. Gets its ARIA, a ref and a click handler. */
  children: React.ReactElement<
    React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
  >;
}

/** Wraps the button that opens the panel. */
export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, toggle, close, panelId, triggerRef } = usePopover();
  const child = children;
  const childRef = refOf<HTMLElement>(child);
  const ref = useCallback(
    (el: HTMLElement | null) => setRefs(el, triggerRef, childRef),
    [triggerRef, childRef],
  );
  return cloneElement(child, {
    ref,
    "aria-haspopup": "dialog",
    "aria-expanded": open,
    "aria-controls": open ? panelId : undefined,
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      child.props.onClick?.(e);
      if (!e.defaultPrevented) toggle();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      child.props.onKeyDown?.(e);
      if (open) escapeCloses(e, close);
    },
  });
}

export interface PopoverPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "id"> {
  /** What the panel is, for screen readers: usually the trigger's label. */
  "aria-label": string;
}

/** The panel, with an arrow pointing at the trigger. Only there while open. */
export const PopoverPanel = forwardRef<HTMLDivElement, PopoverPanelProps>(
  function PopoverPanel({ className, children, onKeyDown, ...rest }, ref) {
    const { open, close, panelId, triggerRef, panelRef, bodyRef } =
      usePopover();
    const container = usePortalContainer();
    const setPanel = useCallback(
      (el: HTMLDivElement | null) => {
        panelRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [panelRef, ref],
    );

    // After it has been placed, so focusing does not scroll the page to
    // wherever it was before.
    useEffect(() => {
      if (!open) return;
      const panel = panelRef.current;
      if (!panel) return;
      (tabbables(panel)[0] ?? panel).focus({ preventScroll: true });
    }, [open, panelRef]);

    if (!open) return null;

    const onTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const panel = panelRef.current;
      const trigger = triggerRef.current;
      if (e.key !== "Tab" || !panel || !trigger) return;
      const inside = tabbables(panel);
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === panel || active === inside[0]) {
          e.preventDefault();
          trigger.focus();
        }
        return;
      }
      if (active === panel || active === inside[inside.length - 1]) {
        e.preventDefault();
        // On along the page from the trigger, skipping the panel itself.
        const page = tabbables(document.body).filter(
          (el) => !panel.contains(el),
        );
        const next = page[page.indexOf(trigger) + 1] ?? trigger;
        close(false);
        next.focus();
      }
    };

    return createPortal(
      <div
        {...rest}
        ref={setPanel}
        id={panelId}
        role="dialog"
        tabIndex={-1}
        // Placed by `applyPlacement`, before paint.
        className={className ? `${styles.panel} ${className}` : styles.panel}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          escapeCloses(e, close);
          if (!e.defaultPrevented) onTab(e);
        }}
      >
        <div ref={bodyRef} className={styles.body}>
          {children}
        </div>
        <span
          data-popover-arrow=""
          aria-hidden
          className={floatingStyles.arrow}
        />
      </div>,
      container,
    );
  },
);
