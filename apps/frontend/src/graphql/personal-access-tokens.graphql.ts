import { gql } from "@apollo/client";

const PERSONAL_ACCESS_TOKEN_FIELDS = gql`
  fragment PersonalAccessTokenFields on PersonalAccessToken {
    id
    name
    displayHint
    createdAt
    expiresAt
    lastUsedAt
    revokedAt
    communities {
      community {
        id
        name
      }
      member
      permissions
    }
  }
`;

export const PERSONAL_ACCESS_TOKENS = gql`
  query PersonalAccessTokens {
    personalAccessTokens {
      ...PersonalAccessTokenFields
    }
  }
  ${PERSONAL_ACCESS_TOKEN_FIELDS}
`;

export const PERSONAL_ACCESS_TOKEN_GRANT_OPTIONS = gql`
  query PersonalAccessTokenGrantOptions {
    personalAccessTokenGrantOptions {
      communities {
        id
        name
      }
      permissions
      lifetimesDays
    }
  }
`;

export const CREATE_PERSONAL_ACCESS_TOKEN = gql`
  mutation CreatePersonalAccessToken($input: CreatePersonalAccessTokenInput!) {
    createPersonalAccessToken(input: $input) {
      secret
      token {
        ...PersonalAccessTokenFields
      }
    }
  }
  ${PERSONAL_ACCESS_TOKEN_FIELDS}
`;

export const REVOKE_PERSONAL_ACCESS_TOKEN = gql`
  mutation RevokePersonalAccessToken($id: ID!) {
    revokePersonalAccessToken(id: $id) {
      ...PersonalAccessTokenFields
    }
  }
  ${PERSONAL_ACCESS_TOKEN_FIELDS}
`;

export {
  usePersonalAccessTokensQuery,
  usePersonalAccessTokenGrantOptionsQuery,
  useCreatePersonalAccessTokenMutation,
  useRevokePersonalAccessTokenMutation,
  type PersonalAccessTokenFieldsFragment,
  type PersonalAccessTokenGrantOptionsQuery,
} from "../generated/graphql";
