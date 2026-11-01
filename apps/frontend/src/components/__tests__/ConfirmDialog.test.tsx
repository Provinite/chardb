import { describe, it, expect, vi } from "vitest";
import { useLayoutEffect, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../ConfirmDialog";

const renderDialog = (onConfirm = vi.fn()) => {
  const Harness = () => {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          reopen
        </button>
        <ConfirmDialog
          open={open}
          title='Remove "Pinefall" from its species?'
          confirmLabel="Remove"
          destructive
          confirmPhrase="Pinefall"
          onConfirm={onConfirm}
          onCancel={() => setOpen(false)}
        >
          Its traits become custom fields.
        </ConfirmDialog>
      </>
    );
  };
  render(<Harness />);
};

describe("ConfirmDialog", () => {
  it("is a dialog named by its title, carrying its test id", () => {
    render(
      <ConfirmDialog
        open
        title="Refund this purchase?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        testId="refund-dialog"
      />,
    );
    const dialog = screen.getByRole("dialog", {
      name: "Refund this purchase?",
    });
    expect(dialog).toHaveAttribute("data-testid", "refund-dialog");
  });

  it("renders nothing while closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="Refund?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancels on Escape and from the close button, not on the scrim", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Refund?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onCancel).toHaveBeenCalledTimes(2);

    await user.click(document.querySelector("[data-dialog-scrim]")!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("does not cancel while busy, which would hide a request still running", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        busy
        title="Refund?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });

  it("shows busy on the confirm button without changing its label", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        busy
        title="Refund?"
        confirmLabel="Refund"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Refund" });
    expect(confirm).toHaveAttribute("aria-disabled", "true");

    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("starts on Cancel when destructive", () => {
    render(
      <ConfirmDialog
        open
        destructive
        title="Delete?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("starts in the phrase box when there is one", () => {
    renderDialog();
    expect(screen.getByLabelText(/Type Pinefall to confirm/)).toHaveFocus();
  });
});

describe("ConfirmDialog with a confirmPhrase", () => {
  it("keeps confirm disabled until the phrase is typed exactly", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog(onConfirm);

    const confirm = screen.getByRole("button", { name: "Remove" });
    const input = screen.getByLabelText(/Type Pinefall to confirm/);
    expect(confirm).toBeDisabled();

    await user.type(input, "pinefall");
    expect(confirm).toBeDisabled();

    await user.clear(input);
    await user.type(input, "Pinefall");
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("never commits a reopened dialog with confirm enabled by old text", async () => {
    // The dialog stays mounted while closed (a failed delete closes it), so
    // its text must not survive into the first frame of the next opening.
    // A layout effect beside it reads the DOM in that same commit.
    const user = userEvent.setup();
    const seen: boolean[] = [];
    const Probe = ({ open }: { open: boolean }) => {
      useLayoutEffect(() => {
        if (!open) return;
        const button = document.querySelector<HTMLButtonElement>(
          '[data-testid="confirm-accept"]',
        );
        if (button) seen.push(button.disabled);
      }, [open]);
      return null;
    };
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            reopen
          </button>
          <ConfirmDialog
            open={open}
            title="Delete?"
            confirmLabel="Remove"
            confirmPhrase="Pinefall"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          >
            body
          </ConfirmDialog>
          <Probe open={open} />
        </>
      );
    };
    render(<Harness />);

    await user.type(screen.getByLabelText(/Type Pinefall/), "Pinefall");
    await user.click(screen.getByRole("button", { name: "Remove" }));
    seen.length = 0;
    await user.click(screen.getByRole("button", { name: "reopen" }));

    expect(seen).toEqual([true]);
  });

  it("ignores surrounding and repeated whitespace on both sides", async () => {
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Remove"
        confirmPhrase=" Ember  Wisp "
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        body
      </ConfirmDialog>,
    );

    // The label shows the normalised name, which is what gets typed.
    await user.type(
      screen.getByLabelText(/Type Ember Wisp to confirm/),
      "Ember Wisp ",
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();
  });

  it("starts empty again each time it opens", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/Type Pinefall/), "Pinefall");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "reopen" }));

    expect(screen.getByLabelText(/Type Pinefall/)).toHaveValue("");
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
  });
});

describe("ConfirmDialog with confirmDisabled", () => {
  it("holds confirm until the caller's own form is complete (#445)", () => {
    // For a dialog that asks for something in its body, like a reason.
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Remove 2 MYO Tickets?"
        confirmLabel="Remove"
        confirmDisabled
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();

    rerender(
      <ConfirmDialog
        open
        title="Remove 2 MYO Tickets?"
        confirmLabel="Remove"
        confirmDisabled={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();
  });
});
