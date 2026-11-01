import { style, styleVariants } from "@vanilla-extract/css";
import { focusRing, hover, mq, vars } from "@chardb/ui/theme";

/**
 * Shared by the sign-in and sign-up pages: one form standing alone on a page,
 * the same card on both so moving between them moves nothing.
 */

export const page = style({
  boxSizing: "border-box",
  inlineSize: "100%",
  maxInlineSize: vars.size.dialog,
  marginInline: "auto",
  paddingBlock: vars.space.xl,
  paddingInline: vars.space.md,
});

/**
 * On `surface.page`, not a raised card: the status colours for field errors
 * and invite code checks are listed against `surface.page` only.
 */
export const panel = style({
  background: vars.surface.page,
  border: `${vars.borderWidth.hairline} solid ${vars.border.default}`,
  borderRadius: vars.radius.lg,
  boxShadow: vars.shadow.lg,
  padding: vars.space.lg,
  "@media": {
    [mq("sm")]: { padding: vars.space.xl },
  },
});

export const header = style({
  textAlign: "center",
});

export const title = style({
  margin: 0,
  color: vars.text.default,
  fontSize: vars.font.size.xxl,
  fontWeight: vars.font.weight.bold,
  lineHeight: vars.font.lineHeight.tight,
  overflowWrap: "anywhere",
});

export const subtitle = style({
  margin: 0,
  color: vars.text.muted,
  fontSize: vars.font.size.md,
  lineHeight: vars.font.lineHeight.normal,
});

export const label = style({
  color: vars.text.default,
  fontWeight: vars.font.weight.medium,
});

export const input = style([
  focusRing,
  {
    display: "block",
    boxSizing: "border-box",
    inlineSize: "100%",
    minBlockSize: vars.size.target.comfortable,
    paddingInline: vars.space.md,
    border: `${vars.borderWidth.hairline} solid ${vars.border.input}`,
    borderRadius: vars.radius.md,
    background: vars.surface.page,
    color: vars.text.default,
    fontFamily: vars.font.family.body,
    fontSize: vars.font.size.md,
    "::placeholder": { color: vars.text.subtle },
  },
]);

export const help = style({
  color: vars.text.muted,
  fontSize: vars.font.size.sm,
});

export const error = style({
  color: vars.status.danger.fg,
  fontSize: vars.font.size.sm,
});

const validationBase = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
  fontSize: vars.font.size.sm,
});

export const validation = styleVariants({
  valid: [validationBase, { color: vars.status.success.fg }],
  invalid: [validationBase, { color: vars.status.danger.fg }],
  loading: [validationBase, { color: vars.text.muted }],
});

/** Which community the new account joins, and as what. */
export const communityBanner = style({
  margin: 0,
  padding: vars.space.md,
  // Transparent so forced-colour mode still draws the box.
  border: `${vars.borderWidth.hairline} solid transparent`,
  borderRadius: vars.radius.md,
  background: vars.action.primary.bgSubtle,
  color: vars.text.default,
  fontSize: vars.font.size.sm,
  lineHeight: vars.font.lineHeight.normal,
});

export const communityName = style({
  fontWeight: vars.font.weight.semibold,
});

export const footer = style({
  margin: 0,
  color: vars.text.muted,
  textAlign: "center",
});

export const link = style([
  focusRing,
  {
    color: vars.text.link,
    textDecoration: "none",
    "@media": hover({
      "&:hover": {
        color: vars.text.linkHover,
        textDecoration: "underline",
      },
    }),
  },
]);
