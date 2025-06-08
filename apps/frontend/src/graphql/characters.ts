import { gql } from '@apollo/client';

// Fragment for consistent character fields
export const CHARACTER_CORE_FRAGMENT = gql`
  fragment CharacterCore on Character {
    id
    name
    species
    description
    visibility
    createdAt
    updatedAt
    owner {
      id
      username
      displayName
    }
    _count {
      images
    }
  }
`;

export const CHARACTER_DETAIL_FRAGMENT = gql`
  fragment CharacterDetail on Character {
    ...CharacterCore
    age
    gender
    personality
    backstory
    isSellable
    isTradeable
    price
    customFields
    creator {
      id
      username
      displayName
    }
    tags_rel {
      tag {
        id
        name
        category
        color
      }
    }
  }
  ${CHARACTER_CORE_FRAGMENT}
`;

export const GET_CHARACTERS = gql`
  query GetCharacters($filters: CharacterFiltersInput) {
    characters(filters: $filters) {
      characters {
        ...CharacterCore
        tags_rel {
          tag {
            id
            name
          }
        }
      }
      total
      hasMore
    }
  }
  ${CHARACTER_CORE_FRAGMENT}
`;

export const GET_CHARACTER = gql`
  query GetCharacter($id: ID!) {
    character(id: $id) {
      ...CharacterDetail
      owner {
        id
        username
        displayName
        avatarUrl
      }
    }
  }
  ${CHARACTER_DETAIL_FRAGMENT}
`;

export const CREATE_CHARACTER = gql`
  mutation CreateCharacter($input: CreateCharacterInput!) {
    createCharacter(input: $input) {
      ...CharacterCore
    }
  }
  ${CHARACTER_CORE_FRAGMENT}
`;

export const UPDATE_CHARACTER = gql`
  mutation UpdateCharacter($id: ID!, $input: UpdateCharacterInput!) {
    updateCharacter(id: $id, input: $input) {
      ...CharacterDetail
    }
  }
  ${CHARACTER_DETAIL_FRAGMENT}
`;

export const DELETE_CHARACTER = gql`
  mutation DeleteCharacter($id: ID!) {
    deleteCharacter(id: $id)
  }
`;

export const GET_MY_CHARACTERS = gql`
  query GetMyCharacters($filters: CharacterFiltersInput) {
    myCharacters(filters: $filters) {
      characters {
        ...CharacterCore
      }
      total
      hasMore
    }
  }
  ${CHARACTER_CORE_FRAGMENT}
`;

export const ADD_CHARACTER_TAGS = gql`
  mutation AddCharacterTags($id: ID!, $input: ManageTagsInput!) {
    addCharacterTags(id: $id, input: $input) {
      id
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

export const TRANSFER_CHARACTER = gql`
  mutation TransferCharacter($id: ID!, $input: TransferCharacterInput!) {
    transferCharacter(id: $id, input: $input) {
      id
      owner {
        id
        username
        displayName
      }
    }
  }
`;

// Character Types
export interface Character {
  id: string;
  name: string;
  species?: string;
  age?: string;
  gender?: string;
  description?: string;
  personality?: string;
  backstory?: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  isSellable: boolean;
  isTradeable: boolean;
  price?: number;
  customFields?: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  creator?: {
    id: string;
    username: string;
    displayName?: string;
  };
  tags_rel?: Array<{
    tag: {
      id: string;
      name: string;
      category?: string;
      color?: string;
    };
  }>;
  _count?: {
    images: number;
  };
}

export interface CharacterFilters {
  limit?: number;
  offset?: number;
  search?: string;
  species?: string;
  tags?: string[];
  ownerId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  isSellable?: boolean;
  isTradeable?: boolean;
}

export interface CreateCharacterInput {
  name: string;
  species?: string;
  age?: string;
  gender?: string;
  description?: string;
  personality?: string;
  backstory?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  isSellable?: boolean;
  isTradeable?: boolean;
  price?: number;
  customFields?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  species?: string;
  age?: string;
  gender?: string;
  description?: string;
  personality?: string;
  backstory?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  isSellable?: boolean;
  isTradeable?: boolean;
  price?: number;
  customFields?: string;
}