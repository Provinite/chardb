import { act, useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { declarationsOf, rulesFor } from "../__tests__/emittedCss";
import { render } from "../__tests__/render";
import { vars } from "../theme/contract.css";
import { CommandPalette, Highlight } from ".";

beforeAll(() => {
  // jsdom lays nothing out, so it has no scrolling to do.
  Element.prototype.scrollIntoView = () => {};
});

const press = (key: string, init: KeyboardEventInit = {}) =>
  act(() => {
    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  });

const click = (el: Element, init: MouseEventInit = {}) =>
  act(() => {
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, ...init }),
    );
  });

/** Sets an input's value the way React notices. */
const type = (input: HTMLInputElement, value: string) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

const PAGES = ["Overview", "Inventory", "Members"];

function Harness({
  onClose = () => {},
  onPick = () => {},
}: {
  onClose?: () => void;
  onPick?: (page: string) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = PAGES.filter((p) => p.toLowerCase().includes(query));
  return (
    <CommandPalette.Root open onClose={onClose} aria-label="Search pages">
      <CommandPalette.Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search pages"
      />
      <CommandPalette.List>
        {shown.length > 0 ? (
          <CommandPalette.Group heading="Pages">
            {shown.map((p) => (
              <CommandPalette.Item key={p} onClick={() => onPick(p)}>
                {p}
              </CommandPalette.Item>
            ))}
            <CommandPalette.Item as="a" href="#elsewhere">
              Elsewhere
            </CommandPalette.Item>
          </CommandPalette.Group>
        ) : (
          <CommandPalette.Empty>Nothing found</CommandPalette.Empty>
        )}
      </CommandPalette.List>
    </CommandPalette.Root>
  );
}

const input = () =>
  document.querySelector<HTMLInputElement>('[role="combobox"]')!;
const options = () => [...document.querySelectorAll('[role="option"]')];
const active = () =>
  document.getElementById(input().getAttribute("aria-activedescendant") ?? "");

describe("CommandPalette", () => {
  it("is a focused combobox that controls the list", () => {
    render(<Harness />);

    const box = input();
    const list = document.getElementById(box.getAttribute("aria-controls")!);
    expect(document.activeElement).toBe(box);
    expect(box.getAttribute("aria-expanded")).toBe("true");
    expect(box.getAttribute("aria-label")).toBe("Search pages");
    expect(list?.getAttribute("role")).toBe("listbox");
  });

  it("starts on the first result", () => {
    render(<Harness />);

    expect(active()).toBe(options()[0]);
    expect(options()[0].getAttribute("aria-selected")).toBe("true");
    expect(options()[1].getAttribute("aria-selected")).toBe("false");
  });

  it("moves with the arrow keys, wrapping at the ends", () => {
    render(<Harness />);

    press("ArrowDown");
    expect(active()?.textContent).toBe("Inventory");

    press("ArrowUp");
    press("ArrowUp");
    expect(active()?.textContent).toBe("Elsewhere");

    press("ArrowDown");
    expect(active()?.textContent).toBe("Overview");
  });

  it("picks the active result on Enter", () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);

    press("ArrowDown");
    press("Enter");

    expect(onPick).toHaveBeenCalledWith("Inventory");
  });

  it("ignores Enter that finishes composing a character", () => {
    const onPick = vi.fn();
    render(<Harness onPick={onPick} />);

    press("Enter", { isComposing: true });

    expect(onPick).not.toHaveBeenCalled();
  });

  it("goes back to the first result when the query changes", () => {
    render(<Harness />);
    press("ArrowDown");
    press("ArrowDown");

    type(input(), "e");

    expect(active()).toBe(options()[0]);
  });

  it("shows the empty state, with nothing active, when nothing matches", () => {
    render(<Harness />);

    type(input(), "zzz");

    expect(options()).toHaveLength(0);
    expect(input().hasAttribute("aria-activedescendant")).toBe(false);
    expect(document.body.textContent).toContain("Nothing found");
  });

  it("makes the result under the pointer active", () => {
    render(<Harness />);

    act(() => {
      options()[2].dispatchEvent(
        new MouseEvent("pointermove", { bubbles: true }),
      );
    });

    expect(active()).toBe(options()[2]);
  });

  it("closes when a link is followed, by click or Enter", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const link = options().find((o) => o.textContent === "Elsewhere")!;

    click(link);
    expect(onClose).toHaveBeenCalledTimes(1);

    press("ArrowUp");
    press("Enter");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("stays open for a link opened elsewhere", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const link = options().find((o) => o.textContent === "Elsewhere")!;

    click(link, { ctrlKey: true });
    click(link, { button: 1 });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("stays open for a result that is not a link", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);

    click(options()[0]);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps focus in the box when a result is pressed", () => {
    render(<Harness />);
    const down = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      options()[1].dispatchEvent(down);
    });

    // The browser would otherwise focus the option, and arrow keys and
    // typing would stop reaching the box.
    expect(down.defaultPrevented).toBe(true);
  });

  it("labels each group with its heading", () => {
    render(<Harness />);

    const group = document.querySelector('[role="group"]')!;
    const heading = document.getElementById(
      group.getAttribute("aria-labelledby")!,
    );
    expect(heading?.textContent).toBe("Pages");
  });
});

describe("CommandPalette styles", () => {
  it("holds the list at one height, whatever it shows", () => {
    render(<Harness />);
    const list = document.querySelector('[role="listbox"]')!;

    expect(declarationsOf(list)["block-size"]).toBe(vars.size.dialogList);
  });

  it("fills the selected result with the primary action colours", () => {
    render(<Harness />);
    const selected = rulesFor(options()[0].classList[0]).find((rule) =>
      rule.selector.includes("aria-selected"),
    );

    expect(selected?.declarations).toMatchObject({
      background: vars.action.primary.bg,
      color: vars.action.primary.fg,
    });
  });
});

describe("Highlight", () => {
  const marks = (container: Element) =>
    [...container.querySelectorAll("mark")].map((m) => m.textContent);

  it("marks every match, ignoring case", () => {
    const container = render(<Highlight text="Liked Lists" match="li" />);

    expect(marks(container)).toEqual(["Li", "Li"]);
    expect(container.textContent).toBe("Liked Lists");
  });

  it("marks nothing for an empty match", () => {
    const container = render(<Highlight text="Liked" match="" />);

    expect(marks(container)).toEqual([]);
    expect(container.textContent).toBe("Liked");
  });

  it("treats the match as text, not a pattern", () => {
    const container = render(<Highlight text="a.b (c)" match=".b (" />);

    expect(marks(container)).toEqual([".b ("]);
  });
});
