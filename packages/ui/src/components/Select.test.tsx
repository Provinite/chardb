import React, { act, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { mount, render } from "../__tests__/render";
import { Dialog, Select } from ".";

// jsdom lays nothing out, so it has no scrollIntoView.
Element.prototype.scrollIntoView = () => {};

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

const combobox = () =>
  document.querySelector<HTMLButtonElement>('[role="combobox"]')!;
const listbox = () => document.querySelector('[role="listbox"]');
const options = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
const active = () => {
  const id = combobox().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};

function Rarity({
  onChange = () => {},
  initial = "",
}: {
  onChange?: (value: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <span id="rarity-label">Rarity</span>
      <Select.Root
        aria-labelledby="rarity-label"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      >
        <Select.Option value="">Select rarity...</Select.Option>
        <Select.Option value="common">
          <i data-swatch="green" />
          Common
        </Select.Option>
        <Select.Option value="uncommon" textValue="Uncommon">
          <i data-swatch="blue" />
          Uncommon
        </Select.Option>
        <Select.Option value="rare">Rare</Select.Option>
      </Select.Root>
    </>
  );
}

describe("Select", () => {
  it("is a select-only combobox named by its label", () => {
    render(<Rarity />);

    expect(combobox().tagName).toBe("BUTTON");
    expect(combobox().getAttribute("aria-labelledby")).toContain(
      "rarity-label",
    );
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
    expect(combobox().textContent).toBe("Select rarity...");
    expect(listbox()).toBeNull();
  });

  it("shows the chosen option's whole content, swatch and all", () => {
    render(<Rarity initial="common" />);

    expect(combobox().textContent).toBe("Common");
    expect(combobox().querySelector('[data-swatch="green"]')).not.toBeNull();
  });

  it("opens on click and picks the option clicked", () => {
    const onChange = vi.fn();
    render(<Rarity onChange={onChange} />);

    click(combobox());
    expect(combobox().getAttribute("aria-expanded")).toBe("true");
    expect(options().map((o) => o.textContent)).toEqual([
      "Select rarity...",
      "Common",
      "Uncommon",
      "Rare",
    ]);

    click(options()[2]);

    expect(onChange).toHaveBeenCalledWith("uncommon");
    expect(listbox()).toBeNull();
    expect(combobox().textContent).toBe("Uncommon");
    expect(document.activeElement).toBe(combobox());
  });

  it("marks the chosen option selected and starts there when opened", () => {
    render(<Rarity initial="uncommon" />);

    key("ArrowDown", {}, combobox());

    expect(options().map((o) => o.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    expect(active()?.textContent).toBe("Uncommon");
  });

  it("moves with the arrow keys, Home and End, and picks with Enter", () => {
    const onChange = vi.fn();
    render(<Rarity onChange={onChange} />);
    act(() => combobox().focus());

    key("ArrowDown");
    expect(active()?.textContent).toBe("Select rarity...");
    key("ArrowDown");
    key("ArrowDown");
    expect(active()?.textContent).toBe("Uncommon");
    key("ArrowUp");
    expect(active()?.textContent).toBe("Common");
    key("End");
    expect(active()?.textContent).toBe("Rare");
    key("ArrowDown");
    expect(active()?.textContent).toBe("Rare");
    key("Home");
    key("ArrowDown");

    key("Enter");

    expect(onChange).toHaveBeenCalledWith("common");
    expect(listbox()).toBeNull();
  });

  it("jumps to the option a typed letter starts", () => {
    render(<Rarity />);
    act(() => combobox().focus());

    key("u");

    expect(combobox().getAttribute("aria-expanded")).toBe("true");
    expect(active()?.textContent).toBe("Uncommon");
  });

  it("closes on Escape without choosing, and keeps a dialog around it open", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <Dialog.Root open onClose={onClose} aria-label="Edit">
        <Dialog.Body>
          <Rarity onChange={onChange} />
        </Dialog.Body>
      </Dialog.Root>,
    );
    act(() => combobox().focus());

    key("ArrowDown");
    key("ArrowDown");
    key("Escape");

    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when something outside is pressed", () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <Rarity />
      </>,
    );

    click(combobox());
    mousedown(document.querySelector("button:not([role])")!);

    expect(listbox()).toBeNull();
  });

  it("closes its list when it turns disabled while open", () => {
    const onChange = vi.fn();
    const box = (disabled: boolean) => (
      <Select.Root
        aria-label="Rarity"
        value=""
        onChange={onChange}
        disabled={disabled}
      >
        <Select.Option value="">None</Select.Option>
        <Select.Option value="rare">Rare</Select.Option>
      </Select.Root>
    );
    const { rerender } = mount(box(false));

    click(combobox());
    expect(listbox()).not.toBeNull();
    rerender(box(true));

    expect(listbox()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("still calls an option's own click handler", () => {
    const onClick = vi.fn();
    mount(
      <Select.Root aria-label="Rarity" value="" onChange={() => {}}>
        <Select.Option value="">None</Select.Option>
        <Select.Option value="rare" onClick={onClick}>
          Rare
        </Select.Option>
      </Select.Root>,
    );

    click(combobox());
    click(options()[1]);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does nothing while disabled", () => {
    mount(
      <Select.Root aria-label="Rarity" value="" onChange={() => {}} disabled>
        <Select.Option value="">None</Select.Option>
      </Select.Root>,
    );

    click(combobox());

    expect(combobox().disabled).toBe(true);
    expect(listbox()).toBeNull();
  });
});
