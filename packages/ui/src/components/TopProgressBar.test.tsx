import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { TopProgressBar } from "./TopProgressBar";

describe("TopProgressBar", () => {
  it("is an indeterminate progress bar named by its caller while active", () => {
    const bar = render(
      <TopProgressBar active label="Loading page" />,
    ).firstElementChild!;
    expect(bar.getAttribute("role")).toBe("progressbar");
    expect(bar.getAttribute("aria-label")).toBe("Loading page");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
  });

  it("renders nothing while inactive", () => {
    const container = render(
      <TopProgressBar active={false} label="Loading page" />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it("forwards its ref and className", () => {
    const ref = createRef<HTMLDivElement>();
    const bar = render(
      <TopProgressBar ref={ref} active label="Loading" className="extra" />,
    ).firstElementChild!;
    expect(ref.current).toBe(bar);
    expect(bar.classList.contains("extra")).toBe(true);
  });

  it("floats along the top of the viewport, above the navigation drawer", () => {
    const bar = render(
      <TopProgressBar active label="Loading" />,
    ).firstElementChild!;
    expect(declarationsOf(bar)).toMatchObject({
      position: "fixed",
      "inset-block-start": "0",
      "inset-inline": "0",
      "z-index": vars.layer.overlay[100],
      "pointer-events": "none",
    });
  });

  it("draws its indicator as a border, so forced colours keep it, on an essential loop", () => {
    const indicator = render(<TopProgressBar active label="Loading" />)
      .firstElementChild!.firstElementChild!;
    expect(declarationsOf(indicator)).toMatchObject({
      "border-block-start": `${vars.borderWidth.thick} solid ${vars.action.primary.bg}`,
      "animation-duration": vars.motion.duration.essential,
      "animation-iteration-count": "infinite",
    });
  });
});
