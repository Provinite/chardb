import { gql } from '@apollo/client';

export const MY_EXTERNAL_ACCOUNTS = gql`
  query MyExternalAccounts {
    myExternalAccounts {
      id
      provider
      providerAccountId
      displayName
      createdAt
      updatedAt
    }
  }
`;

export const LINK_EXTERNAL_ACCOUNT = gql`
  mutation LinkExternalAccount($input: LinkExternalAccountInput!) {
    linkExternalAccount(input: $input) {
      id
      provider
      providerAccountId
      displayName
      createdAt
      updatedAt
    }
  }
`;

export const UNLINK_EXTERNAL_ACCOUNT = gql`
  mutation UnlinkExternalAccount($input: UnlinkExternalAccountInput!) {
    unlinkExternalAccount(input: $input)
  }
`;
