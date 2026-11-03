import { DoorClosed } from "lucide-react";
import { Button, Stack } from "@chardb/ui";
import {
  HalloweenDoorClosedReason,
  type HalloweenDoorFieldsFragment,
} from "../../generated/graphql";
import * as styles from "./DoorKnockView.css";

const CLOSED_COPY: Record<HalloweenDoorClosedReason, string> = {
  [HalloweenDoorClosedReason.AlreadyKnocked]: "Already knocked today",
  [HalloweenDoorClosedReason.NoKnocksLeft]: "No door knocks left today",
  [HalloweenDoorClosedReason.OwnDoor]: "This is your door",
  [HalloweenDoorClosedReason.NotAMember]: "Only members have doors",
};

export interface DoorKnockViewProps {
  /** Null while it loads. */
  door: HalloweenDoorFieldsFragment | null;
  knocking: boolean;
  onKnock: () => void;
}

function statusOf(door: HalloweenDoorFieldsFragment | null): string {
  if (!door) return "";
  if (door.closedReason) return CLOSED_COPY[door.closedReason];
  const n = door.remainingKnocks;
  return `${n} door ${n === 1 ? "knock" : "knocks"} left today`;
}

/** Knocking on a member's door for Halloween candy. */
export function DoorKnockView({ door, knocking, onKnock }: DoorKnockViewProps) {
  return (
    <Stack gap="xs" align="flex-start" className={styles.root}>
      <Button
        tone="outline"
        size="sm"
        icon={<DoorClosed size={15} aria-hidden />}
        disabled={!door?.canKnock}
        busy={knocking}
        onClick={onKnock}
      >
        Knock on door
      </Button>
      <p className={styles.status} aria-live="polite">
        {statusOf(door)}
      </p>
    </Stack>
  );
}
