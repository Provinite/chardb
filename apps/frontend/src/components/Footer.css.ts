import { globalStyle, style } from "@vanilla-extract/css";
import { touchQuery, vars } from "@chardb/ui/theme";

export const footer = style({
  marginBlockStart: "auto",
  paddingBlock: vars.space.lg,
  paddingInline: vars.space.md,
  background: vars.surface.raised,
  borderBlockStart: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  textAlign: "center",
});

/** The site links the shell passes in, such as the privacy page. */
export const links = style({
  marginBlock: vars.space.xs,
});

/**
 * Descendant links rather than a class on each: the shell renders the router
 * links, and the footer only knows they sit inside it.
 */
globalStyle(`${links} a`, {
  display: "inline-flex",
  alignItems: "center",
  minBlockSize: vars.size.target.min,
  color: vars.text.link,
  "@media": {
    [touchQuery]: { minBlockSize: vars.size.target.comfortable },
  },
});

globalStyle(`${links} a:focus-visible`, {
  outline: `${vars.borderWidth.focus} solid ${vars.border.focus}`,
  outlineOffset: vars.size.focusOffset,
});
