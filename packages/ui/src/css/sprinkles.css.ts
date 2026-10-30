import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "../theme/contract.css";
import { flatten, type Leaves } from "../theme/paths";
import { breakpoints, type Breakpoint } from "./breakpoints";
import { hoverQuery, mq } from "./media";

const space = { ...vars.space, none: "0" };

const breakpointConditions = Object.fromEntries(
  Object.keys(breakpoints).map((bp) => [
    bp,
    { "@media": mq(bp as Breakpoint) },
  ]),
) as Record<Breakpoint, { "@media": string }>;

const responsive = defineProperties({
  conditions: { base: {}, ...breakpointConditions },
  defaultCondition: "base",
  properties: {
    display: [
      "none",
      "block",
      "inline",
      "inline-block",
      "flex",
      "inline-flex",
      "grid",
    ],
    flexDirection: ["row", "column"],
    flexWrap: ["wrap", "nowrap"],
    alignItems: ["stretch", "flex-start", "center", "flex-end", "baseline"],
    justifyContent: ["flex-start", "center", "flex-end", "space-between"],
    gap: space,
    rowGap: space,
    columnGap: space,
    paddingTop: space,
    paddingBottom: space,
    paddingLeft: space,
    paddingRight: space,
  },
  shorthands: {
    padding: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"],
    paddingX: ["paddingLeft", "paddingRight"],
    paddingY: ["paddingTop", "paddingBottom"],
  },
});

const { surface, text, border, action } = vars;

type ActionPath = Leaves<{ action: typeof action }>;
const actionPaths = flatten({ action });

/** The action tokens whose path passes `test`, keeping their names in the type. */
const pickActions = <P extends ActionPath>(test: (path: string) => boolean) =>
  Object.fromEntries(
    Object.entries(actionPaths).filter(([path]) => test(path)),
  ) as Record<P, string>;

const actionBackgrounds = pickActions<
  Extract<ActionPath, `${string}.bg${string}`>
>((path) => /\.bg\w*$/.test(path));
const actionBorders = pickActions<Extract<ActionPath, `${string}.border`>>(
  (path) => path.endsWith(".border"),
);

const colors = defineProperties({
  conditions: {
    default: {},
    hover: { "@media": hoverQuery, selector: "&:hover" },
  },
  defaultCondition: "default",
  properties: {
    color: flatten({ text }),
    backgroundColor: { ...flatten({ surface }), ...actionBackgrounds },
    borderColor: { ...flatten({ border }), ...actionBorders },
  },
});

/**
 * Responsive layout values and hover colours as atomic classes:
 * `sprinkles({ flexDirection: { base: "column", md: "row" } })`. An element's
 * property comes from sprinkles or its local style, never both.
 */
export const sprinkles = createSprinkles(responsive, colors);

export type Sprinkles = Parameters<typeof sprinkles>[0];
