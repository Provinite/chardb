import { act, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "../__tests__/render";
import { Dialog } from ".";

const press = (key: string, target: Element = document.activeElement!) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });

const click = (el: Element) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
  });

const dialogs = () => [...document.querySelectorAll("dialog")];

/** A button that opens a dialog, as the app's triggers do. */
function Harness({
  onClose,
  children,
}: {
  onClose?: () => void;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog.Root
        open={open}
        onClose={() => {
          onClose?.();
          setOpen(false);
        }}
        aria-label="Example"
      >
        {children ?? <input data-autofocus aria-label="Field" />}
      </Dialog.Root>
    </>
  );
}

const openHarness = (props: Parameters<typeof Harness>[0] = {}) => {
  const container = render(<Harness {...props} />);
  const opener = container.querySelector("button")!;
  act(() => opener.focus());
  click(opener);
  return { container, opener };
};

afterEach(() => {
  document.documentElement.className = "";
});

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(
      <Dialog.Root open={false} onClose={() => {}} aria-label="Example">
        body
      </Dialog.Root>,
    );

    expect(dialogs()).toHaveLength(0);
  });

  it("opens as a named modal dialog outside the tree that rendered it", () => {
    const { container } = openHarness();

    const [dialog] = dialogs();
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Example");
    expect(container.contains(dialog)).toBe(false);
  });

  it("names itself after its title", () => {
    render(
      <Dialog.Root open onClose={() => {}}>
        <Dialog.Title>Name your board</Dialog.Title>
      </Dialog.Root>,
    );

    const [dialog] = dialogs();
    const title = dialog.querySelector("h2")!;
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.textContent).toBe("Name your board");
  });

  it("makes the rest of the page inert while open, and only that", () => {
    const already = document.createElement("div");
    already.setAttribute("inert", "");
    document.body.append(already);
    const { container } = openHarness();

    expect(container.hasAttribute("inert")).toBe(true);
    expect(dialogs()[0].closest("[inert]")).toBeNull();

    press("Escape");

    expect(container.hasAttribute("inert")).toBe(false);
    // Set by someone else, so not this dialog's to clear.
    expect(already.hasAttribute("inert")).toBe(true);
    already.remove();
  });

  it("moves focus in on open and back to the opener on close", () => {
    const { opener } = openHarness();

    expect(document.activeElement?.getAttribute("aria-label")).toBe("Field");

    press("Escape");

    expect(document.activeElement).toBe(opener);
  });

  it("focuses itself when nothing inside asks for focus", () => {
    openHarness({ children: <p>Nothing to focus</p> });

    expect(document.activeElement).toBe(dialogs()[0]);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    openHarness({ onClose });

    press("Escape");

    expect(onClose).toHaveBeenCalledOnce();
    expect(dialogs()).toHaveLength(0);
  });

  it("closes on a click on the scrim, not on one inside", () => {
    const onClose = vi.fn();
    openHarness({ onClose });

    click(dialogs()[0].querySelector("input")!);
    expect(onClose).not.toHaveBeenCalled();

    click(document.querySelector("[data-dialog-scrim]")!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("holds the page still while open", () => {
    const root = document.documentElement;
    const before = root.className;
    openHarness();

    expect(root.className).not.toBe(before);

    press("Escape");

    expect(root.className).toBe(before);
  });

  it("leaves an Escape that something inside already handled", () => {
    const onClose = vi.fn();
    openHarness({
      onClose,
      children: (
        <input
          data-autofocus
          aria-label="Field"
          onKeyDown={(e) => {
            if (e.key === "Escape") e.preventDefault();
          }}
        />
      ),
    });

    press("Escape");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("leaves an Escape that cancels composing a character", () => {
    const onClose = vi.fn();
    openHarness({ onClose });

    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          isComposing: true,
        }),
      );
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the page inert when a lower dialog closes under an open one", () => {
    function Stacked() {
      const [lower, setLower] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setLower(false)}>
            Close lower
          </button>
          <Dialog.Root open={lower} onClose={() => {}} aria-label="Lower">
            lower
          </Dialog.Root>
          <Dialog.Root open onClose={() => {}} aria-label="Upper">
            upper
          </Dialog.Root>
        </>
      );
    }
    const container = render(<Stacked />);
    const closeLower = container.querySelector("button")!;

    // The button is inert, so its handler is reached directly.
    act(() => {
      closeLower.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dialogs()).toHaveLength(1);
    expect(container.hasAttribute("inert")).toBe(true);
    expect(dialogs()[0].closest("[inert]")).toBeNull();
  });

  it("closes only the top dialog of a stack on Escape", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    render(
      <>
        <Dialog.Root open onClose={outer} aria-label="Outer">
          <input aria-label="Outer field" />
        </Dialog.Root>
        <Dialog.Root open onClose={inner} aria-label="Inner">
          <input data-autofocus aria-label="Inner field" />
        </Dialog.Root>
      </>,
    );

    press("Escape");

    expect(inner).toHaveBeenCalledOnce();
    expect(outer).not.toHaveBeenCalled();
  });
});
