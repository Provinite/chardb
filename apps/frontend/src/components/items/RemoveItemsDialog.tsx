import React, { useState } from "react";
import styled from "styled-components";
import toast from "react-hot-toast";
import { ConfirmDialog } from "../ConfirmDialog";
import {
  type ExternalAccountProvider,
  useRevokeItemsMutation,
} from "../../generated/graphql";

/**
 * Staff removing some of one holder's items of one type: a member's, from
 * their inventory (#169), or someone with no account here, from their pending
 * holdings (#445).
 *
 * One revoke call, so the ledger records one event for the lot. The oldest
 * go first; which of identical items goes makes no difference to anyone, and
 * oldest-first is the order the holder's list already shows.
 */

const Field = styled.label`
  display: block;
  margin-top: 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};

  input {
    display: block;
    width: 100%;
    margin-top: 0.375rem;
    font: inherit;
    font-weight: 400;
    font-size: 0.875rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Hint = styled.span`
  font-weight: 400;
  color: ${({ theme }) => theme.colors.text.muted};
`;

/**
 * Who the page says holds the items. The server refuses the removal unless
 * they still do: the page may be stale, and a trade or a claim in between
 * would otherwise destroy someone else's item.
 */
export type ExpectedHolder =
  | { ownerId: string }
  | {
      pendingOwner: {
        provider: ExternalAccountProvider;
        providerAccountId: string;
      };
    };

interface RemoveItemsDialogProps {
  open: boolean;
  itemTypeName: string;
  /** The holder's items of this type, oldest first. */
  itemIds: string[];
  /** Who they are being taken from, as the page names them. */
  holderLabel: string;
  expectedHolder: ExpectedHolder;
  onClose: () => void;
  /** After the items are gone, so the page can refetch. */
  onRemoved: () => void;
}

export const RemoveItemsDialog: React.FC<RemoveItemsDialogProps> = ({
  open,
  itemTypeName,
  itemIds,
  holderLabel,
  expectedHolder,
  onClose,
  onRemoved,
}) => {
  const [howMany, setHowMany] = useState("1");
  const [reason, setReason] = useState("");
  const [staffNote, setStaffNote] = useState("");
  const [revokeItems, { loading }] = useRevokeItemsMutation();

  // Each opening starts empty. A cancelled draft left in place would offer
  // its public reason for whatever type is opened next.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setHowMany("1");
      setReason("");
      setStaffNote("");
    }
  }

  const count = Number(howMany);
  const countValid =
    Number.isInteger(count) && count >= 1 && count <= itemIds.length;

  const submit = async () => {
    try {
      await revokeItems({
        variables: {
          itemIds: itemIds.slice(0, count),
          reason: reason.trim(),
          staffNote: staffNote.trim() || undefined,
          ...("ownerId" in expectedHolder
            ? { expectedOwnerId: expectedHolder.ownerId }
            : {
                expectedPendingProvider: expectedHolder.pendingOwner.provider,
                expectedPendingAccountId:
                  expectedHolder.pendingOwner.providerAccountId,
              }),
        },
      });
      toast.success(count === 1 ? "Removed 1 item" : `Removed ${count} items`);
      onRemoved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove those");
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title={`Remove ${itemTypeName} from ${holderLabel}?`}
      confirmLabel={countValid ? `Remove ${count}` : "Remove"}
      busyLabel="Removing…"
      busy={loading}
      destructive
      confirmDisabled={!countValid || !reason.trim()}
      onCancel={onClose}
      onConfirm={() => void submit()}
      testId="remove-items-dialog"
    >
      They are destroyed and leave the holder's items. Their history stays on
      the ledger, with the reason you give.
      <Field>
        How many <Hint>(of {itemIds.length})</Hint>
        <input
          type="number"
          min={1}
          max={itemIds.length}
          value={howMany}
          onChange={(e) => setHowMany(e.target.value)}
        />
      </Field>
      <Field>
        Reason <Hint>(shown to members)</Hint>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Spent off-site in the 2025 event"
        />
      </Field>
      <Field>
        Staff note <Hint>(optional, staff only)</Hint>
        <input
          value={staffNote}
          onChange={(e) => setStaffNote(e.target.value)}
        />
      </Field>
    </ConfirmDialog>
  );
};
