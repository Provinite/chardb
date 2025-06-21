import { gql } from "@apollo/client";

export const GET_IMAGES = gql`
  query GetImages($filters: ImageFiltersInput) {
    images(filters: $filters) {
      images {
        id
        filename
        originalFilename
        url
        thumbnailUrl
        altText
        description
        uploaderId
        characterId
        galleryId
        artistId
        artistName
        artistUrl
        source
        width
        height
        fileSize
        mimeType
        isNsfw
        sensitiveContentDescription
        visibility
        createdAt
        updatedAt
        uploader {
          id
          username
          displayName
        }
        artist {
          id
          username
          displayName
        }
        character {
          id
          name
        }
        gallery {
          id
          name
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_IMAGE = gql`
  query GetImage($id: ID!) {
    image(id: $id) {
      id
      filename
      originalFilename
      url
      thumbnailUrl
      altText
      description
      uploaderId
      characterId
      galleryId
      artistId
      artistName
      artistUrl
      source
      width
      height
      fileSize
      mimeType
      isNsfw
      sensitiveContentDescription
      visibility
      createdAt
      updatedAt
      uploader {
        id
        username
        displayName
        avatarUrl
      }
      artist {
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
      gallery {
        id
        name
        description
      }
    }
  }
`;

export const GET_MY_IMAGES = gql`
  query GetMyImages($filters: ImageFiltersInput) {
    myImages(filters: $filters) {
      images {
        id
        filename
        originalFilename
        url
        thumbnailUrl
        altText
        description
        uploaderId
        characterId
        galleryId
        artistId
        artistName
        artistUrl
        source
        width
        height
        fileSize
        mimeType
        isNsfw
        sensitiveContentDescription
        visibility
        createdAt
        updatedAt
        uploader {
          id
          username
          displayName
        }
        artist {
          id
          username
          displayName
        }
        character {
          id
          name
        }
        gallery {
          id
          name
        }
      }
      total
      hasMore
    }
  }
`;

export const UPDATE_IMAGE = gql`
  mutation UpdateImage($id: ID!, $input: UpdateImageInput!) {
    updateImage(id: $id, input: $input) {
      id
      filename
      originalFilename
      url
      thumbnailUrl
      altText
      description
      uploaderId
      characterId
      galleryId
      artistId
      artistName
      artistUrl
      source
      width
      height
      fileSize
      mimeType
      isNsfw
      sensitiveContentDescription
      visibility
      createdAt
      updatedAt
      uploader {
        id
        username
        displayName
      }
      artist {
        id
        username
        displayName
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
    }
  }
`;

export const DELETE_IMAGE = gql`
  mutation DeleteImage($id: ID!) {
    deleteImage(id: $id)
  }
`;

export const GET_LIKED_IMAGES = gql`
  query GetLikedImages {
    likedImages {
      id
      filename
      originalFilename
      url
      thumbnailUrl
      altText
      description
      width
      height
      fileSize
      mimeType
      isNsfw
      sensitiveContentDescription
      visibility
      createdAt
      updatedAt
      uploader {
        id
        username
        displayName
        avatarUrl
      }
      artist {
        id
        username
        displayName
        avatarUrl
      }
      character {
        id
        name
      }
      gallery {
        id
        name
      }
      likesCount
      userHasLiked
    }
  }
`;

// Type definitions for TypeScript
export interface Image {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  description?: string;
  uploaderId: string;
  characterId?: string;
  galleryId?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  isNsfw: boolean;
  sensitiveContentDescription?: string;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  createdAt: string;
  updatedAt: string;
  uploader: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  artist?: {
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
  gallery?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface ImageConnection {
  images: Image[];
  total: number;
  hasMore: boolean;
}

export interface ImageFiltersInput {
  limit?: number;
  offset?: number;
  search?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  isNsfw?: boolean;
  uploaderId?: string;
  characterId?: string;
  galleryId?: string;
  artistId?: string;
}

export interface UpdateImageInput {
  altText?: string;
  description?: string;
  characterId?: string;
  galleryId?: string;
  artistId?: string;
  artistName?: string;
  artistUrl?: string;
  source?: string;
  isNsfw?: boolean;
  sensitiveContentDescription?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
}
