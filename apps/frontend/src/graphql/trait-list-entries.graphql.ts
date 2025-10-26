import { gql } from "@apollo/client";

/**
 * Fragment for TraitListEntry details including trait and order information
 */
export const TRAIT_LIST_ENTRY_DETAILS = gql`
  fragment TraitListEntryDetails on TraitListEntry {
    id
    order
    required
    valueType
    defaultValueString
    defaultValueInt
    defaultValueTimestamp
    traitId
    speciesVariantId
    createdAt
    updatedAt
    trait {
      id
      name
      valueType
      enumValues {
        id
        name
        order
      }
    }
  }
`;

/**
 * Query to fetch all trait list entries for a specific species variant
 * Used for managing trait display order
 */
export const GET_TRAIT_LIST_ENTRIES_BY_VARIANT = gql`
  query TraitListEntriesByVariant($variantId: ID!, $first: Int) {
    traitListEntriesBySpeciesVariant(
      speciesVariantId: $variantId
      first: $first
    ) {
      nodes {
        ...TraitListEntryDetails
      }
      totalCount
      hasNextPage
    }
  }
  ${TRAIT_LIST_ENTRY_DETAILS}
`;

/**
 * Mutation to batch update trait display orders for a species variant
 */
export const UPDATE_TRAIT_ORDERS = gql`
  mutation UpdateTraitOrders($input: UpdateTraitOrdersInput!) {
    updateTraitOrders(input: $input) {
      id
      order
      trait {
        id
        name
      }
    }
  }
`;

/**
 * Mutation to create a new trait list entry (add trait to variant)
 */
export const CREATE_TRAIT_LIST_ENTRY = gql`
  mutation CreateTraitListEntry($input: CreateTraitListEntryInput!) {
    createTraitListEntry(createTraitListEntryInput: $input) {
      ...TraitListEntryDetails
    }
  }
  ${TRAIT_LIST_ENTRY_DETAILS}
`;

/**
 * Mutation to update a trait list entry (required, defaults, etc.)
 */
export const UPDATE_TRAIT_LIST_ENTRY = gql`
  mutation UpdateTraitListEntry($id: ID!, $input: UpdateTraitListEntryInput!) {
    updateTraitListEntry(id: $id, updateTraitListEntryInput: $input) {
      ...TraitListEntryDetails
    }
  }
  ${TRAIT_LIST_ENTRY_DETAILS}
`;

/**
 * Mutation to remove a trait list entry (remove trait from variant)
 */
export const REMOVE_TRAIT_LIST_ENTRY = gql`
  mutation RemoveTraitListEntry($id: ID!) {
    removeTraitListEntry(id: $id) {
      removed
      message
    }
  }
`;
