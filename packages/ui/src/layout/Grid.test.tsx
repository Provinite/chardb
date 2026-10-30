import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { Grid } from "./Grid";
import { minTrack, repeatMode } from "./Grid.css";

/** `--name` from the `var(--name)` that vanilla-extract hands back for a var. */
const propertyName = (ref: string) => ref.slice("var(".length, -")".length);

describe("Grid", () => {
  it("fits as many columns as the width allows, never wider than the grid", () => {
    const grid = render(<Grid min="md" gap="lg" />).firstElementChild!;
    expect(declarationsOf(grid)).toMatchObject({
      display: "grid",
      gap: vars.space.lg,
      "grid-template-columns": `repeat(${repeatMode}, minmax(min(${minTrack}, 100%), 1fr))`,
    });
  });

  it("uses the column size it is given as the minimum track", () => {
    const grid = render(<Grid min="card" />).firstElementChild!;
    const declarations = declarationsOf(grid);
    expect(declarations[propertyName(minTrack)]).toBe(vars.size.column.card);
    expect(declarations[propertyName(repeatMode)]).toBe("auto-fit");
  });

  it("can keep empty tracks with auto-fill", () => {
    const grid = render(<Grid min="md" repeat="fill" />).firstElementChild!;
    expect(declarationsOf(grid)[propertyName(repeatMode)]).toBe("auto-fill");
  });

  it("renders the element named by `as`, forwarding ref and className", () => {
    const ref = createRef<HTMLElement>();
    const grid = render(
      <Grid min="md" as="ul" ref={ref} className="extra" />,
    ).firstElementChild!;
    expect(grid.tagName).toBe("UL");
    expect(ref.current).toBe(grid);
    expect(grid.classList).toContain("extra");
  });
});
