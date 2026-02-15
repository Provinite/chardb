import React, { useState } from 'react';
import styled from 'styled-components';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Heading3, HelpText, SmallText, Caption } from '@chardb/ui';
import {
  useTraitReviewQueueQuery,
  useApproveTraitReviewMutation,
  useRevertTraitReviewMutation,
} from '../../generated/graphql';
import { TraitReviewCard } from './TraitReviewCard';

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

const QueueList = styled.div`
  display: flex;
  flex-direction: column;
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

const PAGE_SIZE = 10;

interface TraitReviewQueueProps {
  communityId: string;
}

export const TraitReviewQueue: React.FC<TraitReviewQueueProps> = ({
  communityId,
}) => {
  const [offset, setOffset] = useState(0);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, loading, error, refetch } = useTraitReviewQueueQuery({
    variables: { communityId, first: PAGE_SIZE, offset },
    fetchPolicy: 'network-only',
  });

  const [approveReview] = useApproveTraitReviewMutation();
  const [revertReview] = useRevertTraitReviewMutation();

  const queue = data?.traitReviewQueue;
  const items = queue?.items || [];
  const total = queue?.total || 0;
  const hasMore = queue?.hasMore || false;

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleApprove = async (reviewId: string) => {
    setActionInProgress(reviewId);
    try {
      await approveReview({ variables: { input: { reviewId } } });
      showToast('Trait review approved');
      await refetch();
    } catch (err) {
      console.error('Failed to approve trait review:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevert = async (reviewId: string, reason: string) => {
    setActionInProgress(reviewId);
    try {
      await revertReview({ variables: { input: { reviewId, reason } } });
      showToast('Trait values reverted');
      await refetch();
    } catch (err) {
      console.error('Failed to revert trait review:', err);
    } finally {
      setActionInProgress(null);
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
            Failed to load trait review queue. Please try again.
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
          <Heading3>Trait Review Queue</Heading3>
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
        Review proposed trait values for imported or user-submitted characters.
        You can approve, revert to previous values, or edit the traits before approving.
      </HelpText>

      {loading ? (
        <LoadingState>
          <RefreshCw size={32} className="animate-spin" />
          <SmallText>Loading trait review queue...</SmallText>
        </LoadingState>
      ) : items.length === 0 ? (
        <EmptyState>
          <EmptyIcon>
            <CheckCircle size={48} />
          </EmptyIcon>
          <Heading3>All Caught Up!</Heading3>
          <HelpText>
            There are no trait reviews pending moderation. Check back later.
          </HelpText>
        </EmptyState>
      ) : (
        <>
          <QueueList>
            {items.map((item) => (
              <TraitReviewCard
                key={item.review.id}
                item={item}
                onApprove={handleApprove}
                onRevert={handleRevert}
                actionInProgress={actionInProgress === item.review.id}
              />
            ))}
          </QueueList>

          {totalPages > 1 && (
            <Pagination>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
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
                onClick={() => setOffset(offset + PAGE_SIZE)}
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
