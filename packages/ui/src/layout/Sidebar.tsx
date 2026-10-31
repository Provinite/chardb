import { createElement, forwardRef } from "react";
import type { ContainerSize } from "../css/containers";
import { sprinkles, type Sprinkles } from "../css/sprinkles.css";
import { cx, type LayoutProps } from "./element";
import * as styles from "./Sidebar.css";

export type SidebarRootProps = LayoutProps & {
  /** Below this container width the panes stack, in source order. */
  stackBelow: ContainerSize;
  gap?: Sprinkles["gap"];
};

/**
 * Holds `Sidebar.Main` and `Sidebar.Side`.
 *
 * Renders a container `div` around the layout. The container is sized as if
 * it were empty, so it takes its width from its parent; `className` goes on
 * it, to place it there. `as`, `ref` and other props go on the layout.
 */
export const SidebarRoot = forwardRef<HTMLElement, SidebarRootProps>(
  function SidebarRoot(
    { as = "div", stackBelow, gap = "lg", className, ...rest },
    ref,
  ) {
    return (
      <div className={cx(styles.wrapper, className)}>
        {createElement(as, {
          ...rest,
          ref,
          className: cx(
            styles.layout,
            styles.stackBelow[stackBelow],
            sprinkles({ gap }),
          ),
        })}
      </div>
    );
  },
);

/** The pane that takes the width the side pane leaves. */
export const SidebarMain = forwardRef<HTMLElement, LayoutProps>(
  function SidebarMain({ as = "div", className, ...rest }, ref) {
    return createElement(as, {
      ...rest,
      ref,
      className: cx(styles.main, className),
    });
  },
);

export type SidebarSideProps = LayoutProps & {
  /** The side pane's width when side by side, as a `size.column` token. */
  width: keyof typeof styles.sideWidths;
};

/** The fixed-width pane. Full width once the panes stack. */
export const SidebarSide = forwardRef<HTMLElement, SidebarSideProps>(
  function SidebarSide({ as = "div", width, className, ...rest }, ref) {
    return createElement(as, {
      ...rest,
      ref,
      className: cx(styles.side, styles.sideWidths[width], className),
    });
  },
);
