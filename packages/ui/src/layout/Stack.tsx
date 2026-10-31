import { createElement, forwardRef } from "react";
import { sprinkles, type Sprinkles } from "../css/sprinkles.css";
import { cx, type LayoutProps } from "./element";

export type StackProps = LayoutProps & {
  /** Space between children; one value or one per breakpoint. */
  gap?: Sprinkles["gap"];
  align?: Sprinkles["alignItems"];
};

/** Children in a column with a gap between them. */
export const Stack = forwardRef<HTMLElement, StackProps>(function Stack(
  { as = "div", gap = "md", align, className, ...rest },
  ref,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      sprinkles({
        display: "flex",
        flexDirection: "column",
        gap,
        alignItems: align,
      }),
      className,
    ),
  });
});
