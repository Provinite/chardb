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
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import type { Align, Placement, Side } from "../hooks/placeFloating";
import * as styles from "./Popover.css";

/** Pixels between the trigger and the panel: room for the arrow. */
const GAP_PX = 10;
/** Pixels the panel keeps from the viewport's edges. */
const MARGIN_PX = 8;
/** Pixels the arrow keeps from the panel's corners. */
const ARROW_INSET_PX = 14;

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
const tabbables = (root: ParentNode): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.matches(":disabled") &&
      !el.closest("[inert]") &&
      (el.checkVisibility?.() ?? true),
  );

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
  placement: Placement | null;
}

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
  children,
}: PopoverRootProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const placement = useAnchoredPosition(triggerRef, panelRef, open, {
    side,
    align,
    gap: GAP_PX,
    margin: MARGIN_PX,
    arrowInset: ARROW_INSET_PX,
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

  const ctx = useMemo(
    () => ({ open, toggle, close, panelId, triggerRef, panelRef, placement }),
    [open, toggle, close, panelId, placement],
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
  return cloneElement(child, {
    ref: (el: HTMLElement | null) => {
      triggerRef.current = el;
    },
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
    const { open, close, panelId, triggerRef, panelRef, placement } =
      usePopover();

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
        ref={(el) => {
          panelRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        }}
        id={panelId}
        role="dialog"
        tabIndex={-1}
        data-side={placement?.side ?? "bottom"}
        className={className ? `${styles.panel} ${className}` : styles.panel}
        style={assignInlineVars({
          [styles.top]: `${placement?.top ?? 0}px`,
          [styles.left]: `${placement?.left ?? 0}px`,
          [styles.arrowAt]: `${placement?.arrow ?? 0}px`,
        })}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          escapeCloses(e, close);
          if (!e.defaultPrevented) onTab(e);
        }}
      >
        {children}
        <span data-popover-arrow="" aria-hidden className={styles.arrow} />
      </div>,
      document.body,
    );
  },
);
