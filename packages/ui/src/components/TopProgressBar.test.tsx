import { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { visuallyHidden } from "../styles/visuallyHidden.css";
import { TopProgressBar } from "./TopProgressBar";

const barIn = (container: Element) =>
  container.querySelector('[role="progressbar"]');
const statusIn = (container: Element) =>
  container.querySelector('[role="status"]');

describe("TopProgressBar", () => {
  it("is an indeterminate progress bar named by its caller while active", () => {
    const bar = barIn(render(<TopProgressBar active label="Loading page" />))!;
    expect(bar.getAttribute("aria-label")).toBe("Loading page");
    expect(bar.hasAttribute("aria-valuenow")).toBe(false);
  });

  it("shows no bar while inactive", () => {
    const container = render(
      <TopProgressBar active={false} label="Loading page" />,
    );
    expect(barIn(container)).toBeNull();
  });

  it("forwards its ref and className to the bar", () => {
    const ref = createRef<HTMLDivElement>();
    const bar = barIn(
      render(
        <TopProgressBar ref={ref} active label="Loading" className="extra" />,
      ),
    )!;
    expect(ref.current).toBe(bar);
    expect(bar.classList.contains("extra")).toBe(true);
  });

  it("floats along the top of the viewport, clear of the safe area, above the navigation drawer", () => {
    const bar = barIn(render(<TopProgressBar active label="Loading" />))!;
    expect(declarationsOf(bar)).toMatchObject({
      position: "fixed",
      "inset-block-start": "env(safe-area-inset-top, 0)",
      "inset-inline": "0",
      "z-index": vars.layer.overlay[100],
      "pointer-events": "none",
    });
  });

  it("draws its indicator as a border, so forced colours keep it, on an essential loop", () => {
    const indicator = barIn(
      render(<TopProgressBar active label="Loading" />),
    )!.firstElementChild!;
    expect(declarationsOf(indicator)).toMatchObject({
      "border-block-start": `${vars.borderWidth.thick} solid ${vars.action.primary.bg}`,
      "animation-duration": vars.motion.duration.essential,
      "animation-iteration-count": "infinite",
    });
  });

  describe("for screen readers", () => {
    it("keeps an empty, visually hidden status region while inactive", () => {
      const status = statusIn(
        render(<TopProgressBar active={false} label="Loading page" />),
      )!;
      expect(status.textContent).toBe("");
      expect(status.classList.contains(visuallyHidden)).toBe(true);
    });

    // A live region announces a change to its text. The region stays mounted,
    // so its text changes exactly once each time the bar appears.
    it("puts the label in that region once when the bar appears", () => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const show = (active: boolean) =>
        act(() =>
          root.render(<TopProgressBar active={active} label="Loading page" />),
        );

      show(false);
      const status = statusIn(container)!;
      show(true);
      expect(statusIn(container)).toBe(status);
      expect(status.textContent).toBe("Loading page");
      show(false);
      expect(status.textContent).toBe("");

      act(() => root.unmount());
      container.remove();
    });
  });
});
