import { globalStyle } from "@vanilla-extract/css";
import { vars } from "@chardb/ui";

// On `html` so overscroll and the canvas behind the page match it.
globalStyle("html", {
  backgroundColor: vars.surface.page,
  color: vars.text.default,
});
