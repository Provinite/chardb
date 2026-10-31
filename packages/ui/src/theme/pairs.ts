import type { Leaves } from "./paths";
import type { ColorTokens } from "./tokens";

/** A colour token's path, such as `action.primary.bgHover`. */
export type ColorPath = Leaves<ColorTokens>;

export type PairUse = "body" | "large" | "nonText";

/** Minimum contrast for each use: body text, large text, and non-text. */
export const thresholds: Record<PairUse, number> = {
  body: 4.5,
  large: 3,
  nonText: 3,
};

interface Floor {
  /** The approved ratio; the pair may not drop below it. */
  ratio: number;
  /** Why the pair was approved below its threshold. */
  reason: string;
}

export interface Pair {
  fg: ColorPath;
  bg: ColorPath;
  use: PairUse;
  floor?: { light?: Floor; dark?: Floor };
}

/** The ratio a pair must meet in a theme: its floor there, or its use's threshold. */
export const requiredRatio = (pair: Pair, theme: "light" | "dark") =>
  pair.floor?.[theme]?.ratio ?? thresholds[pair.use];

export const colorAt = (colors: ColorTokens, path: ColorPath): string => {
  let node: unknown = colors;
  for (const key of path.split(".")) {
    node = (node as Record<string, unknown>)[key];
  }
  if (typeof node !== "string") {
    throw new Error("Colour path does not name a token");
  }
  return node;
};

const on = (fg: ColorPath, bgs: ColorPath[], use: PairUse): Pair[] =>
  bgs.map((bg) => ({ fg, bg, use }));

const actions = ["primary", "secondary", "danger"] as const;
const statuses = ["success", "warning", "danger", "info"] as const;

/**
 * The foregrounds that may sit on each background, and what for. Use only
 * these, and only for the use listed.
 */
export const pairs: Pair[] = [
  ...on(
    "text.default",
    ["surface.page", "surface.raised", "surface.sunken"],
    "body",
  ),
  ...on("text.default", ["surface.raisedHover"], "body"),
  ...on(
    "text.muted",
    ["surface.page", "surface.raised", "surface.raisedHover"],
    "body",
  ),
  ...on(
    "text.subtle",
    ["surface.page", "surface.raised", "surface.raisedHover"],
    "body",
  ),
  ...on(
    "text.link",
    ["surface.page", "surface.raised", "surface.raisedHover"],
    "body",
  ),
  ...on(
    "text.linkHover",
    ["surface.page", "surface.raised", "surface.raisedHover"],
    "body",
  ),

  ...actions.flatMap((a) => [
    ...on(
      `action.${a}.fg`,
      [`action.${a}.bg`, `action.${a}.bgHover`, `action.${a}.bgPressed`],
      "body",
    ),
    ...on("text.default", [`action.${a}.bgSubtle`], "body"),
  ]),

  ...statuses.flatMap((s) => [
    ...on(`status.${s}.fg`, ["surface.page", `status.${s}.bgSubtle`], "body"),
    ...on("text.default", [`status.${s}.bgSubtle`], "body"),
    ...on("text.inverse", [`status.${s}.bg`], "body"),
    // A control inside a tinted toast or alert rings itself on the tint.
    ...on("border.focus", [`status.${s}.bgSubtle`], "nonText"),
  ]),

  ...on("border.input", ["surface.page", "surface.raised"], "nonText"),
  // Not on surface.raisedHover: the ring is offset outside the control, so it
  // sits on the surface around a hovered card, never on the card itself.
  ...on("border.focus", ["surface.page", "surface.raised"], "nonText"),
  // The route progress bar, over the page or the header.
  ...on("action.primary.bg", ["surface.page"], "nonText"),
  {
    fg: "action.primary.bg",
    bg: "surface.raised",
    use: "nonText",
    floor: {
      dark: {
        ratio: 2.56,
        reason:
          "Saturated violet on slate reads clearly by eye despite the ratio (#465).",
      },
    },
  },
];
