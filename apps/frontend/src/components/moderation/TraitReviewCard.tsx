import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Check, X, Edit, Clock, Image as ImageIcon, ExternalLink } from 'lucide-react';
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ImageSection = styled.div`
  width: 100%;
  aspect-ratio: 16/9;
  background: ${({ theme }) => theme.colors.background};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImagePlaceholder = styled.div`
  color: ${({ theme }) => theme.colors.text.muted};
  font-size: 0.875rem;
  text-align: center;
  padding: 1rem;
`;

const CardBody = styled.div`
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

const CharacterInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
`;

const CharacterName = styled(Link)`
  font-weight: 600;
  font-size: 1.125rem;
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
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
  const imageUrl = img?.mediumUrl ?? img?.originalUrl;

  return (
    <>
      <Card>
        <ImageSection>
          {imageUrl ? (
            <MainImage src={imageUrl} alt={item.characterName} />
          ) : (
            <ImagePlaceholder>
              <ImageIcon size={32} />
            </ImagePlaceholder>
          )}
        </ImageSection>

        <CardBody>
          <CardHeader>
            <CharacterInfo>
              <CharacterName to={`/character/${item.characterId}`} target="_blank" rel="noopener noreferrer">
                {item.characterName}
                <ExternalLink size={14} />
              </CharacterName>
              <CharacterMeta>
                {item.registryId && <Caption>#{item.registryId}</Caption>}
                {item.speciesName && <Caption>{item.speciesName}</Caption>}
                {item.variantName && <Caption>({item.variantName})</Caption>}
                <SourceBadge $source={review.source}>{sourceLabel(review.source)}</SourceBadge>
              </CharacterMeta>
            </CharacterInfo>
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
        </CardBody>
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
