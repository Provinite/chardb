import React, { act, useState } from "react";
import { ThemeProvider } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "../__tests__/render";
import { lightTheme } from "../theme";
import {
  Dialog,
  Menu,
  MenuItem,
  Popover,
  SearchSelect,
  TagInput,
  Toggletip,
  Tooltip,
  UserTypeahead,
  type SearchSelectOption,
} from ".";

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
  });

const mousedown = (el: Element) =>
  act(() => {
    el.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
    );
  });

const focus = (el: HTMLElement) => act(() => el.focus());

const type = (input: HTMLInputElement, text: string) =>
  act(() => {
    // React tracks the value itself; setting it through the prototype is
    // what makes it see a change.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

const press = (key: string) =>
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });

const wisp: SearchSelectOption = { id: "ch-1", name: "Pumpkin Wisp" };
const ghost = { id: "u-1", username: "ghost" };

/** The user typeahead's result for `ghost`, and so its list's only option. */
const ghostOption = () =>
  [...document.querySelectorAll("button")].find(
    // After the avatar's initial.
    (b) => b.textContent?.endsWith("ghost"),
  ) ?? null;
const userList = () => ghostOption()?.parentElement ?? null;

/** Each overlay, with how to open it and how to find what it opened. */
const overlays: {
  name: string;
  ui: React.ReactNode;
  open: () => void;
  find: () => HTMLElement | null;
}[] = [
  {
    name: "a popover",
    ui: (
      <Popover.Root>
        <Popover.Trigger>
          <button type="button">Lighting</button>
        </Popover.Trigger>
        <Popover.Panel aria-label="Lighting">
          <input aria-label="Glow" />
        </Popover.Panel>
      </Popover.Root>
    ),
    open: () => click(document.querySelector("button[aria-haspopup]")!),
    find: () =>
      document.querySelector('[role="dialog"][aria-label="Lighting"]'),
  },
  {
    name: "a menu",
    ui: (
      <Menu label="More actions">
        <MenuItem onSelect={() => {}}>Rename</MenuItem>
      </Menu>
    ),
    open: () => click(document.querySelector('[aria-label="More actions"]')!),
    find: () => document.querySelector('[role="menu"]'),
  },
  {
    name: "a tooltip",
    ui: (
      <Tooltip label="Delete">
        <button type="button" aria-label="Delete">
          x
        </button>
      </Tooltip>
    ),
    open: () => {
      const button = document.querySelector<HTMLElement>(
        'button[aria-label="Delete"]',
      )!;
      // Shown on keyboard focus only; jsdom matches :focus-visible on any.
      focus(button);
    },
    find: () => document.querySelector("[data-tooltip]"),
  },
  {
    name: "a toggletip",
    ui: <Toggletip label="About lighting">Drag the light</Toggletip>,
    open: () => click(document.querySelector('[aria-label="About lighting"]')!),
    find: () => document.querySelector("[data-toggletip-bubble]"),
  },
  {
    name: "a search select's list",
    ui: (
      <SearchSelect
        label="Character"
        value={null}
        options={[wisp]}
        onChange={() => {}}
        onSearch={() => {}}
      />
    ),
    open: () => focus(document.querySelector('[role="combobox"]')!),
    find: () => document.querySelector('[role="listbox"]'),
  },
  {
    name: "a user typeahead's list",
    ui: (
      <UserTypeahead
        value={null}
        users={[ghost]}
        onChange={() => {}}
        onSearch={() => {}}
      />
    ),
    open: () => {
      const input = document.querySelector<HTMLInputElement>(
        '[aria-label="Search for user"]',
      )!;
      focus(input);
      type(input, "gh");
    },
    find: userList,
  },
  {
    name: "a tag input's suggestions",
    ui: (
      <TagInput
        value={[]}
        onChange={() => {}}
        suggestions={[{ id: "t-1", name: "forest" }]}
      />
    ),
    open: () => focus(document.querySelector('[aria-label="Add tags"]')!),
    find: () =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent === "forest",
      )?.parentElement ?? null,
  },
];

const themed = (ui: React.ReactNode) => (
  <ThemeProvider theme={lightTheme}>{ui}</ThemeProvider>
);

