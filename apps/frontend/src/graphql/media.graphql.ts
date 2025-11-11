import { gql } from '@apollo/client';
import { USER_BASIC_FRAGMENT } from './users.graphql';

export const GET_MEDIA = gql`
  query GetMedia($filters: MediaFiltersInput) {
    media(filters: $filters) {
      media {
        id
        title
        description
        ownerId
        characterId
        galleryId
        visibility
        imageId
        textContentId
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
        character {
          id
          name
        }
        gallery {
          id
          name
        }
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
        }
        textContent {
          id
          content
          wordCount
          formatting
        }
        likesCount
        userHasLiked
        tags_rel {
          tag {
            id
            name
            category
            color
          }
        }
      }
      total
      hasMore
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_MEDIA_ITEM = gql`
  query GetMediaItem($id: ID!) {
    mediaItem(id: $id) {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        ...UserBasic
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      image {
        id
        originalUrl
        thumbnailUrl
        altText
        isNsfw
        artistName
        artistUrl
        source
        width
        height
        fileSize
        mimeType
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
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
  ${USER_BASIC_FRAGMENT}
`;

export const GET_CHARACTER_MEDIA = gql`
  query GetCharacterMedia($characterId: ID!, $filters: MediaFiltersInput) {
    characterMedia(characterId: $characterId, filters: $filters) {
      media {
        id
        title
        description
        ownerId
        characterId
        galleryId
        visibility
        imageId
        textContentId
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
        }
        textContent {
          id
          content
          wordCount
          formatting
        }
        likesCount
        userHasLiked
      }
      total
      imageCount
      textCount
      hasMore
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const GET_MY_MEDIA = gql`
  query GetMyMedia($filters: MediaFiltersInput) {
    myMedia(filters: $filters) {
      media {
        id
        title
        description
        ownerId
        characterId
        galleryId
        visibility
        imageId
        textContentId
        createdAt
        updatedAt
        character {
          id
          name
        }
        gallery {
          id
          name
        }
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
        }
        textContent {
          id
          content
          wordCount
          formatting
        }
        likesCount
        userHasLiked
        tags_rel {
          tag {
            id
            name
            category
            color
          }
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_LIKED_MEDIA = gql`
  query GetLikedMedia($filters: MediaFiltersInput) {
    likedMedia(filters: $filters) {
      media {
        id
        title
        description
        ownerId
        characterId
        galleryId
        visibility
        imageId
        textContentId
        createdAt
        updatedAt
        owner {
          ...UserBasic
        }
        character {
          id
          name
        }
        gallery {
          id
          name
        }
        image {
          id
          originalUrl
          thumbnailUrl
          altText
          isNsfw
          width
          height
          fileSize
          mimeType
          uploader {
            ...UserBasic
          }
          artist {
            ...UserBasic
          }
        }
        textContent {
          id
          content
          wordCount
          formatting
        }
        likesCount
        userHasLiked
        tags_rel {
          tag {
            id
            name
            category
            color
          }
        }
      }
      total
      hasMore
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const CREATE_TEXT_MEDIA = gql`
  mutation CreateTextMedia($input: CreateTextMediaInput!) {
    createTextMedia(input: $input) {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        ...UserBasic
      }
      character {
        id
        name
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const UPDATE_MEDIA = gql`
  mutation UpdateMedia($id: ID!, $input: UpdateMediaInput!) {
    updateMedia(id: $id, input: $input) {
      id
      title
      description
      ownerId
      characterId
      galleryId
      visibility
      imageId
      textContentId
      createdAt
      updatedAt
      owner {
        ...UserBasic
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      image {
        id
        originalUrl
        thumbnailUrl
        altText
        isNsfw
      }
      textContent {
        id
        content
        wordCount
        formatting
      }
      likesCount
      userHasLiked
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
  ${USER_BASIC_FRAGMENT}
`;

export const UPDATE_TEXT_CONTENT = gql`
  mutation UpdateTextContent($mediaId: ID!, $input: UpdateTextContentInput!) {
    updateTextContent(mediaId: $mediaId, input: $input) {
      id
      title
      description
      textContent {
        id
        content
        wordCount
        formatting
      }
      updatedAt
    }
  }
`;

export const UPDATE_IMAGE = gql`
  mutation UpdateImage($id: ID!, $input: UpdateImageInput!) {
    updateImage(id: $id, input: $input) {
      id
      altText
      isNsfw
      artistId
      artistName
      artistUrl
      source
      updatedAt
    }
  }
`;

export const DELETE_MEDIA = gql`
  mutation DeleteMedia($id: ID!) {
    deleteMedia(id: $id)
  }
`;

export const ADD_MEDIA_TAGS = gql`
  mutation AddMediaTags($id: ID!, $input: ManageMediaTagsInput!) {
    addMediaTags(id: $id, input: $input) {
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

export const REMOVE_MEDIA_TAGS = gql`
  mutation RemoveMediaTags($id: ID!, $input: ManageMediaTagsInput!) {
    removeMediaTags(id: $id, input: $input) {
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

// Re-export generated types and hooks after regeneration
export {
  // Query Hooks
  useGetMediaQuery,
  useGetMediaItemQuery,
  useGetCharacterMediaQuery,
  useGetMyMediaQuery,
  
  // Mutation Hooks
  useCreateTextMediaMutation,
  useUpdateMediaMutation,
  useUpdateTextContentMutation,
  useUpdateImageMutation,
  useDeleteMediaMutation,
  useAddMediaTagsMutation,
  useRemoveMediaTagsMutation,
  
  // Types
  type Media,
  type TextContent,
  type MediaConnection,
  type MediaFiltersInput,
  type CreateTextMediaInput,
  type UpdateMediaInput,
  type UpdateTextContentInput,
  type UpdateImageInput,
  type ManageMediaTagsInput,
  type MediaType,
  type TextFormatting,
  type GetMediaQuery,
  type GetMediaQueryVariables,
  type GetMediaItemQuery,
  type GetMediaItemQueryVariables,
  type GetCharacterMediaQuery,
  type GetCharacterMediaQueryVariables,
  type GetMyMediaQuery,
  type GetMyMediaQueryVariables,
  type CreateTextMediaMutation,
  type CreateTextMediaMutationVariables,
  type UpdateMediaMutation,
  type UpdateMediaMutationVariables,
  type UpdateTextContentMutation,
  type UpdateTextContentMutationVariables,
  type UpdateImageMutation,
  type UpdateImageMutationVariables,
  type DeleteMediaMutation,
  type DeleteMediaMutationVariables,
} from '../generated/graphql';