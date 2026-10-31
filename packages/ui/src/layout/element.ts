import type { ComponentPropsWithoutRef } from "react";

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

type OtherElement = Exclude<LayoutElement, "div">;

/**
 * The element to render, with that element's own attributes: `as="form"`
 * takes `noValidate`, `as="ol"` takes `start`. Without `as` it is a `div`.
 */
export type LayoutProps =
  | ({ as?: "div" } & ComponentPropsWithoutRef<"div">)
  | {
      [E in OtherElement]: { as: E } & ComponentPropsWithoutRef<E>;
    }[OtherElement];

/** Joins class names, skipping empty ones. */
export const cx = (...names: (string | undefined)[]) =>
  names.filter(Boolean).join(" ");
