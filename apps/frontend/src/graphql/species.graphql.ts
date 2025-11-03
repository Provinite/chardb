import { gql } from '@apollo/client';

/**
 * GraphQL operations for species management in the frontend.
 * Provides comprehensive species CRUD operations, community-scoped queries,
 * variant management, and trait configuration capabilities.
 * 
 * @example Basic species query usage:
 * ```tsx
 * const { data, loading, error } = useSpeciesQuery({
 *   variables: { first: 10 }
 * });
 * ```
 * 
 * @example Community-scoped species query:
 * ```tsx
 * const { data } = useSpeciesByCommunityQuery({
 *   variables: { communityId: "community-uuid", first: 20 }
 * });
 * ```
 * 
 * @example Creating a new species:
 * ```tsx
 * const [createSpecies] = useCreateSpeciesMutation({
 *   onCompleted: (data) => {
 *     console.log('Species created:', data.createSpecies);
 *   }
 * });
 * 
 * await createSpecies({
 *   variables: {
 *     createSpeciesInput: {
 *       name: "Dragon",
 *       communityId: "community-uuid",
 *       hasImage: true
 *     }
 *   }
 * });
 * ```
 */

// Species fragment for consistent field selection
export const SPECIES_FRAGMENT = gql`
  fragment SpeciesDetails on Species {
    id
    name
    communityId
    hasImage
    createdAt
    updatedAt
    community {
      id
      name
      discordGuildId
      discordGuildName
    }
  }
`;

// Species connection fragment for pagination consistency
export const SPECIES_CONNECTION_FRAGMENT = gql`
  fragment SpeciesConnectionDetails on SpeciesConnection {
    nodes {
      ...SpeciesDetails
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
  ${SPECIES_FRAGMENT}
`;

/**
 * Query to fetch all species with pagination support.
 * Returns a paginated list of species across all communities.
 * 
 * @param first - Number of species to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns SpeciesConnection with nodes and pagination metadata
 */
