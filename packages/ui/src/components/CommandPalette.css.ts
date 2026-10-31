import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { focusRing } from "../styles/focus.css";

/** Room around the box, so its focus ring is not clipped by the dialog. */
export const inputRow = style({
  padding: vars.space.sm,
  borderBlockEnd: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
});

export const input = style([
  focusRing,
  {
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: vars.size.target.comfortable,
    paddingBlock: vars.space.sm,
    paddingInline: vars.space.md,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.raised,
    color: vars.text.default,
    fontFamily: vars.font.family.body,
    fontSize: vars.font.size.lg,
  },
]);

export const list = style({
  flex: 1,
  minBlockSize: 0,
  overflowY: "auto",
  scrollbarGutter: "stable",
  padding: vars.space.xs,
});

export const group = style({
  selectors: {
    "& + &": { marginBlockStart: vars.space.xs },
  },
});

export const groupHeading = style({
  paddingBlock: vars.space.xs,
  paddingInline: vars.space.md,
  color: vars.text.muted,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.semibold,
});

export const item = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minBlockSize: vars.size.target.comfortable,
  paddingBlock: vars.space.xs,
  paddingInline: vars.space.md,
  borderRadius: vars.radius.md,
  color: vars.text.default,
  textDecoration: "none",
  cursor: "pointer",
  // Transparent until forced-colour mode, which drops the background below
  // and draws this in a system colour instead.
  outline: `${vars.borderWidth.hairline} solid transparent`,
  outlineOffset: `calc(-1 * ${vars.borderWidth.hairline})`,
  selectors: {
    "&[aria-selected='true']": {
      background: vars.surface.raisedHover,
      outlineColor: "currentColor",
    },
  },
});

export const itemLabel = style({
  fontSize: vars.font.size.md,
});

export const itemDescription = style({
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});

export const mark = style({
  borderRadius: vars.radius.sm,
  background: vars.action.primary.bgSubtle,
  color: vars.text.default,
});

export const empty = style({
  padding: vars.space.lg,
  color: vars.text.muted,
  textAlign: "center",
});
