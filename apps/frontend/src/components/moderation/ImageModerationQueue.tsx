import React, { useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Heading3, HelpText, SmallText, Caption } from '@chardb/ui';
import {
  useMediaModerationQueueQuery,
  useApproveImageMutation,
  useRejectImageMutation,
  ModerationRejectionReason,
} from '../../generated/graphql';
import { ImageModerationCard } from './ImageModerationCard';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CountBadge = styled.span`
  padding: 0.25rem 0.75rem;
  background: ${({ theme }) => theme.colors.warning}20;
  color: ${({ theme }) => theme.colors.warning};
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 999px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
`;

const EmptyIcon = styled.div`
  color: ${({ theme }) => theme.colors.success};
  opacity: 0.7;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  text-align: center;
`;

const ErrorState = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: ${({ theme }) => theme.colors.error}10;
  border: 1px solid ${({ theme }) => theme.colors.error}40;
  border-radius: 8px;
  color: ${({ theme }) => theme.colors.error};
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
`;

const PageInfo = styled(Caption)`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SuccessToast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.colors.success};
  color: white;
  border-radius: 8px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  transform: translateY(${({ $visible }) => ($visible ? '0' : '100px')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition: all 0.3s ease;
  z-index: 1000;
`;

const PAGE_SIZE = 12;

interface ImageModerationQueueProps {
  communityId: string;
}

export const ImageModerationQueue: React.FC<ImageModerationQueueProps> = ({
  communityId,
}) => {
  const [offset, setOffset] = useState(0);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useMediaModerationQueueQuery({
    variables: {
      communityId,
      first: PAGE_SIZE,
      offset,
    },
    fetchPolicy: 'network-only',
  });

  const [approveImage] = useApproveImageMutation();
  const [rejectImage] = useRejectImageMutation();

  const queue = data?.mediaModerationQueue;
  const items = queue?.media || [];
  const total = queue?.total || 0;
  const hasMore = queue?.hasMore || false;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = async (imageId: string) => {
    setActionInProgress(imageId);
    try {
      await approveImage({
        variables: { input: { imageId } },
      });
      showToast('Image approved successfully');
      await refetch();
    } catch (err) {
      console.error('Failed to approve image:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async (
    imageId: string,
    reason: ModerationRejectionReason,
    reasonText?: string
  ) => {
    setActionInProgress(imageId);
    try {
      await rejectImage({
        variables: {
          input: {
            imageId,
            reason,
            reasonText,
          },
        },
      });
      showToast('Image rejected');
      await refetch();
    } catch (err) {
      console.error('Failed to reject image:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handlePrevPage = () => {
    setOffset(Math.max(0, offset - PAGE_SIZE));
  };

  const handleNextPage = () => {
    if (hasMore) {
      setOffset(offset + PAGE_SIZE);
    }
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (error) {
    return (
      <Container>
        <ErrorState>
          <AlertCircle size={20} />
          <SmallText style={{ margin: 0 }}>
            Failed to load moderation queue. Please try again.
          </SmallText>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderLeft>
          <Heading3>Image Moderation Queue</Heading3>
          {!loading && <CountBadge>{total} pending</CountBadge>}
        </HeaderLeft>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={loading}
          icon={<RefreshCw size={14} />}
        >
          Refresh
        </Button>
      </Header>

      <HelpText>
        Review and approve or reject uploaded images. Approved images will become
        visible to the community. Rejected images will be hidden and uploaders will
        be notified via email.
      </HelpText>

      {loading ? (
        <LoadingState>
          <RefreshCw size={32} className="animate-spin" />
          <SmallText>Loading moderation queue...</SmallText>
        </LoadingState>
      ) : items.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <CheckCircle size={48} />
          </EmptyIcon>
          <Heading3>All Caught Up!</Heading3>
          <HelpText>
            There are no images pending moderation. Check back later for new uploads.
          </HelpText>
        </EmptyState>
      ) : (
        <>
          <Grid>
            {items.map((mediaItem) => {
              // Only render if we have the pending moderation image (moderator-only field)
              const image = mediaItem.pendingModerationImage;
              if (!image) return null;

              return (
                <ImageModerationCard
                  key={image.id}
                  item={{
                    image: {
                      id: image.id,
                      originalFilename: image.originalFilename,
                      originalUrl: image.originalUrl,
                      thumbnailUrl: image.thumbnailUrl,
                      altText: image.altText,
                      width: image.width,
                      height: image.height,
                      isNsfw: image.isNsfw,
                      moderationStatus: image.moderationStatus,
                      createdAt: image.createdAt,
                      uploader: image.uploader,
                    },
                    characterId: mediaItem.characterId ?? null,
                    characterName: mediaItem.character?.name ?? null,
                    communityId: mediaItem.character?.species?.community?.id ?? null,
                    communityName: mediaItem.character?.species?.community?.name ?? null,
                    mediaTitle: mediaItem.title,
                  }}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  approving={actionInProgress === image.id}
                  rejecting={actionInProgress === image.id}
                />
              );
            })}
          </Grid>

          {totalPages > 1 && (
            <Pagination>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={offset === 0}
              >
                Previous
              </Button>
              <PageInfo>
                Page {currentPage} of {totalPages}
              </PageInfo>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore}
              >
                Next
              </Button>
            </Pagination>
          )}
        </>
      )}

      <SuccessToast $visible={!!toastMessage}>
        <CheckCircle size={16} />
        {toastMessage}
      </SuccessToast>
    </Container>
  );
};
