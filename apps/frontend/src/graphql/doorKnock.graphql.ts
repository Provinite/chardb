import { gql } from "@apollo/client";

export const HALLOWEEN_DOOR_FRAGMENT = gql`
  fragment HalloweenDoorFields on HalloweenDoor {
    canKnock
    closedReason
    remainingKnocks
    knocksPerDay
  }
`;

export const HALLOWEEN_DOOR_QUERY = gql`
  query HalloweenDoor($communityId: ID!, $userId: ID!) {
    halloweenDoor(communityId: $communityId, userId: $userId) {
      ...HalloweenDoorFields
    }
  }
  ${HALLOWEEN_DOOR_FRAGMENT}
`;

export const KNOCK_ON_HALLOWEEN_DOOR_MUTATION = gql`
  mutation KnockOnHalloweenDoor($communityId: ID!, $userId: ID!) {
    knockOnHalloweenDoor(communityId: $communityId, userId: $userId) {
      knockerCandies
      knockeeCandies
      remainingKnocks
    }
  }
`;
