import { act, useRef } from "react";
import { describe, expect, it } from "vitest";
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

let seen: Placement | null = null;
let anchorEl: HTMLElement | null = null;

function Probe({ open }: { open: boolean }) {
  const anchor = useRef<HTMLButtonElement | null>(null);
  const floating = useRef<HTMLDivElement | null>(null);
  seen = useAnchoredPosition(anchor, floating, open, {
    side: "bottom",
    align: "start",
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
  it("is nothing while closed", () => {
    render(<Probe open={false} />);

    expect(seen).toBeNull();
  });

  it("places it beside its anchor once open", () => {
    render(<Probe open />);

    expect(seen).toMatchObject({ top: 148, left: 100, side: "bottom" });
  });

  it("follows the anchor when the page scrolls", () => {
    render(<Probe open />);

    boxed(anchorEl!, { top: 60, left: 100, width: 100, height: 40 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(seen).toMatchObject({ top: 108 });
  });

  it("follows the anchor when the window resizes", () => {
    render(<Probe open />);

    boxed(anchorEl!, { top: 200, left: 100, width: 100, height: 40 });
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    expect(seen).toMatchObject({ top: 248 });
  });
});
