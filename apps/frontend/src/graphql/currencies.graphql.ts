import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";

// ==================== Fragments ====================

export const CURRENCY_FRAGMENT = gql`
  fragment CurrencyFields on Currency {
    id
    communityId
    name
    code
    symbol
    description
    colorId
    archivedAt
    createdAt
    updatedAt
  }
`;

export const CURRENCY_TRANSACTION_FRAGMENT = gql`
  fragment CurrencyTransactionFields on CurrencyTransaction {
    id
    currencyId
    userId
    kind
    amount
    balanceAfter
    batchId
    counterpartyId
    actorUserId
    actorLabel
    reason
    source
    sourceId
    # Null for viewers without item permissions. The server decides, so the
    # page never has to.
    staffNote
    createdAt
    currency {
      ...CurrencyFields
    }
    user {
      ...UserBasic
    }
    counterparty {
      ...UserBasic
    }
    actorUser {
      ...UserBasic
    }
  }
  ${CURRENCY_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ==================== Queries ====================

export const GET_CURRENCIES = gql`
  query GetCurrencies($communityId: ID!, $includeArchived: Boolean) {
    currencies(communityId: $communityId, includeArchived: $includeArchived) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const GET_CURRENCY_SUPPLY = gql`
  query GetCurrencySupply($communityId: ID!) {
    currencySupply(communityId: $communityId) {
      currency {
        ...CurrencyFields
      }
      inCirculation
      holders
      mintedLast30Days
      removedLast30Days
      largestBalance
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const GET_MEMBER_WALLET = gql`
  query GetMemberWallet($communityId: ID!, $userId: ID!) {
    memberWallet(communityId: $communityId, userId: $userId) {
      userId
      communityId
      balances {
        currency {
          ...CurrencyFields
        }
        amount
        updatedAt
      }
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const GET_CURRENCY_TRANSACTIONS = gql`
  query GetCurrencyTransactions($filters: CurrencyTransactionFiltersInput!) {
    currencyTransactions(filters: $filters) {
      transactions {
        ...CurrencyTransactionFields
      }
      total
      hasMore
    }
  }
  ${CURRENCY_TRANSACTION_FRAGMENT}
`;

export const GET_CURRENCY_HOLDERS = gql`
  query GetCurrencyHolders($currencyId: ID!, $limit: Int, $offset: Int) {
    currencyHolders(currencyId: $currencyId, limit: $limit, offset: $offset) {
      id
      userId
      amount
      updatedAt
      currency {
        ...CurrencyFields
      }
      user {
        ...UserBasic
      }
    }
  }
  ${CURRENCY_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ==================== Mutations ====================

export const CREATE_CURRENCY = gql`
  mutation CreateCurrency($input: CreateCurrencyInput!) {
    createCurrency(input: $input) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const UPDATE_CURRENCY = gql`
  mutation UpdateCurrency($id: ID!, $input: UpdateCurrencyInput!) {
    updateCurrency(id: $id, input: $input) {
      ...CurrencyFields
    }
  }
  ${CURRENCY_FRAGMENT}
`;

export const MINT_CURRENCY = gql`
  mutation MintCurrency($input: MintCurrencyInput!) {
    mintCurrency(input: $input)
  }
`;

export const BURN_CURRENCY = gql`
  mutation BurnCurrency($input: BurnCurrencyInput!) {
    burnCurrency(input: $input)
  }
`;

export const TRANSFER_CURRENCY = gql`
  mutation TransferCurrency($input: TransferCurrencyInput!) {
    transferCurrency(input: $input)
  }
`;
