import { createElement, forwardRef } from "react";
import type { ContainerSize } from "../css/containers";
import { sprinkles, type Sprinkles } from "../css/sprinkles.css";
import { cx, type LayoutProps } from "./element";
import * as styles from "./Switcher.css";

export interface SwitcherProps extends LayoutProps {
  /** Below this container width the children stack; at or above it they share a row. */
  stackBelow: ContainerSize;
  gap?: Sprinkles["gap"];
}

/**
 * Children in a row, sharing its width equally, that stack into a column
 * when the space is narrower than `stackBelow`. Renders a container `div`
 * around the row; `as`, `ref`, `className` and other props go on the row.
 */
export const Switcher = forwardRef<HTMLElement, SwitcherProps>(
  function Switcher(
    { as = "div", stackBelow, gap = "md", className, ...rest },
    ref,
  ) {
    return (
      <div className={styles.wrapper}>
        {createElement(as, {
          ...rest,
          ref,
          className: cx(
            styles.row,
            styles.stackBelow[stackBelow],
            sprinkles({ gap }),
            className,
          ),
        })}
      </div>
    );
  },
);
