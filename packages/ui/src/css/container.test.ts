import { describe, expect, it } from "vitest";
import { emittedCss } from "../test/emittedCss";
import { body, panel } from "./__fixtures__/containers.css";
import { cq } from "./container";

describe("cq", () => {
  it("builds one rule per threshold, in rem", () => {
    expect(cq("panel", { 30: { display: "flex" } })).toEqual({
      "panel (min-width: 30rem)": { display: "flex" },
    });
  });

  it("emits thresholds smallest-first whatever order they are written in", () => {
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
});

describe("cq output", () => {
  it("emits container rules smallest-first in the stylesheet", () => {
    const css = emittedCss();
    const at30 = css.indexOf(`@container ${panel} (min-width: 30.5rem)`);
    const at48 = css.indexOf(`@container ${panel} (min-width: 48rem)`);
    expect(body).toBeTruthy();
    expect(at30).toBeGreaterThan(-1);
    expect(at30).toBeLessThan(at48);
  });
});
