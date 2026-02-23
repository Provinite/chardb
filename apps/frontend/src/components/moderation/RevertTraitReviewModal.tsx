import React, { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import {
  Modal,
  Button,
  Label,
  HelpText,
} from '@chardb/ui';

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
  onRevert: (reason: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export const RevertTraitReviewModal: React.FC<RevertTraitReviewModalProps> = ({
  characterName,
  onRevert,
  onCancel,
  submitting,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onRevert(reason.trim());
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Revert Traits: ${characterName}`}
    >
      <FormContainer>
        <WarningBanner>
          <AlertTriangle size={18} />
          This will revert the character's traits to their previous values.
        </WarningBanner>

        <div>
          <Label>Revert Reason</Label>
          <HelpText>Explain why the trait values are being reverted.</HelpText>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Incorrect trait mapping for eye color, should be..."
            maxLength={2000}
          />
        </div>

        <Actions>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? 'Reverting...' : 'Revert'}
          </Button>
        </Actions>
      </FormContainer>
    </Modal>
  );
};
