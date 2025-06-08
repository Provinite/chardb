import { gql } from '@apollo/client';

export const TOGGLE_LIKE = gql`
  mutation ToggleLike($input: ToggleLikeInput!) {
    toggleLike(input: $input) {
      isLiked
      likesCount
      entityType
      entityId
    }
  }
`;

export const GET_LIKE_STATUS = gql`
  query GetLikeStatus($entityType: LikeableType!, $entityId: ID!) {
    likeStatus(entityType: $entityType, entityId: $entityId) {
      isLiked
      likesCount
    }
  }
`;

export const TOGGLE_FOLLOW = gql`
  mutation ToggleFollow($input: ToggleFollowInput!) {
    toggleFollow(input: $input) {
      isFollowing
      followersCount
      followingCount
      targetUserId
    }
  }
`;

export const GET_FOLLOW_STATUS = gql`
  query GetFollowStatus($userId: ID!) {
    followStatus(userId: $userId) {
      isFollowing
      followersCount
      followingCount
    }
  }
`;