import type { ApolloCache } from "@apollo/client";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  useUnwatchCharacterMutation,
  useWatchCharacterMutation,
} from "../../graphql/character-watches.graphql";
import { WatchButtonView } from "./WatchButtonView";

interface WatchButtonProps {
  characterId: string;
  /** Owners are not offered a watch on their own character. */
  ownerId?: string | null;
  /** `viewerIsWatching` from the page's own character query. */
  watching: boolean;
}

export function WatchButton({
  characterId,
  ownerId,
  watching,
}: WatchButtonProps) {
  const { user } = useAuth();
  const hidden = !user || user.id === ownerId;

  /** The mutations answer with a bare boolean; this puts it on the character. */
  const store = (cache: ApolloCache<unknown>, next: boolean | undefined) => {
    if (next === undefined) return;
    cache.modify({
      id: cache.identify({ __typename: "Character", id: characterId }),
      fields: { viewerIsWatching: () => next },
    });
  };

  const [watch, { loading: watchBusy }] = useWatchCharacterMutation({
    variables: { characterId },
    optimisticResponse: { watchCharacter: true },
    update: (cache, { data }) => store(cache, data?.watchCharacter),
    onCompleted: () =>
      toast.success(
        "Watching. You'll be notified when its availability changes.",
      ),
    onError: () => toast.error("Couldn't watch this character."),
  });
  const [unwatch, { loading: unwatchBusy }] = useUnwatchCharacterMutation({
    variables: { characterId },
    optimisticResponse: { unwatchCharacter: false },
    update: (cache, { data }) => store(cache, data?.unwatchCharacter),
    onError: () => toast.error("Couldn't stop watching this character."),
  });

  if (hidden) return null;

  return (
    <WatchButtonView
      watching={watching}
      busy={watchBusy || unwatchBusy}
      onToggle={() => void (watching ? unwatch() : watch())}
    />
  );
}
