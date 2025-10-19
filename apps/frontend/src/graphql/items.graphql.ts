import { gql } from "@apollo/client";

// ==================== ItemType Fragments ====================

export const ITEM_TYPE_FRAGMENT = gql`
  fragment ItemTypeFields on ItemType {
    id
    name
    description
    communityId
    category
    isStackable
    maxStackSize
    isTradeable
    isConsumable
    imageUrl
    iconUrl
    color
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
    quantity
    metadata
    createdAt
    updatedAt
    itemType {
      ...ItemTypeFields
    }
    owner {
      id
      username
      displayName
      avatarUrl
    }
  }
  ${ITEM_TYPE_FRAGMENT}
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

// ==================== Item Queries ====================

export const GET_ITEMS = gql`
  query GetItems($filters: ItemFiltersInput) {
    items(filters: $filters) {
      items {
        ...ItemFields
      }
      total
      hasMore
    }
  }
  ${ITEM_FRAGMENT}
`;

export const GET_MY_ITEMS = gql`
  query GetMyItems($filters: ItemFiltersInput) {
    myItems(filters: $filters) {
      items {
        ...ItemFields
      }
      total
      hasMore
    }
  }
  ${ITEM_FRAGMENT}
`;

export const GET_ITEM = gql`
  query GetItem($id: ID!) {
    item(id: $id) {
      ...ItemFields
    }
  }
  ${ITEM_FRAGMENT}
`;

// ==================== Item Mutations ====================

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

export const DELETE_ITEM = gql`
  mutation DeleteItem($id: ID!) {
    deleteItem(id: $id)
  }
`;
