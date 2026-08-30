import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";

// ==================== ItemType Fragments ====================

export const ITEM_TYPE_FRAGMENT = gql`
  fragment ItemTypeFields on ItemType {
    id
    name
    description
    communityId
    category
    isTradeable
    isConsumable
    image {
      id
      originalUrl
      thumbnailUrl
      altText
    }
    colorId
    color {
      id
      name
      hexCode
    }
    metadata
    createdAt
    updatedAt
  }
`;

// ==================== Item Fragments ====================

export const ITEM_FRAGMENT = gql`
  fragment ItemFields on Item {
    id
    itemTypeId
    ownerId
    destroyedAt
    metadata
    createdAt
    updatedAt
    pendingOwnership {
      id
      provider
      providerAccountId
      createdAt
    }
    itemType {
      ...ItemTypeFields
    }
    owner {
      ...UserBasic
    }
  }
  ${ITEM_TYPE_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ==================== ItemType Queries ====================

export const GET_ITEM_TYPES = gql`
  query GetItemTypes($filters: ItemTypeFiltersInput) {
    itemTypes(filters: $filters) {
      itemTypes {
        ...ItemTypeFields
      }
      total
      hasMore
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const GET_ITEM_TYPE = gql`
  query GetItemType($id: ID!) {
    itemType(id: $id) {
      ...ItemTypeFields
      community {
        id
        name
      }
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

// ==================== ItemType Mutations ====================

export const CREATE_ITEM_TYPE = gql`
  mutation CreateItemType($input: CreateItemTypeInput!) {
    createItemType(input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const UPDATE_ITEM_TYPE = gql`
  mutation UpdateItemType($id: ID!, $input: UpdateItemTypeInput!) {
    updateItemType(id: $id, input: $input) {
      ...ItemTypeFields
    }
  }
  ${ITEM_TYPE_FRAGMENT}
`;

export const DELETE_ITEM_TYPE = gql`
  mutation DeleteItemType($id: ID!) {
    deleteItemType(id: $id)
  }
`;

// ==================== Inventory Fragments ====================

export const INVENTORY_FRAGMENT = gql`
  fragment InventoryFields on Inventory {
    communityId
    totalItems
    items {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

// ==================== Item Queries ====================

export const GET_MY_INVENTORY = gql`
  query GetMyInventory($communityId: ID) {
    me {
      id
      username
      inventories(communityId: $communityId) {
        ...InventoryFields
      }
    }
  }
  ${INVENTORY_FRAGMENT}
`;

// ==================== Item Mutations ====================

// Returns one Item per unit granted -- there is no stacking.
export const GRANT_ITEM = gql`
  mutation GrantItem($input: GrantItemInput!) {
    grantItem(input: $input) {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

export const UPDATE_ITEM = gql`
  mutation UpdateItem($id: ID!, $input: UpdateItemInput!) {
    updateItem(id: $id, input: $input) {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

// Soft: destroyed items keep their provenance. Returns the count revoked.
export const REVOKE_ITEMS = gql`
  mutation RevokeItems($itemIds: [ID!]!, $reason: String!, $staffNote: String) {
    revokeItems(itemIds: $itemIds, reason: $reason, staffNote: $staffNote)
  }
`;

// ==================== Item Ledger ====================

export const ITEM_TRANSACTION_FRAGMENT = gql`
  fragment ItemTransactionFields on ItemTransaction {
    id
    communityId
    kind
    batchId
    batchSize
    reason
    # Resolves to null for viewers without item permissions, so the same
    # document serves staff and members.
    staffNote
    actorLabel
    createdAt
    itemId
    itemType {
      id
      name
      category
      color {
        id
        hexCode
      }
      image {
        id
        thumbnailUrl
        originalUrl
        altText
      }
    }
    fromUser {
      ...UserBasic
    }
    toUser {
      ...UserBasic
    }
    actorUser {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_ITEM_TRANSACTIONS = gql`
  query GetItemTransactions($filters: ItemTransactionFiltersInput!) {
    itemTransactions(filters: $filters) {
      transactions {
        ...ItemTransactionFields
      }
      total
      hasMore
    }
  }
  ${ITEM_TRANSACTION_FRAGMENT}
`;

export const GET_ITEM_PROVENANCE = gql`
  query GetItemProvenance($itemId: ID!) {
    itemProvenance(itemId: $itemId) {
      ...ItemTransactionFields
    }
  }
  ${ITEM_TRANSACTION_FRAGMENT}
`;
