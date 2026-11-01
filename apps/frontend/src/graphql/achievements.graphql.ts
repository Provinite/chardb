import { gql } from "@apollo/client";

/** What one member earned in the community being viewed. */
export const COMMUNITY_MEMBER_ACHIEVEMENTS = gql`
  query CommunityMemberAchievements($communityId: ID!, $userId: ID!) {
    communityMemberAchievements(communityId: $communityId, userId: $userId) {
      id
      name
      description
      imagePath
      earnedAt
    }
  }
`;
