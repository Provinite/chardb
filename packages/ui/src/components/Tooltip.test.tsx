import React, { act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { declarationsOf } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { timingMs } from "../theme/tokens";
import { Tooltip } from ".";

const pointer = (type: string, el: Element, pointerType = "mouse") =>
  act(() => {
    const e = new MouseEvent(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "pointerType", { value: pointerType });
    el.dispatchEvent(e);
  });

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

const key = (k: string, target: Element = document.activeElement!) => {
  const e = new KeyboardEvent("keydown", {
    key: k,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(e);
  });
  return e;
};

const tip = () => document.querySelector<HTMLElement>("[data-tooltip]");

const renderTooltip = (child?: React.ReactElement) => {
  const container = render(
    <Tooltip label="Copy link">
      {child ?? (
        <button type="button" aria-label="Copy link to Moonlit Board">
          ⧉
        </button>
      )}
    </Tooltip>,
  );
  return { container, button: container.querySelector("button")! };
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Tooltip", () => {
  it("shows after hovering for the delay, not before", () => {
    const { button } = renderTooltip();

    pointer("pointerover", button);
    wait(timingMs.tooltip.delay - 1);
    expect(tip()).toBeNull();

    wait(1);
    expect(tip()?.textContent).toBe("Copy link");
  });

  it("is seen, not heard: hidden from screen readers, outside the page tree", () => {
    const { container, button } = renderTooltip();
    pointer("pointerover", button);
    wait(timingMs.tooltip.delay);

    expect(tip()?.getAttribute("aria-hidden")).toBe("true");
    expect(container.contains(tip())).toBe(false);
    // The button keeps its own name; the tooltip adds no description.
    expect(button.hasAttribute("aria-describedby")).toBe(false);
  });

  it("hides once the pointer has left, after a grace period", () => {
    const { button } = renderTooltip();
    pointer("pointerover", button);
    wait(timingMs.tooltip.delay);

    pointer("pointerout", button);
    wait(timingMs.tooltip.hideDelay - 1);
    expect(tip()).not.toBeNull();

    wait(1);
    expect(tip()).toBeNull();
  });

  it("stays while the pointer moves onto it", () => {
    const { button } = renderTooltip();
    pointer("pointerover", button);
    wait(timingMs.tooltip.delay);

    pointer("pointerout", button);
    pointer("pointerover", tip()!);
    wait(timingMs.tooltip.hideDelay * 2);

    expect(tip()).not.toBeNull();
  });

  it("never shows for a pointer that only passes over", () => {
    const { button } = renderTooltip();

    pointer("pointerover", button);
    wait(timingMs.tooltip.delay / 2);
    pointer("pointerout", button);
    wait(timingMs.tooltip.delay);

    expect(tip()).toBeNull();
  });

  it("shows at once on keyboard focus, and hides on blur", () => {
    const { button } = renderTooltip();

    act(() => button.focus());
    expect(tip()).not.toBeNull();

    act(() => button.blur());
    expect(tip()).toBeNull();
  });

  it("hides on Escape, which goes no further", () => {
    const { button } = renderTooltip();
    act(() => button.focus());

    const e = key("Escape");

    expect(tip()).toBeNull();
    // A popover or dialog it sits in stays open; a second Escape is theirs.
    expect(e.defaultPrevented).toBe(true);
  });

  it("leaves Escape alone when it is not showing", () => {
    const { button } = renderTooltip();
    pointer("pointerover", button);
    act(() => {
      button.focus({ preventScroll: true });
      button.blur();
    });

    const e = key("Escape", button);

    expect(e.defaultPrevented).toBe(false);
  });

  it("shows on a long press, and swallows the click that ends it", () => {
    const onClick = vi.fn();
    const { button } = renderTooltip(
      <button type="button" aria-label="Copy" onClick={onClick}>
        ⧉
      </button>,
    );

    pointer("pointerdown", button, "touch");
    wait(timingMs.tooltip.longPress);
    expect(tip()).not.toBeNull();

    pointer("pointerup", button, "touch");
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets a quick tap through as an ordinary click", () => {
    const onClick = vi.fn();
    const { button } = renderTooltip(
      <button type="button" aria-label="Copy" onClick={onClick}>
        ⧉
      </button>,
    );

    pointer("pointerdown", button, "touch");
    wait(timingMs.tooltip.longPress / 2);
    pointer("pointerup", button, "touch");
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(tip()).toBeNull();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not show on hover for a touch pointer", () => {
    const { button } = renderTooltip();

    pointer("pointerover", button, "touch");
    wait(timingMs.tooltip.delay);

    expect(tip()).toBeNull();
  });

  it("keeps a ref and handlers already on its child", () => {
    const ref = createRef<HTMLButtonElement>();
    const onFocus = vi.fn();
    const { button } = renderTooltip(
      <button type="button" aria-label="Copy" ref={ref} onFocus={onFocus}>
        ⧉
      </button>,
    );

    act(() => button.focus());

    expect(ref.current).toBe(button);
    expect(onFocus).toHaveBeenCalled();
  });

  it("draws above dialogs, since it names controls inside them", () => {
    const { button } = renderTooltip();
    act(() => button.focus());

    expect(declarationsOf(tip()!)["z-index"]).toBe(vars.layer.modal[100]);
  });
});
