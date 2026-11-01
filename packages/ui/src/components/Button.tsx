import React, { Children, cloneElement, forwardRef } from "react";
import * as styles from "./Button.css";
import { useBusyPress } from "./busyPress";
import { Spinner } from "./Spinner";

export type ButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Defaults to `primary`. */
  tone?: ButtonTone;
  /**
   * Defaults to `md`, 44px tall. `sm` looks smaller and grows its hit area
   * to 44px on touch devices.
   */
  size?: ButtonSize;
  /**
   * The action it started is running. Presses are blocked at once; after
   * `timing.loader.delay` a spinner covers the label and `aria-busy` is set.
   * Keep the label as it is: the spinner says it is working, and a toast or
   * inline status reports how it went.
   */
  busy?: boolean;
  /** Shown before the label. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const join = (...classes: (string | undefined)[]) =>
  classes.filter(Boolean).join(" ");

/**
 * A button: something that does something. For a control that goes to a
 * page, use `ButtonLink` around the app's own link. Busy, it stays focusable;
 * see `useBusyPress`.
 *
 * Forwards its ref so callers can move focus to a particular button, such as
 * Cancel in a confirm dialog.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      tone,
      size,
      busy = false,
      disabled = false,
      icon,
      type = "button",
      className,
      onClick,
      children,
      ...rest
    },
    ref,
  ) {
    const press = useBusyPress({ busy, disabled, onClick });

    return (
      <button
        {...rest}
        {...press.props}
        ref={ref}
        type={type}
        className={join(styles.button({ tone, size }), className)}
      >
        <span className={styles.label}>
          {icon}
          {children}
        </span>
        {press.spinnerShown && (
          <span className={styles.spinnerSlot}>
            <Spinner />
          </span>
        )}
      </button>
    );
  },
);

interface LinkSlotProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonLinkProps {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Shown before the link's text. */
  icon?: React.ReactNode;
  /**
   * One link element, such as a router `Link` or `HostAwareLink`, with its
   * own destination. It stays a real `<a href>`, so Ctrl-click, middle-click
   * and "open in new tab" work on it as on any link.
   */
  children: React.ReactElement<LinkSlotProps>;
}

/**
 * A link that looks like a button: the caller's link element, given the
 * button's classes and label. `@chardb/ui` cannot import the router, so the
 * app passes its own link in. Links have no busy state; they go somewhere.
 */
export function ButtonLink({ tone, size, icon, children }: ButtonLinkProps) {
  const link = Children.only(children);
  return cloneElement(link, {
    className: join(styles.button({ tone, size }), link.props.className),
    children: (
      <span className={styles.label}>
        {icon}
        {link.props.children}
      </span>
    ),
  });
}
