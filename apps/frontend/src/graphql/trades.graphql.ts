import { gql } from "@apollo/client";

// ==================== Fragments ====================

/** Everything a trade row or page needs, in one shape both surfaces share. */
export const TRADE_FRAGMENT = gql`
  fragment TradeFields on Trade {
    id
    status
    note
    expiresAt
    respondedAt
    settlementBatchId
    createdAt
    community {
      id
      name
    }
    proposer {
      id
      username
      displayName
      avatarImage {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    recipient {
      id
      username
      displayName
      avatarImage {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    items {
      id
      quantity
      item {
        id
        itemTypeId
      }
      itemType {
        id
        name
      }
      sourceUser {
        id
        username
        displayName
      }
      destinationUser {
        id
        username
        displayName
      }
    }
    currencyLines {
      id
      amount
      currency {
        id
        name
        code
        symbol
      }
      sourceUser {
        id
        username
        displayName
      }
      destinationUser {
        id
        username
        displayName
      }
    }
  }
`;

// ==================== Queries ====================

export const TRADES_QUERY = gql`
  query Trades(
    $communityId: ID
    $status: EffectiveTradeStatus
    $first: Int
    $after: String
  ) {
    trades(
      communityId: $communityId
      status: $status
      first: $first
      after: $after
    ) {
      nodes {
        ...TradeFields
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
  ${TRADE_FRAGMENT}
`;

export const TRADE_QUERY = gql`
  query Trade($id: ID!) {
    trade(id: $id) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

// ==================== Mutations ====================

export const PROPOSE_TRADE = gql`
  mutation ProposeTrade($input: CreateTradeInput!) {
    proposeTrade(input: $input) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

export const ACCEPT_TRADE = gql`
  mutation AcceptTrade($id: ID!, $selections: [TradeSelectionInput!]) {
    acceptTrade(id: $id, selections: $selections) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

export const DECLINE_TRADE = gql`
  mutation DeclineTrade($id: ID!) {
    declineTrade(id: $id) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

export const CANCEL_TRADE = gql`
  mutation CancelTrade($id: ID!) {
    cancelTrade(id: $id) {
      ...TradeFields
    }
  }
  ${TRADE_FRAGMENT}
`;

export {
  useTradesQuery,
  useTradeQuery,
  useProposeTradeMutation,
  useAcceptTradeMutation,
  useDeclineTradeMutation,
  useCancelTradeMutation,
  EffectiveTradeStatus,
  type TradesQuery,
  type TradeQuery,
  type TradeFieldsFragment,
  type CreateTradeInput,
} from "../generated/graphql";
