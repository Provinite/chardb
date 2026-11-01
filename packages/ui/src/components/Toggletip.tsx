import React, {
  forwardRef,
  useCallback,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";
import { useAnchoredPosition } from "../hooks/useAnchoredPosition";
import type { Side } from "../hooks/placeFloating";
import { visuallyHidden } from "../styles/visuallyHidden.css";
import { applyPlacement, setRefs, usePressOutside } from "./floating";
import * as floatingStyles from "./floating.css";
import * as styles from "./Toggletip.css";
import { usePortalContainer } from "./portal";

/** Pixels between the button and the bubble: room for the arrow. */
const GAP_PX = 8;
/** Pixels the arrow keeps from the bubble's corners. */
const ARROW_INSET_PX = 12;

const OPPOSITE: Record<Side, Side> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

export interface ToggletipProps {
  /** The button's name: what the note explains, e.g. "How to move the light". */
  label: string;
  /** The side the note shows on, when there is room. Above by default. */
  side?: Side;
  className?: string;
  /** The note. Short: a sentence or two. */
  children: React.ReactNode;
}

/**
 * Information people need, behind a small info button: a tap, click, Enter
 * or Space shows it, and the same again, Escape or a press elsewhere hides
 * it. Unlike a tooltip it works the same on touch, keyboard and mouse.
 *
 * Screen readers hear the note when it opens: it is written into a live
 * region beside the button, which starts empty so that the change is what
 * gets announced. The bubble on screen is hidden from them, so it is not
 * read twice. Focus stays on the button.
 */
export const Toggletip = forwardRef<HTMLButtonElement, ToggletipProps>(
  function Toggletip({ label, side = "top", className, children }, ref) {
    const [open, setOpen] = useState(false);
    const container = usePortalContainer();
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const bubbleRef = useRef<HTMLDivElement | null>(null);

    const setButton = useCallback(
      (el: HTMLButtonElement | null) => setRefs(el, buttonRef, ref),
      [ref],
    );

    useAnchoredPosition(buttonRef, bubbleRef, open, {
      side,
      align: "center",
      fallbackPlacements: [OPPOSITE[side]],
      gap: GAP_PX,
      arrowInset: ARROW_INSET_PX,
      apply: (p) => applyPlacement(bubbleRef.current, p),
    });

    const pressInside = usePressOutside(open, () => setOpen(false), [
      buttonRef,
    ]);

    return (
      <>
        <button
          ref={setButton}
          type="button"
          aria-label={label}
          aria-expanded={open}
          className={
            className ? `${styles.button} ${className}` : styles.button
          }
          onClick={() => setOpen((was) => !was)}
          onKeyDown={(e) => {
            // On the button rather than the document, so it runs before a
            // popover or dialog this sits in sees the key, and they stay open.
            if (
              e.key !== "Escape" ||
              !open ||
              e.defaultPrevented ||
              e.nativeEvent.isComposing
            ) {
              return;
            }
            e.preventDefault();
            setOpen(false);
          }}
        >
          <Info size={16} aria-hidden />
        </button>
        <span role="status" className={visuallyHidden}>
          {open ? children : ""}
        </span>
        {open &&
          createPortal(
            <div
              ref={bubbleRef}
              data-toggletip-bubble=""
              aria-hidden="true"
              className={styles.bubble}
              onMouseDownCapture={pressInside.onMouseDownCapture}
            >
              {children}
              <span aria-hidden className={floatingStyles.arrow} />
            </div>,
            container,
          )}
      </>
    );
  },
);