export const SPECIES_QUERY = gql`
  query Species($first: Int, $after: String) {
    species(first: $first, after: $after) {
      ...SpeciesConnectionDetails
    }
  }
  ${SPECIES_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch species by community ID with pagination.
 * Essential for community-scoped species management interfaces.
 * 
 * @param communityId - ID of the community to filter by
 * @param first - Number of species to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns SpeciesConnection filtered by community
 */
export const SPECIES_BY_COMMUNITY_QUERY = gql`
  query SpeciesByCommunity($communityId: ID!, $first: Int, $after: String) {
    speciesByCommunity(communityId: $communityId, first: $first, after: $after) {
      ...SpeciesConnectionDetails
    }
  }
  ${SPECIES_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch a single species by ID with full details.
 * Used for species detail views and editing forms.
 * 
 * @param id - ID of the species to fetch
 * @returns Single Species entity with all fields
 */
export const SPECIES_BY_ID_QUERY = gql`
  query SpeciesById($id: ID!) {
    speciesById(id: $id) {
      ...SpeciesDetails
      community {
        id
        name
        discordGuildId
        discordGuildName
      }
    }
  }
  ${SPECIES_FRAGMENT}
`;

/**
 * Mutation to create a new species within a community.
 * Automatically associates the species with the specified community.
 * 
 * @param createSpeciesInput - Species creation data including name, community, and image flag
 * @returns Newly created Species entity
 */
export const CREATE_SPECIES_MUTATION = gql`
  mutation CreateSpecies($createSpeciesInput: CreateSpeciesInput!) {
    createSpecies(createSpeciesInput: $createSpeciesInput) {
      ...SpeciesDetails
    }
  }
  ${SPECIES_FRAGMENT}
`;

/**
 * Mutation to update an existing species.
 * Supports partial updates - only provide fields that need to change.
 * 
 * @param id - ID of the species to update
 * @param updateSpeciesInput - Partial species update data
 * @returns Updated Species entity
 */
export const UPDATE_SPECIES_MUTATION = gql`
  mutation UpdateSpecies($id: ID!, $updateSpeciesInput: UpdateSpeciesInput!) {
    updateSpecies(id: $id, updateSpeciesInput: $updateSpeciesInput) {
      ...SpeciesDetails
    }
  }
  ${SPECIES_FRAGMENT}
`;

/**
 * Mutation to delete a species.
 * WARNING: This will also delete all associated variants, traits, and character data.
 * Should include confirmation dialogs in UI implementations.
 * 
 * @param id - ID of the species to delete
 * @returns RemovalResponse with success confirmation
 */
export const DELETE_SPECIES_MUTATION = gql`
  mutation DeleteSpecies($id: ID!) {
    removeSpecies(id: $id) {
      removed
      message
    }
  }
`;

// Species Variant Operations

/**
 * Fragment for species variant data consistency.
 * Includes parent species information for context.
 */
export const SPECIES_VARIANT_FRAGMENT = gql`
  fragment SpeciesVariantDetails on SpeciesVariant {
    id
    name
    speciesId
    colorId
    color {
      id
      name
      hexCode
    }
    createdAt
    updatedAt
  }
`;

/**
 * Species variant connection fragment for pagination.
 */
export const SPECIES_VARIANT_CONNECTION_FRAGMENT = gql`
  fragment SpeciesVariantConnectionDetails on SpeciesVariantConnection {
    nodes {
      ...SpeciesVariantDetails
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
  ${SPECIES_VARIANT_FRAGMENT}
`;

/**
 * Query to fetch all species variants with pagination.
 * Used for global variant management interfaces.
 * 
 * @param first - Number of variants to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns SpeciesVariantConnection with all variants
 */
export const SPECIES_VARIANTS_QUERY = gql`
  query SpeciesVariants($first: Int, $after: String) {
    speciesVariants(first: $first, after: $after) {
      ...SpeciesVariantConnectionDetails
    }
  }
  ${SPECIES_VARIANT_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch variants by species ID with pagination.
 * Essential for species-specific variant management.
 * 
 * @param speciesId - ID of the parent species
 * @param first - Number of variants to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @returns SpeciesVariantConnection filtered by species
 */
export const SPECIES_VARIANTS_BY_SPECIES_QUERY = gql`
  query SpeciesVariantsBySpecies($speciesId: ID!, $first: Int, $after: String) {
    speciesVariantsBySpecies(speciesId: $speciesId, first: $first, after: $after) {
      ...SpeciesVariantConnectionDetails
    }
  }
  ${SPECIES_VARIANT_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch a single species variant by ID.
 * Includes parent species data for context.
 * 
 * @param id - ID of the species variant to fetch
 * @returns Single SpeciesVariant with species context
 */
export const SPECIES_VARIANT_BY_ID_QUERY = gql`
  query SpeciesVariantById($id: ID!) {
    speciesVariantById(id: $id) {
      ...SpeciesVariantDetails
      species {
        id
        name
        communityId
        community {
          id
          name
          discordGuildId
          discordGuildName
        }
      }
    }
  }
  ${SPECIES_VARIANT_FRAGMENT}
`;

/**
 * Mutation to create a new species variant.
 * Associates the variant with an existing species.
 * 
 * @param createSpeciesVariantInput - Variant creation data including name and species ID
 * @returns Newly created SpeciesVariant entity
 */
export const CREATE_SPECIES_VARIANT_MUTATION = gql`
  mutation CreateSpeciesVariant($createSpeciesVariantInput: CreateSpeciesVariantInput!) {
    createSpeciesVariant(createSpeciesVariantInput: $createSpeciesVariantInput) {
      ...SpeciesVariantDetails
    }
  }
  ${SPECIES_VARIANT_FRAGMENT}
`;

/**
 * Mutation to update an existing species variant.
 * Supports moving variants between species if needed.
 * 
 * @param id - ID of the species variant to update
 * @param updateSpeciesVariantInput - Partial variant update data
 * @returns Updated SpeciesVariant entity
 */
export const UPDATE_SPECIES_VARIANT_MUTATION = gql`
  mutation UpdateSpeciesVariant($id: ID!, $updateSpeciesVariantInput: UpdateSpeciesVariantInput!) {
    updateSpeciesVariant(id: $id, updateSpeciesVariantInput: $updateSpeciesVariantInput) {
      ...SpeciesVariantDetails
    }
  }
  ${SPECIES_VARIANT_FRAGMENT}
`;

/**
 * Mutation to delete a species variant.
 * WARNING: This will also delete associated trait configurations and character data.
 * 
 * @param id - ID of the species variant to delete
 * @returns RemovalResponse with success confirmation
 */
export const DELETE_SPECIES_VARIANT_MUTATION = gql`
  mutation DeleteSpeciesVariant($id: ID!) {
    removeSpeciesVariant(id: $id) {
      removed
      message
    }
  }
`;

// Trait System Operations

/**
 * Fragment for trait data with value type information.
 * Essential for trait builder interfaces.
 */
export const TRAIT_FRAGMENT = gql`
  fragment TraitDetails on Trait {
    id
    name
    valueType
    allowsMultipleValues
    speciesId
    colorId
    color {
      id
      name
      hexCode
    }
    createdAt
    updatedAt
  }
`;

/**
 * Trait connection fragment for pagination consistency.
 */
export const TRAIT_CONNECTION_FRAGMENT = gql`
  fragment TraitConnectionDetails on TraitConnection {
    nodes {
      ...TraitDetails
    }
    hasNextPage
    hasPreviousPage
    totalCount
  }
  ${TRAIT_FRAGMENT}
`;

/**
 * Query to fetch traits by species ID with pagination.
 * Core query for trait builder interfaces.
 *
 * @param speciesId - ID of the species to get traits for
 * @param first - Number of traits to fetch (default: 20)
 * @param after - Cursor for pagination (optional)
 * @param variantId - Optional variant ID for ordered trait display (optional)
 * @returns TraitConnection filtered by species, optionally ordered by variant-specific order
 */
export const TRAITS_BY_SPECIES_QUERY = gql`
  query TraitsBySpecies($speciesId: ID!, $first: Int, $after: String, $variantId: ID) {
    traitsBySpecies(speciesId: $speciesId, first: $first, after: $after, variantId: $variantId) {
      ...TraitConnectionDetails
    }
  }
  ${TRAIT_CONNECTION_FRAGMENT}
`;

/**
 * Query to fetch a single trait by ID with full context.
 * Includes parent species and enum values for ENUM-type traits.
 * 
 * @param id - ID of the trait to fetch
 * @returns Single Trait with species context and enum values
 */
export const TRAIT_BY_ID_QUERY = gql`
  query TraitById($id: ID!) {
    traitById(id: $id) {
      ...TraitDetails
      species {
        id
        name
        communityId
        community {
          id
          name
          discordGuildId
          discordGuildName
        }
      }
    }
  }
  ${TRAIT_FRAGMENT}
`;

/**
 * Mutation to create a new trait for a species.
 * Supports all trait value types (STRING, INTEGER, TIMESTAMP, ENUM).
 * 
 * @param createTraitInput - Trait creation data including name, type, and species ID
 * @returns Newly created Trait entity
 */
export const CREATE_TRAIT_MUTATION = gql`
  mutation CreateTrait($createTraitInput: CreateTraitInput!) {
    createTrait(createTraitInput: $createTraitInput) {
      ...TraitDetails
    }
  }
  ${TRAIT_FRAGMENT}
`;

/**
 * Mutation to update an existing trait.
 * Note: Changing valueType may require additional enum value management.
 * 
 * @param id - ID of the trait to update
 * @param updateTraitInput - Partial trait update data
 * @returns Updated Trait entity
 */
export const UPDATE_TRAIT_MUTATION = gql`
  mutation UpdateTrait($id: ID!, $updateTraitInput: UpdateTraitInput!) {
    updateTrait(id: $id, updateTraitInput: $updateTraitInput) {
      ...TraitDetails
    }
  }
  ${TRAIT_FRAGMENT}
`;

/**
 * Mutation to delete a trait.
 * WARNING: This will also delete all enum values and character trait data.
 * 
 * @param id - ID of the trait to delete
 * @returns RemovalResponse with success confirmation
 */
export const DELETE_TRAIT_MUTATION = gql`
  mutation DeleteTrait($id: ID!) {
    removeTrait(id: $id) {
      removed
      message
    }
  }
`;