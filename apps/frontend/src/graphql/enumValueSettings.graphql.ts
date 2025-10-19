import { gql } from '@apollo/client';

/**
 * GraphQL operations for enum value settings management in the frontend.
 * Provides comprehensive enum value settings CRUD operations for configuring
 * which enum values are enabled/disabled for specific species variants.
 *
 * EnumValueSettings create a many-to-many relationship between SpeciesVariants
 * and EnumValues, allowing variants to have specific enum options available.
 *
 * @example Use case:
 * ```
 * Species: Dragon
 * Trait: Scale Color (ENUM)
 * Enum Values: Red, Blue, Green, Gold
 * Variants: Fire Dragon, Ice Dragon, Forest Dragon
 * Settings:
 *   - Fire Dragon: Can have Red, Gold
 *   - Ice Dragon: Can have Blue
 *   - Forest Dragon: Can have Green, Blue
 * ```
 *
 * @example Basic enum value settings query usage:
 * ```tsx
 * const { data, loading, error } = useEnumValueSettingsBySpeciesVariantQuery({
 *   variables: { speciesVariantId: "variant-uuid", first: 10 }
 * });
 * ```
 *
 * @example Creating a new enum value setting:
 * ```tsx
 * const [createEnumValueSetting] = useCreateEnumValueSettingMutation({
 *   onCompleted: (data) => {
 *     console.log('Enum value setting created:', data.createEnumValueSetting);
 *   }
 * });
 *
 * await createEnumValueSetting({
 *   variables: {
 *     createEnumValueSettingInput: {
 *       enumValueId: "enum-value-uuid",
 *       speciesVariantId: "variant-uuid"
 *     }
 *   }
 * });
 * ```
 */

// Enum Value Setting fragment for consistent field selection
export const ENUM_VALUE_SETTING_FRAGMENT = gql`
  fragment EnumValueSettingDetails on EnumValueSetting {
    id
    enumValueId
    speciesVariantId
    createdAt
    updatedAt
  }
`;

// Enum Value Setting connection fragment for pagination consistency
export const ENUM_VALUE_SETTING_CONNECTION_FRAGMENT = gql`
  fragment EnumValueSettingConnectionDetails on EnumValueSettingConnection {
    nodes {
      ...EnumValueSettingDetails
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
  ${ENUM_VALUE_SETTING_FRAGMENT}
`;

/**
 * Query to fetch all enum value settings with pagination.
 * Returns a paginated list of all enum value settings in the system.
 *
 * @param first - Number of settings to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns EnumValueSettingConnection with all settings
 */
