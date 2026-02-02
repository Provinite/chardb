import { gql } from '@apollo/client';

export const IMAGE_MODERATION_QUEUE = gql`
  query ImageModerationQueue(
    $communityId: ID!
    $filters: ImageModerationQueueFiltersInput
    $first: Int
    $offset: Int
  ) {
    imageModerationQueue(
      communityId: $communityId
      filters: $filters
      first: $first
      offset: $offset
    ) {
      items {
        image {
          id
          filename
          originalFilename
          originalUrl
          thumbnailUrl
          altText
          width
          height
          isNsfw
          moderationStatus
          createdAt
          uploader {
            id
            username
            displayName
          }
        }
        characterId
        characterName
        communityId
        communityName
        mediaTitle
      }
      total
      hasMore
    }
  }
`;

export const GLOBAL_IMAGE_MODERATION_QUEUE = gql`
  query GlobalImageModerationQueue(
    $filters: ImageModerationQueueFiltersInput
    $first: Int
    $offset: Int
  ) {
    globalImageModerationQueue(
      filters: $filters
      first: $first
      offset: $offset
    ) {
      items {
        image {
          id
          filename
          originalFilename
          originalUrl
          thumbnailUrl
          altText
          width
          height
          isNsfw
          moderationStatus
          createdAt
          uploader {
            id
            username
            displayName
          }
        }
        characterId
        characterName
        communityId
        communityName
        mediaTitle
      }
      total
      hasMore
    }
  }
`;

export const PENDING_IMAGE_COUNT = gql`
  query PendingImageCount($communityId: ID!) {
    pendingImageCount(communityId: $communityId)
  }
`;

export const GLOBAL_PENDING_IMAGE_COUNT = gql`
  query GlobalPendingImageCount {
    globalPendingImageCount
  }
`;

export const IMAGE_MODERATION_HISTORY = gql`
  query ImageModerationHistory($imageId: ID!) {
    imageModerationHistory(imageId: $imageId) {
      id
      action
      reason
      reasonText
      createdAt
      moderator {
        id
        username
        displayName
      }
    }
  }
`;

export const APPROVE_IMAGE = gql`
  mutation ApproveImage($input: ApproveImageInput!) {
    approveImage(input: $input) {
      id
      action
      createdAt
      image {
        id
        moderationStatus
      }
    }
  }
`;

export const REJECT_IMAGE = gql`
  mutation RejectImage($input: RejectImageInput!) {
    rejectImage(input: $input) {
      id
      action
      reason
      reasonText
      createdAt
      image {
        id
        moderationStatus
      }
    }
  }
`;
