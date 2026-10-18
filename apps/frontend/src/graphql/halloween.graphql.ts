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
        toDeliver
      }
      prizes {
        ...HalloweenPrizeFields
      }
    }
  }
  ${HALLOWEEN_PRIZE_FRAGMENT}
`;

export const HALLOWEEN_WINS_QUERY = gql`
  query HalloweenWins(
    $communityId: ID!
    $filter: HalloweenWinFilter
    $limit: Int
    $offset: Int
  ) {
    halloweenWins(
      communityId: $communityId
      filter: $filter
      limit: $limit
      offset: $offset
    ) {
      total
      hasMore
      wins {
        ...HalloweenWinFields
      }
    }
  }
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

export const HALLOWEEN_SETTINGS_FRAGMENT = gql`
  fragment HalloweenSettingsFields on HalloweenEventSettings {
    startDate
    endDate
    knocksPerDay
    resetTime
    winRate
    winChannel
  }
`;

export const UPDATE_HALLOWEEN_SETTINGS_MUTATION = gql`
  mutation UpdateHalloweenSettings(
    $communityId: ID!
    $input: HalloweenSettingsInput!
  ) {
    updateHalloweenSettings(communityId: $communityId, input: $input) {
      ...HalloweenSettingsFields
    }
  }
  ${HALLOWEEN_SETTINGS_FRAGMENT}
`;

export const CREATE_HALLOWEEN_PRIZE_MUTATION = gql`
  mutation CreateHalloweenPrize(
    $communityId: ID!
    $input: CreateHalloweenPrizeInput!
  ) {
    createHalloweenPrize(communityId: $communityId, input: $input) {
      ...HalloweenPrizeFields
    }
  }
  ${HALLOWEEN_PRIZE_FRAGMENT}
`;

export const UPDATE_HALLOWEEN_PRIZE_MUTATION = gql`
  mutation UpdateHalloweenPrize(
    $communityId: ID!
    $prizeId: ID!
    $input: UpdateHalloweenPrizeInput!
  ) {
    updateHalloweenPrize(
      communityId: $communityId
      prizeId: $prizeId
      input: $input
    ) {
      ...HalloweenPrizeFields
    }
  }
  ${HALLOWEEN_PRIZE_FRAGMENT}
`;

export const REMOVE_HALLOWEEN_PRIZE_MUTATION = gql`
  mutation RemoveHalloweenPrize($communityId: ID!, $prizeId: ID!) {
    removeHalloweenPrize(communityId: $communityId, prizeId: $prizeId)
  }
`;

export const HALLOWEEN_PRIZE_OPTIONS_QUERY = gql`
  query HalloweenPrizeOptions($communityId: ID!, $search: String) {
    halloweenPrizeOptions(communityId: $communityId, search: $search) {
      itemTypes {
        id
        name
        image
      }
      characters {
        id
        name
        image
      }
    }
  }
`;
