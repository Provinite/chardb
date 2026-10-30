import { describe, expect, it } from "vitest";
import { rulesFor } from "../__tests__/emittedCss";
import { split } from "./split.css";

describe("split", () => {
  it.each([
    ["1:1", "minmax(0, 1fr) minmax(0, 1fr)"],
    ["2:1", "minmax(0, 2fr) minmax(0, 1fr)"],
    ["1:2", "minmax(0, 1fr) minmax(0, 2fr)"],
    ["1:1:1", "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)"],
    ["3:1", "minmax(0, 3fr) minmax(0, 1fr)"],
  ] as const)(
    "%s is a grid in that ratio, with no gap of its own",
    (ratio, columns) => {
      expect(rulesFor(split[ratio])).toEqual([
        expect.objectContaining({
          conditions: [],
          declarations: { display: "grid", "grid-template-columns": columns },
        }),
      ]);
    },
  );
});
