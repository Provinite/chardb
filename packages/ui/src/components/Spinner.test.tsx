import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { reducedMotionQuery } from "../css/media";
import { vars } from "../theme/contract.css";
import { Spinner } from "./Spinner";

const spinnerIn = (container: Element) => container.firstElementChild!;

describe("Spinner", () => {
  it("is hidden from screen readers, which hear the control's busy state instead", () => {
    const spinner = spinnerIn(render(<Spinner />));
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
  });

  it("forwards className", () => {
    const spinner = spinnerIn(render(<Spinner className="extra" />));
    expect(spinner.classList.contains("extra")).toBe(true);
  });

  it("is as tall as the text and drawn in the text's colour", () => {
    const declarations = declarationsOf(spinnerIn(render(<Spinner />)));
    expect(declarations).toMatchObject({
      "inline-size": vars.size.spinner,
      "block-size": vars.size.spinner,
      "border-radius": vars.radius.full,
    });
    expect(declarations.border).toContain("currentColor");
  });

  it("spins forever as an essential loop, which reduced motion slows but never stops", () => {
    const spinner = spinnerIn(render(<Spinner />));
    expect(declarationsOf(spinner)).toMatchObject({
      "animation-duration": vars.motion.duration.essential,
      "animation-iteration-count": "infinite",
    });
    expect(
      declarationsOf(spinner, [`@media ${reducedMotionQuery}`]),
    ).not.toHaveProperty("animation-name");
  });
});
