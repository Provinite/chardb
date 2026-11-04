import { gql } from "@apollo/client";

/**
 * Both answer with the new `viewerIsWatching` rather than the character, so
 * unwatching works on a character the caller can no longer see. The caller
 * writes the answer into the cache, where `GetCharacter` reads it.
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
  useWatchCharacterMutation,
  useUnwatchCharacterMutation,
} from "../generated/graphql";
