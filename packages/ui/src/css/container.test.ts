import { describe, expect, it } from "vitest";
import { rulesFor } from "../__tests__/emittedCss";
import { body, panel } from "./__fixtures__/containers.css";
import { cq } from "./container";

describe("cq", () => {
  it("builds one rule per threshold, in rem", () => {
    expect(cq("panel", { 30: { display: "flex" } })).toEqual({
      "panel (min-width: 30rem)": { display: "flex" },
    });
  });

  it("orders thresholds smallest-first whatever order they are written in", () => {
    const rules = cq("panel", {
      48: { gap: "1rem" },
      30.5: { display: "flex" },
      30: { display: "block" },
    });
    expect(Object.keys(rules)).toEqual([
      "panel (min-width: 30rem)",
      "panel (min-width: 30.5rem)",
      "panel (min-width: 48rem)",
    ]);
  });

  it("emits container rules smallest-first in the stylesheet", () => {
    expect(rulesFor(body).map((rule) => rule.conditions)).toEqual([
      [`@container ${panel} (min-width: 30.5rem)`],
      [`@container ${panel} (min-width: 48rem)`],
    ]);
  });
});
