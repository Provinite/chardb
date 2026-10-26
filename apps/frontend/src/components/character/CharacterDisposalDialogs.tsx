import React from "react";
import { ConfirmDialog } from "../ConfirmDialog";

/**
 * The two staff disposal confirmations, shared by the character page and the
 * trait review queue so their wording and safeguards cannot drift apart.
 */

interface DisposalDialogProps {
  open: boolean;
  characterName: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A soft delete: a plain destructive confirm, focus on Cancel. */
export const DeleteCharacterDialog: React.FC<DisposalDialogProps> = ({
  open,
  characterName,
  busy,
  onConfirm,
  onCancel,
}) => (
  <ConfirmDialog
    open={open}
    title={`Delete "${characterName}"?`}
    confirmLabel="Delete"
    busyLabel="Deleting…"
    busy={busy}
    destructive
    onCancel={onCancel}
    onConfirm={onConfirm}
    testId="delete-character-dialog"
  >
    It disappears from every list, including the review queue, and its page
    stops loading. Undoing it takes a site admin.
  </ConfirmDialog>
);

/** No restore exists, so the name has to be typed. */
export const RemoveFromSpeciesDialog: React.FC<
  DisposalDialogProps & { speciesName?: string | null }
> = ({ open, characterName, speciesName, busy, onConfirm, onCancel }) => (
  <ConfirmDialog
    open={open}
    title={`Remove "${characterName}" from ${speciesName ?? "its species"}?`}
    confirmLabel="Remove"
    busyLabel="Removing…"
    busy={busy}
    destructive
    confirmPhrase={characterName}
    onCancel={onCancel}
    onConfirm={onConfirm}
    testId="remove-from-species-dialog"
  >
    Its trait values become plain custom fields, and it leaves the species and
    the community. There is no undo.
  </ConfirmDialog>
);
