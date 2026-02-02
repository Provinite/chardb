import React, { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import {
  Modal,
  Button,
  Label,
  HelpText,
  ErrorMessage,
} from '@chardb/ui';
import { ModerationRejectionReason } from '../../generated/graphql';

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ReasonOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ReasonOption = styled.label<{ $selected?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid ${({ theme, $selected }) =>
    $selected ? theme.colors.primary : theme.colors.border};
  border-radius: 8px;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary + '10' : theme.colors.surface};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const RadioInput = styled.input.attrs({ type: 'radio' })`
  margin-top: 0.125rem;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

const ReasonContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const ReasonLabel = styled.span`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ReasonDescription = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const TextAreaContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
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
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary}20;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const FooterButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
`;

const WarningBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${({ theme }) => theme.colors.warning}20;
  border: 1px solid ${({ theme }) => theme.colors.warning}40;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
`;

const WarningIcon = styled.div`
  color: ${({ theme }) => theme.colors.warning};
  flex-shrink: 0;
`;

const REJECTION_REASONS: Array<{
  value: ModerationRejectionReason;
  label: string;
  description: string;
}> = [
  {
    value: ModerationRejectionReason.TosViolation,
    label: 'Terms of Service Violation',
    description: 'Content violates community guidelines or terms of service',
  },
  {
    value: ModerationRejectionReason.NsfwNotTagged,
    label: 'NSFW Not Tagged',
    description: 'Adult content that was not properly marked as NSFW',
  },
  {
    value: ModerationRejectionReason.SpamLowQuality,
    label: 'Spam / Low Quality',
    description: 'Spam, duplicate content, or extremely low quality images',
  },
  {
    value: ModerationRejectionReason.CopyrightIssue,
    label: 'Copyright Issue',
    description: 'Potential copyright infringement or unauthorized use',
  },
  {
    value: ModerationRejectionReason.Other,
    label: 'Other',
    description: 'Other reason not listed above (please specify)',
  },
];

interface RejectImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: ModerationRejectionReason, reasonText?: string) => void;
  loading?: boolean;
  imageName?: string;
}

export const RejectImageModal: React.FC<RejectImageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  imageName,
}) => {
  const [selectedReason, setSelectedReason] = useState<ModerationRejectionReason | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedReason) {
      setError('Please select a rejection reason');
      return;
    }

    if (selectedReason === ModerationRejectionReason.Other && !reasonText.trim()) {
      setError('Please provide additional details for "Other" reason');
      return;
    }

    onConfirm(selectedReason, reasonText.trim() || undefined);
  };

  const handleClose = () => {
    setSelectedReason(null);
    setReasonText('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reject Image">
      <form onSubmit={handleSubmit}>
        <FormContainer>
          <WarningBanner>
            <WarningIcon>
              <AlertTriangle size={20} />
            </WarningIcon>
            <span>
              This action will reject the image{imageName ? ` "${imageName}"` : ''} and notify the
              uploader via email.
            </span>
          </WarningBanner>

          <div>
            <Label>Rejection Reason</Label>
            <HelpText style={{ marginBottom: '0.75rem' }}>
              Select the primary reason for rejecting this image.
            </HelpText>
            <ReasonOptions>
              {REJECTION_REASONS.map((reason) => (
                <ReasonOption
                  key={reason.value}
                  $selected={selectedReason === reason.value}
                >
                  <RadioInput
                    name="rejection-reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    disabled={loading}
                  />
                  <ReasonContent>
                    <ReasonLabel>{reason.label}</ReasonLabel>
                    <ReasonDescription>{reason.description}</ReasonDescription>
                  </ReasonContent>
                </ReasonOption>
              ))}
            </ReasonOptions>
          </div>

          <TextAreaContainer>
            <Label htmlFor="reason-text">
              Additional Details {selectedReason === ModerationRejectionReason.Other ? '(Required)' : '(Optional)'}
            </Label>
            <TextArea
              id="reason-text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Provide additional context about the rejection..."
              disabled={loading}
            />
            <HelpText>
              This message will be included in the notification email sent to the uploader.
            </HelpText>
          </TextAreaContainer>

          {error && <ErrorMessage message={error} />}

          <FooterButtons>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              disabled={loading || !selectedReason}
              loading={loading}
            >
              Reject Image
            </Button>
          </FooterButtons>
        </FormContainer>
      </form>
    </Modal>
  );
};