export const ENUM_VALUE_SETTINGS_QUERY = gql`
  query EnumValueSettings($first: Int, $after: String) {
    enumValueSettings(first: $first, after: $after) {
      ...EnumValueSettingConnectionDetails
    }
  }
  ${ENUM_VALUE_SETTING_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch enum value settings by species variant ID with pagination.
 * Essential for variant-specific enum value configuration interfaces.
 *
 * @param speciesVariantId - ID of the species variant to get settings for
 * @param first - Number of settings to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns EnumValueSettingConnection filtered by species variant
 */
export const ENUM_VALUE_SETTINGS_BY_SPECIES_VARIANT_QUERY = gql`
  query EnumValueSettingsBySpeciesVariant(
    $speciesVariantId: ID!
    $first: Int
    $after: String
  ) {
    enumValueSettingsBySpeciesVariant(
      speciesVariantId: $speciesVariantId
      first: $first
      after: $after
    ) {
      ...EnumValueSettingConnectionDetails
    }
  }
  ${ENUM_VALUE_SETTING_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch enum value settings by enum value ID with pagination.
 * Useful for seeing which variants have a specific enum value enabled.
 *
 * @param enumValueId - ID of the enum value to get settings for
 * @param first - Number of settings to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns EnumValueSettingConnection filtered by enum value
 */
export const ENUM_VALUE_SETTINGS_BY_ENUM_VALUE_QUERY = gql`
  query EnumValueSettingsByEnumValue(
    $enumValueId: ID!
    $first: Int
    $after: String
  ) {
    enumValueSettingsByEnumValue(
      enumValueId: $enumValueId
      first: $first
      after: $after
    ) {
      ...EnumValueSettingConnectionDetails
    }
  }
  ${ENUM_VALUE_SETTING_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch a single enum value setting by ID with full details.
 * Used for enum value setting detail views and editing forms.
 *
 * @param id - ID of the enum value setting to fetch
 * @returns Single EnumValueSetting entity with all fields
 */
export const ENUM_VALUE_SETTING_BY_ID_QUERY = gql`
  query EnumValueSettingById($id: ID!) {
    enumValueSettingById(id: $id) {
      ...EnumValueSettingDetails
    }
  }
  ${ENUM_VALUE_SETTING_FRAGMENT}
`;

/**
 * Mutation to create a new enum value setting.
 * Enables a specific enum value for a species variant.
 *
 * @param createEnumValueSettingInput - Setting creation data including enum value ID and variant ID
 * @returns Newly created EnumValueSetting entity
 */
export const CREATE_ENUM_VALUE_SETTING_MUTATION = gql`
  mutation CreateEnumValueSetting(
    $createEnumValueSettingInput: CreateEnumValueSettingInput!
  ) {
    createEnumValueSetting(
      createEnumValueSettingInput: $createEnumValueSettingInput
    ) {
      ...EnumValueSettingDetails
    }
  }
  ${ENUM_VALUE_SETTING_FRAGMENT}
`;

/**
 * Mutation to update an existing enum value setting.
 * Supports changing which enum value or variant the setting applies to.
 *
 * @param id - ID of the enum value setting to update
 * @param updateEnumValueSettingInput - Partial setting update data
 * @returns Updated EnumValueSetting entity
 */
export const UPDATE_ENUM_VALUE_SETTING_MUTATION = gql`
  mutation UpdateEnumValueSetting(
    $id: ID!
    $updateEnumValueSettingInput: UpdateEnumValueSettingInput!
  ) {
    updateEnumValueSetting(
      id: $id
      updateEnumValueSettingInput: $updateEnumValueSettingInput
    ) {
      ...EnumValueSettingDetails
    }
  }
  ${ENUM_VALUE_SETTING_FRAGMENT}
`;

/**
 * Mutation to delete an enum value setting.
 * Disables a specific enum value for a species variant.
 *
 * @param id - ID of the enum value setting to delete
 * @returns RemovalResponse with success confirmation
 */
export const DELETE_ENUM_VALUE_SETTING_MUTATION = gql`
  mutation DeleteEnumValueSetting($id: ID!) {
    removeEnumValueSetting(id: $id) {
      removed
      message
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useEnumValueSettingsQuery,
  useEnumValueSettingsBySpeciesVariantQuery,
  useEnumValueSettingsByEnumValueQuery,
  useEnumValueSettingByIdQuery,
  useCreateEnumValueSettingMutation,
  useUpdateEnumValueSettingMutation,
  useDeleteEnumValueSettingMutation,

  // Types
  type EnumValueSettingsQuery,
  type EnumValueSettingsQueryVariables,
  type EnumValueSettingsBySpeciesVariantQuery,
  type EnumValueSettingsBySpeciesVariantQueryVariables,
  type EnumValueSettingsByEnumValueQuery,
  type EnumValueSettingsByEnumValueQueryVariables,
  type EnumValueSettingByIdQuery,
  type EnumValueSettingByIdQueryVariables,
  type CreateEnumValueSettingMutation,
  type CreateEnumValueSettingMutationVariables,
  type UpdateEnumValueSettingMutation,
  type UpdateEnumValueSettingMutationVariables,
  type DeleteEnumValueSettingMutation,
  type DeleteEnumValueSettingMutationVariables,
  type EnumValueSetting,
  type EnumValueSettingConnection,
  type CreateEnumValueSettingInput,
  type UpdateEnumValueSettingInput,
} from '../generated/graphql';
