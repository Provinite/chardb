import { createSprinkles, defineProperties } from "@vanilla-extract/sprinkles";
import { vars } from "../theme/contract.css";
import { flatten } from "../theme/paths";
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

// Listed by hand so the names are inferred; the sprinkles test fails if a
// token is added to the theme but not here.
const backgroundStates = ({
  bg,
  bgHover,
  bgPressed,
  bgSubtle,
  bgDisabled,
}: typeof action.secondary) => ({
  bg,
  bgHover,
  bgPressed,
  bgSubtle,
  bgDisabled,
});

const actionBackgrounds = flatten({
  action: {
    primary: backgroundStates(action.primary),
    secondary: backgroundStates(action.secondary),
    danger: backgroundStates(action.danger),
  },
});

const actionBorders = flatten({
  action: {
    primary: { border: action.primary.border },
    secondary: { border: action.secondary.border },
    danger: { border: action.danger.border },
  },
});

const colors = defineProperties({
  conditions: {
    default: {},
    // A disabled control keeps its colour under the pointer.
    hover: { "@media": hoverQuery, selector: "&:hover:not(:disabled)" },
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
