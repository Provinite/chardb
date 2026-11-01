import { globalStyle } from "@vanilla-extract/css";
import { vars } from "@chardb/ui/theme";

// On `html` so overscroll and the canvas behind the page match it.
globalStyle("html", {
  backgroundColor: vars.surface.page,
  color: vars.text.default,
  // Phones otherwise enlarge text on their own when turned sideways.
  WebkitTextSizeAdjust: "100%",
  textSizeAdjust: "100%",
});

// The baseline Mantine's stylesheet used to set, kept when it went (#466).

globalStyle("body", {
  lineHeight: vars.font.lineHeight.normal,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

// Browsers give form controls their own small font; these take the page's,
// size and line height included, not only the family.
globalStyle("input, button, textarea, select", {
  font: "inherit",
});

// `index.css` sizes every element by its border box; pseudo-elements too.
globalStyle("*::before, *::after", {
  boxSizing: "border-box",
});
