import { act, useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../__tests__/render";
import { useAnchoredPosition } from "./useAnchoredPosition";
import type { Placement } from "./placeFloating";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** jsdom lays nothing out, so each element reports the box it is given. */
const boxed = (el: HTMLElement, box: Box) => {
  el.getBoundingClientRect = () =>
    ({
      ...box,
      x: box.left,
      y: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      toJSON: () => box,
    }) as DOMRect;
  Object.defineProperty(el, "offsetWidth", {
    configurable: true,
    value: box.width,
  });
  Object.defineProperty(el, "offsetHeight", {
    configurable: true,
    value: box.height,
  });
};

let anchorEl: HTMLElement | null = null;
let renders = 0;

function Probe({
  open,
  apply,
  measure,
}: {
  open: boolean;
  apply: (p: Placement) => void;
  measure?: (el: HTMLElement) => { width: number; height: number };
}) {
  renders++;
  const anchor = useRef<HTMLButtonElement | null>(null);
  const floating = useRef<HTMLDivElement | null>(null);
  useAnchoredPosition(anchor, floating, open, {
    side: "bottom",
    align: "start",
    apply,
    measure,
  });
  return (
    <>
      <button
        ref={(el) => {
          anchor.current = el;
          anchorEl = el;
          if (el) boxed(el, { top: 100, left: 100, width: 100, height: 40 });
        }}
      />
      <div
        ref={(el) => {
          floating.current = el;
          if (el) boxed(el, { top: 0, left: 0, width: 200, height: 100 });
        }}
      />
    </>
  );
}

describe("useAnchoredPosition", () => {
  it("places nothing while closed", () => {
    const apply = vi.fn();
    render(<Probe open={false} apply={apply} />);

    expect(apply).not.toHaveBeenCalled();
  });

  it("places it beside its anchor once open", () => {
    const apply = vi.fn();
    render(<Probe open apply={apply} />);

    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 148, left: 100, side: "bottom" }),
    );
  });

  it("follows the anchor on scroll without re-rendering", () => {
    const apply = vi.fn();
    render(<Probe open apply={apply} />);
    const before = renders;

    boxed(anchorEl!, { top: 60, left: 100, width: 100, height: 40 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 108 }),
    );
    expect(renders).toBe(before);
  });

  it("follows the anchor when the window resizes", () => {
    const apply = vi.fn();
    render(<Probe open apply={apply} />);

    boxed(anchorEl!, { top: 200, left: 100, width: 100, height: 40 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ top: 248 }),
    );
  });

  it("does not re-apply a placement that has not changed", () => {
    const apply = vi.fn();
    render(<Probe open apply={apply} />);
    const calls = apply.mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(apply.mock.calls.length).toBe(calls);
  });

  it("decides by the size it measures, not the size it was capped to", () => {
    const apply = vi.fn();
    // Uncapped it would be 700 tall: too tall for the 612 below the button,
    // so it is capped to that, whatever height the element reports.
    render(
      <Probe
        open
        apply={apply}
        measure={() => ({ width: 200, height: 700 })}
      />,
    );

    expect(apply).toHaveBeenLastCalledWith(
      expect.objectContaining({ maxHeight: 612 }),
    );
  });
});
