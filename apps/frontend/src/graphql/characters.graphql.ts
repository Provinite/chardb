import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";

export const GET_CHARACTERS = gql`
  query GetCharacters($filters: CharacterFiltersInput) {
    characters(filters: $filters) {
      characters {
        id
        name
        species {
          id
          name
        }
        details
        ownerId
        creatorId
        mainMediaId
        visibility
        isSellable
        isTradeable
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
        trait {
          name
          valueType
          allowsMultipleValues
        }
        enumValue {
          name
          color {
            id
            hexCode
          }
        }
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
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
        }
        details
        ownerId
        creatorId
        mainMediaId
        visibility
        isSellable
        isTradeable
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
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
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
  mutation AssignCharacterSpecies($id: ID!, $input: AssignCharacterSpeciesInput!) {
    assignCharacterSpecies(id: $id, input: $input) {
      id
      name
      species {
        id
        name
      }
      speciesVariant {
        id
        name
      }
      registryId
      traitValues {
        traitId
        value
      }
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
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

export const TRANSFER_CHARACTER = gql`
  mutation TransferCharacter($id: ID!, $input: TransferCharacterInput!) {
    transferCharacter(id: $id, input: $input) {
      id
      name
      species {
        id
        name
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
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
  mutation UpdateCharacterProfile($id: ID!, $input: UpdateCharacterProfileInput!) {
    updateCharacterProfile(id: $id, input: $input) {
      id
      name
      species {
        id
        name
      }
      details
      ownerId
      creatorId
      visibility
      isSellable
      isTradeable
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
  mutation UpdateCharacterRegistry($id: ID!, $input: UpdateCharacterRegistryInput!) {
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
        trait {
          name
          valueType
          allowsMultipleValues
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
