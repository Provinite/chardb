import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
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
