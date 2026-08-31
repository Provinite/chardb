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
        # A row line names no type of its own, so without this the offer page
        # can only say "1 item" -- which is not something anyone can answer.
        itemType {
          id
          name
        }
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

/**
 * Everything the composer needs, in one round trip.
 *
 * Both inventories and the proposer's balances, because the composer shows all
 * three at once and fetching them separately would leave the three panes
 * arriving at different moments.
 */
export const TRADE_COMPOSER_QUERY = gql`
  query TradeComposer($communityId: ID!, $meId: ID!, $themId: ID!) {
    mine: memberHoldings(communityId: $communityId, userId: $meId) {
      holdings {
        count
        itemType {
          id
          name
          isTradeable
        }
        items {
          id
        }
      }
    }
    theirs: memberHoldings(communityId: $communityId, userId: $themId) {
      holdings {
        count
        itemType {
          id
          name
          isTradeable
        }
      }
    }
    wallet: memberWallet(communityId: $communityId, userId: $meId) {
      balances {
        amount
        currency {
          id
          name
          code
          symbol
          # An archived currency still holds balances and stays readable, but
          # refuses new transactions -- so the composer has to know not to
          # price an offer in one.
          archivedAt
        }
      }
    }
  }
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
  useTradeComposerQuery,
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
