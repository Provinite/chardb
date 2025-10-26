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
    trait {
      id
      name
      valueType
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
