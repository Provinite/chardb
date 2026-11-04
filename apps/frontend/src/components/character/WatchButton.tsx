import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  useCharacterWatchStatusQuery,
  useUnwatchCharacterMutation,
  useWatchCharacterMutation,
} from "../../graphql/character-watches.graphql";
import { WatchButtonView } from "./WatchButtonView";

interface WatchButtonProps {
  characterId: string;
  /** Owners are not offered a watch on their own character. */
  ownerId?: string | null;
}

export function WatchButton({ characterId, ownerId }: WatchButtonProps) {
  const { user } = useAuth();
  const hidden = !user || user.id === ownerId;

  const { data, loading } = useCharacterWatchStatusQuery({
    variables: { id: characterId },
    skip: hidden,
  });
  const watching = data?.character?.viewerIsWatching ?? false;
  const optimistic = (next: boolean) => ({
    __typename: "Character" as const,
    id: characterId,
    viewerIsWatching: next,
  });

  const [watch, { loading: watchBusy }] = useWatchCharacterMutation({
    variables: { characterId },
    optimisticResponse: { watchCharacter: optimistic(true) },
    onCompleted: () =>
      toast.success(
        "Watching. You'll be notified when its availability changes.",
      ),
    onError: () => toast.error("Couldn't watch this character."),
  });
  const [unwatch, { loading: unwatchBusy }] = useUnwatchCharacterMutation({
    variables: { characterId },
    optimisticResponse: { unwatchCharacter: optimistic(false) },
    onError: () => toast.error("Couldn't stop watching this character."),
  });

  if (hidden) return null;

  return (
    <WatchButtonView
      watching={watching}
      pending={loading && !data}
      busy={watchBusy || unwatchBusy}
      onToggle={() => void (watching ? unwatch() : watch())}
    />
  );
}
