import { gql } from "@apollo/client";

/**
 * Both mutations answer with the character, so Apollo updates
 * `viewerIsWatching` in the cache without a refetch.
 */
export const CHARACTER_WATCH_STATUS = gql`
  query CharacterWatchStatus($id: ID!) {
    character(id: $id) {
      id
      viewerIsWatching
    }
  }
`;

export const WATCH_CHARACTER = gql`
  mutation WatchCharacter($characterId: ID!) {
    watchCharacter(characterId: $characterId) {
      id
      viewerIsWatching
    }
  }
`;

export const UNWATCH_CHARACTER = gql`
  mutation UnwatchCharacter($characterId: ID!) {
    unwatchCharacter(characterId: $characterId) {
      id
      viewerIsWatching
    }
  }
`;

export {
  useCharacterWatchStatusQuery,
  useWatchCharacterMutation,
  useUnwatchCharacterMutation,
  CharacterWatchStatusDocument,
} from "../generated/graphql";
