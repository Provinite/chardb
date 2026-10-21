import { gql } from "@apollo/client";

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

/**
 * What a queue card needs from a media, shared by the community queue and the
 * site-wide one so the two cannot drift apart.
 */
export const MODERATION_QUEUE_MEDIA_FRAGMENT = gql`
  fragment ModerationQueueMediaFields on Media {
    id
    title
    characterId
    character {
      id
      name
      species {
        id
        name
        community {
          id
          name
        }
      }
    }
    owner {
      id
      username
      displayName
    }
    image {
      id
      moderationStatus
    }
    pendingModerationImage {
      id
      originalFilename
      originalUrl
      thumbnailUrl
      altText
      width
      height
      isNsfw
      moderationStatus
      createdAt
      deferredAt
      deferralCount
      deferralNote
      deferredBy {
        id
        username
        displayName
      }
      uploader {
        id
        username
        displayName
      }
    }
  }
`;

export const MEDIA_MODERATION_QUEUE = gql`
  query MediaModerationQueue($communityId: ID!, $first: Int, $offset: Int) {
    mediaModerationQueue(
      communityId: $communityId
      first: $first
      offset: $offset
    ) {
      media {
        ...ModerationQueueMediaFields
        # Null unless the viewer holds canGrantItems in this community, which
        # is what gates the award widget. The server decides, not the client.
        awardRecipients {
          userId
          relations
          isMember
          user {
            id
            username
            displayName
          }
        }
      }
      total
      hasMore
    }
  }
  ${MODERATION_QUEUE_MEDIA_FRAGMENT}
`;

/**
 * Every pending media on the site, for site admins (#404). No award
 * recipients: awards are minted from a community's currency, and this queue
 * is where uploads with no community end up.
 */
export const GLOBAL_MEDIA_MODERATION_QUEUE = gql`
  query GlobalMediaModerationQueue($first: Int, $offset: Int) {
    globalMediaModerationQueue(first: $first, offset: $offset) {
      media {
        ...ModerationQueueMediaFields
      }
      total
      hasMore
    }
  }
  ${MODERATION_QUEUE_MEDIA_FRAGMENT}
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
      # Read back off the ledger, so the toast reports what was actually
      # paid rather than what the client asked for.
      currencyAwards {
        id
        userId
        amount
        currency {
          id
          code
          symbol
          name
        }
      }
    }
  }
`;

export const DEFER_IMAGE = gql`
  mutation DeferImage($input: DeferImageInput!) {
    deferImage(input: $input) {
      id
      moderationStatus
      deferredAt
      deferralCount
      deferralNote
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
