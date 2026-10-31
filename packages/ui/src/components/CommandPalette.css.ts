import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { mq } from "../css/media";

/**
 * The search box's row: an icon and a borderless input over a divider. The
 * divider turns the focus colour while the box has focus, and is always the
 * same width, so focus changes its colour and nothing else.
 */
export const inputRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  paddingInline: vars.space.md,
  borderBlockEnd: `${vars.borderWidth.thick} solid ${vars.border.default}`,
  color: vars.text.muted,
  selectors: {
    "&:focus-within": { borderBlockEndColor: vars.border.focus },
  },
});

export const searchIcon = style({
  flexShrink: 0,
});

export const input = style({
  flex: 1,
  minInlineSize: 0,
  minBlockSize: vars.size.target.comfortable,
  paddingBlock: vars.space.md,
  paddingInline: 0,
  border: 0,
  background: "transparent",
  color: vars.text.default,
  fontFamily: vars.font.family.body,
  fontSize: vars.font.size.lg,
  // The row's divider shows focus. Transparent until forced-colour mode, which
  // drops the divider's colour and draws this in a system colour instead.
  outline: `${vars.borderWidth.focus} solid transparent`,
  selectors: {
    "&::placeholder": { color: vars.text.subtle },
  },
});

/**
 * One height whatever it holds -- seven results, one, or the empty state --
 * so the dialog never resizes under the box while typing.
 */
export const list = style({
  display: "flex",
  flexDirection: "column",
  blockSize: vars.size.dialogList,
  flexShrink: 1,
  minBlockSize: 0,
  overflowY: "auto",
  scrollbarGutter: "stable",
  padding: vars.space.xs,
});

export const group = style({
  selectors: {
    "& + &": {
      marginBlockStart: vars.space.xs,
      paddingBlockStart: vars.space.xs,
      borderBlockStart: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
    },
  },
});

export const groupHeading = style({
  paddingBlockStart: vars.space.sm,
  paddingBlockEnd: vars.space.xs,
  paddingInline: vars.space.md,
  color: vars.text.muted,
  fontSize: vars.font.size.xs,
  fontWeight: vars.font.weight.bold,
  lineHeight: vars.font.lineHeight.tight,
  textTransform: "uppercase",
});

export const item = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minBlockSize: vars.size.target.comfortable,
  paddingBlock: vars.space.sm,
  paddingInline: vars.space.md,
  borderRadius: vars.radius.md,
  color: vars.text.default,
  textDecoration: "none",
  cursor: "pointer",
  selectors: {
    "&[aria-selected='true']": {
      background: vars.action.primary.bg,
      color: vars.action.primary.fg,
      // Invisible until forced-colour mode, which drops the background and
      // draws this in a system colour instead.
      outline: `${vars.borderWidth.hairline} solid transparent`,
      outlineOffset: `calc(-1 * ${vars.borderWidth.hairline})`,
    },
  },
});

export const itemLabel = style({
  fontSize: vars.font.size.md,
  fontWeight: vars.font.weight.medium,
  lineHeight: vars.font.lineHeight.tight,
});

export const itemDescription = style({
  marginBlockStart: vars.space.xs,
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
  lineHeight: vars.font.lineHeight.tight,
  selectors: {
    // Muted text has no pair on the primary fill; the fill's own foreground
    // does, and the smaller size keeps the two lines apart.
    [`${item}[aria-selected='true'] &`]: { color: vars.action.primary.fg },
  },
});

/** Colour and an underline, neither of which changes the text's width. */
export const mark = style({
  background: "none",
  color: vars.text.link,
  textDecoration: "underline",
  textDecorationThickness: vars.borderWidth.thick,
  textUnderlineOffset: vars.borderWidth.thick,
  selectors: {
    [`${item}[aria-selected='true'] &`]: { color: "inherit" },
  },
});

/** Fills the list, so the message sits in the middle of the same space. */
export const empty = style({
  display: "flex",
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.lg,
  color: vars.text.muted,
  textAlign: "center",
});

/** Keyboard hints. Hidden on phones, where there is no keyboard to hint at. */
export const footer = style({
  display: "none",
  "@media": {
    [mq("sm")]: {
      display: "flex",
      flexWrap: "wrap",
      gap: vars.space.md,
      paddingBlock: vars.space.sm,
      paddingInline: vars.space.md,
      borderBlockStart: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
      color: vars.text.muted,
      fontSize: vars.font.size.xs,
    },
  },
});

export const kbd = style({
  paddingInline: vars.space.xs,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.sm,
  background: vars.surface.page,
  color: vars.text.default,
  fontFamily: vars.font.family.mono,
  fontSize: vars.font.size.xs,
});
