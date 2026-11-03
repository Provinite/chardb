import { toast } from "react-hot-toast";
import {
  HalloweenDoorDocument,
  useHalloweenDoorQuery,
  useKnockOnHalloweenDoorMutation,
} from "../../generated/graphql";
import { DoorKnockToast } from "./DoorKnockToast";
import { DoorKnockView } from "./DoorKnockView";

export interface DoorKnockProps {
  communityId: string;
  /** The member whose door it is. */
  userId: string;
  /** What to call them in the toast. */
  name: string;
}

/**
 * The knock button on a member's profile. Shows nothing while the community
 * has no Halloween event running.
 */
export function DoorKnock({ communityId, userId, name }: DoorKnockProps) {
  const variables = { communityId, userId };
  const { data, loading } = useHalloweenDoorQuery({ variables });
  const [knock, { loading: knocking }] = useKnockOnHalloweenDoorMutation({
    refetchQueries: [{ query: HalloweenDoorDocument, variables }],
    awaitRefetchQueries: true,
    update(cache) {
      // Both sides' candies are new; lists of them are stale.
      cache.evict({ fieldName: "myHalloweenCandies" });
      cache.evict({ fieldName: "myHalloweenCandyBoards" });
      cache.evict({ fieldName: "halloweenCandyBoard" });
      cache.gc();
    },
  });

  if (!loading && !data?.halloweenDoor) return null;

  const onKnock = async () => {
    try {
      const { data: result } = await knock({ variables });
      const knocked = result?.knockOnHalloweenDoor;
      if (knocked) {
        toast.success(
          <DoorKnockToast
            name={name}
            knockerCandies={knocked.knockerCandies}
            knockeeCandies={knocked.knockeeCandies}
          />,
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not knock");
    }
  };

  return (
    <DoorKnockView
      door={data?.halloweenDoor ?? null}
      knocking={knocking}
      onKnock={onKnock}
    />
  );
}
