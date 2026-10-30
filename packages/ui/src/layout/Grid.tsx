import { createElement, forwardRef } from "react";
import { sprinkles, type Sprinkles } from "../css/sprinkles.css";
import { cx, type LayoutProps } from "./element";
import { grid, type GridVariants } from "./Grid.css";

export interface GridProps extends LayoutProps {
  /** The narrowest a column gets, as a `size.column` token. */
  min: NonNullable<GridVariants["min"]>;
  /**
   * `fit` (the default) stretches the items across the row when there are
   * fewer than fit; `fill` keeps the empty columns, so items stay one width.
   */
  repeat?: GridVariants["repeat"];
  gap?: Sprinkles["gap"];
}

/** As many columns as the width allows, each at least `min` wide. */
export const Grid = forwardRef<HTMLElement, GridProps>(function Grid(
  { as = "div", min, repeat, gap = "md", className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(grid({ min, repeat }), sprinkles({ gap }), className),
  });
});
