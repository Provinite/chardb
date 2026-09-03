import React, { useState } from "react";
import styled from "styled-components";
import { Clock } from "lucide-react";
import { Modal, Button, Label, HelpText } from "@chardb/ui";

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

/* Deliberately not the warning colour used by the revert modal. Nothing here
   is destructive or irreversible, and dressing it in the same red-orange
   would make moderators hesitate over the one action in this queue that
   costs nobody anything. */
const InfoBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.primary}15;
  border: 1px solid ${({ theme }) => theme.colors.primary}40;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 90px;
  padding: 0.75rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
`;

interface DeferQueueEntryModalProps {
  /** What is being deferred -- a character name, a filename. */
  entryName: string;
  /** How many times this entry has already been passed on. */
  deferralCount: number;
  onDefer: (note: string | undefined) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  maxNoteLength?: number;
}

export const DeferQueueEntryModal: React.FC<DeferQueueEntryModalProps> = ({
  entryName,
  deferralCount,
  onDefer,
  onCancel,
  submitting,
  maxNoteLength = 1000,
}) => {
  const [note, setNote] = useState("");

  return (
    <Modal isOpen onClose={onCancel} title={`Send to back: ${entryName}`}>
      <FormContainer data-testid="defer-modal">
        <InfoBanner>
          <Clock size={18} />
          This stays pending and nobody is notified. It moves behind the entries
          that can be worked on now.
        </InfoBanner>

        <div>
          <Label>Why (optional)</Label>
          <HelpText>
            Shown to the next moderator who reaches this. Replaces any note left
            by the last person to pass on it.
          </HelpText>
          <TextArea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., waiting on a reference sheet from the owner"
            maxLength={maxNoteLength}
          />
        </div>

        {/* Said plainly rather than hidden behind a count badge: someone
            deciding whether to pass on an entry for the fourth time should be
            told it is the fourth time while they are deciding. */}
        {deferralCount > 0 && (
          <HelpText>
            This has already been sent to the back {deferralCount}{" "}
            {deferralCount === 1 ? "time" : "times"}.
          </HelpText>
        )}

        <Actions>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onDefer(note.trim() || undefined)}
            disabled={submitting}
          >
            {submitting ? "Sending..." : "Send to back"}
          </Button>
        </Actions>
      </FormContainer>
    </Modal>
  );
};
