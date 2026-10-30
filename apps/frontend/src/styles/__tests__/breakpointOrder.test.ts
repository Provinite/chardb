import { mq } from "@chardb/ui/theme";
import { rulesFor } from "../../__tests__/emittedCss";
import { columns } from "./__fixtures__/breakpointOrder.css";

describe("breakpoint order", () => {
  it("emits mq() queries smallest-first whatever order they are written in", () => {
    expect(rulesFor(columns).map((rule) => rule.conditions)).toEqual([
      [`@media ${mq("sm")}`],
      [`@media ${mq("md")}`],
      [`@media ${mq("lg")}`],
    ]);
  });
});
