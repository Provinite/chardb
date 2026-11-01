import React, {
  cloneElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import type { Side } from "../hooks/placeFloating";
import { timingMs } from "../theme/tokens";
import { applyPlacement, refOf, setRefs } from "./floating";
import * as floatingStyles from "./floating.css";
import * as styles from "./Tooltip.css";
import { usePortalContainer } from "./portal";

/** Pixels between the anchor and the tooltip: room for the arrow. */
const GAP_PX = 8;
/** Pixels the arrow keeps from the tooltip's corners. */
const ARROW_INSET_PX = 10;

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

/** Focus from the keyboard, as opposed to a click; jsdom may not know the selector. */
const focusVisible = (el: Element) => {
  try {
    return el.matches(":focus-visible");
  } catch {
    return true;
  }
};

type ChildProps = React.HTMLAttributes<HTMLElement> & {
  ref?: React.Ref<HTMLElement>;
};

export interface TooltipProps {
  /** What the tooltip says: the control's name, already its accessible name. */
  label: string;
  /** The side it shows on, when there is room. Above by default. */
  side?: Side;
  /** The element it names. Gets a ref and pointer and focus handlers. */
  children: React.ReactElement<ChildProps>;
}

/**
 * A name shown beside a control: on hover after a moment, at once on
 * keyboard focus, and on a long press on touch screens.
 *
 * Seen, not heard. It repeats a name the control already has (`aria-label`,
 * or text), so it is hidden from screen readers and nothing depends on it;
 * information people need goes in a `Toggletip`. It stays while the pointer
 * moves onto it, and Escape hides it, so it never covers what someone is
 * trying to read.
 */
export function Tooltip({ label, side = "top", children }: TooltipProps) {
  const [shown, setShown] = useState(false);
  const container = usePortalContainer();
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout>>();
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  /** A long press showed it, so the click that ends the press is not a click. */
  const longPressed = useRef(false);

  const clearTimers = useCallback(() => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
  }, []);
  const showAfter = (ms: number) => {
    clearTimers();
    showTimer.current = setTimeout(() => setShown(true), ms);
  };
  const hideAfter = (ms: number) => {
    clearTimeout(showTimer.current);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShown(false), ms);
  };
  const hideNow = useCallback(() => {
    clearTimers();
    setShown(false);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  useAnchoredPosition(anchorRef, tipRef, shown, {
    side,
    align: "center",
    fallbackPlacements: [OPPOSITE[side]],
    gap: GAP_PX,
    arrowInset: ARROW_INSET_PX,
    apply: (p) => applyPlacement(tipRef.current, p),
  });

  useEffect(() => {
    if (!shown) return;
    // Capturing, so it hides before anything else hears the key, and marks
    // it handled: a popover or dialog the control sits in stays open, and the
    // next Escape is theirs.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      e.preventDefault();
      hideNow();
    };
    // After a long press it stays until the next touch elsewhere.
    const onPointerDown = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) hideNow();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [shown, hideNow]);

  const childRef = refOf<HTMLElement>(children);
  const ref = useCallback(
    (el: HTMLElement | null) => setRefs(el, anchorRef, childRef),
    [childRef],
  );
  const own = children.props;

  const anchor = cloneElement(children, {
    ref,
    onPointerOver: (e: React.PointerEvent<HTMLElement>) => {
      own.onPointerOver?.(e);
      if (e.pointerType === "touch") return;
      if (shown) clearTimeout(hideTimer.current);
      else showAfter(timingMs.tooltip.delay);
    },
    onPointerOut: (e: React.PointerEvent<HTMLElement>) => {
      own.onPointerOut?.(e);
      if (e.pointerType === "touch") return;
      if (shown) hideAfter(timingMs.tooltip.hideDelay);
      else clearTimers();
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      own.onPointerDown?.(e);
      if (e.pointerType !== "touch") return;
      longPressed.current = false;
      clearTimers();
      showTimer.current = setTimeout(() => {
        longPressed.current = true;
        setShown(true);
      }, timingMs.tooltip.longPress);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      own.onPointerUp?.(e);
      if (e.pointerType === "touch") clearTimeout(showTimer.current);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLElement>) => {
      own.onPointerCancel?.(e);
      clearTimeout(showTimer.current);
    },
    onClickCapture: (e: React.MouseEvent<HTMLElement>) => {
      own.onClickCapture?.(e);
      // The press was to read the name, not to act.
      if (longPressed.current) {
        longPressed.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      own.onFocus?.(e);
      if (focusVisible(e.target)) {
        clearTimers();
        setShown(true);
      }
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      own.onBlur?.(e);
      hideNow();
    },
  });

  return (
    <>
      {anchor}
      {shown &&
        createPortal(
          <div
            ref={tipRef}
            data-tooltip=""
            aria-hidden="true"
            className={styles.tooltip}
            onPointerOver={() => clearTimeout(hideTimer.current)}
            onPointerOut={() => hideAfter(timingMs.tooltip.hideDelay)}
          >
            {label}
            <span aria-hidden className={floatingStyles.arrow} />
          </div>,
          container,
        )}
    </>
  );
}
