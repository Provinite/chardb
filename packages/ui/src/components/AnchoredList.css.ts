import { createVar, style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";

/** The tallest the list grows before it scrolls. */
export const maxHeight = createVar();

/**
 * A typeahead's list: fixed under its input by `useAnchoredList`, on the
 * dropdown layer. How it looks is up to the component it belongs to.
 */
export const list = style({
  position: "fixed",
  boxSizing: "border-box",
  zIndex: vars.layer.dropdown.base,
  maxBlockSize: maxHeight,
  overflowY: "auto",
});
