import { gql } from "@apollo/client";

export const HALLOWEEN_PRIZE_LISTING_FRAGMENT = gql`
  fragment HalloweenPrizeListingFields on HalloweenPrizeListing {
    id
    name
    image
    initialStock
    currentStock
    itemTypeId
    characterId
  }
`;

/** The public prize list: open to anyone, signed in or not. */
export const HALLOWEEN_PRIZE_LIST_QUERY = gql`
  query HalloweenPrizeList($communityId: ID!) {
    halloweenPrizes(communityId: $communityId) {
      ...HalloweenPrizeListingFields
    }
    halloweenRecentWins(communityId: $communityId) {
      id
      time
      prize {
        ...HalloweenPrizeListingFields
      }
      winner {
        kind
        displayName
        url
      }
    }
  }
  ${HALLOWEEN_PRIZE_LISTING_FRAGMENT}
`;
