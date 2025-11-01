import { gql } from "@apollo/client";

// ==================== Fragments ====================

export const COMMUNITY_MEMBER_USER_FRAGMENT = gql`
  fragment CommunityMemberUser on User {
    id
    username
    displayName
    avatarUrl
  }
`;

// ==================== Queries ====================

export const COMMUNITIES_QUERY = gql`
  query Communities($first: Int, $after: String) {
    communities(first: $first, after: $after) {
      nodes {
        id
        name
        createdAt
        updatedAt
      }
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
`;

export const COMMUNITY_BY_ID_QUERY = gql`
  query CommunityById($id: ID!) {
    community(id: $id) {
      id
      name
      discordGuildId
      discordGuildName
      createdAt
      updatedAt
    }
  }
`;

export const GET_COMMUNITY_MEMBERS_QUERY = gql`
  query GetCommunityMembers($communityId: ID!, $search: String, $limit: Int) {
    community(id: $communityId) {
      id
      members(search: $search, limit: $limit) {
        ...CommunityMemberUser
      }
    }
  }
  ${COMMUNITY_MEMBER_USER_FRAGMENT}
`;

// ==================== Mutations ====================

export const CREATE_COMMUNITY_MUTATION = gql`
  mutation CreateCommunity($createCommunityInput: CreateCommunityInput!) {
    createCommunity(createCommunityInput: $createCommunityInput) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_COMMUNITY_MUTATION = gql`
  mutation UpdateCommunity(
    $id: ID!
    $updateCommunityInput: UpdateCommunityInput!
  ) {
    updateCommunity(id: $id, updateCommunityInput: $updateCommunityInput) {
      id
      name
      createdAt
      updatedAt
    }
  }
`;

export const REMOVE_COMMUNITY_MUTATION = gql`
  mutation RemoveCommunity($id: ID!) {
    removeCommunity(id: $id) {
      removed
      message
    }
  }
`;

// ==================== Discord Integration ====================

export const DISCORD_BOT_INVITE_URL_QUERY = gql`
  query DiscordBotInviteUrl {
    discordBotInviteUrl
  }
`;

export const VALIDATE_DISCORD_GUILD_QUERY = gql`
  query ValidateDiscordGuild($guildId: ID!) {
    validateDiscordGuild(guildId: $guildId) {
      id
      name
      botHasAccess
    }
  }
`;

export const LINK_DISCORD_GUILD_MUTATION = gql`
  mutation LinkDiscordGuild($communityId: ID!, $guildId: ID!) {
    linkDiscordGuild(communityId: $communityId, guildId: $guildId) {
      id
      name
      discordGuildId
      discordGuildName
      createdAt
      updatedAt
    }
  }
`;

export const UNLINK_DISCORD_GUILD_MUTATION = gql`
  mutation UnlinkDiscordGuild($communityId: ID!) {
    unlinkDiscordGuild(communityId: $communityId) {
      id
      name
      discordGuildId
      discordGuildName
      createdAt
      updatedAt
    }
  }
`;

export const COMMUNITY_MEMBERS_BY_USER_QUERY = gql`
  query CommunityMembersByUser($userId: ID!, $first: Int, $after: String) {
    communityMembersByUser(userId: $userId, first: $first, after: $after) {
      nodes {
        id
        createdAt
        updatedAt
        role {
          id
          name
          community {
            id
            name
            createdAt
            updatedAt
          }
          canCreateCharacter
          canCreateInviteCode
          canCreateRole
          canEditCharacter
          canCreateSpecies
          canEditSpecies
          canEditRole
          canEditCharacter
          canEditOwnCharacter
          canListInviteCodes
          canRemoveCommunityMember
          canManageMemberRoles
        }
        user {
          id
          username
          displayName
        }
      }
      hasNextPage
      hasPreviousPage
      totalCount
    }
  }
`;

// Re-export generated types and hooks after regeneration
export {
  // Hooks
  useCommunitiesQuery,
  useCommunityByIdQuery,
  useGetCommunityMembersQuery,
  useCreateCommunityMutation,
  useUpdateCommunityMutation,
  useRemoveCommunityMutation,
  useCommunityMembersByUserQuery,
  useDiscordBotInviteUrlQuery,
  useValidateDiscordGuildQuery,
  useLinkDiscordGuildMutation,
  useUnlinkDiscordGuildMutation,

  // Types
  type CommunitiesQuery,
  type CommunitiesQueryVariables,
  type CommunityByIdQuery,
  type CommunityByIdQueryVariables,
  type GetCommunityMembersQuery,
  type GetCommunityMembersQueryVariables,
  type CreateCommunityMutation,
  type CreateCommunityMutationVariables,
  type UpdateCommunityMutation,
  type UpdateCommunityMutationVariables,
  type RemoveCommunityMutation,
  type RemoveCommunityMutationVariables,
  type CommunityMembersByUserQuery,
  type CommunityMembersByUserQueryVariables,
  type DiscordBotInviteUrlQuery,
  type DiscordBotInviteUrlQueryVariables,
  type ValidateDiscordGuildQuery,
  type ValidateDiscordGuildQueryVariables,
  type LinkDiscordGuildMutation,
  type LinkDiscordGuildMutationVariables,
  type UnlinkDiscordGuildMutation,
  type UnlinkDiscordGuildMutationVariables,
  type Community,
  type CommunityConnection,
  type CommunityMember,
  type CommunityMemberConnection,
  type CreateCommunityInput,
  type UpdateCommunityInput,
  type DiscordGuildInfo,
} from "../generated/graphql";
