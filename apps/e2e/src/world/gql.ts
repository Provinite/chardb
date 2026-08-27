/**
 * GraphQL documents used by the seeding layer.
 *
 * Argument names are inconsistent across this API on purpose-of-history, not by
 * design -- some mutations take `input:`, others a verbose
 * `createSpeciesInput:`. Each one below matches apps/backend/src/schema.gql
 * exactly. The backend runs ValidationPipe with `forbidNonWhitelisted: true`,
 * so a misspelled or extra field is a hard error rather than a silent drop.
 */

export const LOGIN = /* GraphQL */ `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

/**
 * Requires the GLOBAL canCreateCommunity flag. Transactionally auto-creates the
 * Admin / Moderator / Member roles and binds the creator to Admin.
 */
export const CREATE_COMMUNITY = /* GraphQL */ `
  mutation CreateCommunity($createCommunityInput: CreateCommunityInput!) {
    createCommunity(createCommunityInput: $createCommunityInput) {
      id
      name
    }
  }
`;

export const ROLES_BY_COMMUNITY = /* GraphQL */ `
  query RolesByCommunity($communityId: ID!) {
    rolesByCommunity(communityId: $communityId) {
      nodes {
        id
        name
        canDeleteCharacter
        canEditCharacterRegistry
      }
    }
  }
`;

export const CREATE_ROLE = /* GraphQL */ `
  mutation CreateRole($createRoleInput: CreateRoleInput!) {
    createRole(createRoleInput: $createRoleInput) {
      id
      name
      canDeleteCharacter
      canEditCharacterRegistry
    }
  }
`;

/** Requires GLOBAL isAdmin -- not a community permission. */
export const CREATE_COMMUNITY_MEMBER = /* GraphQL */ `
  mutation CreateCommunityMember(
    $createCommunityMemberInput: CreateCommunityMemberInput!
  ) {
    createCommunityMember(
      createCommunityMemberInput: $createCommunityMemberInput
    ) {
      id
    }
  }
`;

/** Requires community CanCreateSpecies. Notably has NO global-admin bypass. */
export const CREATE_SPECIES = /* GraphQL */ `
  mutation CreateSpecies($createSpeciesInput: CreateSpeciesInput!) {
    createSpecies(createSpeciesInput: $createSpeciesInput) {
      id
      name
    }
  }
`;

export const CREATE_SPECIES_VARIANT = /* GraphQL */ `
  mutation CreateSpeciesVariant(
    $createSpeciesVariantInput: CreateSpeciesVariantInput!
  ) {
    createSpeciesVariant(
      createSpeciesVariantInput: $createSpeciesVariantInput
    ) {
      id
      name
    }
  }
`;

export const CREATE_TRAIT = /* GraphQL */ `
  mutation CreateTrait($createTraitInput: CreateTraitInput!) {
    createTrait(createTraitInput: $createTraitInput) {
      id
      name
      valueType
    }
  }
`;

export const CREATE_ENUM_VALUE = /* GraphQL */ `
  mutation CreateEnumValue($createEnumValueInput: CreateEnumValueInput!) {
    createEnumValue(createEnumValueInput: $createEnumValueInput) {
      id
      name
    }
  }
`;

/**
 * `speciesId` is nullable in the schema but the resolver rejects its absence.
 * Passing non-empty `traitValues` auto-creates a PENDING TraitReview with
 * source CREATION -- that is how the review-queue fixture is seeded; there is
 * no separate mutation for it.
 */
export const CREATE_CHARACTER = /* GraphQL */ `
  mutation CreateCharacter($input: CreateCharacterInput!) {
    createCharacter(input: $input) {
      id
      name
    }
  }
`;
