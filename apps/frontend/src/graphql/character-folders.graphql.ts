import { gql } from "@apollo/client";

/**
 * Everything the browser needs about one folder.
 *
 * The whole workspace arrives flat and the client builds the tree, so
 * `parentId` is as load-bearing as the name -- there is no nested shape to
 * fall back on.
 */
export const CHARACTER_FOLDER_FIELDS_FRAGMENT = gql`
  fragment CharacterFolderFields on CharacterFolder {
    id
    parentId
    name
    isPrivate
    sortOrder
    characterCount
  }
`;

export const GET_MY_CHARACTER_FOLDERS = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  query GetMyCharacterFolders($communityId: ID) {
    myCharacterFolders(communityId: $communityId) {
      ...CharacterFolderFields
    }
  }
`;

export const GET_USER_CHARACTER_FOLDERS = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  query GetUserCharacterFolders($userId: ID!, $communityId: ID) {
    userCharacterFolders(userId: $userId, communityId: $communityId) {
      ...CharacterFolderFields
    }
  }
`;

export const GET_CHARACTER_FOLDERS = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  query GetCharacterFolders($characterId: ID!) {
    characterFolders(characterId: $characterId) {
      ...CharacterFolderFields
    }
  }
`;

export const CREATE_CHARACTER_FOLDER = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  mutation CreateCharacterFolder($input: CreateCharacterFolderInput!) {
    createCharacterFolder(input: $input) {
      ...CharacterFolderFields
    }
  }
`;

export const UPDATE_CHARACTER_FOLDER = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  mutation UpdateCharacterFolder($input: UpdateCharacterFolderInput!) {
    updateCharacterFolder(input: $input) {
      ...CharacterFolderFields
    }
  }
`;

/**
 * Returns the whole workspace rather than the folder that moved, because one
 * drop renumbers a sibling group.
 */
export const MOVE_CHARACTER_FOLDER = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  mutation MoveCharacterFolder($input: MoveCharacterFolderInput!) {
    moveCharacterFolder(input: $input) {
      ...CharacterFolderFields
    }
  }
`;

export const DELETE_CHARACTER_FOLDER = gql`
  mutation DeleteCharacterFolder($id: ID!) {
    deleteCharacterFolder(id: $id) {
      removed
      message
    }
  }
`;

export const MOVE_CHARACTERS_TO_FOLDER = gql`
  mutation MoveCharactersToFolder($input: MoveCharactersToFolderInput!) {
    moveCharactersToFolder(input: $input)
  }
`;

export const SET_CHARACTER_FOLDERS = gql`
  ${CHARACTER_FOLDER_FIELDS_FRAGMENT}
  mutation SetCharacterFolders($input: SetCharacterFoldersInput!) {
    setCharacterFolders(input: $input) {
      ...CharacterFolderFields
    }
  }
`;
