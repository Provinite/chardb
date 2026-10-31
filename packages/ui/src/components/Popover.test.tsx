import React, { act, createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "../__tests__/render";
import { Dialog, Popover } from ".";

const key = (
  key: string,
  init: KeyboardEventInit = {},
  target: Element = document.activeElement!,
) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
      }),
    );
  });

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
  });

const mousedown = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });

const renderPopover = () => {
  const container = render(
    <>
      <button type="button">Before</button>
      <Popover.Root side="bottom" align="center">
        <Popover.Trigger>
          <button type="button">Lighting</button>
        </Popover.Trigger>
        <Popover.Panel aria-label="Lighting">
          <input aria-label="First" />
          <input aria-label="Last" />
        </Popover.Panel>
      </Popover.Root>
      <button type="button">After</button>
      <p>Outside</p>
    </>,
  );
  const [, trigger, after] = container.querySelectorAll("button");
  return { container, trigger, after };
};

const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
const field = (name: string) =>
  document.querySelector<HTMLElement>(`[aria-label="${name}"]`)!;

const openIt = () => {
  const parts = renderPopover();
  act(() => parts.trigger.focus());
  click(parts.trigger);
  return parts;
};

describe("Popover", () => {
  it("is closed to start, and its trigger says what it opens", () => {
    const { trigger } = renderPopover();

    expect(panel()).toBeNull();
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens as a named dialog its trigger controls, outside the page tree", () => {
    const { container, trigger } = openIt();

    expect(panel()?.getAttribute("aria-label")).toBe("Lighting");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(panel()!.id);
    expect(container.contains(panel())).toBe(false);
  });

  it("closes from its trigger", () => {
    const { trigger } = openIt();

    click(trigger);

    expect(panel()).toBeNull();
  });

  it("moves focus to the panel's first control", () => {
    openIt();

    expect(document.activeElement).toBe(field("First"));
  });

  it("closes on Escape and hands focus back to its trigger", () => {
    const { trigger } = openIt();

    key("Escape");

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape with focus still on its trigger", () => {
    const { trigger } = openIt();
    act(() => trigger.focus());

    key("Escape");

    expect(panel()).toBeNull();
  });

  it("leaves an Escape something inside already handled", () => {
    openIt();
    field("First").addEventListener("keydown", (e) => e.preventDefault());

    key("Escape");

    expect(panel()).not.toBeNull();
  });

  it("closes on a press outside it, not on one inside", () => {
    const { container } = openIt();

    mousedown(field("Last"));
    expect(panel()).not.toBeNull();

    mousedown(container.querySelector("p")!);
    expect(panel()).toBeNull();
  });

  it("goes back to its trigger on Shift+Tab from the first control", () => {
    const { trigger } = openIt();

    key("Tab", { shiftKey: true });

    expect(document.activeElement).toBe(trigger);
    expect(panel()).not.toBeNull();
  });

  it("closes on Tab from the last control, carrying on past its trigger", () => {
    const { after } = openIt();
    act(() => field("Last").focus());

    key("Tab");

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(after);
  });

  it("closes on Escape without closing a dialog it sits in", () => {
    const onDialogClose = vi.fn();
    render(
      <Dialog.Root open onClose={onDialogClose} aria-label="Settings">
        <Popover.Root>
          <Popover.Trigger>
            <button type="button">Lighting</button>
          </Popover.Trigger>
          <Popover.Panel aria-label="Lighting">
            <input aria-label="First" />
          </Popover.Panel>
        </Popover.Root>
      </Dialog.Root>,
    );
    click(document.querySelector("dialog button")!);
    expect(document.activeElement).toBe(field("First"));

    key("Escape");

    expect(panel()).toBeNull();
    expect(onDialogClose).not.toHaveBeenCalled();
  });

  it("keeps a ref already on its trigger's button", () => {
    const ref = createRef<HTMLButtonElement>();
    const container = render(
      <Popover.Root>
        <Popover.Trigger>
          <button type="button" ref={ref}>
            Lighting
          </button>
        </Popover.Trigger>
        <Popover.Panel aria-label="Lighting">x</Popover.Panel>
      </Popover.Root>,
    );

    expect(ref.current).toBe(container.querySelector("button"));
  });

  it("does not re-render its trigger as the page scrolls", () => {
    let renders = 0;
    const Counted = React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >(function Counted(props, ref) {
      renders++;
      return <button type="button" ref={ref} {...props} />;
    });
    const container = render(
      <Popover.Root>
        <Popover.Trigger>
          <Counted>Lighting</Counted>
        </Popover.Trigger>
        <Popover.Panel aria-label="Lighting">
          <input aria-label="First" />
        </Popover.Panel>
      </Popover.Root>,
    );
    click(container.querySelector("button")!);
    const before = renders;

    act(() => {
      container.querySelector("button")!.getBoundingClientRect = () =>
        ({
          top: 50,
          left: 0,
          width: 80,
          height: 30,
          right: 80,
          bottom: 80,
          x: 0,
          y: 50,
          toJSON: () => ({}),
        }) as DOMRect;
      window.dispatchEvent(new Event("scroll"));
    });

    expect(renders).toBe(before);
  });

  it("points an arrow at its trigger", () => {
    openIt();

    expect(panel()!.querySelector("[data-popover-arrow]")).not.toBeNull();
  });
});
