import { gql } from "@apollo/client";






export const GET_LIKED_IMAGES = gql`
  query GetLikedImages {
    likedImages {
      id
      filename
      originalFilename
      originalUrl
      thumbnailUrl
      altText
      width
      height
      fileSize
      mimeType
      isNsfw
      sensitiveContentDescription
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


