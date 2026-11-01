import { recipe } from "@vanilla-extract/recipes";
import { focusRing } from "../styles/focus.css";
import { vars } from "../theme/contract.css";
import { control, tones, touchHitArea } from "./Button.css";

export const iconButton = recipe({
  base: [focusRing, control, { padding: 0, flexShrink: 0 }],
  variants: {
    tone: tones,
    size: {
      /** 24px, the floor; 44px to a finger. */
      sm: {
        inlineSize: vars.size.target.min,
        blockSize: vars.size.target.min,
        "@media": touchHitArea,
      },
      /** 44px everywhere. */
      md: {
        inlineSize: vars.size.target.comfortable,
        blockSize: vars.size.target.comfortable,
      },
    },
  },
  defaultVariants: { tone: "ghost", size: "md" },
});
