import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";

/**
 * Everything `CharacterCard` reads. A fragment because two lists now render
 * the same card -- global browse and one member's characters -- and a card
 * that renders differently depending on which list it came from would be a
 * bug waiting to happen.
 */
export const CHARACTER_CARD_FIELDS_FRAGMENT = gql`
  fragment CharacterCardFields on Character {
    id
    name
    species {
      id
      name
      community {
        id
        # The host this character is served from. A card renders at the apex
        # (My Characters, Liked, a profile, the feed) and on a community host
        # alike, so it has to build an absolute URL; without this the Edit
        # button would point at an apex route that does not exist.
        slug
      }
    }
    details
    ownerId
    creatorId
    mainMediaId
    visibility
    isSellable
    isTradeable
    isSellableForCoin
    isTradeableForArt
    isOpenToOffers
    isFreebie
    price
    tags
    customFields
    createdAt
    updatedAt
    pendingOwnership {
      id
      provider
      providerAccountId
      createdAt
    }
    owner {
      ...UserBasic
    }
    creator {
      ...UserBasic
    }
    mainMedia {
      id
      title
      image {
        id
        originalUrl
        thumbnailUrl
        altText
        isNsfw
      }
    }
    _count {
      media
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/** One member's characters, filtered server-side by owner and by viewer. */
export const USER_CHARACTERS = gql`
  query UserCharacters($userId: ID!, $filters: CharacterFiltersInput) {
    userCharacters(userId: $userId, filters: $filters) {
      characters {
        ...CharacterCardFields
      }
      total
      hasMore
    }
  }
  ${CHARACTER_CARD_FIELDS_FRAGMENT}
