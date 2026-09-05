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
    characterLines {
      id
      character {
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
 * Both inventories, both sets of tradeable characters, and the proposer's
 * balances, because the composer shows them at once and fetching them
 * separately would leave the panes arriving at different moments.
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
      # For the link out to their full inventory. This pane is deliberately
      # narrowed to what can move; the page it links to is not.
      member {
        id
        username
        displayName
      }
      holdings {
        count
        itemType {
          id
          name
          isTradeable
        }
      }
    }
    # Only the characters already open to trades, on both sides. A closed one
    # is not a choice the composer can offer -- the server refuses it, and the
    # flag is the owner's standing answer to being asked, so showing it greyed
    # out would be the invitation the flag exists to withhold.
    myCharacters: characters(
      filters: {
        ownerId: $meId
        communityId: $communityId
        isTradeable: true
        limit: 100
      }
    ) {
      characters {
        id
        name
      }
    }
    theirCharacters: characters(
      filters: {
        ownerId: $themId
        communityId: $communityId
        isTradeable: true
        limit: 100
      }
    ) {
      characters {
        id
        name
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
          # Two different reasons a currency cannot price an offer, both of
          # which the composer has to know about or it renders a picker whose
          # every choice is rejected at send. Archived means the currency takes
          # no new transactions at all; untradeable means members may still
          # earn and spend it, just not hand it to each other.
          archivedAt
          isTradeable
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

/**
 * Decline and reply in one step.
 *
 * Not two calls from here. Declining on the button press meant abandoning the
 * composer left the member with neither offer and no way back to the one they
 * had been sent.
 */
export const COUNTER_TRADE = gql`
  mutation CounterTrade($id: ID!, $input: CreateTradeInput!) {
    counterTrade(id: $id, input: $input) {
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
  useCounterTradeMutation,
  useAcceptTradeMutation,
  useDeclineTradeMutation,
  useCancelTradeMutation,
  EffectiveTradeStatus,
  type TradesQuery,
  type TradeQuery,
  type TradeFieldsFragment,
  type CreateTradeInput,
} from "../generated/graphql";
