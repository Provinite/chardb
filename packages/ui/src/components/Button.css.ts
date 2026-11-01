import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { hover, touchQuery } from "../css/media";
import { focusRing } from "../styles/focus.css";
import { vars } from "../theme/contract.css";

/** Not disabled, not busy: the states a press can act in. */
const live = ':not(:disabled):not([aria-disabled="true"])';

const filled = (action: typeof vars.action.secondary) => ({
  backgroundColor: action.bg,
  color: action.fg,
  borderColor: action.border,
  selectors: {
    [`&:active${live}`]: {
      backgroundColor: action.bgPressed,
      borderColor: action.bgPressed,
    },
  },
  "@media": hover({
    [`&:hover${live}`]: {
      backgroundColor: action.bgHover,
      borderColor: action.bgHover,
    },
  }),
});

/** What every button shares, labelled or icon-only. */
export const control = style({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  // A border that is always there, so tones and states that colour it never
  // change the size; transparent until a tone colours it, and drawn in a
  // system colour under forced colours.
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderRadius: vars.radius.md,
  fontFamily: vars.font.family.body,
  fontWeight: vars.font.weight.medium,
  lineHeight: vars.font.lineHeight.normal,
  textAlign: "center",
  textDecoration: "none",
  cursor: "pointer",
  transition: [
    `background-color ${vars.motion.duration.fast} ${vars.motion.easing.standard}`,
    `border-color ${vars.motion.duration.fast} ${vars.motion.easing.standard}`,
    `color ${vars.motion.duration.fast} ${vars.motion.easing.standard}`,
  ].join(", "),
  selectors: {
    // Every tone greys out the same way.
    "&:disabled": {
      backgroundColor: vars.action.primary.bgDisabled,
      borderColor: vars.action.primary.bgDisabled,
      color: vars.action.primary.fgDisabled,
      cursor: "not-allowed",
    },
    '&[aria-disabled="true"]': { cursor: "progress" },
  },
});

/** The tones, shared by `Button` and `IconButton`. */
export const tones = {
  primary: filled(vars.action.primary),
  secondary: filled(vars.action.secondary),
  danger: filled(vars.action.danger),
  outline: {
    backgroundColor: "transparent",
    color: vars.action.primary.fgOutline,
    borderColor: vars.action.primary.border,
    selectors: {
      [`&:active${live}`]: {
        backgroundColor: vars.action.primary.bgPressed,
        borderColor: vars.action.primary.bgPressed,
        color: vars.action.primary.fg,
      },
    },
    "@media": hover({
      [`&:hover${live}`]: {
        backgroundColor: vars.action.primary.bgHover,
        borderColor: vars.action.primary.bgHover,
        color: vars.action.primary.fg,
      },
    }),
  },
  ghost: {
    backgroundColor: "transparent",
    color: vars.text.default,
    selectors: {
      [`&:active${live}`]: { backgroundColor: vars.surface.sunken },
    },
    "@media": hover({
      [`&:hover${live}`]: { backgroundColor: vars.surface.raisedHover },
    }),
  },
};

export const button = recipe({
  base: [focusRing, control],
  variants: {
    tone: tones,
    size: {
      sm: {
        minBlockSize: vars.size.target.min,
        paddingBlock: vars.space.xs,
        paddingInline: vars.space.sm,
        fontSize: vars.font.size.sm,
        // Full size to a finger. The control itself grows rather than an
        // invisible hit area, which would overlap its neighbours in a dense
        // row and take their taps.
        "@media": {
          [touchQuery]: {
            minInlineSize: vars.size.target.comfortable,
            minBlockSize: vars.size.target.comfortable,
          },
        },
      },
      md: {
        minBlockSize: vars.size.target.comfortable,
        minInlineSize: vars.size.target.comfortable,
        paddingBlock: vars.space.sm,
        paddingInline: vars.space.md,
        fontSize: vars.font.size.md,
      },
    },
  },
  defaultVariants: { tone: "primary", size: "md" },
});

/** The icon and text. Hidden, not removed, while busy, so the width holds. */
export const label = style({
  display: "inline-flex",
  alignItems: "center",
  gap: vars.space.xs,
  selectors: {
    // Opacity rather than `visibility: hidden`, which would take the label
    // out of the accessible name too.
    [`${control}[aria-busy="true"] &`]: { opacity: 0 },
  },
});

/** Over the label while busy. */
export const spinnerSlot = style({
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});
