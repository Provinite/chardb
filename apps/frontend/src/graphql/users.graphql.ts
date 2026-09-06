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
      }
      website
      dateOfBirth
      isVerified
      createdAt
      updatedAt
    }
  }
`;
