import { gql } from "@apollo/client";

export const HALLOWEEN_PRIZE_LISTING_FRAGMENT = gql`
  fragment HalloweenPrizeListingFields on HalloweenPrizeListing {
    id
    name
    image
    initialStock
    currentStock
    url
  }
`;

export const HALLOWEEN_PUBLIC_WIN_FRAGMENT = gql`
  fragment HalloweenPublicWinFields on HalloweenPublicWin {
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
  ${HALLOWEEN_PRIZE_LISTING_FRAGMENT}
`;

/** The public prize list: open to anyone, signed in or not. */
export const HALLOWEEN_PRIZE_LIST_QUERY = gql`
  query HalloweenPrizeList($communityId: ID!) {
    halloweenPrizes(communityId: $communityId) {
      ...HalloweenPrizeListingFields
    }
    halloweenRecentWins(communityId: $communityId) {
      ...HalloweenPublicWinFields
    }
  }
  ${HALLOWEEN_PRIZE_LISTING_FRAGMENT}
  ${HALLOWEEN_PUBLIC_WIN_FRAGMENT}
`;
