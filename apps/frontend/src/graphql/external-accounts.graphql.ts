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

export const UNLINK_EXTERNAL_ACCOUNT = gql`
  mutation UnlinkExternalAccount($input: UnlinkExternalAccountInput!) {
    unlinkExternalAccount(input: $input)
  }
`;
