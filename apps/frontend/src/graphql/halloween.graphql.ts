import { gql } from "@apollo/client";

export const HALLOWEEN_PRIZE_FRAGMENT = gql`
  fragment HalloweenPrizeFields on HalloweenPrizeView {
    id
    name
    initialStock
    currentStock
    weight
    image
    delivery
    itemTypeId
    characterId
  }
`;

export const HALLOWEEN_WIN_FRAGMENT = gql`
  fragment HalloweenWinFields on HalloweenWin {
    id
    time
    discordUserId
    linkedUser {
      id
      username
      displayName
    }
    deviantArtName
    giftyFromDiscordUserId
    prize {
      ...HalloweenPrizeFields
    }
    deliveredAt
    deliveredBy {
      id
      username
    }
  }
  ${HALLOWEEN_PRIZE_FRAGMENT}
`;

export const HALLOWEEN_DASHBOARD_QUERY = gql`
  query HalloweenDashboard($communityId: ID!) {
    halloweenDashboard(communityId: $communityId) {
      communityId
      guildId
      settings {
        startDate
        endDate
        knocksPerDay
        resetTime
        winRate
        winChannel
      }
      summary {
        knocks
        wins
        giftiesSent
        players
      }
      prizes {
        ...HalloweenPrizeFields
      }
      wins {
        ...HalloweenWinFields
      }
    }
  }
  ${HALLOWEEN_PRIZE_FRAGMENT}
  ${HALLOWEEN_WIN_FRAGMENT}
`;

export const SET_HALLOWEEN_PRIZE_DELIVERED_MUTATION = gql`
  mutation SetHalloweenPrizeDelivered(
    $communityId: ID!
    $knockEventId: Int!
    $delivered: Boolean!
  ) {
    setHalloweenPrizeDelivered(
      communityId: $communityId
      knockEventId: $knockEventId
      delivered: $delivered
    ) {
      ...HalloweenWinFields
    }
  }
  ${HALLOWEEN_WIN_FRAGMENT}
`;
