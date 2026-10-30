import { createElement, forwardRef } from "react";
import { sprinkles, type Sprinkles } from "../css/sprinkles.css";
import { cx, type LayoutProps } from "./element";

export interface ClusterProps extends LayoutProps {
  /** Space between children, across and between rows. */
  gap?: Sprinkles["gap"];
  align?: Sprinkles["alignItems"];
  justify?: Sprinkles["justifyContent"];
}

/** Children in a row that wraps when it runs out of width: toolbars, tags, action bars. */
export const Cluster = forwardRef<HTMLElement, ClusterProps>(function Cluster(
  { as = "div", gap = "sm", align = "center", justify, className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      sprinkles({
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap,
        alignItems: align,
        justifyContent: justify,
      }),
      className,
    ),
  });
});
