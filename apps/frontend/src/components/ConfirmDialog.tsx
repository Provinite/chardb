import React, { useCallback, useId, useState } from "react";
import { Button, Cluster, Dialog, Stack } from "@chardb/ui";
import * as styles from "./ConfirmDialog.css";

interface ConfirmDialogProps {
  open: boolean;
  /** A question naming the specific thing, not "Are you sure?". */
  title: string;
  /**
   * What it will do, in the units the reader cares about. Left out when the
   * title already says all of it.
   */
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  /** Defaults to "Confirm". Say the verb: "Refund", "Delete". */
  confirmLabel?: string;
  /**
   * The action is in flight: confirm shows a spinner after the loader delay
   * and keeps its label, and the dialog cannot be cancelled.
   */
  busy?: boolean;
  /**
   * Colours the confirm red and puts the initial focus on Cancel.
   *
   * For anything that cannot be undone. The focus part is the point: a dialog
   * that opens with the destructive button focused turns a stray Enter into
   * the thing it was trying to prevent.
   */
  destructive?: boolean;
  /**
   * Text the reader must type, exactly, before confirm enables -- usually the
   * name of the thing. For the few actions with no way back at all, where a
   * click-through habit is the risk; focus starts in the box instead.
   */
  confirmPhrase?: string;
  /**
   * Holds confirm while the caller's own fields in the body are incomplete,
   * such as a required reason.
   */
  confirmDisabled?: boolean;
  testId?: string;
}

/**
 * Trims and collapses runs of whitespace, so a stray or doubled space on
 * either side never blocks a match. Case still counts.
 */
const normalise = (text: string) => text.trim().replace(/\s+/g, " ");

/**
 * A yes/no gate in front of something that cannot be taken back.
 *
 * Extracted because this codebase keeps re-deciding it. Whether a given
 * one-way action gets a gate had been decided case by case -- shop checkout
 * has one, the staff refund beside it did not (#296), and the difference was
 * not deliberate.
 *
 * Cancel is reachable three ways: the button, Escape, and the scrim. All
 * three are safe, so being generous with them costs nothing; there is no
 * equivalent shortcut to confirm, and there should not be.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  busy = false,
  destructive = false,
  confirmPhrase,
  confirmDisabled = false,
  testId,
}) => {
  const phraseId = useId();
  const [typed, setTyped] = useState("");
  const phrase =
    confirmPhrase === undefined ? undefined : normalise(confirmPhrase);
  const phraseMatches = phrase === undefined || normalise(typed) === phrase;

  // Cleared during render rather than in an effect, so no committed frame of
  // a reopened dialog carries the last opening's text -- with it, confirm
  // would be enabled until the effect caught up.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }

  // Not while the action is running: cancelling then would dismiss the dialog
  // without stopping the request, which reads as "it did not happen".
  const dismiss = useCallback(() => {
    if (!busy) onCancel();
  }, [busy, onCancel]);

  return (
    <Dialog.Root open={open} onClose={dismiss} data-testid={testId}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Body>
        <Stack>
          {children && <div className={styles.message}>{children}</div>}
          {phrase !== undefined && (
            <label htmlFor={phraseId} className={styles.phraseLabel}>
              Type <strong>{phrase}</strong> to confirm
              <input
                id={phraseId}
                className={styles.phraseInput}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                data-autofocus=""
                data-testid="confirm-phrase"
              />
            </label>
          )}
          <Cluster justify="flex-end">
            <Button
              tone="secondary"
              onClick={dismiss}
              disabled={busy}
              data-autofocus={
                destructive && phrase === undefined ? "" : undefined
              }
              data-testid="confirm-cancel"
            >
              Cancel
            </Button>
            <Button
              tone={destructive ? "danger" : "primary"}
              onClick={onConfirm}
              busy={busy}
              disabled={!phraseMatches || confirmDisabled}
              data-testid="confirm-accept"
            >
              {confirmLabel}
            </Button>
          </Cluster>
        </Stack>
      </Dialog.Body>
    </Dialog.Root>
  );
};
