import { gql } from '@apollo/client';

/**
 * GraphQL operations for enum value management in the frontend.
 * Provides comprehensive enum value CRUD operations for ENUM-type traits.
 * 
 * @example Basic enum values query usage:
 * ```tsx
 * const { data, loading, error } = useEnumValuesByTraitQuery({
 *   variables: { traitId: "trait-uuid", first: 10 }
 * });
 * ```
 * 
 * @example Creating a new enum value:
 * ```tsx
 * const [createEnumValue] = useCreateEnumValueMutation({
 *   onCompleted: (data) => {
 *     console.log('Enum value created:', data.createEnumValue);
 *   }
 * });
 * 
 * await createEnumValue({
 *   variables: {
 *     createEnumValueInput: {
 *       name: "Red",
 *       traitId: "trait-uuid",
 *       order: 1
 *     }
 *   }
 * });
 * ```
 */

// Enum Value fragment for consistent field selection
export const ENUM_VALUE_FRAGMENT = gql`
  fragment EnumValueDetails on EnumValue {
    id
    name
    order
    traitId
    createdAt
    updatedAt
  }
`;

// Enum Value connection fragment for pagination consistency
export const ENUM_VALUE_CONNECTION_FRAGMENT = gql`
  fragment EnumValueConnectionDetails on EnumValueConnection {
    nodes {
      ...EnumValueDetails
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
  ${ENUM_VALUE_FRAGMENT}
`;

/**
 * Query to fetch enum values by trait ID with pagination.
 * Essential for trait-specific enum value management interfaces.
 * 
 * @param traitId - ID of the trait to get enum values for
 * @param first - Number of enum values to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns EnumValueConnection filtered by trait
 */
export const ENUM_VALUES_BY_TRAIT_QUERY = gql`
  query EnumValuesByTrait($traitId: ID!, $first: Int, $after: String) {
    enumValuesByTrait(traitId: $traitId, first: $first, after: $after) {
      ...EnumValueConnectionDetails
    }
  }
  ${ENUM_VALUE_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch a single enum value by ID with full details.
 * Used for enum value detail views and editing forms.
 * 
 * @param id - ID of the enum value to fetch
 * @returns Single EnumValue entity with all fields
 */
export const ENUM_VALUE_BY_ID_QUERY = gql`
  query EnumValueById($id: ID!) {
    enumValueById(id: $id) {
      ...EnumValueDetails
      trait {
        id
        name
        valueType
        species {
          id
          name
        }
      }
    }
  }
  ${ENUM_VALUE_FRAGMENT}
`;

/**
 * Mutation to create a new enum value for a trait.
 * Automatically associates the enum value with the specified trait.
 * 
 * @param createEnumValueInput - Enum value creation data including name, trait ID, and order
 * @returns Newly created EnumValue entity
 */
export const CREATE_ENUM_VALUE_MUTATION = gql`
  mutation CreateEnumValue($createEnumValueInput: CreateEnumValueInput!) {
    createEnumValue(createEnumValueInput: $createEnumValueInput) {
      ...EnumValueDetails
    }
  }
  ${ENUM_VALUE_FRAGMENT}
`;

/**
 * Mutation to update an existing enum value.
 * Supports partial updates - only provide fields that need to change.
 * 
 * @param id - ID of the enum value to update
 * @param updateEnumValueInput - Partial enum value update data
 * @returns Updated EnumValue entity
 */
export const UPDATE_ENUM_VALUE_MUTATION = gql`
  mutation UpdateEnumValue($id: ID!, $updateEnumValueInput: UpdateEnumValueInput!) {
    updateEnumValue(id: $id, updateEnumValueInput: $updateEnumValueInput) {
      ...EnumValueDetails
    }
  }
  ${ENUM_VALUE_FRAGMENT}
`;

/**
 * Mutation to delete an enum value.
 * WARNING: This will also delete associated enum value settings and character trait data.
 * Should include confirmation dialogs in UI implementations.
 * 
 * @param id - ID of the enum value to delete
 * @returns RemovalResponse with success confirmation
 */
export const DELETE_ENUM_VALUE_MUTATION = gql`
  mutation DeleteEnumValue($id: ID!) {
    removeEnumValue(id: $id) {
      removed
      message
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useEnumValuesByTraitQuery,
  useEnumValueByIdQuery,
  useCreateEnumValueMutation,
  useUpdateEnumValueMutation,
  useDeleteEnumValueMutation,
  
  // Types
  type EnumValuesByTraitQuery,
  type EnumValuesByTraitQueryVariables,
  type EnumValueByIdQuery,
  type EnumValueByIdQueryVariables,
  type CreateEnumValueMutation,
  type CreateEnumValueMutationVariables,
  type UpdateEnumValueMutation,
  type UpdateEnumValueMutationVariables,
  type DeleteEnumValueMutation,
  type DeleteEnumValueMutationVariables,
  type EnumValue,
  type EnumValueConnection,
  type CreateEnumValueInput,
  type UpdateEnumValueInput,
} from '../generated/graphql';