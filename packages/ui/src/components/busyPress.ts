import type React from "react";
import { useLoaderVisible } from "../hooks/useLoaderVisible";

interface BusyPressOptions {
  busy: boolean;
  disabled: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** The caller's own, kept when not busy. */
  "aria-disabled"?: React.AriaAttributes["aria-disabled"];
  /** The caller's own, kept when not busy. */
  "aria-busy"?: React.AriaAttributes["aria-busy"];
}

/**
 * The busy state `Button` and `IconButton` share: presses blocked at once,
 * the spinner and `aria-busy` after the loader delay.
 *
 * Busy uses `aria-disabled` rather than `disabled`, which would drop keyboard
 * focus to the page. Every press reaches a button as a click, Enter in a form
 * field included, so cancelling the click is what blocks it. Busy wins over
 * `disabled`, so the spinner can show. A caller's own `aria-disabled` and
 * `aria-busy` stand when it is not busy; its `aria-disabled` does not block
 * clicks, so a control can still explain why it is unavailable.
 */
export function useBusyPress({
  busy,
  disabled,
  onClick,
  "aria-disabled": ariaDisabled,
  "aria-busy": ariaBusy,
}: BusyPressOptions) {
  const spinnerShown = useLoaderVisible(busy);
  // Held for the spinner's minimum time too: a press on a button still
  // showing a spinner would read as a second submit.
  const blocked = busy || spinnerShown;

  return {
    spinnerShown,
    props: {
      disabled: disabled && !blocked,
      "aria-disabled": blocked || ariaDisabled,
      "aria-busy": spinnerShown || ariaBusy,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        if (blocked) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      },
    },
  };
}
