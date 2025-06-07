import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      user {
        id
        username
        email
        displayName
        avatarUrl
        isVerified
      }
      accessToken
      refreshToken
    }
  }
`;

export const SIGNUP_MUTATION = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      user {
        id
        username
        email
        displayName
        avatarUrl
        isVerified
      }
      accessToken
      refreshToken
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token)
  }
`;

export const ME_QUERY = gql`
  query Me {
    me {
      id
      username
      email
      displayName
      bio
      avatarUrl
      location
      website
      isVerified
      isAdmin
      createdAt
    }
  }
`;