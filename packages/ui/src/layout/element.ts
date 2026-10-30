import type { HTMLAttributes } from "react";

/** The elements a layout primitive may render as. */
export type LayoutElement =
  | "div"
  | "section"
  | "article"
  | "aside"
  | "nav"
  | "header"
  | "footer"
  | "main"
  | "form"
  | "fieldset"
  | "ul"
  | "ol"
  | "li";

export interface LayoutProps extends HTMLAttributes<HTMLElement> {
  /** The element to render. Defaults to `div`. */
  as?: LayoutElement;
}

/** Joins class names, skipping empty ones. */
export const cx = (...names: (string | undefined)[]) =>
  names.filter(Boolean).join(" ");
