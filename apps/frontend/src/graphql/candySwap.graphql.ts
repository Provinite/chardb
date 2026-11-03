import { gql } from "@apollo/client";

export const HALLOWEEN_CANDY_OFFER_FRAGMENT = gql`
  fragment HalloweenCandyOfferFields on HalloweenCandyOffer {
    id
    wantSlug
    status
    host
    createdAt
    candies {
      id
      slug
    }
  }
`;

export const HALLOWEEN_CANDY_TRADE_FRAGMENT = gql`
  fragment HalloweenCandyTradeFields on HalloweenCandyTradeRecord {
    id
    gave
    received
    createdAt
    host
    with {
      id
      username
      displayName
    }
  }
`;

export const CANDY_SWAP_QUERY = gql`
  query CandySwap($communityId: ID!) {
    halloweenCandyTypes
    halloweenCandySwapLimits {
      maxOpenOffers
      maxOfferedCandies
    }
    myHalloweenCandies(communityId: $communityId) {
      id
      slug
    }
    myHalloweenCandyOffers(communityId: $communityId) {
      ...HalloweenCandyOfferFields
    }
    myHalloweenCandyTrades(communityId: $communityId) {
      ...HalloweenCandyTradeFields
    }
  }
  ${HALLOWEEN_CANDY_OFFER_FRAGMENT}
  ${HALLOWEEN_CANDY_TRADE_FRAGMENT}
`;

export const HALLOWEEN_CANDY_SWAP_LISTING_FRAGMENT = gql`
  fragment HalloweenCandySwapListingFields on HalloweenCandySwapListing {
    canTake
    offer {
      ...HalloweenCandyOfferFields
    }
  }
  ${HALLOWEEN_CANDY_OFFER_FRAGMENT}
`;

export const HALLOWEEN_CANDY_SWAP_TRADE_FRAGMENT = gql`
  fragment HalloweenCandySwapTradeFields on HalloweenCandySwapTrade {
    id
    host
    offered
    paid
    createdAt
    offerer {
      id
      username
      displayName
    }
    taker {
      id
      username
      displayName
    }
  }
`;

export const CANDY_SWAP_ACTIVITY_FRAGMENT = gql`
  fragment CandySwapActivityFields on HalloweenCandySwapMarket {
    openOffers
    tradesLastDay
    available
    readyToTrade
  }
`;

export const CANDY_SWAP_MARKET_QUERY = gql`
  query CandySwapMarket($communityId: ID!) {
    halloweenCandySwapMarket(communityId: $communityId) {
      ...CandySwapActivityFields
      listings {
        ...HalloweenCandySwapListingFields
      }
    }
  }
  ${CANDY_SWAP_ACTIVITY_FRAGMENT}
  ${HALLOWEEN_CANDY_SWAP_LISTING_FRAGMENT}
`;

export const CANDY_SWAP_RECENT_TRADES_QUERY = gql`
  query CandySwapRecentTrades($communityId: ID!) {
    halloweenCandySwapRecentTrades(communityId: $communityId) {
      ...HalloweenCandySwapTradeFields
    }
  }
  ${HALLOWEEN_CANDY_SWAP_TRADE_FRAGMENT}
`;

export const PLACE_CANDY_OFFER = gql`
  mutation PlaceHalloweenCandyOffer(
    $communityId: ID!
    $candyIds: [Int!]!
    $wantSlug: String
  ) {
    placeHalloweenCandyOffer(
      communityId: $communityId
      candyIds: $candyIds
      wantSlug: $wantSlug
    ) {
      offer {
        ...HalloweenCandyOfferFields
      }
      trade {
        ...HalloweenCandyTradeFields
      }
    }
  }
  ${HALLOWEEN_CANDY_OFFER_FRAGMENT}
  ${HALLOWEEN_CANDY_TRADE_FRAGMENT}
`;

export const ACCEPT_CANDY_OFFER = gql`
  mutation AcceptHalloweenCandyOffer(
    $communityId: ID!
    $offerId: ID!
    $giveSlug: String
  ) {
    acceptHalloweenCandyOffer(
      communityId: $communityId
      offerId: $offerId
      giveSlug: $giveSlug
    ) {
      ...HalloweenCandyTradeFields
    }
  }
  ${HALLOWEEN_CANDY_TRADE_FRAGMENT}
`;

export const CANCEL_CANDY_OFFER = gql`
  mutation CancelHalloweenCandyOffer($communityId: ID!, $offerId: ID!) {
    cancelHalloweenCandyOffer(communityId: $communityId, offerId: $offerId)
  }
`;
