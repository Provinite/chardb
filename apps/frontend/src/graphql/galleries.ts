import { gql } from '@apollo/client';

// Fragment for consistent gallery fields
export const GALLERY_CORE_FRAGMENT = gql`
  fragment GalleryCore on Gallery {
    id
    name
    description
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
    _count {
      images
    }
  }
`;

export const GALLERY_DETAIL_FRAGMENT = gql`
  fragment GalleryDetail on Gallery {
    ...GalleryCore
    images {
      id
      filename
      originalFilename
      url
      thumbnailUrl
      altText
      description
      width
      height
      mimeType
      fileSize
      isNsfw
      visibility
      createdAt
      uploader {
        id
        username
        displayName
      }
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const GET_GALLERIES = gql`
  query GetGalleries($filters: GalleryFiltersInput) {
    galleries(filters: $filters) {
      galleries {
        ...GalleryCore
      }
      total
      hasMore
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const GET_GALLERY = gql`
  query GetGallery($id: ID!) {
    gallery(id: $id) {
      ...GalleryDetail
    }
  }
  ${GALLERY_DETAIL_FRAGMENT}
`;

export const GET_MY_GALLERIES = gql`
  query GetMyGalleries($filters: GalleryFiltersInput) {
    myGalleries(filters: $filters) {
      galleries {
        ...GalleryCore
      }
      total
      hasMore
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const GET_USER_GALLERIES = gql`
  query GetUserGalleries($userId: ID!, $filters: GalleryFiltersInput) {
    userGalleries(userId: $userId, filters: $filters) {
      galleries {
        ...GalleryCore
      }
      total
      hasMore
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const GET_CHARACTER_GALLERIES = gql`
  query GetCharacterGalleries($characterId: ID!, $filters: GalleryFiltersInput) {
    characterGalleries(characterId: $characterId, filters: $filters) {
      galleries {
        ...GalleryCore
      }
      total
      hasMore
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const GET_GALLERY_IMAGES = gql`
  query GetGalleryImages($galleryId: ID!, $filters: ImageFiltersInput) {
    galleryImages(galleryId: $galleryId, filters: $filters) {
      images {
        id
        filename
        originalFilename
        url
        thumbnailUrl
        altText
        description
        width
        height
        mimeType
        fileSize
        isNsfw
        visibility
        createdAt
        uploader {
          id
          username
          displayName
        }
        character {
          id
          name
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
      ...GalleryCore
    }
  }
  ${GALLERY_CORE_FRAGMENT}
`;

export const UPDATE_GALLERY = gql`
  mutation UpdateGallery($id: ID!, $input: UpdateGalleryInput!) {
    updateGallery(id: $id, input: $input) {
      ...GalleryDetail
    }
  }
  ${GALLERY_DETAIL_FRAGMENT}
`;

export const DELETE_GALLERY = gql`
  mutation DeleteGallery($id: ID!) {
    deleteGallery(id: $id)
  }
`;

export const ADD_IMAGE_TO_GALLERY = gql`
  mutation AddImageToGallery($galleryId: ID!, $input: GalleryImageOperationInput!) {
    addImageToGallery(galleryId: $galleryId, input: $input) {
      ...GalleryDetail
    }
  }
  ${GALLERY_DETAIL_FRAGMENT}
`;

export const REMOVE_IMAGE_FROM_GALLERY = gql`
  mutation RemoveImageFromGallery($galleryId: ID!, $input: GalleryImageOperationInput!) {
    removeImageFromGallery(galleryId: $galleryId, input: $input) {
      ...GalleryDetail
    }
  }
  ${GALLERY_DETAIL_FRAGMENT}
`;

export const REORDER_GALLERIES = gql`
  mutation ReorderGalleries($input: ReorderGalleriesInput!) {
    reorderGalleries(input: $input) {
      id
      sortOrder
      name
    }
  }
`;

// Gallery Types
export interface Gallery {
  id: string;
  name: string;
  description?: string;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  character?: {
    id: string;
    name: string;
    species?: string;
  };
  images?: Image[];
  _count?: {
    images: number;
  };
}

export interface Image {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  description?: string;
  width: number;
  height: number;
  mimeType: string;
  fileSize: number;
  isNsfw: boolean;
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  createdAt: string;
  uploader: {
    id: string;
    username: string;
    displayName?: string;
  };
  character?: {
    id: string;
    name: string;
  };
  gallery?: {
    id: string;
    name: string;
  };
}

export interface GalleryFilters {
  limit?: number;
  offset?: number;
  ownerId?: string;
  characterId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
}

export interface CreateGalleryInput {
  name: string;
  description?: string;
  characterId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  sortOrder?: number;
}

export interface UpdateGalleryInput {
  name?: string;
  description?: string;
  characterId?: string;
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  sortOrder?: number;
}

export interface GalleryImageOperationInput {
  imageId: string;
}

export interface ReorderGalleriesInput {
  galleryIds: string[];
}