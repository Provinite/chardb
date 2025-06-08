import { gql } from '@apollo/client';

export const GET_CHARACTERS = gql`
  query GetCharacters($filters: CharacterFiltersInput) {
    characters(filters: $filters) {
      characters {
        id
        name
        species
        age
        gender
        description
        personality
        backstory
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
          id
          username
          displayName
          avatarUrl
        }
        creator {
          id
          username
          displayName
          avatarUrl
        }
        _count {
          images
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_CHARACTER = gql`
  query GetCharacter($id: ID!) {
    character(id: $id) {
      id
      name
      species
      age
      gender
      description
      personality
      backstory
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
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      _count {
        images
      }
    }
  }
`;

export const GET_MY_CHARACTERS = gql`
  query GetMyCharacters($filters: CharacterFiltersInput) {
    myCharacters(filters: $filters) {
      characters {
        id
        name
        species
        age
        gender
        description
        personality
        backstory
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
          id
          username
          displayName
          avatarUrl
        }
        creator {
          id
          username
          displayName
          avatarUrl
        }
        _count {
          images
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
      species
      age
      gender
      description
      personality
      backstory
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
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      _count {
        images
      }
    }
  }
`;

export const UPDATE_CHARACTER = gql`
  mutation UpdateCharacter($id: ID!, $input: UpdateCharacterInput!) {
    updateCharacter(id: $id, input: $input) {
      id
      name
      species
      age
      gender
      description
      personality
      backstory
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
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      _count {
        images
      }
    }
  }
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
      species
      age
      gender
      description
      personality
      backstory
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
        id
        username
        displayName
        avatarUrl
      }
      creator {
        id
        username
        displayName
        avatarUrl
      }
      _count {
        images
      }
    }
  }
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

// Re-export generated types and hooks after regeneration
export {
  // Query Hooks
  useGetCharactersQuery,
  useGetCharacterQuery,
  useGetMyCharactersQuery,
  
  // Mutation Hooks
  useCreateCharacterMutation,
  useUpdateCharacterMutation,
  useDeleteCharacterMutation,
  useTransferCharacterMutation,
  useAddCharacterTagsMutation,
  useRemoveCharacterTagsMutation,
  
  // Types
  type Character,
  type CharacterConnection,
  type CharacterFiltersInput,
  type CreateCharacterInput,
  type UpdateCharacterInput,
  type TransferCharacterInput,
  type ManageTagsInput,
  type GetCharactersQuery,
  type GetCharactersQueryVariables,
  type GetCharacterQuery,
  type GetCharacterQueryVariables,
  type GetMyCharactersQuery,
  type GetMyCharactersQueryVariables,
  type CreateCharacterMutation,
  type CreateCharacterMutationVariables,
  type UpdateCharacterMutation,
  type UpdateCharacterMutationVariables,
  type DeleteCharacterMutation,
  type DeleteCharacterMutationVariables,
  type TransferCharacterMutation,
  type TransferCharacterMutationVariables,
  type AddCharacterTagsMutation,
  type AddCharacterTagsMutationVariables,
  type RemoveCharacterTagsMutation,
  type RemoveCharacterTagsMutationVariables,
  type Visibility,
  type Tag,
  type CharacterTag,
} from '../generated/graphql';