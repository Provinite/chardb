import { gql } from "@apollo/client";

/**
 * One person, as a community member profile shows them: who they are and
 * what they earned in that community, in one request so the page renders
 * whole.
 */
/**
 * Whether the person on a member profile belongs to the community at all.
 * Signed-in viewers only: the server answers it no more widely than the
 * members list.
 */
export const IS_MEMBER_OF = gql`
  query IsMemberOf($username: String!, $communityId: ID!) {
    user(username: $username) {
      id
      isMemberOf(communityId: $communityId)
    }
  }
`;

export const COMMUNITY_MEMBER_PROFILE = gql`
  query CommunityMemberProfile($username: String!, $communityId: ID!) {
    user(username: $username) {
      id
      username
      displayName
      bio
      followersCount
      followingCount
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
