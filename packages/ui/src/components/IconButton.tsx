import React, { forwardRef } from "react";
import type { ButtonSize, ButtonTone } from "./Button";
import * as buttonStyles from "./Button.css";
import { useBusyPress } from "./busyPress";
import * as styles from "./IconButton.css";
import { Spinner } from "./Spinner";

export interface IconButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "aria-label"
  > {
  /**
   * The button's accessible name. Required: an icon says nothing to a screen
   * reader. To show it on hover as well, wrap the button in `Tooltip`.
   */
  label: string;
  /** The icon, drawn in `currentColor`. */
  icon: React.ReactNode;
  /** Defaults to `ghost`. */
  tone?: ButtonTone;
  /** Defaults to `md`, a 44px square. `sm` is 24px, with a 44px hit area on touch. */
  size?: ButtonSize;
  /** As on `Button`: presses blocked at once, a spinner after the loader delay. */
  busy?: boolean;
}

/** A button that is only an icon, named by `label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      tone,
      size,
      busy = false,
      disabled = false,
      type = "button",
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const press = useBusyPress({ busy, disabled, onClick });
    const classes = styles.iconButton({ tone, size });

    return (
      <button
        {...rest}
        {...press.props}
        ref={ref}
        type={type}
        aria-label={label}
        className={className ? `${classes} ${className}` : classes}
      >
        <span className={buttonStyles.label}>{icon}</span>
        {press.spinnerShown && (
          <span className={buttonStyles.spinnerSlot}>
            <Spinner />
          </span>
        )}
      </button>
    );
  },
);
