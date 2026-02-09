import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./users.graphql";

export const GET_LIKED_IMAGES = gql`
  query GetLikedImages {
    likedImages {
      id
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
        ...UserBasic
      }
      artist {
        ...UserBasic
      }
      likesCount
      userHasLiked
    }
  }
  ${USER_BASIC_FRAGMENT}
`;
