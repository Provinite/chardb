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

interface RejectTraitReviewModalProps {
  characterName: string;
  onReject: (reason: string) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

export const RejectTraitReviewModal: React.FC<RejectTraitReviewModalProps> = ({
  characterName,
  onReject,
  onCancel,
  submitting,
}) => {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onReject(reason.trim());
    }
  };

  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={`Reject Trait Review: ${characterName}`}
    >
      <FormContainer>
        <WarningBanner>
          <AlertTriangle size={18} />
          This will reject the proposed trait values. The character's traits will not be updated.
        </WarningBanner>

        <div>
          <Label>Rejection Reason</Label>
          <HelpText>Explain why the trait values are being rejected.</HelpText>
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
            {submitting ? 'Rejecting...' : 'Reject'}
          </Button>
        </Actions>
      </FormContainer>
    </Modal>
  );
};
