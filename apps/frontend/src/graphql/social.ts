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
        id
        username
        displayName
        avatarUrl
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
          id
          username
          displayName
          avatarUrl
        }
      }
    }
  }
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
        id
        username
        displayName
        avatarUrl
      }
    }
  }
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
          id
          username
          displayName
          avatarUrl
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
            id
            username
            displayName
            avatarUrl
          }
        }
      }
      total
    }
  }
`;

// TODO: These queries need to be implemented in the backend
// export const GET_FOLLOWERS = gql`
//   query GetFollowers($username: String!) {
//     getFollowers(username: $username) {
//       user {
//         id
//         username
//         displayName
//       }
//       followers {
//         id
//         username
//         displayName
//         avatarUrl
//         bio
//       }
//     }
//   }
// `;

// export const GET_FOLLOWING = gql`
//   query GetFollowing($username: String!) {
//     getFollowing(username: $username) {
//       user {
//         id
//         username
//         displayName
//       }
//       following {
//         id
//         username
//         displayName
//         avatarUrl
//         bio
//       }
//     }
//   }
// `;

// export const GET_ACTIVITY_FEED = gql`
//   query GetActivityFeed($limit: Int, $offset: Int) {
//     activityFeed(limit: $limit, offset: $offset) {
//       id
//       type
//       entityId
//       createdAt
//       user {
//         id
//         username
//         displayName
//         avatarUrl
//       }
//       content {
//         name
//         title
//         description
//       }
//     }
//   }
// `;