`;

export const GET_CHARACTERS = gql`
  query GetCharacters($filters: CharacterFiltersInput) {
    characters(filters: $filters) {
      characters {
        id
        name
        species {
          id
          name
          community {
            id
            # The host the character is served from; every list of characters
            # can be rendered from the apex, so its links cross an origin.
            slug
          }
        }
        details
        ownerId
        creatorId
        mainMediaId
        visibility
        isSellable
        isTradeable
        isSellableForCoin
        isTradeableForArt
        isOpenToOffers
        isFreebie
        price
        tags
        customFields
        createdAt
        updatedAt
        pendingOwnership {
          id
          provider
          providerAccountId
          createdAt
        }
        owner {
          ...UserBasic
        }
        creator {
          ...UserBasic
        }
        mainMedia {
          id
          title
          image {
            id
            originalUrl
            thumbnailUrl
            altText
            isNsfw
          }
        }
        _count {
          media
        }
      }
      total
      hasMore
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_CHARACTER = gql`
  query GetCharacter($id: ID!) {
    character(id: $id) {
      id
      name
      registryId
      speciesId
      speciesVariantId
      pendingTraitReviewSource
      species {
        id
        name
        communityId
        hasImage
        createdAt
        updatedAt
        community {
          id
          name
          # The host this character is served from. CharacterHostGuard needs it
          # to forward an apex /character/:id to the right community.
          slug
          discordGuildId
          discordGuildName
        }
      }
      speciesVariant {
        id
        name
        speciesId
        colorId
        createdAt
        updatedAt
        color {
          id
          name
          hexCode
        }
      }
      traitValues {
        traitId
        value
        clarifier
        trait {
          name
          valueType
          allowsMultipleValues
          allowsClarifier
        }
        enumValue {
          name
          color {
            id
            hexCode
          }
        }
      }
      traitReviewStatus
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
      isSellableForCoin
      isTradeableForArt
      isOpenToOffers
      isFreebie
      price
      tags
      customFields
      createdAt
      updatedAt
      pendingOwnership {
        id
        provider
        providerAccountId
        displayIdentifier
        createdAt
      }
      owner {
        ...UserBasic
      }
      creator {
        ...UserBasic
      }
      _count {
        media
      }
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
      mainMediaId
      mainMedia {
        id
        title
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_MY_CHARACTERS = gql`
  query GetMyCharacters($filters: CharacterFiltersInput) {
    myCharacters(filters: $filters) {
      characters {
        id
        name
        species {
          id
          name
          community {
            id
            # The host the character is served from; every list of characters
            # can be rendered from the apex, so its links cross an origin.
            slug
          }
        }
        details
        ownerId
        creatorId
        mainMediaId
        visibility
        isSellable
        isTradeable
        isSellableForCoin
        isTradeableForArt
        isOpenToOffers
        isFreebie
        price
        tags
        customFields
        createdAt
        updatedAt
        isOrphaned
        likesCount
        userHasLiked
        speciesId
        speciesVariantId
        speciesVariant {
          id
          name
        }
        tags_rel {
          tag {
            id
            name
            category
            color
          }
        }
        traitValues {
          traitId
          value
          clarifier
        }
        pendingOwnership {
          id
          provider
          providerAccountId
          createdAt
        }
        owner {
          ...UserBasic
        }
        creator {
          ...UserBasic
        }
        mainMedia {
          id
          title
          image {
            id
            originalUrl
            thumbnailUrl
            altText
            isNsfw
          }
        }
        _count {
          media
        }
      }
      total
      hasMore
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_MY_EDITABLE_CHARACTERS = gql`
  query GetMyEditableCharacters($filters: CharacterFiltersInput) {
    myEditableCharacters(filters: $filters) {
      characters {
        id
        name
        species {
          id
          name
          community {
            id
            # The host the character is served from; every list of characters
            # can be rendered from the apex, so its links cross an origin.
            slug
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_MY_CHARACTERS_FOR_IMAGE_UPLOAD = gql`
  query GetMyCharactersForImageUpload($filters: CharacterFiltersInput) {
    myCharactersForImageUpload(filters: $filters) {
      characters {
        id
        name
        species {
          id
          name
          community {
            id
            # The host the character is served from; every list of characters
            # can be rendered from the apex, so its links cross an origin.
            slug
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const CREATE_CHARACTER = gql`
  mutation CreateCharacter($input: CreateCharacterInput!) {
    createCharacter(input: $input) {
      id
      name
      species {
        id
        name
        community {
          id
          slug
        }
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
      isSellableForCoin
      isTradeableForArt
      isOpenToOffers
      isFreebie
      price
      tags
      customFields
      createdAt
      updatedAt
      pendingOwnership {
        id
        provider
        providerAccountId
        displayIdentifier
        createdAt
      }
      owner {
        ...UserBasic
      }
      creator {
        ...UserBasic
      }
      _count {
        media
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const ASSIGN_CHARACTER_SPECIES = gql`
  mutation AssignCharacterSpecies(
    $id: ID!
    $input: AssignCharacterSpeciesInput!
  ) {
    assignCharacterSpecies(id: $id, input: $input) {
      id
      name
      species {
        id
        name
        community {
          id
          slug
        }
      }
      speciesVariant {
        id
        name
      }
      registryId
      traitValues {
        traitId
        value
        clarifier
      }
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
      isSellableForCoin
      isTradeableForArt
      isOpenToOffers
      isFreebie
      price
      tags
      customFields
      createdAt
      updatedAt
      pendingOwnership {
        id
        provider
        providerAccountId
        displayIdentifier
        createdAt
      }
      owner {
        ...UserBasic
      }
      creator {
        ...UserBasic
      }
      _count {
        media
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const DELETE_CHARACTER = gql`
  mutation DeleteCharacter($id: ID!) {
    deleteCharacter(id: $id)
  }
`;

export const PURGE_CHARACTER = gql`
  mutation PurgeCharacter($id: ID!) {
    purgeCharacter(id: $id)
  }
`;

export const KICK_CHARACTER_FROM_SPECIES = gql`
  mutation KickCharacterFromSpecies($id: ID!) {
    kickCharacterFromSpecies(id: $id)
  }
`;

export const TRANSFER_CHARACTER = gql`
  mutation TransferCharacter($id: ID!, $input: TransferCharacterInput!) {
    transferCharacter(id: $id, input: $input) {
      id
      name
      species {
        id
        name
        community {
          id
          slug
        }
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
      isSellableForCoin
      isTradeableForArt
      isOpenToOffers
      isFreebie
      price
      tags
      customFields
      createdAt
      updatedAt
      owner {
        ...UserBasic
      }
      creator {
        ...UserBasic
      }
      _count {
        media
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const ADD_CHARACTER_TAGS = gql`
  mutation AddCharacterTags($id: ID!, $input: ManageTagsInput!) {
    addCharacterTags(id: $id, input: $input) {
      id
      name
      tags
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
    }
  }
`;

export const REMOVE_CHARACTER_TAGS = gql`
  mutation RemoveCharacterTags($id: ID!, $input: ManageTagsInput!) {
    removeCharacterTags(id: $id, input: $input) {
      id
      name
      tags
      tags_rel {
        tag {
          id
          name
          category
          color
        }
      }
    }
  }
`;

export const SET_CHARACTER_MAIN_MEDIA = gql`
  mutation SetCharacterMainMedia($id: ID!, $input: SetMainMediaInput!) {
    setCharacterMainMedia(id: $id, input: $input) {
      id
      name
      mainMediaId
      mainMedia {
        id
        title
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
        }
      }
    }
  }
`;

export const UPDATE_CHARACTER_PROFILE = gql`
  mutation UpdateCharacterProfile(
    $id: ID!
    $input: UpdateCharacterProfileInput!
  ) {
    updateCharacterProfile(id: $id, input: $input) {
      id
      name
      species {
        id
        name
        community {
          id
          slug
        }
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
      isSellableForCoin
      isTradeableForArt
      isOpenToOffers
      isFreebie
      price
      tags
      customFields
      mainMediaId
      createdAt
      updatedAt
      pendingOwnership {
        id
        provider
        providerAccountId
        displayIdentifier
        createdAt
      }
      owner {
        ...UserBasic
      }
      creator {
        ...UserBasic
      }
      _count {
        media
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const UPDATE_CHARACTER_REGISTRY = gql`
  mutation UpdateCharacterRegistry(
    $id: ID!
    $input: UpdateCharacterRegistryInput!
  ) {
    updateCharacterRegistry(id: $id, input: $input) {
      id
      name
      registryId
      speciesId
      speciesVariantId
      speciesVariant {
        id
        name
      }
      traitValues {
        traitId
        value
        clarifier
        trait {
          name
          valueType
          allowsMultipleValues
          allowsClarifier
        }
        enumValue {
          name
          color {
            id
            hexCode
          }
        }
      }
    }
  }
`;

export const GET_LIKED_CHARACTERS = gql`
  query GetLikedCharacters {
    likedCharacters {
      id
      name
      species {
        id
        name
        community {
          id
          slug
        }
      }
      visibility
      createdAt
      updatedAt
      owner {
        ...UserBasic
      }
      _count {
        media
      }
      likesCount
      userHasLiked
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// Re-export generated types and hooks after regeneration
export {
  // Query Hooks
  useGetCharactersQuery,
  useGetCharacterQuery,
  useGetMyCharactersQuery,

  // Mutation Hooks
  useCreateCharacterMutation,
  useAssignCharacterSpeciesMutation,
  useUpdateCharacterProfileMutation,
  useUpdateCharacterRegistryMutation,
  useDeleteCharacterMutation,
  useTransferCharacterMutation,
  useAddCharacterTagsMutation,
  useRemoveCharacterTagsMutation,
  useSetCharacterMainMediaMutation,

  // Types
  type Character,
  type CharacterConnection,
  type CharacterFiltersInput,
  type CreateCharacterInput,
  type AssignCharacterSpeciesInput,
  type UpdateCharacterProfileInput,
  type UpdateCharacterRegistryInput,
  type TransferCharacterInput,
  type ManageTagsInput,
  type SetMainMediaInput,
  type CharacterTraitValueInput,
  type GetCharactersQuery,
  type GetCharactersQueryVariables,
  type GetCharacterQuery,
  type GetCharacterQueryVariables,
  type GetMyCharactersQuery,
  type GetMyCharactersQueryVariables,
  type CreateCharacterMutation,
  type CreateCharacterMutationVariables,
  type AssignCharacterSpeciesMutation,
  type AssignCharacterSpeciesMutationVariables,
  type UpdateCharacterProfileMutation,
  type UpdateCharacterProfileMutationVariables,
  type UpdateCharacterRegistryMutation,
  type UpdateCharacterRegistryMutationVariables,
  type DeleteCharacterMutation,
  type DeleteCharacterMutationVariables,
  type TransferCharacterMutation,
  type TransferCharacterMutationVariables,
  type AddCharacterTagsMutation,
  type AddCharacterTagsMutationVariables,
  type RemoveCharacterTagsMutation,
  type RemoveCharacterTagsMutationVariables,
  type SetCharacterMainMediaMutation,
  type SetCharacterMainMediaMutationVariables,
  type Visibility,
  type Tag,
  type CharacterTag,
} from "../generated/graphql";

/**
 * A character's rarity history.
 *
 * Its own query rather than a field on GetCharacter: most character pages have
 * no history at all, and the ones that do are the minority a masterlist
 * argument is about. Making every page load pay for it would be backwards.
 */
export const CHARACTER_VARIANT_CHANGES = gql`
  query CharacterVariantChanges($characterId: ID!) {
    characterVariantChanges(characterId: $characterId) {
      id
      reason
      createdAt
      fromVariant {
        id
        name
      }
      toVariant {
        id
        name
      }
      changedBy {
        id
        username
        displayName
      }
    }
  }
`;
