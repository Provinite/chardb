import { gql } from '@apollo/client';

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
          id
          username
          displayName
          avatarUrl
        }
      }
      recentGalleries {
        id
        name
        description
        createdAt
        updatedAt
        owner {
          id
          username
          displayName
          avatarUrl
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
          id
          username
          displayName
          avatarUrl
        }
        image {
          id
          filename
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
          id
          username
          displayName
          avatarUrl
        }
      }
      isOwnProfile
      canViewPrivateContent
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