import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { mount, render } from "../__tests__/render";
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

  it("floats along the top of the viewport, clear of the safe area, above the page", () => {
    const bar = barIn(render(<TopProgressBar active label="Loading" />))!;
    expect(declarationsOf(bar)).toMatchObject({
      position: "fixed",
      "inset-block-start": "env(safe-area-inset-top, 0)",
      "inset-inline": "0",
      "z-index": vars.layer.sticky.base,
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

    // A live region announces each change to its text, so the count of
    // changes is the count of announcements. One region for the component's
    // whole life: a region that mounts holding text is often not read.
    it("announces the label exactly once each time the bar appears", () => {
      const bar = (active: boolean, className?: string) => (
        <TopProgressBar
          active={active}
          label="Loading page"
          className={className}
        />
      );
      const { container, rerender } = mount(bar(false));
      const status = statusIn(container)!;
      const observer = new MutationObserver(() => {});
      observer.observe(status, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      /** How many times the region changed since the last call. */
      const changes = () => observer.takeRecords().length;

      rerender(bar(true));
      expect(changes()).toBe(1);
      expect(status.textContent).toBe("Loading page");

      // Rendering again while the bar shows says nothing more.
      rerender(bar(true, "restyled"));
      expect(changes()).toBe(0);

      // Hiding empties the region, which is not read out.
      rerender(bar(false));
      expect(changes()).toBe(1);
      expect(status.textContent).toBe("");

      // The next navigation is announced again, from the same region.
      rerender(bar(true));
      expect(changes()).toBe(1);
      expect(status.textContent).toBe("Loading page");
      expect(statusIn(container)).toBe(status);

      observer.disconnect();
    });
  });
});
