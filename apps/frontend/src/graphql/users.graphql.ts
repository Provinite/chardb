import { gql } from "@apollo/client";

// Shared user fragment for basic user info with avatar
export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasic on User {
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

/**
 * Enough of a member to title a page about them, and no more.
 *
 * Deliberately not `GET_USER_PROFILE`: that pulls stats, recent characters,
 * recent galleries and recent images to render one heading, and the per-owner
 * listing pages need a name and an id.
 */
export const USER_IDENTITY = gql`
  query UserIdentity($username: String!) {
    user(username: $username) {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_USER_PROFILE = gql`
  query GetUserProfile($username: String!) {
    userProfile(username: $username) {
      user {
        id
        username
        displayName
        bio
        avatarImage {
          id
          originalUrl
          thumbnailUrl
          altText
        }
        website
        isVerified
        createdAt
      }
      stats {
        charactersCount
        galleriesCount
        imagesCount
        totalViews
        totalLikes
        followersCount
        followingCount
      }
      recentCharacters {
        id
        name
        species {
          id
          name
          community {
            id
            # The host the character is served from; a profile is at the apex.
            slug
          }
        }
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
      }
      recentGalleries {
        id
        name
        description
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
        character {
          id
          name
        }
      }
      recentMedia {
        id
        title
        description
        visibility
        createdAt
        owner {
          ...UserBasic
        }
        image {
          id
          originalUrl
          thumbnailUrl
          altText
        }
        textContent {
          content
          wordCount
        }
      }
      featuredCharacters {
        id
        name
        species {
          id
          name
          community {
            id
            slug
          }
        }
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
      }
      isOwnProfile
      canViewPrivateContent
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * The user's own image media, as little of it as the avatar picker needs.
 *
 * Deliberately not `GET_MY_MEDIA`: that selects tags, likes, owner, gallery,
 * character and text content to render a library page, where a grid of squares
 * needs a URL. It also does not ask for the two fields this does --
 * `moderationStatus`, to grey out what cannot be chosen yet, and
 * `thumbnailCrop`, so re-framing an already-framed picture starts from where
 * it was left rather than back at the centre.
 */
export const MY_AVATAR_CANDIDATES = gql`
  query MyAvatarCandidates($filters: MediaFiltersInput) {
    myMedia(filters: $filters) {
      media {
        id
        title
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          moderationStatus
          thumbnailCrop {
            x
            y
            width
            height
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_USER_STATS = gql`
  query GetUserStats($userId: ID!) {
    userStats(userId: $userId) {
      charactersCount
      galleriesCount
      imagesCount
      totalViews
      totalLikes
      followersCount
      followingCount
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateUserInput!) {
    updateProfile(input: $input) {
      id
      username
      displayName
      bio
      avatarImage {
        id
        originalUrl
        thumbnailUrl
        altText
        thumbnailCrop {
          x
          y
          width
          height
        }
      }
      # Null unless an avatar is set but not being served. The avatarImage
      # above goes null for anything unapproved, which on its own is
      # indistinguishable from the save having failed.
      avatarImageModerationStatus
      website
      dateOfBirth
      isVerified
      createdAt
      updatedAt
    }
  }
`;
