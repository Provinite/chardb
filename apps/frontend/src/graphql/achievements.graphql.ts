import { gql } from "@apollo/client";

/**
 * One person, as a community member profile shows them: who they are and
 * what they earned in that community, in one request so the page renders
 * whole.
 */
export const COMMUNITY_MEMBER_PROFILE = gql`
  query CommunityMemberProfile($username: String!, $communityId: ID!) {
    user(username: $username) {
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
      achievements(communityId: $communityId) {
        id
        name
        description
        imagePath
        earnedAt
      }
    }
  }
`;
