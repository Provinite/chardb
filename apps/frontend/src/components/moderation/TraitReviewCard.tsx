import React, { useState } from 'react';
import styled from 'styled-components';
import { Check, X, Edit, Clock, Image as ImageIcon } from 'lucide-react';
import { Button, Caption } from '@chardb/ui';
import { TraitReviewSource } from '../../generated/graphql';
import { TraitDiffDisplay } from './TraitDiffDisplay';
import { RejectTraitReviewModal } from './RejectTraitReviewModal';

import type { TraitReviewQueueQuery } from '../../generated/graphql';

type QueueItem = TraitReviewQueueQuery['traitReviewQueue']['items'][0];

interface TraitReviewCardProps {
  item: QueueItem;
  onApprove: (reviewId: string) => Promise<void>;
  onReject: (reviewId: string, reason: string) => Promise<void>;
  onEditAndApprove?: (reviewId: string) => void;
  actionInProgress: boolean;
}

const Card = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;

const CharacterHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
`;

const CharacterAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.muted};

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CharacterInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const CharacterName = styled.span`
  font-weight: 600;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CharacterMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SourceBadge = styled.span<{ $source: TraitReviewSource }>`
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ theme, $source }) => {
    switch ($source) {
      case TraitReviewSource.Import: return theme.colors.primary + '20';
      case TraitReviewSource.Myo: return theme.colors.warning + '20';
      case TraitReviewSource.UserEdit: return theme.colors.success + '20';
      default: return theme.colors.surface;
    }
  }};
  color: ${({ theme, $source }) => {
    switch ($source) {
      case TraitReviewSource.Import: return theme.colors.primary;
      case TraitReviewSource.Myo: return theme.colors.warning;
      case TraitReviewSource.UserEdit: return theme.colors.success;
      default: return theme.colors.text.secondary;
    }
  }};
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: ${({ theme }) => theme.colors.text.muted};
  flex-shrink: 0;
`;

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function sourceLabel(source: TraitReviewSource): string {
  switch (source) {
    case TraitReviewSource.Import: return 'Import';
    case TraitReviewSource.Myo: return 'MYO';
    case TraitReviewSource.UserEdit: return 'User Edit';
    default: return source;
  }
}

export const TraitReviewCard: React.FC<TraitReviewCardProps> = ({
  item,
  onApprove,
  onReject,
  onEditAndApprove,
  actionInProgress,
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const review = item.review;
  const mainMedia = review.character?.mainMedia;
  const img = mainMedia?.pendingModerationImage ?? mainMedia?.image;
  const imageUrl = img?.thumbnailUrl ?? img?.originalUrl;

  return (
    <>
      <Card>
        <CardHeader>
          <CharacterHeaderLeft>
            <CharacterAvatar>
              {imageUrl ? (
                <img src={imageUrl} alt={item.characterName} />
              ) : (
                <ImageIcon size={20} />
              )}
            </CharacterAvatar>
            <CharacterInfo>
              <CharacterName>{item.characterName}</CharacterName>
            <CharacterMeta>
              {item.registryId && <Caption>#{item.registryId}</Caption>}
              {item.speciesName && <Caption>{item.speciesName}</Caption>}
              {item.variantName && <Caption>({item.variantName})</Caption>}
              <SourceBadge $source={review.source}>{sourceLabel(review.source)}</SourceBadge>
            </CharacterMeta>
            </CharacterInfo>
          </CharacterHeaderLeft>
          <TimeInfo>
            <Clock size={12} />
            <Caption>{formatTimeAgo(review.createdAt)}</Caption>
          </TimeInfo>
        </CardHeader>

        <TraitDiffDisplay
          previousTraitValues={review.previousTraitValues}
          proposedTraitValues={review.proposedTraitValues}
        />

        <Actions>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onApprove(review.id)}
            disabled={actionInProgress}
            icon={<Check size={14} />}
          >
            Approve
          </Button>
          {onEditAndApprove && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditAndApprove(review.id)}
              disabled={actionInProgress}
              icon={<Edit size={14} />}
            >
              Edit & Approve
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRejectModal(true)}
            disabled={actionInProgress}
            icon={<X size={14} />}
          >
            Reject
          </Button>
        </Actions>
      </Card>

      {showRejectModal && (
        <RejectTraitReviewModal
          characterName={item.characterName}
          onReject={async (reason) => {
            await onReject(review.id, reason);
            setShowRejectModal(false);
          }}
          onCancel={() => setShowRejectModal(false)}
          submitting={actionInProgress}
        />
      )}
    </>
  );
};
