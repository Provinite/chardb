import { describe, it, expect, vi } from "vitest";
import { useLayoutEffect, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { ConfirmDialog } from "../ConfirmDialog";

const renderDialog = (onConfirm = vi.fn()) => {
  const Harness = () => {
    const [open, setOpen] = useState(true);
    return (
      <ThemeProvider theme={lightTheme}>
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
      </ThemeProvider>
    );
  };
  render(<Harness />);
};

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
        <ThemeProvider theme={lightTheme}>
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
        </ThemeProvider>
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
    const Harness = () => (
      <ThemeProvider theme={lightTheme}>
        <ConfirmDialog
          open
          title="Delete?"
          confirmLabel="Remove"
          confirmPhrase=" Ember  Wisp "
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        >
          body
        </ConfirmDialog>
      </ThemeProvider>
    );
    render(<Harness />);

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
      <ThemeProvider theme={lightTheme}>
        <ConfirmDialog
          open
          title="Remove 2 MYO Tickets?"
          confirmLabel="Remove"
          confirmDisabled
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();

    rerender(
      <ThemeProvider theme={lightTheme}>
        <ConfirmDialog
          open
          title="Remove 2 MYO Tickets?"
          confirmLabel="Remove"
          confirmDisabled={false}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Remove" })).toBeEnabled();
  });
});
