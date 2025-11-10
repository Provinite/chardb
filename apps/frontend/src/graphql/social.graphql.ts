import { gql } from '@apollo/client';

// User fragment for social features
const USER_AVATAR_FRAGMENT = gql`
  fragment UserWithAvatar on User {
    id
    username
    displayName
    avatarImage {
      id
      originalUrl
      thumbnailUrl
      altText
    }
  }
`;

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

export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content
      createdAt
      authorId
      commentableId
      commentableType
      parentId
      isHidden
      likesCount
      author {
        ...UserWithAvatar
      }
      replies {
        id
        content
        createdAt
        authorId
        parentId
        isHidden
        likesCount
        author {
          ...UserWithAvatar
        }
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

export const UPDATE_COMMENT = gql`
  mutation UpdateComment($id: ID!, $input: UpdateCommentInput!) {
    updateComment(id: $id, input: $input) {
      id
      content
      createdAt
      authorId
      commentableId
      commentableType
      parentId
      isHidden
      likesCount
      author {
        ...UserWithAvatar
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: ID!) {
    deleteComment(id: $id)
  }
`;

export const GET_COMMENTS = gql`
  query GetComments($filters: CommentFiltersInput!) {
    comments(filters: $filters) {
      comments {
        id
        content
        createdAt
        authorId
        commentableId
        commentableType
        parentId
        isHidden
        likesCount
        author {
          ...UserWithAvatar
        }
        replies {
          id
          content
          createdAt
          authorId
          parentId
          isHidden
          likesCount
          author {
            ...UserWithAvatar
          }
        }
      }
      total
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

export const GET_FOLLOWERS = gql`
  query GetFollowers($username: String!) {
    getFollowers(username: $username) {
      user {
        id
        username
        displayName
      }
      followers {
        ...UserWithAvatar
        bio
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

export const GET_FOLLOWING = gql`
  query GetFollowing($username: String!) {
    getFollowing(username: $username) {
      user {
        id
        username
        displayName
      }
      following {
        ...UserWithAvatar
        bio
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;

export const GET_ACTIVITY_FEED = gql`
  query GetActivityFeed($input: ActivityFeedInput) {
    activityFeed(input: $input) {
      id
      type
      entityId
      createdAt
      user {
        ...UserWithAvatar
      }
      content {
        name
        title
        description
      }
    }
  }
  ${USER_AVATAR_FRAGMENT}
`;