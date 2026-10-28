import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import styled from "styled-components";
import { Button } from "@chardb/ui";

const Overlay = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? "flex" : "none")};
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.background};
  padding: 2rem;
  border-radius: 12px;
  max-width: 460px;
  width: 90%;
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Body = styled.div`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9375rem;
  line-height: 1.5;
`;

const PhraseLabel = styled.label`
  display: block;
  margin-top: 1rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const PhraseInput = styled.input`
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin-top: 0.375rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9375rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
`;

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
  /** Shown on the confirm button while the action is in flight. */
  busyLabel?: string;
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
  testId?: string;
}

/**
 * A yes/no gate in front of something that cannot be taken back.
 *
 * Extracted because this codebase keeps re-deciding it. Eight files hand-roll
 * a modal, and whether a given one-way action gets a gate has been decided
 * case by case -- shop checkout has one, the staff refund beside it did not
 * (#296), and the difference was not deliberate.
 *
 * Cancel is reachable three ways: the button, Escape, and the backdrop. All
 * three are safe, so being generous with them costs nothing; there is no
 * equivalent shortcut to confirm, and there should not be.
 */
/**
 * Trims and collapses runs of whitespace, so a stray or doubled space on
 * either side never blocks a match. Case still counts.
 */
const normalise = (text: string) => text.trim().replace(/\s+/g, " ");

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  busyLabel,
  busy = false,
  destructive = false,
  confirmPhrase,
  testId,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const phraseRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (!open) return;
    if (confirmPhrase !== undefined) phraseRef.current?.focus();
    else if (destructive) cancelRef.current?.focus();
  }, [open, destructive, confirmPhrase]);

  if (!open) return null;

  return (
    <Overlay $isOpen={open} onClick={dismiss}>
      <Panel
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        // The backdrop cancels; a click inside it must not travel up and do
        // the same.
        onClick={(e) => e.stopPropagation()}
      >
        <Title>{title}</Title>
        {children && <Body>{children}</Body>}
        {confirmPhrase !== undefined && (
          <PhraseLabel htmlFor={phraseId}>
            Type <strong>{phrase}</strong> to confirm
            <PhraseInput
              ref={phraseRef}
              id={phraseId}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              data-testid="confirm-phrase"
            />
          </PhraseLabel>
        )}
        <Actions>
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={dismiss}
            disabled={busy}
            data-testid="confirm-cancel"
          >
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy || !phraseMatches}
            data-testid="confirm-accept"
          >
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </Actions>
      </Panel>
    </Overlay>
  );
};
