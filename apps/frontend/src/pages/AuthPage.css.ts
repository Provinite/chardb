import { style, styleVariants } from "@vanilla-extract/css";
import { focusRing, hover, mq, vars, visuallyHidden } from "@chardb/ui/theme";

/**
 * The sign-up form's unseen parts, the honeypot field and the proof-of-work
 * widget: out of view and out of the layout. The markup hides the honeypot
 * from screen readers (`aria-hidden`) and the keyboard (`tabIndex`).
 */
export const hiddenFields = style([visuallyHidden]);

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
  // A line tall while empty, so its text lands without moving the form.
  minBlockSize: `calc(${vars.font.size.md} * ${vars.font.lineHeight.normal})`,
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

/**
 * The line under every field: its error, else its hint, else empty. A line
 * tall either way, so a message arriving moves nothing below it.
 */
const message = style({
  minBlockSize: `calc(${vars.font.size.sm} * ${vars.font.lineHeight.normal})`,
  fontSize: vars.font.size.sm,
  lineHeight: vars.font.lineHeight.normal,
});

export const help = style([message, { color: vars.text.muted }]);

export const error = style([message, { color: vars.status.danger.fg }]);

/** Colour and size only: the row itself is a `Cluster`. */
const validationBase = style({
  fontSize: vars.font.size.sm,
});

export const validation = styleVariants({
  valid: [validationBase, { color: vars.status.success.fg }],
  invalid: [validationBase, { color: vars.status.danger.fg }],
  loading: [validationBase, { color: vars.text.muted }],
});

/** A field's label, standing in while the form is not ready to show. */
export const placeholderLabel = style({
  display: "block",
  inlineSize: "40%",
  minBlockSize: `calc(${vars.font.size.md} * ${vars.font.lineHeight.normal})`,
  borderRadius: vars.radius.sm,
  background: vars.surface.sunken,
});

/** A field's input, or the submit button, standing in the same way. */
export const placeholderInput = style({
  display: "block",
  minBlockSize: vars.size.target.comfortable,
  borderRadius: vars.radius.md,
  background: vars.surface.sunken,
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
