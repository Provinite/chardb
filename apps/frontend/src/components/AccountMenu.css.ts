import { style } from "@vanilla-extract/css";
import { mq, vars } from "@chardb/ui/theme";

/** The name beside the avatar; there is no room for it below `sm`. */
export const name = style({
  display: "none",
  color: vars.text.default,
  fontWeight: vars.font.weight.medium,
  "@media": {
    [mq("sm")]: { display: "inline" },
  },
});
