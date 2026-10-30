import { style } from "@vanilla-extract/css";
import { mq, vars } from "@chardb/ui/theme";

// Written largest-first on purpose: the PostCSS sort must reorder them.
export const columns = style({
  "@media": {
    [mq("lg")]: { gap: vars.space.xl },
    [mq("md")]: { gap: vars.space.lg },
    [mq("sm")]: { gap: vars.space.md },
  },
});
