import { gql } from "@apollo/client";

export const HALLOWEEN_CANDY_OFFER_FRAGMENT = gql`
  fragment HalloweenCandyOfferFields on HalloweenCandyOffer {
    id
    wantSlug
    status
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

export const CANDY_SWAP_OFFERS_QUERY = gql`
  query CandySwapOffers($communityId: ID!) {
    halloweenCandySwapOffers(communityId: $communityId) {
      ...HalloweenCandyOfferFields
    }
  }
  ${HALLOWEEN_CANDY_OFFER_FRAGMENT}
`;

export const PLACE_CANDY_OFFER = gql`
  mutation PlaceHalloweenCandyOffer(
    $communityId: ID!
    $candyIds: [Int!]!
    $wantSlug: String!
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
  mutation AcceptHalloweenCandyOffer($communityId: ID!, $offerId: ID!) {
    acceptHalloweenCandyOffer(communityId: $communityId, offerId: $offerId) {
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
