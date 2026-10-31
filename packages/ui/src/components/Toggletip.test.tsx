import { act } from "react";
import { describe, expect, it } from "vitest";
import { render } from "../__tests__/render";
import { Popover, Toggletip } from ".";

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
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

const HINT = "Drag the light, or use the arrow keys";

const renderToggletip = () => {
  const container = render(
    <>
      <Toggletip label="How to move the light">{HINT}</Toggletip>
      <p>Elsewhere</p>
    </>,
  );
  return {
    container,
    button: container.querySelector("button")!,
    status: container.querySelector('[role="status"]')!,
  };
};

const bubble = () =>
  document.querySelector<HTMLElement>("[data-toggletip-bubble]");

describe("Toggletip", () => {
  it("is an info button named for what it explains", () => {
    const { button } = renderToggletip();

    expect(button.getAttribute("aria-label")).toBe("How to move the light");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(bubble()).toBeNull();
  });

  it("shows its text on a click, and reads it out", () => {
    const { button, status } = renderToggletip();

    click(button);

    expect(bubble()?.textContent).toBe(HINT);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    // The live region carries the words for screen readers; the bubble is
    // what is seen, so it is not read a second time.
    expect(status.textContent).toBe(HINT);
    expect(bubble()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("starts with an empty live region, so opening it is what is announced", () => {
    const { status } = renderToggletip();

    expect(status.textContent).toBe("");
  });

  it("closes on a second click", () => {
    const { button, status } = renderToggletip();
    click(button);

    click(button);

    expect(bubble()).toBeNull();
    expect(status.textContent).toBe("");
  });

  it("closes on Escape, which goes no further", () => {
    const { button } = renderToggletip();
    act(() => button.focus());
    click(button);

    const e = key("Escape");

    expect(bubble()).toBeNull();
    expect(e.defaultPrevented).toBe(true);
  });

  it("closes on a press elsewhere", () => {
    const { button, container } = renderToggletip();
    click(button);

    act(() => {
      container
        .querySelector("p")!
        .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(bubble()).toBeNull();
  });

  it("closes on Escape without closing a popover it sits in", () => {
    const container = render(
      <Popover.Root>
        <Popover.Trigger>
          <button type="button">Lighting</button>
        </Popover.Trigger>
        <Popover.Panel aria-label="Lighting">
          <Toggletip label="How to move the light">{HINT}</Toggletip>
        </Popover.Panel>
      </Popover.Root>,
    );
    click(container.querySelector("button")!);
    const info = document.querySelector<HTMLElement>(
      '[aria-label="How to move the light"]',
    )!;
    act(() => info.focus());
    click(info);

    key("Escape");

    expect(bubble()).toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });
});
