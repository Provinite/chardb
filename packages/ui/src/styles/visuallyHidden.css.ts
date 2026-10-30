import { style } from "@vanilla-extract/css";

/** Hidden from view and from the layout; screen readers still read it. */
export const visuallyHidden = style({
  position: "absolute",
  // Not a design value: one pixel is the smallest box screen readers keep.
  // eslint-disable-next-line @chardb/styles/no-raw-length
  width: "1px",
  // eslint-disable-next-line @chardb/styles/no-raw-length
  height: "1px",
  margin: 0,
  padding: 0,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: 0,
});
