import React, { useState } from 'react';
import { useQuery } from '@apollo/client';
import styled from 'styled-components';
import { LoadingSpinner } from './LoadingSpinner';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';
import { GET_COMMENTS } from '../graphql/social.graphql';
import { CommentableType } from '../generated/graphql';

const Container = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  padding-bottom: ${({ theme }) => theme.spacing.sm};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CommentCount = styled.span`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
`;

const CommentsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const CommentWithReplies = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const RepliesContainer = styled.div`
  margin-left: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ReplyFormContainer = styled.div`
  margin-left: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.error};
  background: ${({ theme }) => theme.colors.error + '10'};
  border: 1px solid ${({ theme }) => theme.colors.error + '30'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xxl};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  opacity: 0.5;
`;

const EmptyTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  margin: 0;
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
`;

const LoadMoreButton = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  margin-top: ${({ theme }) => theme.spacing.md};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

interface CommentListProps {
  entityType: CommentableType;
  entityId: string;
  showCommentForm?: boolean;
}

export const CommentList: React.FC<CommentListProps> = ({
  entityType,
  entityId,
  showCommentForm = true,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, loading, error, refetch, fetchMore } = useQuery(GET_COMMENTS, {
    variables: {
      filters: {
        entityType,
        entityId,
        limit: 20,
        offset: 0,
      },
    },
    notifyOnNetworkStatusChange: true,
  });

  const comments = data?.comments?.comments || [];
  const total = data?.comments?.total || 0;
  const hasMore = comments.length < total;

  const handleCommentAdded = () => {
    refetch();
    setReplyingTo(null);
  };

  const handleReply = (parentId: string) => {
    setReplyingTo(replyingTo === parentId ? null : parentId);
  };

  const handleLoadMore = async () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      try {
        await fetchMore({
          variables: {
            filters: {
              entityType,
              entityId,
              limit: 20,
              offset: comments.length,
            },
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) return prev;
            return {
              comments: {
                ...fetchMoreResult.comments,
                comments: [
                  ...prev.comments.comments,
                  ...fetchMoreResult.comments.comments,
                ],
              },
            };
          },
        });
      } catch (error) {
        console.error('Failed to load more comments:', error);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  // Group comments by parent/replies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topLevelComments = comments.filter((comment: any) => !comment.parentId);
  const repliesMap = new Map();

  comments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((comment: any) => comment.parentId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .forEach((reply: any) => {
      const parentId = reply.parentId;
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId).push(reply);
    });

  if (loading && !data) {
    return (
      <Container>
        <SectionHeader>
          <SectionTitle>Comments</SectionTitle>
        </SectionHeader>
        <LoadingContainer>
          <LoadingSpinner />
        </LoadingContainer>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <SectionHeader>
          <SectionTitle>Comments</SectionTitle>
        </SectionHeader>
        <ErrorContainer>
          <h4>Failed to load comments</h4>
          <p>{error.message}</p>
        </ErrorContainer>
      </Container>
    );
  }

  return (
    <Container>
      <SectionHeader>
        <SectionTitle>Comments</SectionTitle>
        <CommentCount>
          {total} {total === 1 ? 'comment' : 'comments'}
        </CommentCount>
      </SectionHeader>

      {showCommentForm && (
        <CommentForm
          entityType={entityType}
          entityId={entityId}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {topLevelComments.length === 0 ? (
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyTitle>No comments yet</EmptyTitle>
          <EmptyDescription>
            Be the first to share your thoughts about this content!
          </EmptyDescription>
        </EmptyState>
      ) : (
        <CommentsContainer>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {topLevelComments.map((comment: any) => {
            const replies = repliesMap.get(comment.id) || [];

            return (
              <CommentWithReplies key={comment.id}>
                <Comment
                  comment={comment}
                  onReply={handleReply}
                  onUpdate={handleCommentAdded}
                />

                {replies.length > 0 && (
                  <RepliesContainer>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {replies.map((reply: any) => (
                      <Comment
                        key={reply.id}
                        comment={reply}
                        onUpdate={handleCommentAdded}
                        isReply
                      />
                    ))}
                  </RepliesContainer>
                )}

                {replyingTo === comment.id && (
                  <ReplyFormContainer>
                    <CommentForm
                      entityType={entityType}
                      entityId={entityId}
                      parentId={comment.id}
                      placeholder={`Reply to ${comment.author.displayName || comment.author.username}...`}
                      onCommentAdded={handleCommentAdded}
                      onCancel={() => setReplyingTo(null)}
                      compact
                    />
                  </ReplyFormContainer>
                )}
              </CommentWithReplies>
            );
          })}

          {hasMore && (
            <LoadMoreButton onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore
                ? 'Loading more comments...'
                : `Load ${Math.min(20, total - comments.length)} more comments`}
            </LoadMoreButton>
          )}
        </CommentsContainer>
      )}
    </Container>
  );
};

export default CommentList;