describe("Portal container", () => {
  for (const overlay of overlays) {
    it(`renders ${overlay.name} into the body outside any dialog`, () => {
      render(themed(overlay.ui));
      overlay.open();

      const el = overlay.find();
      expect(el).not.toBeNull();
      expect(el!.parentElement).toBe(document.body);
    });

    it(`renders ${overlay.name} inside the dialog it was opened from`, () => {
      render(
        themed(
          <Dialog.Root open onClose={() => {}} aria-label="Settings">
            {overlay.ui}
          </Dialog.Root>,
        ),
      );
      overlay.open();

      const el = overlay.find();
      const layer = document.querySelector("dialog")!.parentElement!;
      expect(el).not.toBeNull();
      // Beside the dialog in its layer, not inside the `<dialog>`, whose
      // `overflow: hidden` would clip it.
      expect(el!.parentElement).toBe(layer);
      expect(el!.closest("[inert]")).toBeNull();
    });
  }

  it("picks a search select option pressed in its list", () => {
    const onChange = vi.fn();
    render(
      themed(
        <SearchSelect
          label="Character"
          value={null}
          options={[wisp]}
          onChange={onChange}
          onSearch={() => {}}
          minSearchLength={0}
        />,
      ),
    );
    focus(document.querySelector('[role="combobox"]')!);

    mousedown(document.querySelector('[role="option"]')!);

    expect(onChange).toHaveBeenCalledWith(wisp);
  });

  it("picks a user pressed in a user typeahead's list", () => {
    const onChange = vi.fn();
    render(
      themed(
        <UserTypeahead
          value={null}
          users={[ghost]}
          onChange={onChange}
          onSearch={() => {}}
        />,
      ),
    );
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Search for user"]',
    )!;
    focus(input);
    type(input, "gh");
    const option = ghostOption()!;

    // As a browser does: the press, then the click.
    mousedown(option);
    click(option);

    expect(onChange).toHaveBeenCalledWith("u-1", ghost);
  });

  it("closes a typeahead's list on Escape without closing its dialog", () => {
    function Harness() {
      const [open, setOpen] = useState(true);
      return themed(
        <Dialog.Root
          open={open}
          onClose={() => setOpen(false)}
          aria-label="Grant"
        >
          <SearchSelect
            label="Character"
            value={null}
            options={[wisp]}
            onChange={() => {}}
            onSearch={() => {}}
          />
          <UserTypeahead
            value={null}
            users={[ghost]}
            onChange={() => {}}
            onSearch={() => {}}
          />
        </Dialog.Root>,
      );
    }
    render(<Harness />);

    focus(document.querySelector('[role="combobox"]')!);
    press("Escape");
    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(document.querySelector("dialog")).not.toBeNull();

    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Search for user"]',
    )!;
    focus(input);
    type(input, "gh");
    press("Escape");
    expect(userList()).toBeNull();
    expect(document.querySelector("dialog")).not.toBeNull();
  });

  it("keeps a popover open for a pick from a typeahead inside it", () => {
    const onChange = vi.fn();
    render(
      themed(
        <Popover.Root>
          <Popover.Trigger>
            <button type="button">Recipient</button>
          </Popover.Trigger>
          <Popover.Panel aria-label="Recipient">
            <UserTypeahead
              value={null}
              users={[ghost]}
              onChange={onChange}
              onSearch={() => {}}
            />
          </Popover.Panel>
        </Popover.Root>,
      ),
    );
    click(document.querySelector("button[aria-haspopup]")!);
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Search for user"]',
    )!;
    type(input, "gh");
    const option = ghostOption()!;
    // Portalled out of the panel, but inside it in the component tree.
    expect(document.querySelector('[role="dialog"]')!.contains(option)).toBe(
      false,
    );

    mousedown(option);
    click(option);

    expect(onChange).toHaveBeenCalledWith("u-1", ghost);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("keeps a popover open for a press in a menu inside it", () => {
    render(
      themed(
        <Popover.Root>
          <Popover.Trigger>
            <button type="button">Options</button>
          </Popover.Trigger>
          <Popover.Panel aria-label="Options">
            <Menu label="More actions">
              <MenuItem onSelect={() => {}}>Rename</MenuItem>
            </Menu>
          </Popover.Panel>
        </Popover.Root>,
      ),
    );
    click(document.querySelector("button[aria-haspopup]")!);
    click(document.querySelector('[aria-label="More actions"]')!);

    mousedown(document.querySelector('[role="menuitem"]')!);

    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("still closes a popover on a press outside it", () => {
    render(
      <>
        <p>Outside</p>
        <Popover.Root>
          <Popover.Trigger>
            <button type="button">Options</button>
          </Popover.Trigger>
          <Popover.Panel aria-label="Options">
            <input aria-label="Field" />
          </Popover.Panel>
        </Popover.Root>
      </>,
    );
    click(document.querySelector("button[aria-haspopup]")!);

    mousedown(document.querySelector("p")!);

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});

describe("Typeahead list width", () => {
  /** A ResizeObserver that reports whatever size a test gives it. */
  const observers: {
    callback: ResizeObserverCallback;
    targets: Element[];
  }[] = [];
  class FakeResizeObserver {
    private entry: { callback: ResizeObserverCallback; targets: Element[] };
    constructor(callback: ResizeObserverCallback) {
      this.entry = { callback, targets: [] };
      observers.push(this.entry);
    }
    observe(el: Element) {
      this.entry.targets.push(el);
    }
    unobserve() {}
    disconnect() {
      this.entry.targets = [];
    }
  }
  const resize = (el: Element, inlineSize: number) =>
    act(() => {
      for (const o of observers) {
        if (!o.targets.includes(el)) continue;
        const entry = {
          target: el,
          borderBoxSize: [{ inlineSize, blockSize: 40 }],
        } as unknown as ResizeObserverEntry;
        o.callback([entry], o as unknown as ResizeObserver);
      }
    });

  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows its input's width, also when only the width changes", () => {
    render(
      themed(
        <SearchSelect
          label="Character"
          value={null}
          options={[wisp]}
          onChange={() => {}}
          onSearch={() => {}}
        />,
      ),
    );
    const input = document.querySelector<HTMLElement>('[role="combobox"]')!;
    focus(input);
    const box = input.parentElement!;
    const list = () => document.querySelector<HTMLElement>('[role="listbox"]')!;

    resize(box, 320);
    expect(list().style.width).toBe("320px");

    resize(box, 305);
    expect(list().style.width).toBe("305px");
  });
});
