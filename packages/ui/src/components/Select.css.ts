import { style } from "@vanilla-extract/css";
import { vars } from "../theme/contract.css";
import { focusRing } from "../styles/focus.css";
import { hover } from "../css/media";

/** The closed box: drawn like a text input, with a chevron at its end. */
export const trigger = style([
  focusRing,
  {
    display: "flex",
    alignItems: "center",
    gap: vars.space.sm,
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: vars.size.target.comfortable,
    paddingBlock: vars.space.sm,
    paddingInline: vars.space.md,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.page,
    color: vars.text.default,
    fontFamily: vars.font.family.body,
    fontSize: vars.font.size.md,
    lineHeight: vars.font.lineHeight.normal,
    textAlign: "start",
    cursor: "pointer",
    selectors: {
      "&:disabled": {
        background: vars.action.secondary.bgDisabled,
        color: vars.action.secondary.fgDisabled,
        cursor: "not-allowed",
      },
      "&[aria-invalid='true']": { borderColor: vars.status.danger.border },
    },
  },
]);

/** What the chosen option shows, as it shows it in the list. */
export const value = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flex: 1,
  minInlineSize: 0,
  overflowWrap: "anywhere",
});

export const chevron = style({
  flexShrink: 0,
  color: vars.text.muted,
  selectors: {
    [`${trigger}:disabled &`]: { color: "inherit" },
  },
});

export const list = style({
  padding: vars.space.xs,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.md,
  background: vars.surface.raised,
  boxShadow: vars.shadow.lg,
  overscrollBehavior: "contain",
});

export const option = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  minBlockSize: vars.size.target.comfortable,
  paddingBlock: vars.space.sm,
  paddingInline: vars.space.sm,
  borderRadius: vars.radius.sm,
  color: vars.text.default,
  cursor: "pointer",
  overflowWrap: "anywhere",
  selectors: {
    "&[data-active]": {
      background: vars.surface.raisedHover,
      // Invisible until forced-colour mode, which drops the background and
      // draws this in a system colour instead.
      outline: `${vars.borderWidth.hairline} solid transparent`,
      outlineOffset: `calc(-1 * ${vars.borderWidth.hairline})`,
    },
  },
  "@media": hover({
    "&:hover": { background: vars.surface.raisedHover },
  }),
});

/**
 * The tick beside the chosen option. Its column is always there, so the
 * options line up whichever one is chosen.
 */
export const check = style({
  flexShrink: 0,
  color: vars.text.muted,
  visibility: "hidden",
  selectors: {
    [`${option}[aria-selected='true'] &`]: { visibility: "visible" },
  },
});
