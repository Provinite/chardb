import { style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { focusRing, hover, vars } from "@chardb/ui/theme";

/** Slides in from the right edge, and back out when dismissed. */
export const slide = style({
  transitionProperty: "transform, opacity",
  transitionDuration: vars.motion.duration.slow,
  transitionTimingFunction: vars.motion.easing.standard,
  selectors: {
    '&[data-visible="false"]': { transform: "translateX(100%)", opacity: 0 },
  },
});

export const toastBase = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  inlineSize: vars.size.column.xl,
  maxInlineSize: "100%",
  paddingBlock: vars.space.sm,
  paddingInlineStart: vars.space.lg,
  paddingInlineEnd: vars.space.xs,
  background: vars.surface.raised,
  color: vars.text.default,
  borderStyle: "solid",
  borderWidth: vars.borderWidth.hairline,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  fontFamily: vars.font.family.body,
  fontSize: vars.font.size.sm,
  overflowWrap: "anywhere",
});

export const toast = recipe({
  base: toastBase,
  variants: {
    tone: {
      neutral: { borderColor: vars.border.default },
      // Tinted as well as bordered: the status borders are pale, and a tint
      // tells success from error at a glance. `text.default` is a listed
      // body pair on both.
      success: {
        borderColor: vars.status.success.border,
        background: vars.status.success.bgSubtle,
      },
      error: {
        borderColor: vars.status.danger.border,
        background: vars.status.danger.bgSubtle,
      },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export const message = style({ flex: 1, minWidth: 0 });

export const dismiss = style([
  focusRing,
  {
    flexShrink: 0,
    display: "grid",
    placeItems: "center",
    inlineSize: vars.size.target.comfortable,
    blockSize: vars.size.target.comfortable,
    padding: 0,
    border: "none",
    borderRadius: vars.radius.md,
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    transitionProperty: "background-color",
    transitionDuration: vars.motion.duration.fast,
    "@media": hover({ "&:hover": { background: vars.surface.raisedHover } }),
  },
]);
