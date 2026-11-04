import { gql } from "@apollo/client";

export const CHARACTER_WATCH_STATUS = gql`
  query CharacterWatchStatus($id: ID!) {
    character(id: $id) {
      id
      viewerIsWatching
    }
  }
`;

/**
 * Both answer with the new `viewerIsWatching` rather than the character, so
 * unwatching works on a character the caller can no longer see. The caller
 * writes the answer into the cache.
 */
export const WATCH_CHARACTER = gql`
  mutation WatchCharacter($characterId: ID!) {
    watchCharacter(characterId: $characterId)
  }
`;

export const UNWATCH_CHARACTER = gql`
  mutation UnwatchCharacter($characterId: ID!) {
    unwatchCharacter(characterId: $characterId)
  }
`;

export {
  useCharacterWatchStatusQuery,
  useWatchCharacterMutation,
  useUnwatchCharacterMutation,
  CharacterWatchStatusDocument,
} from "../generated/graphql";
