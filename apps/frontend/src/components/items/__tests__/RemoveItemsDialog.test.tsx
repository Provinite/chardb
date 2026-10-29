/**
 * Staff removing some of a holder's items of one type, from their inventory
 * or a pending holder's page (#445, #169).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { RemoveItemsDialog } from "../RemoveItemsDialog";

vi.mock("react-hot-toast", () => {
  const toast = { success: vi.fn(), error: vi.fn() };
  return { default: toast, toast };
});

type Sent = { itemIds: string[]; reason: string; staffNote?: string | null };

const recordingLink = (sent: Sent[]) =>
  new ApolloLink(
    (operation) =>
      new Observable((observer) => {
        sent.push(operation.variables as Sent);
        observer.next({
          data: { revokeItems: (sent.at(-1)?.itemIds ?? []).length },
        });
        observer.complete();
      }),
  );

const renderDialog = (sent: Sent[], onRemoved = vi.fn()) =>
  render(
    <MockedProvider link={recordingLink(sent)}>
      <ThemeProvider theme={lightTheme}>
        <RemoveItemsDialog
          open
          itemTypeName="MYO Ticket"
          itemIds={["oldest", "middle", "newest"]}
          holderLabel="Neo the Baka (@neo.baka)"
          onClose={vi.fn()}
          onRemoved={onRemoved}
        />
      </ThemeProvider>
    </MockedProvider>,
  );

const confirm = () => screen.getByRole("button", { name: /^Remove/ });

describe("RemoveItemsDialog", () => {
  it("needs a reason before it will remove anything", async () => {
    renderDialog([]);

    expect(confirm()).toBeDisabled();
    await userEvent.type(
      screen.getByLabelText(/Reason/),
      "Spent off-site in the 2025 event",
    );
    expect(confirm()).toBeEnabled();
  });

  it("removes as many as asked for, oldest first, with the reason and note", async () => {
    const sent: Sent[] = [];
    const onRemoved = vi.fn();
    renderDialog(sent, onRemoved);

    const howMany = screen.getByLabelText(/How many/);
    await userEvent.clear(howMany);
    await userEvent.type(howMany, "2");
    await userEvent.type(
      screen.getByLabelText(/Reason/),
      "Spent off-site in the 2025 event",
    );
    await userEvent.type(
      screen.getByLabelText(/Staff note/),
      "Per Neo's sheet",
    );
    expect(confirm()).toHaveTextContent("Remove 2");
    await userEvent.click(confirm());

    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(sent).toEqual([
      {
        itemIds: ["oldest", "middle"],
        reason: "Spent off-site in the 2025 event",
        staffNote: "Per Neo's sheet",
      },
    ]);
  });

  it("will not remove more than the holder has, or none", async () => {
    renderDialog([]);
    await userEvent.type(screen.getByLabelText(/Reason/), "Spent");

    const howMany = screen.getByLabelText(/How many/);
    await userEvent.clear(howMany);
    await userEvent.type(howMany, "4");
    expect(confirm()).toBeDisabled();

    await userEvent.clear(howMany);
    await userEvent.type(howMany, "0");
    expect(confirm()).toBeDisabled();
  });
});
