import { gql } from '@apollo/client';

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
        location
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
        createdAt
        owner {
          ...UserBasic
        }
        image {
          id
          originalUrl
          thumbnailUrl
        }
      }
      featuredCharacters {
        id
        name
        species {
          id
          name
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
      location
      website
      dateOfBirth
      isVerified
      createdAt
      updatedAt
    }
  }
`;