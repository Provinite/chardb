/**
 * Staff removing some of a holder's items of one type, from their inventory
 * or a pending holder's page (#445, #169).
 */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MockedProvider } from "@apollo/client/testing";
import { ApolloLink, Observable } from "@apollo/client";
import { ThemeProvider } from "styled-components";
import { lightTheme } from "@chardb/ui";
import { ExternalAccountProvider } from "../../../generated/graphql";
import { RemoveItemsDialog, type ExpectedHolder } from "../RemoveItemsDialog";

vi.mock("react-hot-toast", () => {
  const toast = { success: vi.fn(), error: vi.fn() };
  return { default: toast, toast };
});

type Sent = {
  itemIds: string[];
  reason: string;
  staffNote?: string | null;
  expectedOwnerId?: string | null;
  expectedPendingProvider?: ExternalAccountProvider | null;
  expectedPendingAccountId?: string | null;
};

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

const member: ExpectedHolder = { ownerId: "user1" };

const renderDialog = (
  sent: Sent[],
  {
    onRemoved = vi.fn(),
    expectedHolder = member,
  }: { onRemoved?: () => void; expectedHolder?: ExpectedHolder } = {},
) =>
  render(
    <MockedProvider link={recordingLink(sent)}>
      <ThemeProvider theme={lightTheme}>
        <RemoveItemsDialog
          open
          itemTypeName="MYO Ticket"
          itemIds={["oldest", "middle", "newest"]}
          holderLabel="Neo the Baka (@neo.baka)"
          expectedHolder={expectedHolder}
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
    renderDialog(sent, { onRemoved });

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
      expect.objectContaining({
        itemIds: ["oldest", "middle"],
        reason: "Spent off-site in the 2025 event",
        staffNote: "Per Neo's sheet",
      }),
    ]);
  });

  it("asks the server to refuse if the member no longer holds them", async () => {
    // The page may be stale: a trade in between would otherwise destroy the
    // new holder's item.
    const sent: Sent[] = [];
    renderDialog(sent);

    await userEvent.type(screen.getByLabelText(/Reason/), "Spent");
    await userEvent.click(confirm());

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ expectedOwnerId: "user1" });
  });

  it("asks the server to refuse if the external member has claimed them", async () => {
    const sent: Sent[] = [];
    const pendingOwner = {
      provider: ExternalAccountProvider.Discord,
      providerAccountId: "214000000000009071",
    };
    renderDialog(sent, { expectedHolder: { pendingOwner } });

    await userEvent.type(screen.getByLabelText(/Reason/), "Spent");
    await userEvent.click(confirm());

    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({
      expectedPendingProvider: pendingOwner.provider,
      expectedPendingAccountId: pendingOwner.providerAccountId,
    });
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

  it("starts empty each time it opens, rather than with a cancelled draft", async () => {
    // A cancelled reason left in place is easy to submit for the next type.
    const Harness = () => {
      const [open, setOpen] = useState(true);
      return (
        <MockedProvider link={recordingLink([])}>
          <ThemeProvider theme={lightTheme}>
            <button type="button" onClick={() => setOpen(true)}>
              reopen
            </button>
            <RemoveItemsDialog
              open={open}
              itemTypeName="MYO Ticket"
              itemIds={["oldest", "middle", "newest"]}
              holderLabel="Neo"
              expectedHolder={member}
              onClose={() => setOpen(false)}
              onRemoved={vi.fn()}
            />
          </ThemeProvider>
        </MockedProvider>
      );
    };
    render(<Harness />);

    await userEvent.type(screen.getByLabelText(/Reason/), "Spent");
    const howMany = screen.getByLabelText(/How many/);
    await userEvent.clear(howMany);
    await userEvent.type(howMany, "3");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.click(screen.getByRole("button", { name: "reopen" }));

    expect(screen.getByLabelText(/Reason/)).toHaveValue("");
    expect(screen.getByLabelText(/How many/)).toHaveValue(1);
  });
});
