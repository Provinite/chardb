import React, { useState } from "react";
import styled from "styled-components";
import { AlertTriangle } from "lucide-react";
import { Modal, Button, Label, HelpText } from "@chardb/ui";

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const WarningBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.warning}15;
  border: 1px solid ${({ theme }) => theme.colors.warning}40;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 0.875rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
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

interface RevertTraitReviewModalProps {
  characterName: string;
  /**
   * Whether this review came from a redemption -- an MYO ticket or an edit
   * kit.
   *
   * It changes what this dialog is truthfully able to say. A redemption's
   * proposal was never applied to the character, so refusing one reverts
   * nothing: the traits stay exactly as they are and the member's item comes
   * back. Saying "this will revert the character's traits" there is simply
   * false, and with forms it is more visibly so -- a proposed form has no
   * previous version to return to, because it never existed.
   */
  redemption?: boolean;
  onRevert: (reason: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export const RevertTraitReviewModal: React.FC<RevertTraitReviewModalProps> = ({
  characterName,
  redemption = false,
  onRevert,
  onCancel,
  submitting,
}) => {
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (reason.trim()) {
      onRevert(reason.trim());
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`${redemption ? "Refuse" : "Revert"} Traits: ${characterName}`}
    >
      {/* The test id sits here rather than on the Modal because the shared
          Modal takes no props of its own to forward one through. */}
      <FormContainer data-testid="revert-modal">
        <WarningBanner>
          <AlertTriangle size={18} />
          {redemption
            ? "The character's traits stay as they are, and the member's item is returned."
            : "This will revert the character's traits to their previous values."}
        </WarningBanner>

        <div>
          <Label>{redemption ? "Reason" : "Revert Reason"}</Label>
          <HelpText>
            {redemption
              ? "Explain why this submission is being refused. The member sees it."
              : "Explain why the trait values are being reverted."}
          </HelpText>
          <TextArea
            data-testid="revert-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Incorrect trait mapping for eye color, should be..."
            maxLength={2000}
          />
        </div>

        <Actions>
          <Button
            variant="outline"
            data-testid="revert-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            data-testid="revert-confirm"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
          >
            {submitting
              ? redemption
                ? "Refusing..."
                : "Reverting..."
              : redemption
                ? "Refuse"
                : "Revert"}
          </Button>
        </Actions>
      </FormContainer>
    </Modal>
  );
};
