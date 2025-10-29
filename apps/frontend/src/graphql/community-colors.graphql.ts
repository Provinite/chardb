import { gql } from "@apollo/client";

// ==================== CommunityColor Fragments ====================

export const COMMUNITY_COLOR_FRAGMENT = gql`
  fragment CommunityColorFields on CommunityColor {
    id
    name
    hexCode
    communityId
    createdAt
    updatedAt
  }
`;

// ==================== CommunityColor Queries ====================

export const GET_COMMUNITY_COLORS = gql`
  query GetCommunityColors($communityId: ID!) {
    communityColors(communityId: $communityId) {
      ...CommunityColorFields
    }
  }
  ${COMMUNITY_COLOR_FRAGMENT}
`;

// ==================== CommunityColor Mutations ====================

export const CREATE_COMMUNITY_COLOR = gql`
  mutation CreateCommunityColor($input: CreateCommunityColorInput!) {
    createCommunityColor(input: $input) {
      ...CommunityColorFields
    }
  }
  ${COMMUNITY_COLOR_FRAGMENT}
`;

export const UPDATE_COMMUNITY_COLOR = gql`
  mutation UpdateCommunityColor($id: ID!, $input: UpdateCommunityColorInput!) {
    updateCommunityColor(id: $id, input: $input) {
      ...CommunityColorFields
    }
  }
  ${COMMUNITY_COLOR_FRAGMENT}
`;

export const DELETE_COMMUNITY_COLOR = gql`
  mutation DeleteCommunityColor($id: ID!) {
    deleteCommunityColor(id: $id)
  }
`;
