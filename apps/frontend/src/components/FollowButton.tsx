import React from 'react';
import { useMutation, useQuery } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '@chardb/ui';
import { useAuth } from '../contexts/AuthContext';
import { TOGGLE_FOLLOW, GET_FOLLOW_STATUS } from '../graphql/social';
import toast from 'react-hot-toast';

const FollowButtonContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const FollowCount = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
  margin-left: ${({ theme }) => theme.spacing.xs};
`;

const StyledButton = styled(Button).withConfig({
  shouldForwardProp: (prop) => prop !== 'isFollowing'
})<{ isFollowing?: boolean }>`
  min-width: 100px;
  background: ${({ theme, isFollowing }) => 
    isFollowing ? theme.colors.surface : theme.colors.primary
  };
  color: ${({ theme, isFollowing }) => 
    isFollowing ? theme.colors.text.primary : 'white'
  };
  border: 1px solid ${({ theme, isFollowing }) => 
    isFollowing ? theme.colors.border : theme.colors.primary
  };
  
  &:hover:not(:disabled) {
    background: ${({ theme, isFollowing }) => 
      isFollowing ? theme.colors.error + '20' : theme.colors.secondary
    };
    color: ${({ theme, isFollowing }) => 
      isFollowing ? theme.colors.error : 'white'
    };
    border-color: ${({ theme, isFollowing }) => 
      isFollowing ? theme.colors.error : theme.colors.secondary
    };
  }
`;

const LoginPrompt = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text.muted};
`;

interface FollowButtonProps {
  userId: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact';
}

export const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  showCount = true,
  size = 'sm',
  variant = 'default',
}) => {
  const { user } = useAuth();

  const { data: followData, loading: followLoading } = useQuery(GET_FOLLOW_STATUS, {
    variables: { userId },
    skip: !user || user.id === userId,
  });

  const [toggleFollow, { loading: toggleLoading }] = useMutation(TOGGLE_FOLLOW, {
    variables: { input: { targetUserId: userId } },
    optimisticResponse: {
      toggleFollow: {
        __typename: 'FollowResult',
        isFollowing: !followData?.followStatus?.isFollowing,
        followersCount: followData?.followStatus?.isFollowing 
          ? (followData?.followStatus?.followersCount || 0) - 1
          : (followData?.followStatus?.followersCount || 0) + 1,
        followingCount: followData?.followStatus?.followingCount || 0,
        targetUserId: userId,
      },
    },
    update: (cache, { data }) => {
      if (data?.toggleFollow) {
        cache.writeQuery({
          query: GET_FOLLOW_STATUS,
          variables: { userId },
          data: {
            followStatus: {
              __typename: 'FollowStatus',
              isFollowing: data.toggleFollow.isFollowing,
              followersCount: data.toggleFollow.followersCount,
              followingCount: data.toggleFollow.followingCount,
            },
          },
        });
      }
    },
    onCompleted: (data) => {
      if (data?.toggleFollow) {
        toast.success(
          data.toggleFollow.isFollowing 
            ? 'Successfully followed user!' 
            : 'Successfully unfollowed user!'
        );
      }
    },
    onError: (error) => {
      toast.error(`Failed to ${followData?.followStatus?.isFollowing ? 'unfollow' : 'follow'} user: ${error.message}`);
    },
  });

  const handleToggleFollow = async () => {
    if (!user) {
      toast.error('Please log in to follow users');
      return;
    }

    if (user.id === userId) {
      toast.error('You cannot follow yourself');
      return;
    }

    try {
      await toggleFollow();
    } catch (error) {
      // Error handled by onError callback
    }
  };

  // Don't show follow button for own profile
  if (!user || user.id === userId) {
    return null;
  }

  if (!user) {
    return (
      <LoginPrompt>
        <span>Log in to follow users</span>
      </LoginPrompt>
    );
  }

  const isFollowing = followData?.followStatus?.isFollowing || false;
  const followersCount = followData?.followStatus?.followersCount || 0;
  const isLoading = followLoading || toggleLoading;

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (variant === 'compact') {
      return isFollowing ? 'Following' : 'Follow';
    }
    return isFollowing ? 'Following' : 'Follow';
  };


  return (
    <FollowButtonContainer>
      <StyledButton
        size={size}
        isFollowing={isFollowing}
        onClick={handleToggleFollow}
        disabled={isLoading}
      >
        {getButtonText()}
      </StyledButton>
      
      {showCount && variant !== 'compact' && (
        <FollowCount>
          {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
        </FollowCount>
      )}
    </FollowButtonContainer>
  );
};

export default FollowButton;