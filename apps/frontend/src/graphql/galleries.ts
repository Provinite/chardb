import { gql } from '@apollo/client';

export const GET_GALLERIES = gql`
  query GetGalleries($filters: GalleryFiltersInput) {
    galleries(filters: $filters) {
      galleries {
        id
        name
        description
        ownerId
        characterId
        visibility
        sortOrder
        createdAt
        updatedAt
        owner {
          id
          username
          displayName
          avatarUrl
        }
        character {
          id
          name
          species
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_GALLERY = gql`
  query GetGallery($id: ID!) {
    gallery(id: $id) {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species
      }
    }
  }
`;

export const GET_MY_GALLERIES = gql`
  query GetMyGalleries($filters: GalleryFiltersInput) {
    myGalleries(filters: $filters) {
      galleries {
        id
        name
        description
        ownerId
        characterId
        visibility
        sortOrder
        createdAt
        updatedAt
        owner {
          id
          username
          displayName
          avatarUrl
        }
        character {
          id
          name
          species
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_USER_GALLERIES = gql`
  query GetUserGalleries($userId: ID!, $filters: GalleryFiltersInput) {
    userGalleries(userId: $userId, filters: $filters) {
      galleries {
        id
        name
        description
        ownerId
        characterId
        visibility
        sortOrder
        createdAt
        updatedAt
        owner {
          id
          username
          displayName
          avatarUrl
        }
        character {
          id
          name
          species
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_CHARACTER_GALLERIES = gql`
  query GetCharacterGalleries($characterId: ID!, $filters: GalleryFiltersInput) {
    characterGalleries(characterId: $characterId, filters: $filters) {
      galleries {
        id
        name
        description
        ownerId
        characterId
        visibility
        sortOrder
        createdAt
        updatedAt
        owner {
          id
          username
          displayName
          avatarUrl
        }
        character {
          id
          name
          species
        }
      }
      total
      hasMore
    }
  }
`;

export const CREATE_GALLERY = gql`
  mutation CreateGallery($input: CreateGalleryInput!) {
    createGallery(input: $input) {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species
      }
    }
  }
`;

export const UPDATE_GALLERY = gql`
  mutation UpdateGallery($id: ID!, $input: UpdateGalleryInput!) {
    updateGallery(id: $id, input: $input) {
      id
      name
      description
      ownerId
      characterId
      visibility
      sortOrder
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
        species
      }
    }
  }
`;

export const DELETE_GALLERY = gql`
  mutation DeleteGallery($id: ID!) {
    deleteGallery(id: $id)
  }
`;


export const REORDER_GALLERIES = gql`
  mutation ReorderGalleries($input: ReorderGalleriesInput!) {
    reorderGalleries(input: $input) {
      id
      name
      sortOrder
    }
  }
`;

export const GET_LIKED_GALLERIES = gql`
  query GetLikedGalleries {
    likedGalleries {
      id
      name
      description
      visibility
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
      }
      likesCount
      userHasLiked
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Query Hooks
  useGetGalleriesQuery,
  useGetGalleryQuery,
  useGetMyGalleriesQuery,
  useGetUserGalleriesQuery,
  useGetCharacterGalleriesQuery,
  
  // Mutation Hooks
  useCreateGalleryMutation,
  useUpdateGalleryMutation,
  useDeleteGalleryMutation,
  useReorderGalleriesMutation,
  
  // Types
  type Gallery,
  type GalleryConnection,
  type GalleryFiltersInput,
  type CreateGalleryInput,
  type UpdateGalleryInput,
  type ReorderGalleriesInput,
  type GetGalleriesQuery,
  type GetGalleriesQueryVariables,
  type GetGalleryQuery,
  type GetGalleryQueryVariables,
  type GetMyGalleriesQuery,
  type GetMyGalleriesQueryVariables,
  type GetUserGalleriesQuery,
  type GetUserGalleriesQueryVariables,
  type GetCharacterGalleriesQuery,
  type GetCharacterGalleriesQueryVariables,
  type CreateGalleryMutation,
  type CreateGalleryMutationVariables,
  type UpdateGalleryMutation,
  type UpdateGalleryMutationVariables,
  type DeleteGalleryMutation,
  type DeleteGalleryMutationVariables,
  type ReorderGalleriesMutation,
  type ReorderGalleriesMutationVariables,
  type Image,
} from '../generated/graphql';