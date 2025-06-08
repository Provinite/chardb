import React, { useState } from 'react';
import styled from 'styled-components';
import { Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery } from '@apollo/client';
import { LikeableType } from '../generated/graphql';
import { TOGGLE_LIKE, GET_LIKE_STATUS } from '../graphql/social';
import { useAuth } from '../contexts/AuthContext';

interface LikeButtonProps {
  entityType: LikeableType;
  entityId: string;
  className?: string;
  showCount?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ButtonContainer = styled.button<{ $isLiked: boolean; $size: string }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: ${props => {
    switch (props.$size) {
      case 'small': return '0.25rem 0.5rem';
      case 'large': return '0.75rem 1rem';
      default: return '0.5rem 0.75rem';
    }
  }};
  border: 1px solid ${props => props.$isLiked 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius.md};
  background: ${props => props.$isLiked 
    ? props.theme.colors.primary + '10' 
    : 'transparent'};
  color: ${props => props.$isLiked 
    ? props.theme.colors.primary 
    : props.theme.colors.text.secondary};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  font-size: ${props => {
    switch (props.$size) {
      case 'small': return '0.875rem';
      case 'large': return '1.125rem';
      default: return '1rem';
    }
  }};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => props.theme.colors.primary + '15'};
    color: ${props => props.theme.colors.primary};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const HeartIcon = styled(Heart)<{ $isLiked: boolean; $size: string }>`
  width: ${props => {
    switch (props.$size) {
      case 'small': return '16px';
      case 'large': return '24px';
      default: return '20px';
    }
  }};
  height: ${props => {
    switch (props.$size) {
      case 'small': return '16px';
      case 'large': return '24px';
      default: return '20px';
    }
  }};
  fill: ${props => props.$isLiked ? 'currentColor' : 'none'};
  transition: all 0.2s ease-in-out;
`;

const Count = styled.span`
  font-weight: 500;
  min-width: 1ch;
`;

export const LikeButton: React.FC<LikeButtonProps> = ({
  entityType,
  entityId,
  className,
  showCount = true,
  size = 'medium'
}) => {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [optimisticState, setOptimisticState] = useState<{
    isLiked: boolean;
    likesCount: number;
  } | null>(null);

  const { data: likeStatusData, loading: statusLoading } = useQuery(GET_LIKE_STATUS, {
    variables: { entityType, entityId },
    skip: !isAuthenticated,
  });

  const [toggleLike, { loading: mutationLoading }] = useMutation(TOGGLE_LIKE, {
    onCompleted: (data: any) => {
      // Clear optimistic state when mutation completes successfully
      setOptimisticState(null);
      
      if (data.toggleLike.isLiked) {
        toast.success('Added to likes!', { duration: 2000 });
      }
    },
    onError: (error: any) => {
      // Revert optimistic state on error
      setOptimisticState(null);
      console.error('Like toggle error:', error);
      toast.error('Failed to update like. Please try again.');
    }
  });

  // Use optimistic state if available, otherwise use server data
  const isLiked = optimisticState?.isLiked ?? likeStatusData?.likeStatus.isLiked ?? false;
  const likesCount = optimisticState?.likesCount ?? likeStatusData?.likeStatus.likesCount ?? 0;
  const isLoading = statusLoading || mutationLoading;

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to like content');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    setOptimisticState({
      isLiked: !isLiked,
      likesCount: isLiked ? likesCount - 1 : likesCount + 1,
    });

    try {
      await toggleLike({
        variables: {
          input: { entityType, entityId }
        }
      });
    } catch (error) {
      // Error handling is done in onError callback
    }
  };

  if (!isAuthenticated && !showCount) {
    return null; // Don't show like button if not authenticated and not showing count
  }

  return (
    <ButtonContainer
      $isLiked={isLiked}
      $size={size}
      onClick={handleClick}
      disabled={isLoading || !isAuthenticated}
      className={className}
      type="button"
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <HeartIcon $isLiked={isLiked} $size={size} />
      {showCount && <Count>{likesCount}</Count>}
    </ButtonContainer>
  );
};

export default LikeButton;